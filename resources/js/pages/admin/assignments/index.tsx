import {
    AdminEmpty,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
    AdminStickyBar,
    AdminTextarea,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import { StatusChipSet } from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsonRequestInit } from '@/lib/http';
import { Head, Link } from '@inertiajs/react';
import { RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type RoleFilter = 'trainer' | 'nutritionist';

type Assignment = {
    id: number;
    client_id: number;
    professional_id: number;
    professional_role: RoleFilter;
    notes?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    client?: {
        id: number;
        name: string;
        email: string;
        city?: string | null;
    } | null;
    professional?: {
        id: number;
        name: string;
        email: string;
        role: RoleFilter;
        city?: string | null;
        specialties?: string[];
        verified?: boolean;
        status?: string | null;
    } | null;
    assigned_by?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type Client = {
    id: number;
    name: string;
    email: string;
    city?: string | null;
    status?: string | null;
    dietary_goal?: string | null;
    fitness_goal?: string | null;
    diet_name?: string | null;
    assignment_state: 'assigned' | 'unassigned' | 'reassignment';
    current_assignments: Assignment[];
    activity: {
        meal_entries: number;
        workout_logs: number;
        plans: number;
    };
};

type Professional = {
    id: number;
    name: string;
    email: string;
    role: RoleFilter;
    city?: string | null;
    specialties: string[];
    verified: boolean;
    status?: string | null;
    current_load: number;
    capacity: number;
    capacity_state: 'available' | 'near_capacity' | 'overloaded';
};

type AssignmentResponse = {
    stats?: {
        unassigned_users: number;
        active_assignments: number;
        reassignment_needs: number;
        over_capacity_professionals: number;
    };
    filters?: {
        cities?: string[];
    };
    clients?: Client[];
    professionals?: Professional[];
    assignments?: Assignment[];
};

function formatRoleLabel(role: RoleFilter) {
    return role === 'nutritionist' ? 'Dietitian' : 'Trainer';
}

function formatDate(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

function formatStatus(value?: string | null) {
    return (value || 'pending')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assignmentForRole(client: Client | null, role: RoleFilter) {
    return (
        client?.current_assignments.find(
            (assignment) => assignment.professional_role === role,
        ) ?? null
    );
}

function calculateFit(client: Client | null, professional: Professional) {
    if (!client) {
        return {
            score: 0,
            cityMatch: false,
            specialtyMatch: false,
            roleMatch: true,
            reasons: ['Select a user to calculate match signals.'],
        };
    }

    const clientSignals = [
        client.dietary_goal,
        client.fitness_goal,
        client.diet_name,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    const specialtyMatch = professional.specialties.some((specialty) =>
        clientSignals.includes(specialty.toLowerCase()),
    );
    const cityMatch =
        Boolean(client.city) &&
        Boolean(professional.city) &&
        client.city?.toLowerCase() === professional.city?.toLowerCase();
    const roleMatch = professional.role === 'nutritionist'
        ? Boolean(client.dietary_goal || client.diet_name)
        : Boolean(client.fitness_goal);
    const capacityScore =
        professional.capacity_state === 'available'
            ? 30
            : professional.capacity_state === 'near_capacity'
              ? 15
              : 0;
    const score =
        capacityScore +
        (cityMatch ? 25 : 0) +
        (specialtyMatch ? 25 : 0) +
        (roleMatch ? 20 : 8);

    return {
        score,
        cityMatch,
        specialtyMatch,
        roleMatch,
        reasons: [
            cityMatch ? 'Same city' : 'Different or missing city',
            specialtyMatch ? 'Specialty aligns' : 'Specialty not explicit',
            roleMatch ? 'Role matches need' : 'Role need is weak',
            `${professional.current_load}/${professional.capacity} current load`,
        ],
    };
}

export default function AdminAssignmentsPage() {
    const [role, setRole] = useState<RoleFilter>('trainer');
    const [city, setCity] = useState('all');
    const [query, setQuery] = useState('');
    const [clients, setClients] = useState<Client[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<number | null>(
        null,
    );
    const [selectedProfessionalId, setSelectedProfessionalId] = useState<
        number | null
    >(null);
    const [note, setNote] = useState('');
    const [replaceExisting, setReplaceExisting] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [stats, setStats] = useState({
        unassigned_users: 0,
        active_assignments: 0,
        reassignment_needs: 0,
        over_capacity_professionals: 0,
    });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ role });

            if (query.trim()) {
                params.set('search', query.trim());
            }

            if (city !== 'all') {
                params.set('city', city);
            }

            const response = await fetch(
                `/api/admin/assignments?${params.toString()}`,
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) {
                throw new Error('Could not load assignment workspace.');
            }

            const json = (await response.json()) as AssignmentResponse;
            const nextClients = Array.isArray(json.clients)
                ? json.clients
                : [];
            const nextProfessionals = Array.isArray(json.professionals)
                ? json.professionals
                : [];

            setClients(nextClients);
            setProfessionals(nextProfessionals);
            setAssignments(Array.isArray(json.assignments) ? json.assignments : []);
            setCities(Array.isArray(json.filters?.cities) ? json.filters.cities : []);
            setStats({
                unassigned_users: Number(json.stats?.unassigned_users ?? 0),
                active_assignments: Number(json.stats?.active_assignments ?? 0),
                reassignment_needs: Number(json.stats?.reassignment_needs ?? 0),
                over_capacity_professionals: Number(
                    json.stats?.over_capacity_professionals ?? 0,
                ),
            });
            setSelectedClientId((current) =>
                current && nextClients.some((client) => client.id === current)
                    ? current
                    : (nextClients[0]?.id ?? null),
            );
            setSelectedProfessionalId((current) =>
                current &&
                nextProfessionals.some(
                    (professional) => professional.id === current,
                )
                    ? current
                    : null,
            );
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load assignment workspace.',
            );
            setClients([]);
            setProfessionals([]);
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    }, [city, query, role]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setSelectedClientId(null);
        setSelectedProfessionalId(null);
        setNote('');
    }, [city, query, role]);

    const selectedClient = useMemo(
        () => clients.find((client) => client.id === selectedClientId) ?? null,
        [clients, selectedClientId],
    );

    const currentAssignment = useMemo(
        () => assignmentForRole(selectedClient, role),
        [role, selectedClient],
    );

    const rankedProfessionals = useMemo(
        () =>
            professionals
                .map((professional) => ({
                    professional,
                    fit: calculateFit(selectedClient, professional),
                }))
                .sort((a, b) => b.fit.score - a.fit.score),
        [professionals, selectedClient],
    );

    const selectedProfessional = useMemo(
        () =>
            professionals.find(
                (professional) => professional.id === selectedProfessionalId,
            ) ?? null,
        [professionals, selectedProfessionalId],
    );

    useEffect(() => {
        if (!selectedProfessionalId && rankedProfessionals[0]) {
            setSelectedProfessionalId(rankedProfessionals[0].professional.id);
        }
    }, [rankedProfessionals, selectedProfessionalId]);

    const assignmentHistory = useMemo(() => {
        if (!selectedClient) {
            return assignments.slice(0, 8);
        }

        return assignments
            .filter((assignment) => assignment.client_id === selectedClient.id)
            .slice(0, 8);
    }, [assignments, selectedClient]);

    async function saveAssignment() {
        if (!selectedClient || !selectedProfessional) {
            setError('Select a user and professional before saving.');
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                '/api/admin/assignments',
                jsonRequestInit('POST', {
                    client_id: selectedClient.id,
                    professional_id: selectedProfessional.id,
                    professional_role: role,
                    notes: note.trim() || null,
                    replace_existing: replaceExisting,
                }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not save assignment.',
                );
            }

            setSuccess(
                `${selectedClient.name} assigned to ${selectedProfessional.name}.`,
            );
            setNote('');
            await load();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save assignment.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function removeAssignment(assignment: Assignment | null) {
        if (!assignment) {
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(
                `/api/admin/assignments/${assignment.id}`,
                jsonRequestInit('DELETE'),
            );

            if (!response.ok) {
                throw new Error('Could not remove assignment.');
            }

            setSuccess('Assignment removed.');
            await load();
        } catch (removeError) {
            setError(
                removeError instanceof Error
                    ? removeError.message
                    : 'Could not remove assignment.',
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Head title="Admin Assignments" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Assignments"
                    description="Manual matching workspace for assigning clients to trainers or dietitians with capacity, city, and specialty context."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Unassigned users"
                                value={loading ? '...' : String(stats.unassigned_users)}
                                tone="accent"
                                helper={`Need a ${formatRoleLabel(role).toLowerCase()} assignment in the current view.`}
                            />
                            <AdminStatCard
                                label="Active assignments"
                                value={loading ? '...' : String(stats.active_assignments)}
                                helper="All active client-professional links."
                            />
                            <AdminStatCard
                                label="Reassignment needs"
                                value={loading ? '...' : String(stats.reassignment_needs)}
                                helper="Clients linked to an unavailable or unverified professional."
                            />
                            <AdminStatCard
                                label="Over capacity"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.over_capacity_professionals)
                                }
                                helper="Professionals at or above the default capacity limit."
                            />
                        </AdminStatsGrid>

                        {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
                        {success ? (
                            <AdminNotice tone="success">{success}</AdminNotice>
                        ) : null}

                        <AdminSection
                            title="Assignment Guidance"
                            description="Work through the three steps in order: select a user, review recommended professionals, then confirm the assignment with a clear admin note."
                        >
                            <div className="grid gap-4 xl:grid-cols-3">
                                <AdminOverviewCard
                                    title="1. Select user"
                                    description="Start from an unassigned client or someone with a reassignment warning."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Current focus:{' '}
                                        <span className="font-medium text-foreground">
                                            {selectedClient?.name ?? 'No user selected'}
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="2. Review candidates"
                                    description="Candidates are ranked by capacity, city, specialty, and role fit."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Recommended professionals:{' '}
                                        <span className="font-medium text-foreground">
                                            {rankedProfessionals.length}
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="3. Confirm"
                                    description="Save assignment, reassign by replacing the role link, remove an existing link, or add an admin note."
                                >
                                    <div className="dashboard-surface-soft rounded-[22px] px-4 py-4 text-sm leading-6 text-muted-foreground">
                                        Current assignment:{' '}
                                        <span className="font-medium text-foreground">
                                            {currentAssignment?.professional?.name ??
                                                'None for this role'}
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filters"
                            description="Narrow the matching workspace without losing the selected user and candidate context."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField label="Search" className="xl:flex-1">
                                        <AdminInput
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            placeholder="Search users by name, email, city, goal, or diet"
                                        />
                                    </AdminField>
                                    <AdminField label="Assignment role" className="sm:w-52">
                                        <AdminNativeSelect
                                            value={role}
                                            onChange={(event) =>
                                                setRole(
                                                    event.target.value as RoleFilter,
                                                )
                                            }
                                        >
                                            <option value="trainer">Trainer</option>
                                            <option value="nutritionist">
                                                Dietitian
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField label="City" className="sm:w-52">
                                        <AdminNativeSelect
                                            value={city}
                                            onChange={(event) =>
                                                setCity(event.target.value)
                                            }
                                        >
                                            <option value="all">All cities</option>
                                            {cities.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>
                                <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void load()}
                                        disabled={loading}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        {loading ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                        </AdminSection>

                        <AdminSection
                            title="Guided Matching Workspace"
                            description="A stacked three-step flow keeps user need, candidate fit, and confirmation readable on desktop and mobile."
                        >
                            <div className="space-y-4">
                                <AdminPanel
                                    title="Step 1: Select user"
                                    description="Unassigned users and reassignment needs appear first. Current assignments stay visible for context."
                                >
                                    {loading && clients.length === 0 ? (
                                        <AdminEmpty
                                            title="Loading assignment queue"
                                            description="Pulling users, assignments, and professional capacity."
                                        />
                                    ) : (
                                        <AdminScrollArea maxHeightClassName="max-h-[360px]">
                                            <div className="space-y-2">
                                                {clients.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedClientId(
                                                                client.id,
                                                            );
                                                            setNote('');
                                                        }}
                                                        className={`dashboard-surface-soft w-full rounded-[20px] px-4 py-3 text-left transition hover:border-primary/35 ${
                                                            selectedClient?.id ===
                                                            client.id
                                                                ? 'border-primary/45 bg-primary/5'
                                                                : ''
                                                        }`}
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-foreground">
                                                                    {client.name}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {client.email}
                                                                </div>
                                                            </div>
                                                            <StatusChipSet
                                                                items={[
                                                                    {
                                                                        value: client.assignment_state,
                                                                        label: formatStatus(
                                                                            client.assignment_state,
                                                                        ),
                                                                    },
                                                                    {
                                                                        value:
                                                                            client.status ||
                                                                            'active',
                                                                    },
                                                                ]}
                                                            />
                                                        </div>
                                                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                                                            <span>
                                                                City:{' '}
                                                                {client.city ||
                                                                    'Not set'}
                                                            </span>
                                                            <span>
                                                                Fitness:{' '}
                                                                {client.fitness_goal ||
                                                                    'Not set'}
                                                            </span>
                                                            <span>
                                                                Diet:{' '}
                                                                {client.dietary_goal ||
                                                                    client.diet_name ||
                                                                    'Not set'}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                                {!loading && clients.length === 0 ? (
                                                    <AdminEmpty
                                                        title="No users found"
                                                        description="Adjust the filters or return when more clients need assignment."
                                                    />
                                                ) : null}
                                            </div>
                                        </AdminScrollArea>
                                    )}
                                </AdminPanel>

                                <AdminPanel
                                    title="Step 2: Review recommended professionals"
                                    description="Candidate cards are stacked by fit so capacity and match details stay readable."
                                >
                                    {!selectedClient ? (
                                        <AdminEmpty
                                            title="Select a user first"
                                            description="Candidate matching appears after a client is selected."
                                        />
                                    ) : (
                                        <AdminScrollArea maxHeightClassName="max-h-[460px]">
                                            <div className="space-y-3">
                                                {rankedProfessionals.map(
                                                    ({ professional, fit }) => (
                                                        <button
                                                            key={professional.id}
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedProfessionalId(
                                                                    professional.id,
                                                                )
                                                            }
                                                            className={`dashboard-surface-soft w-full rounded-[22px] px-4 py-4 text-left transition hover:border-primary/35 ${
                                                                selectedProfessionalId ===
                                                                professional.id
                                                                    ? 'border-primary/45 bg-primary/5'
                                                                    : ''
                                                            }`}
                                                        >
                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-foreground">
                                                                        {
                                                                            professional.name
                                                                        }
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {
                                                                            professional.email
                                                                        }
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-lg font-semibold text-foreground">
                                                                        {
                                                                            fit.score
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        fit
                                                                        score
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                <Badge variant="outline">
                                                                    {formatRoleLabel(
                                                                        professional.role,
                                                                    )}
                                                                </Badge>
                                                                <Badge variant="outline">
                                                                    {professional.city ||
                                                                        'City missing'}
                                                                </Badge>
                                                                <Badge
                                                                    variant={
                                                                        professional.capacity_state ===
                                                                        'overloaded'
                                                                            ? 'destructive'
                                                                            : 'secondary'
                                                                    }
                                                                >
                                                                    {
                                                                        professional.current_load
                                                                    }
                                                                    /
                                                                    {
                                                                        professional.capacity
                                                                    }{' '}
                                                                    load
                                                                </Badge>
                                                            </div>
                                                            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                                                {fit.reasons.map(
                                                                    (reason) => (
                                                                        <span
                                                                            key={
                                                                                reason
                                                                            }
                                                                        >
                                                                            {
                                                                                reason
                                                                            }
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </div>
                                                            <div className="mt-3 flex flex-wrap gap-1">
                                                                {professional.specialties
                                                                    .slice(0, 5)
                                                                    .map(
                                                                        (
                                                                            specialty,
                                                                        ) => (
                                                                            <Badge
                                                                                key={
                                                                                    specialty
                                                                                }
                                                                                variant="secondary"
                                                                                className="rounded-full px-2 py-0.5 text-[11px]"
                                                                            >
                                                                                {
                                                                                    specialty
                                                                                }
                                                                            </Badge>
                                                                        ),
                                                                    )}
                                                            </div>
                                                        </button>
                                                    ),
                                                )}
                                                {rankedProfessionals.length === 0 ? (
                                                    <AdminEmpty
                                                        title="No verified professionals"
                                                        description="Switch role focus or verify professionals before assigning."
                                                    />
                                                ) : null}
                                            </div>
                                        </AdminScrollArea>
                                    )}
                                </AdminPanel>

                                <AdminPanel
                                    title="Step 3: Confirm assignment"
                                    description="Save a new assignment, replace an existing role assignment, remove the current assignment, or add an admin note."
                                >
                                    <div className="space-y-4">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                                                <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                    Current assignment
                                                </div>
                                                <div className="mt-2 text-base font-semibold text-foreground">
                                                    {currentAssignment?.professional
                                                        ?.name ??
                                                        'None for this role'}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {currentAssignment
                                                        ? `Assigned ${formatDate(currentAssignment.created_at)} by ${currentAssignment.assigned_by?.name ?? 'admin'}`
                                                        : `${selectedClient?.name ?? 'Selected user'} is unassigned for ${formatRoleLabel(role).toLowerCase()}.`}
                                                </div>
                                            </div>
                                            <div className="dashboard-surface-soft rounded-[22px] px-4 py-4">
                                                <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                    Selected candidate
                                                </div>
                                                <div className="mt-2 text-base font-semibold text-foreground">
                                                    {selectedProfessional?.name ??
                                                        'No professional selected'}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {selectedProfessional
                                                        ? `${selectedProfessional.current_load}/${selectedProfessional.capacity} load in ${selectedProfessional.city || 'city not set'}`
                                                        : 'Choose a candidate from step 2.'}
                                                </div>
                                            </div>
                                        </div>

                                        <AdminField
                                            label="Admin note"
                                            helper="Required for clean handoff context when reassigning or documenting why this match was chosen."
                                        >
                                            <AdminTextarea
                                                rows={4}
                                                value={note}
                                                onChange={(event) =>
                                                    setNote(event.target.value)
                                                }
                                                placeholder="Why this professional is the right match, what changed, or what the next admin should know."
                                            />
                                        </AdminField>

                                        <label className="flex items-start gap-3 text-sm text-muted-foreground">
                                            <input
                                                type="checkbox"
                                                checked={replaceExisting}
                                                onChange={(event) =>
                                                    setReplaceExisting(
                                                        event.target.checked,
                                                    )
                                                }
                                                className="mt-1"
                                            />
                                            <span>
                                                Replace existing{' '}
                                                {formatRoleLabel(
                                                    role,
                                                ).toLowerCase()}{' '}
                                                assignment for this client when
                                                saving.
                                            </span>
                                        </label>

                                        <AdminPanel
                                            title="Assignment history"
                                            description="Readable assignment history only. Raw audit data stays in admin logs."
                                        >
                                            <div className="space-y-2">
                                                {assignmentHistory.map(
                                                    (assignment) => (
                                                        <div
                                                            key={assignment.id}
                                                            className="dashboard-surface-soft rounded-[18px] px-3 py-3 text-sm"
                                                        >
                                                            <div className="font-medium text-foreground">
                                                                {assignment.client
                                                                    ?.name ??
                                                                    'Client'}{' '}
                                                                to{' '}
                                                                {assignment
                                                                    .professional
                                                                    ?.name ??
                                                                    'Professional'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatRoleLabel(
                                                                    assignment.professional_role,
                                                                )}{' '}
                                                                ·{' '}
                                                                {formatDate(
                                                                    assignment.created_at,
                                                                )}
                                                            </div>
                                                            {assignment.notes ? (
                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                    {
                                                                        assignment.notes
                                                                    }
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ),
                                                )}
                                                {assignmentHistory.length === 0 ? (
                                                    <AdminEmpty
                                                        title="No assignment history"
                                                        description="History will appear after this client has assignment activity."
                                                    />
                                                ) : null}
                                            </div>
                                        </AdminPanel>
                                    </div>
                                </AdminPanel>

                                <AdminStickyBar
                                    summary={
                                        selectedClient && selectedProfessional
                                            ? `${selectedClient.name} -> ${selectedProfessional.name}`
                                            : 'Select a user and professional'
                                    }
                                >
                                    <Button
                                        type="button"
                                        onClick={() => void saveAssignment()}
                                        disabled={
                                            saving ||
                                            !selectedClient ||
                                            !selectedProfessional
                                        }
                                    >
                                        {currentAssignment
                                            ? 'Reassign'
                                            : 'Assign'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void saveAssignment()}
                                        disabled={
                                            saving ||
                                            !selectedClient ||
                                            !selectedProfessional
                                        }
                                    >
                                        Add admin note
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() =>
                                            void removeAssignment(
                                                currentAssignment,
                                            )
                                        }
                                        disabled={saving || !currentAssignment}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Remove
                                    </Button>
                                    <Button asChild type="button" variant="outline">
                                        <Link href="/admin/logs">Logs</Link>
                                    </Button>
                                </AdminStickyBar>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
