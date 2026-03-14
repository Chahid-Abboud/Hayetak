import NavHeader from '@/components/NavHeader';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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

    function getCsrfToken() {
        return (
            (
                document.querySelector(
                    'meta[name="csrf-token"]',
                ) as HTMLMetaElement | null
            )?.content ?? ''
        );
    }

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
        } catch (err) {
            setItems([]);
            setError(
                err instanceof Error
                    ? err.message
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
        setError(null);
        const response = await fetch(`/api/appointments/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ status }),
        });
        if (!response.ok) {
            const json = await response.json().catch(() => null);
            setError(
                typeof json?.message === 'string'
                    ? json.message
                    : 'Could not update the appointment.',
            );
            return;
        }
        await load();
    }

    return (
        <>
            <Head title="Appointments" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <h1 className="mb-4 text-2xl font-semibold">Appointments</h1>
                {error && (
                    <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
                        {error}
                    </div>
                )}
                <div className="space-y-3">
                    {loading && (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            Loading appointments...
                        </div>
                    )}
                    {items.map((a) => (
                        <div
                            key={a.id}
                            className="rounded-xl border bg-card p-4 text-sm shadow-sm"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="font-medium capitalize">
                                    {a.professional_role === 'nutritionist'
                                        ? 'Dietitian'
                                        : a.professional_role}{' '}
                                    appointment
                                </div>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                                    {a.status}
                                </span>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                                {new Date(a.scheduled_at).toLocaleString()}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Client: {a.client?.name ?? '-'} | Professional:{' '}
                                {a.professional?.name ?? '-'}
                            </div>
                            {a.notes ? (
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {a.notes}
                                </div>
                            ) : null}
                            {(auth.user.role === 'admin' ||
                                auth.user.id === a.professional?.id) && (
                                <div className="mt-2 flex gap-2">
                                    <button
                                        className="text-xs text-primary underline"
                                        onClick={() =>
                                            void updateStatus(a.id, 'accepted')
                                        }
                                    >
                                        Accept
                                    </button>
                                    <button
                                        className="text-xs text-muted-foreground underline"
                                        onClick={() =>
                                            void updateStatus(a.id, 'declined')
                                        }
                                    >
                                        Decline
                                    </button>
                                    <button
                                        className="text-xs text-primary underline"
                                        onClick={() =>
                                            void updateStatus(a.id, 'completed')
                                        }
                                    >
                                        Complete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {!loading && items.length === 0 && (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                            No appointments yet. You can request one from the{' '}
                            <a href="/nearby" className="underline">
                                Nearby
                            </a>{' '}
                            page.
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
