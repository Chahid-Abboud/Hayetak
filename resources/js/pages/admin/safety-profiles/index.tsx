import {
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminOverviewCard,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    EntityDetailDrawer,
    RiskBannerStack,
    StatusChip,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Lock,
    RefreshCcw,
    Settings2,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type RiskLevel = 'danger' | 'warning' | 'info';

type SafetyProfile = {
    id: number;
    name: string;
    email: string;
    role: string;
    risk_level: RiskLevel;
    status?: string | null;
    verified: boolean;
    diet_type?: string | null;
    allergies: string[];
    medical_conditions: string[];
    injuries: string[];
    blocked_foods: string[];
    blocked_exercises: string[];
    equipment_limits: string[];
    available_equipment: string[];
    incomplete_onboarding: string[];
    contradictions: string[];
    ai_must_avoid: string[];
    plan_status: {
        ai_plans: number;
        ai_conversations: number;
        planner_generation: string;
    };
    review_state: string;
};

type SafetyProfilesResponse = {
    stats: {
        total: number;
        danger: number;
        warning: number;
        allergy_profiles: number;
        incomplete: number;
    };
    profiles: SafetyProfile[];
};

const defaultStats: SafetyProfilesResponse['stats'] = {
    total: 0,
    danger: 0,
    warning: 0,
    allergy_profiles: 0,
    incomplete: 0,
};

function riskToneClassName(risk: RiskLevel) {
    return {
        danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200',
        warning:
            'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
        info: 'border-info/30 bg-info/10 text-foreground',
    }[risk];
}

function SignalChips({
    items,
    emptyText,
    tone = 'default',
}: {
    items: string[];
    emptyText: string;
    tone?: 'default' | 'danger' | 'warning';
}) {
    if (items.length === 0) {
        return (
            <div className="rounded-[18px] border border-dashed border-border/60 bg-background/50 px-3 py-3 text-sm text-muted-foreground">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <span
                    key={item}
                    className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium',
                        tone === 'danger'
                            ? 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-200'
                            : tone === 'warning'
                              ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200'
                              : 'border-border/60 bg-background/70 text-muted-foreground',
                    )}
                >
                    {item}
                </span>
            ))}
        </div>
    );
}

function ProfileDetail({
    profile,
    actionState,
    onAction,
}: {
    profile: SafetyProfile | null;
    actionState?: string;
    onAction: (action: string) => void;
}) {
    if (!profile) {
        return (
            <AdminPanel
                title="Selected profile"
                description="Choose a user from the safety queue to inspect AI-impacting restrictions."
            >
                <div className="rounded-[22px] border border-dashed border-border/60 bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    No safety profile selected.
                </div>
            </AdminPanel>
        );
    }

    const risks = [
        profile.contradictions.length > 0
            ? {
                  severity: 'danger' as const,
                  title: 'Contradictions need admin review',
                  description: profile.contradictions.join(', '),
                  meta: 'Resolve before trusting generated plans.',
              }
            : null,
        profile.allergies.length > 0
            ? {
                  severity: 'danger' as const,
                  title: 'Allergies are hard exclusions',
                  description: profile.allergies.join(', '),
                  meta: 'Planner and coach must never suggest these foods.',
              }
            : null,
        profile.injuries.length > 0
            ? {
                  severity: 'warning' as const,
                  title: 'Injury limits affect exercise selection',
                  description: profile.injuries.join(', '),
                  meta: 'Recommend safer alternatives only.',
              }
            : null,
        profile.incomplete_onboarding.length > 0
            ? {
                  severity: 'info' as const,
                  title: 'Onboarding is incomplete',
                  description: profile.incomplete_onboarding.join(', '),
                  meta: 'Request user update before broad AI generation.',
              }
            : null,
    ].filter(
        (
            item,
        ): item is {
            severity: 'danger' | 'warning' | 'info';
            title: string;
            description: string;
            meta: string;
        } => item !== null,
    );

    return (
        <div className="space-y-4">
            <AdminPanel
                title={profile.name}
                description={profile.email}
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs font-semibold uppercase',
                                riskToneClassName(profile.risk_level),
                            )}
                        >
                            {profile.risk_level}
                        </span>
                        <StatusChipSet
                            items={[
                                { value: profile.role, label: profile.role },
                                {
                                    value: profile.verified
                                        ? 'verified'
                                        : 'unverified',
                                },
                                { value: profile.status || 'pending' },
                            ]}
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="dashboard-surface-soft rounded-[20px] px-3 py-3">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Diet type
                            </div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                                {profile.diet_type || 'Not recorded'}
                            </div>
                        </div>
                        <div className="dashboard-surface-soft rounded-[20px] px-3 py-3">
                            <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Planner generation
                            </div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                                {profile.plan_status.planner_generation.replace(
                                    /_/g,
                                    ' ',
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AdminPanel>

            {risks.length > 0 ? (
                <RiskBannerStack items={risks} />
            ) : (
                <AdminNotice tone="success">
                    No high-risk restrictions surfaced for this profile.
                </AdminNotice>
            )}

            <AdminPanel
                title="What the AI must avoid"
                description="Review these restrictions before any edit or generation action."
            >
                <div className="space-y-4">
                    <SignalChips
                        items={profile.ai_must_avoid}
                        emptyText="No hard avoid directives generated from this profile."
                        tone="danger"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <div className="mb-2 text-sm font-semibold text-foreground">
                                Blocked foods
                            </div>
                            <SignalChips
                                items={profile.blocked_foods}
                                emptyText="No blocked foods recorded."
                                tone="danger"
                            />
                        </div>
                        <div>
                            <div className="mb-2 text-sm font-semibold text-foreground">
                                Blocked exercises
                            </div>
                            <SignalChips
                                items={profile.blocked_exercises}
                                emptyText="No blocked exercises inferred."
                                tone="warning"
                            />
                        </div>
                    </div>
                </div>
            </AdminPanel>

            <AdminStickyBar summary={actionState ?? 'No action recorded in this session'}>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onAction('Marked reviewed')}
                >
                    <ShieldCheck className="h-4 w-4" />
                    Mark reviewed
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onAction('User update required')}
                >
                    <AlertTriangle className="h-4 w-4" />
                    Require user update
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onAction('Planner generation locked')}
                >
                    <Lock className="h-4 w-4" />
                    Lock planner generation
                </Button>
            </AdminStickyBar>

            <AdminPanel
                title="Restriction detail"
                description="Readable AI-impacting profile data only."
            >
                <div className="space-y-4">
                    <div>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                            Allergies
                        </div>
                        <SignalChips
                            items={profile.allergies}
                            emptyText="No allergies recorded."
                            tone="danger"
                        />
                    </div>
                    <div>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                            Medical history
                        </div>
                        <SignalChips
                            items={profile.medical_conditions}
                            emptyText="No medical history recorded."
                            tone="warning"
                        />
                    </div>
                    <div>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                            Injuries
                        </div>
                        <SignalChips
                            items={profile.injuries}
                            emptyText="No injuries recorded."
                            tone="warning"
                        />
                    </div>
                    <div>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                            Equipment limits
                        </div>
                        <SignalChips
                            items={profile.equipment_limits}
                            emptyText="No equipment limits recorded."
                        />
                    </div>
                    <div>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                            Incomplete onboarding
                        </div>
                        <SignalChips
                            items={profile.incomplete_onboarding}
                            emptyText="Safety-critical onboarding looks complete."
                        />
                    </div>
                    <div>
                        <div className="mb-2 text-sm font-semibold text-foreground">
                            Contradictions
                        </div>
                        <SignalChips
                            items={profile.contradictions}
                            emptyText="No contradictions detected."
                            tone="danger"
                        />
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="Plan and AI context"
                description="Summary only; open diagnostics for technical traces."
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="dashboard-surface-soft rounded-[20px] px-3 py-3">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            AI plans
                        </div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                            {profile.plan_status.ai_plans}
                        </div>
                    </div>
                    <div className="dashboard-surface-soft rounded-[20px] px-3 py-3">
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Coach conversations
                        </div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                            {profile.plan_status.ai_conversations}
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/diagnostics">
                            <Settings2 className="h-4 w-4" />
                            Open diagnostics
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/admin/users/${profile.id}`}>
                            Open user record
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            </AdminPanel>
        </div>
    );
}

export default function AdminSafetyProfilesPage() {
    const [profiles, setProfiles] = useState<SafetyProfile[]>([]);
    const [stats, setStats] =
        useState<SafetyProfilesResponse['stats']>(defaultStats);
    const [search, setSearch] = useState('');
    const [risk, setRisk] = useState('all');
    const [profileFilter, setProfileFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [actionStates, setActionStates] = useState<Record<number, string>>(
        {},
    );

    const selectedProfile =
        profiles.find((profile) => profile.id === selectedId) ??
        profiles[0] ??
        null;

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();

            if (search.trim()) {
                params.set('search', search.trim());
            }

            if (risk !== 'all') {
                params.set('risk', risk);
            }

            if (profileFilter !== 'all') {
                params.set('profile', profileFilter);
            }

            const response = await fetch(
                `/api/admin/safety-profiles?${params.toString()}`,
            );

            if (!response.ok) {
                throw new Error('Could not load safety profiles.');
            }

            const json = (await response.json()) as SafetyProfilesResponse;
            setProfiles(json.profiles ?? []);
            setStats(json.stats ?? defaultStats);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load safety profiles.',
            );
        } finally {
            setLoading(false);
        }
    }, [profileFilter, risk, search]);

    useEffect(() => {
        void loadProfiles();
    }, [loadProfiles]);

    useEffect(() => {
        if (profiles.length === 0) {
            setSelectedId(null);
            return;
        }

        if (!selectedId || !profiles.some((profile) => profile.id === selectedId)) {
            setSelectedId(profiles[0].id);
        }
    }, [profiles, selectedId]);

    const riskSummary = useMemo(() => {
        const contradictions = profiles.filter(
            (profile) => profile.contradictions.length > 0,
        ).length;
        const lockedCandidates = profiles.filter(
            (profile) => profile.risk_level === 'danger',
        ).length;

        return { contradictions, lockedCandidates };
    }, [profiles]);

    function recordAction(action: string) {
        if (!selectedProfile) {
            return;
        }

        setActionStates((current) => ({
            ...current,
            [selectedProfile.id]: `${action} for this session`,
        }));
    }

    return (
        <>
            <Head title="Admin Safety Profiles" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Safety Profiles"
                    description="Review user restrictions that directly affect AI planner and coach recommendations before unsafe guidance can reach users."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Safety profiles"
                                value={loading ? '...' : stats.total}
                                tone="accent"
                                helper="Filtered review queue."
                            />
                            <AdminStatCard
                                label="Danger profiles"
                                value={loading ? '...' : stats.danger}
                                helper="Allergies, injuries, or contradictions present."
                            />
                            <AdminStatCard
                                label="Warning profiles"
                                value={loading ? '...' : stats.warning}
                                helper="Medical or incomplete safety context."
                            />
                            <AdminStatCard
                                label="Allergy profiles"
                                value={loading ? '...' : stats.allergy_profiles}
                                helper="Food restrictions AI must never violate."
                            />
                            <AdminStatCard
                                label="Incomplete onboarding"
                                value={loading ? '...' : stats.incomplete}
                                helper="Missing fields needed for safe generation."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Risk summary"
                            description="Safety decisions come before edits or generation actions."
                        >
                            <div className="grid gap-4 xl:grid-cols-3">
                                <AdminOverviewCard
                                    title="AI must avoid first"
                                    description="Every selected profile shows blocked foods and exercises before the action rail."
                                >
                                    <div className="dashboard-surface-soft flex items-start gap-3 rounded-[22px] px-4 py-4 text-sm text-muted-foreground">
                                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                        <span>
                                            Allergy and injury directives are
                                            treated as hard safety constraints.
                                        </span>
                                    </div>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Contradictions"
                                    description="Profiles where saved settings conflict or require admin interpretation."
                                >
                                    <div className="text-3xl font-semibold tracking-tight text-foreground">
                                        {riskSummary.contradictions}
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Resolve or request a user update before
                                        planner generation.
                                    </p>
                                </AdminOverviewCard>
                                <AdminOverviewCard
                                    title="Lock candidates"
                                    description="Profiles that should stay constrained until reviewed."
                                >
                                    <div className="text-3xl font-semibold tracking-tight text-foreground">
                                        {riskSummary.lockedCandidates}
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Use lock action for current review
                                        workflow; raw traces stay separate.
                                    </p>
                                </AdminOverviewCard>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Filters"
                            description="Find profiles by user, diet, medical text, risk, or restriction type."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField
                                        label="Search"
                                        className="xl:min-w-[320px] xl:flex-1"
                                    >
                                        <AdminSearchInput
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Search user, email, diet, or medical text"
                                        />
                                    </AdminField>
                                    <AdminField
                                        label="Risk"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={risk}
                                            onChange={(event) =>
                                                setRisk(event.target.value)
                                            }
                                        >
                                            <option value="all">All risks</option>
                                            <option value="danger">Danger</option>
                                            <option value="warning">Warning</option>
                                            <option value="info">Info</option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                    <AdminField
                                        label="Profile type"
                                        className="sm:w-56"
                                    >
                                        <AdminNativeSelect
                                            value={profileFilter}
                                            onChange={(event) =>
                                                setProfileFilter(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="all">All profiles</option>
                                            <option value="allergies">
                                                Allergies
                                            </option>
                                            <option value="medical">
                                                Medical history
                                            </option>
                                            <option value="injury">
                                                Injuries
                                            </option>
                                            <option value="incomplete">
                                                Incomplete onboarding
                                            </option>
                                            <option value="contradictions">
                                                Contradictions
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>
                                <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => void loadProfiles()}
                                        disabled={loading}
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Refresh
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                        </AdminSection>

                        <AdminSection
                            title="Safety queue"
                            description="Review the selected profile detail before taking any action."
                        >
                            {error ? (
                                <AdminNotice tone="danger">{error}</AdminNotice>
                            ) : null}

                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)] xl:items-start">
                                <AdminPanel
                                    title="Users requiring safety review"
                                    description="Scrollable queue of AI-impacting restrictions."
                                >
                                    <AdminScrollArea maxHeightClassName="max-h-[38rem]">
                                        <div className="space-y-3">
                                            {profiles.map((profile) => {
                                                const active =
                                                    selectedProfile?.id ===
                                                    profile.id;

                                                return (
                                                    <button
                                                        key={profile.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedId(
                                                                profile.id,
                                                            );
                                                            if (
                                                                typeof window !==
                                                                    'undefined' &&
                                                                window.innerWidth <
                                                                    1280
                                                            ) {
                                                                setDrawerOpen(
                                                                    true,
                                                                );
                                                            }
                                                        }}
                                                        className={cn(
                                                            'w-full rounded-[22px] border px-4 py-4 text-left transition hover:border-primary/25 hover:bg-primary/5',
                                                            active
                                                                ? 'border-primary/28 bg-primary/8'
                                                                : 'border-border/65 bg-background/72',
                                                        )}
                                                    >
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span
                                                                        className={cn(
                                                                            'rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase',
                                                                            riskToneClassName(
                                                                                profile.risk_level,
                                                                            ),
                                                                        )}
                                                                    >
                                                                        {
                                                                            profile.risk_level
                                                                        }
                                                                    </span>
                                                                    <StatusChip
                                                                        value={
                                                                            profile.review_state
                                                                        }
                                                                    />
                                                                </div>
                                                                <div className="mt-3 text-sm font-semibold text-foreground">
                                                                    {
                                                                        profile.name
                                                                    }
                                                                </div>
                                                                <div className="mt-1 text-xs text-muted-foreground">
                                                                    {
                                                                        profile.email
                                                                    }
                                                                </div>
                                                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                                    <span>
                                                                        Allergies:{' '}
                                                                        {
                                                                            profile
                                                                                .allergies
                                                                                .length
                                                                        }
                                                                    </span>
                                                                    <span>
                                                                        Injuries:{' '}
                                                                        {
                                                                            profile
                                                                                .injuries
                                                                                .length
                                                                        }
                                                                    </span>
                                                                    <span>
                                                                        Missing:{' '}
                                                                        {
                                                                            profile
                                                                                .incomplete_onboarding
                                                                                .length
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
                                                                Review
                                                                <ArrowRight className="h-4 w-4" />
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}

                                            {!loading && profiles.length === 0 ? (
                                                <div className="rounded-[22px] border border-dashed border-border/60 bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
                                                    No safety profiles match the
                                                    current filters.
                                                </div>
                                            ) : null}
                                        </div>
                                    </AdminScrollArea>
                                </AdminPanel>

                                <div className="hidden xl:block xl:sticky xl:top-6 xl:max-h-[calc(100svh-2rem)] xl:overflow-y-auto xl:pr-1 [scrollbar-width:thin]">
                                    <ProfileDetail
                                        profile={selectedProfile}
                                        actionState={
                                            selectedProfile
                                                ? actionStates[
                                                      selectedProfile.id
                                                  ]
                                                : undefined
                                        }
                                        onAction={recordAction}
                                    />
                                </div>
                            </div>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>

            <EntityDetailDrawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                title={selectedProfile?.name ?? 'Safety profile'}
                description="Mobile review drawer for AI-impacting restrictions."
            >
                <ProfileDetail
                    profile={selectedProfile}
                    actionState={
                        selectedProfile
                            ? actionStates[selectedProfile.id]
                            : undefined
                    }
                    onAction={recordAction}
                />
            </EntityDetailDrawer>
        </>
    );
}
