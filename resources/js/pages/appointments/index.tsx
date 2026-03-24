import {
    ProductBanner,
    ProductEmptyState,
    ProductHero,
    ProductPageShell,
    ProductSection,
    ProductStatCard,
    ProductStatGrid,
} from '@/components/product/page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { jsonRequestInit } from '@/lib/http';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CheckCircle2, RefreshCcw, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Appointment = {
    id: number;
    professional_role: string;
    scheduled_at: string;
    status: string;
    notes?: string | null;
    client?: { id: number; name: string };
    professional?: { id: number; name: string };
};

export default function AppointmentsPage() {
    const { auth } = usePage<SharedData>().props;
    const [items, setItems] = useState<Appointment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/appointments', {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                throw new Error('Could not load appointments.');
            }

            const json = await res.json();
            setItems(Array.isArray(json?.data) ? json.data : []);
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
    }

    useEffect(() => {
        void load();
    }, []);

    async function updateStatus(id: number, status: string) {
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

    const summary = useMemo(
        () => ({
            upcoming: items.filter((item) => item.status === 'pending').length,
            accepted: items.filter((item) => item.status === 'accepted').length,
            completed: items.filter((item) => item.status === 'completed')
                .length,
        }),
        [items],
    );

    return (
        <>
            <Head title="Appointments" />

            <ProductPageShell>
                <ProductHero
                    eyebrow="Appointments"
                    title="Appointments"
                    description="Review requests, confirm sessions, and keep client-professional scheduling on the same polished footing as the rest of the product."
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

                <ProductStatGrid className="xl:grid-cols-3">
                    <ProductStatCard
                        label="Pending"
                        value={loading ? '...' : String(summary.upcoming)}
                        tone="accent"
                        helper="Requests waiting for a decision."
                    />
                    <ProductStatCard
                        label="Accepted"
                        value={loading ? '...' : String(summary.accepted)}
                        helper="Upcoming confirmed sessions."
                    />
                    <ProductStatCard
                        label="Completed"
                        value={loading ? '...' : String(summary.completed)}
                        helper="Sessions already finished."
                    />
                </ProductStatGrid>

                <ProductSection
                    title="Appointment timeline"
                    description="Each card shows the role, participants, notes, and the actions available for your current user role."
                >
                    <div className="space-y-4">
                        {error ? (
                            <ProductBanner tone="danger">{error}</ProductBanner>
                        ) : null}

                        {loading ? (
                            <ProductEmptyState
                                title="Loading appointments"
                                description="Fetching the latest scheduling activity."
                            />
                        ) : items.length === 0 ? (
                            <ProductEmptyState
                                title="No appointments yet"
                                description="You can request one from the nearby professionals page whenever you are ready."
                                action={
                                    <Button asChild>
                                        <Link href="/nearby">
                                            Browse professionals
                                        </Link>
                                    </Button>
                                }
                            />
                        ) : (
                            items.map((appointment) => {
                                const canUpdate =
                                    auth.user.role === 'admin' ||
                                    auth.user.id ===
                                        appointment.professional?.id;

                                return (
                                    <article
                                        key={appointment.id}
                                        className="rounded-[24px] border border-border/70 bg-background/80 p-5"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-foreground">
                                                        {appointment.professional_role ===
                                                        'nutritionist'
                                                            ? 'Dietitian'
                                                            : appointment.professional_role}{' '}
                                                        appointment
                                                    </h3>
                                                    <Badge
                                                        variant="outline"
                                                        className="rounded-full px-2.5 py-1 capitalize"
                                                    >
                                                        {appointment.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {new Date(
                                                        appointment.scheduled_at,
                                                    ).toLocaleString()}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span>
                                                        Client:{' '}
                                                        {appointment.client
                                                            ?.name || '-'}
                                                    </span>
                                                    <span>
                                                        Professional:{' '}
                                                        {appointment
                                                            .professional
                                                            ?.name || '-'}
                                                    </span>
                                                </div>
                                                {appointment.notes ? (
                                                    <p className="text-sm leading-6 text-muted-foreground">
                                                        {appointment.notes}
                                                    </p>
                                                ) : null}
                                            </div>

                                            {canUpdate ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() =>
                                                            void updateStatus(
                                                                appointment.id,
                                                                'accepted',
                                                            )
                                                        }
                                                        disabled={
                                                            updatingId ===
                                                            appointment.id
                                                        }
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            void updateStatus(
                                                                appointment.id,
                                                                'completed',
                                                            )
                                                        }
                                                        disabled={
                                                            updatingId ===
                                                            appointment.id
                                                        }
                                                    >
                                                        Mark complete
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            void updateStatus(
                                                                appointment.id,
                                                                'declined',
                                                            )
                                                        }
                                                        disabled={
                                                            updatingId ===
                                                            appointment.id
                                                        }
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                        Decline
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </ProductSection>
            </ProductPageShell>
        </>
    );
}
