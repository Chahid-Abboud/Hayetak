import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStatCard,
    ProductStatGrid,
} from '@/components/product/page';
import { Button } from '@/components/ui/button';
import { jsonRequestInit } from '@/lib/http';
import {
    type AppointmentStatus,
    type SharedData,
} from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    CalendarClock,
    CheckCircle2,
    RefreshCcw,
    XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Appointment = {
    id: number;
    professional_role: string;
    scheduled_at: string;
    status: AppointmentStatus;
    notes?: string | null;
    client?: { id: number; name: string };
    professional?: { id: number; name: string };
};

type AppointmentApiResponse = {
    data?: Appointment[];
    summary?: {
        by_status?: Record<AppointmentStatus, number>;
        upcoming?: number;
        past?: number;
    };
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
    requested: 'Requested',
    accepted: 'Accepted',
    completed: 'Completed',
    declined: 'Declined',
    cancelled: 'Cancelled',
};

const STATUS_FILTERS: Array<'all' | AppointmentStatus> = [
    'all',
    'requested',
    'accepted',
    'completed',
    'declined',
    'cancelled',
];

export default function AppointmentsPage() {
    const { auth } = usePage<SharedData>().props;
    const [items, setItems] = useState<Appointment[]>([]);
    const [summary, setSummary] = useState<Record<AppointmentStatus, number>>({
        requested: 0,
        accepted: 0,
        completed: 0,
        declined: 0,
        cancelled: 0,
    });
    const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>(
        'all',
    );
    const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>(
        'timeline',
    );
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.set('status', statusFilter);
            }

            const url = params.size
                ? `/api/appointments?${params.toString()}`
                : '/api/appointments';
            const res = await fetch(url, { headers: { Accept: 'application/json' } });

            if (!res.ok) {
                throw new Error('Could not load appointments.');
            }

            const json = (await res.json()) as AppointmentApiResponse;
            setItems(Array.isArray(json?.data) ? json.data : []);
            setSummary({
                requested: Number(json?.summary?.by_status?.requested ?? 0),
                accepted: Number(json?.summary?.by_status?.accepted ?? 0),
                completed: Number(json?.summary?.by_status?.completed ?? 0),
                declined: Number(json?.summary?.by_status?.declined ?? 0),
                cancelled: Number(json?.summary?.by_status?.cancelled ?? 0),
            });
        } catch (loadError) {
            setItems([]);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load appointments.',
            );
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    async function updateStatus(id: number, status: AppointmentStatus) {
        setUpdatingId(id);
        setError(null);

        try {
            const response = await fetch(
                `/api/appointments/${id}/status`,
                jsonRequestInit('PATCH', { status }),
            );

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Could not update the appointment.',
                );
            }

            await load();
        } catch (updateError) {
            setError(
                updateError instanceof Error
                    ? updateError.message
                    : 'Could not update the appointment.',
            );
        } finally {
            setUpdatingId(null);
        }
    }

    const now = Date.now();
    const upcomingItems = useMemo(
        () =>
            items.filter(
                (item) =>
                    new Date(item.scheduled_at).getTime() >= now &&
                    ['requested', 'accepted'].includes(item.status),
            ),
        [items, now],
    );
    const pastItems = useMemo(
        () =>
            items.filter(
                (item) =>
                    new Date(item.scheduled_at).getTime() < now ||
                    ['completed', 'declined', 'cancelled'].includes(item.status),
            ),
        [items, now],
    );

    const groupedByDate = useMemo(() => {
        return items.reduce<Record<string, Appointment[]>>((acc, item) => {
            const key = new Date(item.scheduled_at).toDateString();
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});
    }, [items]);

    const roleMode = auth.user.role === 'trainer' || auth.user.role === 'nutritionist';

    return (
        <>
            <Head title="Appointments" />
            <ProductPageShell>
                <ProductHero
                    eyebrow="Appointments"
                    title={roleMode ? 'Care Schedule' : 'Appointments'}
                    description={
                        roleMode
                            ? 'Manage your client sessions, prep context, and follow-up actions with a clear role-aware schedule.'
                            : 'Book, review, and follow your sessions in one calm scheduling workspace.'
                    }
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => void load()}
                            disabled={loading}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    }
                />

                <ProductStatGrid className="xl:grid-cols-4">
                    <ProductStatCard label="Requested" value={String(summary.requested)} tone="accent" />
                    <ProductStatCard label="Accepted" value={String(summary.accepted)} />
                    <ProductStatCard label="Completed" value={String(summary.completed)} />
                    <ProductStatCard label="Declined / Cancelled" value={String(summary.declined + summary.cancelled)} />
                </ProductStatGrid>

                <ProductSection
                    title="Schedule View"
                    description="Filter by status and switch between timeline and date-grouped schedule views."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className={`rounded-full border px-3 py-1.5 text-xs ${viewMode === 'timeline' ? 'border-primary/35 bg-primary/10' : 'border-border/70 bg-background'}`}
                                onClick={() => setViewMode('timeline')}
                            >
                                Timeline
                            </button>
                            <button
                                type="button"
                                className={`rounded-full border px-3 py-1.5 text-xs ${viewMode === 'calendar' ? 'border-primary/35 bg-primary/10' : 'border-border/70 bg-background'}`}
                                onClick={() => setViewMode('calendar')}
                            >
                                By Date
                            </button>
                        </div>
                    }
                >
                    <div className="mb-4 flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setStatusFilter(item)}
                                className={`rounded-full border px-3 py-1.5 text-xs ${statusFilter === item ? 'border-primary/35 bg-primary/10 text-foreground' : 'border-border/70 bg-background text-muted-foreground'}`}
                            >
                                {item === 'all' ? 'All' : STATUS_LABELS[item]}
                            </button>
                        ))}
                    </div>

                    {error ? <ProductBanner tone="danger">{error}</ProductBanner> : null}

                    {loading ? (
                        <ProductEmptyState
                            title="Loading schedule"
                            description="Fetching appointment data."
                        />
                    ) : items.length === 0 ? (
                        <ProductEmptyState
                            title="No appointments found"
                            description="Try another filter, or create a new request from nearby professionals."
                            action={
                                <Button asChild>
                                    <Link href="/nearby">Browse professionals</Link>
                                </Button>
                            }
                        />
                    ) : viewMode === 'timeline' ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming</h3>
                                <div className="space-y-3">
                                    {upcomingItems.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
                                    ) : (
                                        upcomingItems.map((appointment) => (
                                            <AppointmentCard
                                                key={appointment.id}
                                                appointment={appointment}
                                                actorRole={auth.user.role ?? 'client'}
                                                updating={updatingId === appointment.id}
                                                onAccept={() => void updateStatus(appointment.id, 'accepted')}
                                                onComplete={() => void updateStatus(appointment.id, 'completed')}
                                                onDecline={() => void updateStatus(appointment.id, 'declined')}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-semibold text-foreground">History</h3>
                                <div className="space-y-3">
                                    {pastItems.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No past sessions yet.</p>
                                    ) : (
                                        pastItems.map((appointment) => (
                                            <AppointmentCard
                                                key={appointment.id}
                                                appointment={appointment}
                                                actorRole={auth.user.role ?? 'client'}
                                                updating={updatingId === appointment.id}
                                                onAccept={() => void updateStatus(appointment.id, 'accepted')}
                                                onComplete={() => void updateStatus(appointment.id, 'completed')}
                                                onDecline={() => void updateStatus(appointment.id, 'declined')}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedByDate).map(([dateLabel, group]) => (
                                <div key={dateLabel} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                                    <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold">
                                        <CalendarClock className="h-4 w-4" />
                                        {dateLabel}
                                    </h3>
                                    <div className="space-y-3">
                                        {group.map((appointment) => (
                                            <AppointmentCard
                                                key={appointment.id}
                                                appointment={appointment}
                                                actorRole={auth.user.role ?? 'client'}
                                                updating={updatingId === appointment.id}
                                                onAccept={() => void updateStatus(appointment.id, 'accepted')}
                                                onComplete={() => void updateStatus(appointment.id, 'completed')}
                                                onDecline={() => void updateStatus(appointment.id, 'declined')}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ProductSection>
            </ProductPageShell>
        </>
    );
}

function AppointmentCard({
    appointment,
    actorRole,
    updating,
    onAccept,
    onComplete,
    onDecline,
}: {
    appointment: Appointment;
    actorRole: string;
    updating: boolean;
    onAccept: () => void;
    onComplete: () => void;
    onDecline: () => void;
}) {
    const canUpdate = actorRole === 'admin' || actorRole === appointment.professional_role;

    return (
        <article className="rounded-[24px] border border-border/70 bg-card/95 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold capitalize">
                        {appointment.professional_role} appointment • {STATUS_LABELS[appointment.status]}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        {new Date(appointment.scheduled_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Client: {appointment.client?.name || '-'} • Professional:{' '}
                        {appointment.professional?.name || '-'}
                    </p>
                    {appointment.notes ? (
                        <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                    ) : null}
                </div>
                {canUpdate ? (
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={onAccept} disabled={updating}>
                            <CheckCircle2 className="h-4 w-4" />
                            Accept
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={onComplete} disabled={updating}>
                            Mark complete
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={onDecline} disabled={updating}>
                            <XCircle className="h-4 w-4" />
                            Decline
                        </Button>
                    </div>
                ) : null}
            </div>
        </article>
    );
}
