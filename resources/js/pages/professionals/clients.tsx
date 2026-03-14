import NavHeader from '@/components/NavHeader';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type ProgressPoint = {
    date: string;
    weight_kg: number | null;
    height_cm: number | null;
};

type WorkoutItem = {
    id: number;
    performed_at: string | null;
    duration_min: number | null;
    notes: string | null;
    sets_count: number;
};

type WeeklyMealItem = {
    id: number;
    food_name: string;
    servings: number | null;
};

type WeeklyMealGroup = {
    meal_type: string;
    items: WeeklyMealItem[];
};

type WeeklyMealDay = {
    date: string;
    label: string;
    meals: WeeklyMealGroup[];
};

type MealChoice = {
    entryId: number;
    mealType: string;
    foodName: string;
    servings: number | null;
};

type SearchFood = {
    id: number;
    name: string;
    serving_size: number;
    serving_unit: string;
};

type ClientCard = {
    assignment_id: number;
    notes?: string | null;
    client: {
        id: number;
        name: string;
        email: string;
        username?: string | null;
        age?: number | null;
        height_cm?: number | null;
        weight_kg?: number | null;
    };
    progress: {
        latest_weight_kg: number | null;
        latest_height_cm: number | null;
        points: ProgressPoint[];
    };
    training?: {
        recent_workouts: WorkoutItem[];
        summary: {
            logged_sessions: number;
            latest_session_at: string | null;
            total_sets: number;
        };
    };
    nutrition?: {
        weekly_days: WeeklyMealDay[];
    };
};

type PageProps = SharedData & {
    roleMode: 'trainer' | 'nutritionist';
    pageTitle: string;
    clients: ClientCard[];
};

type AppointmentDialogState = {
    client: ClientCard['client'];
    title: string;
    date: string;
    location: string;
};

type MealNoteDialogState = {
    client: ClientCard['client'];
    weeklyDays: WeeklyMealDay[];
    selectedDate: string;
    selectedEntryId: number | null;
    message: string;
    substituteQuery: string;
    substitute: SearchFood | null;
    substituteResults: SearchFood[];
    substituteLoading: boolean;
    substituteError: string | null;
};

function getCsrfToken() {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

function formatRoleLabel(role: 'trainer' | 'nutritionist') {
    return role === 'nutritionist' ? 'Dietitian' : 'Trainer';
}

function formatDateTime(value?: string | null) {
    if (!value) return 'Not logged yet';

    return new Date(value).toLocaleString();
}

function formatMealType(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTimeInput(value: Date) {
    const offset = value.getTimezoneOffset();
    const local = new Date(value.getTime() - offset * 60_000);

    return local.toISOString().slice(0, 16);
}

function formatAppointmentDate(value: string) {
    if (!value) return 'Not set';

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

function getMealChoicesForDay(day?: WeeklyMealDay | null): MealChoice[] {
    if (!day) return [];

    return day.meals.flatMap((meal) =>
        meal.items.map((item) => ({
            entryId: item.id,
            mealType: meal.meal_type,
            foodName: item.food_name,
            servings: item.servings,
        })),
    );
}

function getFirstMealSelection(days: WeeklyMealDay[]) {
    for (const day of days) {
        const choices = getMealChoicesForDay(day);

        if (choices.length > 0) {
            return {
                selectedDate: day.date,
                selectedEntryId: choices[0].entryId,
            };
        }
    }

    return {
        selectedDate: days[0]?.date ?? '',
        selectedEntryId: null,
    };
}

function findSelectedMealChoice(
    days: WeeklyMealDay[],
    selectedDate: string,
    selectedEntryId: number | null,
) {
    const day = days.find((item) => item.date === selectedDate) ?? null;
    const choices = getMealChoicesForDay(day);
    const choice =
        choices.find((item) => item.entryId === selectedEntryId) ?? null;

    return { day, choices, choice };
}

function hasAnyLoggedMeals(days: WeeklyMealDay[]) {
    return days.some((day) => getMealChoicesForDay(day).length > 0);
}

async function ensureConversation(participantId: number) {
    const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ participant_id: participantId }),
    });

    if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
            typeof json?.message === 'string'
                ? json.message
                : 'Could not open the conversation.',
        );
    }

    const json = await response.json();
    const conversationId = Number(json?.conversation?.id);

    if (!conversationId) {
        throw new Error('Conversation could not be found.');
    }

    return conversationId;
}

async function sendConversationMessage(conversationId: number, body: string) {
    const response = await fetch(
        `/api/messages/conversations/${conversationId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({ body }),
        },
    );

    if (!response.ok) {
        const json = await response.json().catch(() => null);
        throw new Error(
            typeof json?.message === 'string'
                ? json.message
                : 'Could not send the message.',
        );
    }
}

export default function ProfessionalClientsPage() {
    const { roleMode, pageTitle, clients } = usePage<PageProps>().props;
    const [busyClientId, setBusyClientId] = useState<number | null>(null);
    const [banner, setBanner] = useState<{
        kind: 'error' | 'success';
        text: string;
    } | null>(null);
    const [appointmentDialog, setAppointmentDialog] =
        useState<AppointmentDialogState | null>(null);
    const [mealNoteDialog, setMealNoteDialog] =
        useState<MealNoteDialogState | null>(null);
    const mealNoteIsOpen = mealNoteDialog !== null;
    const mealNoteSubstituteQuery = mealNoteDialog?.substituteQuery ?? '';
    const mealNoteSelectedMealType = mealNoteDialog
        ? findSelectedMealChoice(
              mealNoteDialog.weeklyDays,
              mealNoteDialog.selectedDate,
              mealNoteDialog.selectedEntryId,
          ).choice?.mealType ?? null
        : null;

    async function openConversation(clientId: number) {
        setBusyClientId(clientId);
        setBanner(null);

        try {
            const conversationId = await ensureConversation(clientId);
            window.location.href = `/messages?conversation=${conversationId}`;
        } catch (error) {
            setBanner({
                kind: 'error',
                text:
                    error instanceof Error
                        ? error.message
                        : 'Could not open the conversation.',
            });
        } finally {
            setBusyClientId(null);
        }
    }

    useEffect(() => {
        if (!mealNoteIsOpen) {
            return;
        }

        if (!mealNoteSelectedMealType) {
            setMealNoteDialog((current) =>
                current
                    ? {
                          ...current,
                          substituteResults: [],
                          substituteLoading: false,
                          substituteError: null,
                      }
                    : null,
            );

            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            page: '1',
            meal_type: mealNoteSelectedMealType,
            category: mealNoteSelectedMealType,
        });

        if (mealNoteSubstituteQuery.trim()) {
            params.set('q', mealNoteSubstituteQuery.trim());
        }

        setMealNoteDialog((current) =>
            current
                ? {
                      ...current,
                      substituteLoading: true,
                      substituteError: null,
                  }
                : null,
        );

        fetch(`/api/foods/search?${params.toString()}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Could not load substitute options.');
                }

                const json = await response.json();
                const results = Array.isArray(json?.data)
                    ? json.data.map((item: SearchFood) => ({
                          id: Number(item.id),
                          name: item.name,
                          serving_size: Number(item.serving_size || 0),
                          serving_unit: item.serving_unit || '',
                      }))
                    : [];

                setMealNoteDialog((current) =>
                    current
                        ? {
                              ...current,
                              substituteResults: results,
                              substituteLoading: false,
                              substituteError: null,
                          }
                        : null,
                );
            })
            .catch((error) => {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }

                setMealNoteDialog((current) =>
                    current
                        ? {
                              ...current,
                              substituteResults: [],
                              substituteLoading: false,
                              substituteError:
                                  error instanceof Error
                                      ? error.message
                                      : 'Could not load substitute options.',
                          }
                        : null,
                );
            });

        return () => controller.abort();
    }, [mealNoteIsOpen, mealNoteSelectedMealType, mealNoteSubstituteQuery]);

    function openAppointmentDialog(client: ClientCard['client']) {
        setAppointmentDialog({
            client,
            title: '',
            date: formatDateTimeInput(new Date(Date.now() + 86_400_000)),
            location: '',
        });
    }

    async function submitAppointmentMessage() {
        if (!appointmentDialog) {
            return;
        }

        const title = appointmentDialog.title.trim();
        const date = appointmentDialog.date.trim();
        const location = appointmentDialog.location.trim();

        if (!title || !date || !location) {
            setBanner({
                kind: 'error',
                text: 'Please complete the appointment title, date, and location.',
            });
            return;
        }

        setBusyClientId(appointmentDialog.client.id);
        setBanner(null);

        try {
            const conversationId = await ensureConversation(
                appointmentDialog.client.id,
            );
            const body = [
                `${formatRoleLabel(roleMode)} appointment message`,
                '',
                `Title: ${title}`,
                `Date: ${formatAppointmentDate(date)}`,
                `Location: ${location}`,
            ]
                .filter(Boolean)
                .join('\n');

            await sendConversationMessage(conversationId, body);
            setBanner({
                kind: 'success',
                text: `Appointment message sent to ${appointmentDialog.client.name}.`,
            });
            setAppointmentDialog(null);
        } catch (error) {
            setBanner({
                kind: 'error',
                text:
                    error instanceof Error
                        ? error.message
                        : 'Could not send the appointment message.',
            });
        } finally {
            setBusyClientId(null);
        }
    }

    function openMealNoteDialog(clientEntry: ClientCard) {
        const selection = getFirstMealSelection(
            clientEntry.nutrition?.weekly_days ?? [],
        );

        setMealNoteDialog({
            client: clientEntry.client,
            weeklyDays: clientEntry.nutrition?.weekly_days ?? [],
            selectedDate: selection.selectedDate,
            selectedEntryId: selection.selectedEntryId,
            message: '',
            substituteQuery: '',
            substitute: null,
            substituteResults: [],
            substituteLoading: false,
            substituteError: null,
        });
    }

    async function submitMealNote() {
        if (!mealNoteDialog) {
            return;
        }

        const { day, choice } = findSelectedMealChoice(
            mealNoteDialog.weeklyDays,
            mealNoteDialog.selectedDate,
            mealNoteDialog.selectedEntryId,
        );
        const message = mealNoteDialog.message.trim();

        if (!choice || !day) {
            setBanner({
                kind: 'error',
                text: 'Please choose a logged meal before sending the note.',
            });
            return;
        }

        if (!message) {
            setBanner({
                kind: 'error',
                text: 'Please write the meal note before sending it.',
            });
            return;
        }

        setBusyClientId(mealNoteDialog.client.id);
        setBanner(null);

        try {
            const conversationId = await ensureConversation(mealNoteDialog.client.id);
            const body = [
                'Meal note from your dietitian',
                '',
                `Day: ${day.label} (${day.date})`,
                `Meal: ${formatMealType(choice.mealType)}`,
                `Logged item: ${choice.foodName}${
                    choice.servings !== null
                        ? ` (${choice.servings} serving(s))`
                        : ''
                }`,
                `Note: ${message}`,
                mealNoteDialog.substitute
                    ? `Suggested substitute: ${mealNoteDialog.substitute.name}`
                    : null,
            ]
                .filter(Boolean)
                .join('\n');

            await sendConversationMessage(conversationId, body);
            setBanner({
                kind: 'success',
                text: `Meal note sent to ${mealNoteDialog.client.name}.`,
            });
            setMealNoteDialog(null);
        } catch (error) {
            setBanner({
                kind: 'error',
                text:
                    error instanceof Error
                        ? error.message
                        : 'Could not send the meal note.',
            });
        } finally {
            setBusyClientId(null);
        }
    }

    const mealNoteSelection = mealNoteDialog
        ? findSelectedMealChoice(
              mealNoteDialog.weeklyDays,
              mealNoteDialog.selectedDate,
              mealNoteDialog.selectedEntryId,
          )
        : null;

    return (
        <>
            <Head title={pageTitle} />
            <NavHeader />

            <main className="mx-auto max-w-6xl px-4 py-6">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">{pageTitle}</h1>
                        <p className="text-sm text-muted-foreground">
                            Private client view for your assigned{' '}
                            {roleMode === 'nutritionist'
                                ? 'nutrition'
                                : 'training'}{' '}
                            clients.
                        </p>
                    </div>
                    <div className="rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground">
                        {clients.length} client{clients.length === 1 ? '' : 's'}
                    </div>
                </header>

                {banner ? (
                    <div
                        className={
                            'mb-4 rounded-2xl border px-4 py-3 text-sm ' +
                            (banner.kind === 'success'
                                ? 'border-[color:var(--primary)]/30 bg-[color:var(--primary)]/10 text-foreground'
                                : 'border-destructive/30 bg-destructive/10 text-foreground')
                        }
                    >
                        {banner.text}
                    </div>
                ) : null}

                {clients.length === 0 ? (
                    <div className="rounded-3xl border border-dashed bg-card p-8 text-sm text-muted-foreground">
                        No assigned clients found yet.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {clients.map((entry) => (
                            <section
                                key={entry.assignment_id}
                                className="rounded-3xl border bg-card p-5 shadow-sm"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-xl font-semibold">
                                                {entry.client.name}
                                            </h2>
                                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                {formatRoleLabel(roleMode)} client
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                            <span>{entry.client.email}</span>
                                            {entry.client.age ? (
                                                <span>Age {entry.client.age}</span>
                                            ) : null}
                                            {entry.client.username ? (
                                                <span>@{entry.client.username}</span>
                                            ) : null}
                                        </div>
                                        {entry.notes ? (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {entry.notes}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                                            onClick={() =>
                                                void openConversation(entry.client.id)
                                            }
                                            disabled={busyClientId === entry.client.id}
                                        >
                                            Message
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)] transition hover:opacity-95"
                                            onClick={() => openAppointmentDialog(entry.client)}
                                            disabled={busyClientId === entry.client.id}
                                        >
                                            Appointment
                                        </button>
                                        {roleMode === 'nutritionist' ? (
                                            <button
                                                type="button"
                                                className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                                                onClick={() => openMealNoteDialog(entry)}
                                                disabled={busyClientId === entry.client.id}
                                            >
                                                Meal Note
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                                    <div className="rounded-2xl border bg-background p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold">
                                                Height and weight progress
                                            </h3>
                                            <div className="text-xs text-muted-foreground">
                                                Latest:{' '}
                                                {entry.progress.latest_weight_kg !== null
                                                    ? `${entry.progress.latest_weight_kg} kg`
                                                    : 'n/a'}
                                                {' / '}
                                                {entry.progress.latest_height_cm !== null
                                                    ? `${entry.progress.latest_height_cm} cm`
                                                    : 'n/a'}
                                            </div>
                                        </div>

                                        {entry.progress.points.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No measurement history logged yet.
                                            </p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead className="text-left text-muted-foreground">
                                                        <tr>
                                                            <th className="py-2 pr-4">Date</th>
                                                            <th className="py-2 pr-4">Weight</th>
                                                            <th className="py-2">Height</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {entry.progress.points
                                                            .slice(-6)
                                                            .map((point) => (
                                                                <tr
                                                                    key={point.date}
                                                                    className="border-t"
                                                                >
                                                                    <td className="py-2 pr-4">
                                                                        {point.date}
                                                                    </td>
                                                                    <td className="py-2 pr-4">
                                                                        {point.weight_kg !== null
                                                                            ? `${point.weight_kg} kg`
                                                                            : '-'}
                                                                    </td>
                                                                    <td className="py-2">
                                                                        {point.height_cm !== null
                                                                            ? `${point.height_cm} cm`
                                                                            : '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {roleMode === 'trainer' ? (
                                        <div className="rounded-2xl border bg-background p-4">
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold">
                                                    Workout progress
                                                </h3>
                                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                    <span className="rounded-full bg-muted px-2.5 py-1">
                                                        Sessions:{' '}
                                                        {entry.training?.summary.logged_sessions}
                                                    </span>
                                                    <span className="rounded-full bg-muted px-2.5 py-1">
                                                        Sets: {entry.training?.summary.total_sets}
                                                    </span>
                                                </div>
                                            </div>

                                            {entry.training?.recent_workouts.length ? (
                                                <div className="space-y-3">
                                                    {entry.training.recent_workouts.map(
                                                        (workout) => (
                                                            <div
                                                                key={workout.id}
                                                                className="rounded-2xl border p-3"
                                                            >
                                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                                    <div className="font-medium">
                                                                        {formatDateTime(
                                                                            workout.performed_at,
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {workout.duration_min
                                                                            ? `${workout.duration_min} min`
                                                                            : 'No duration'}
                                                                        {' - '}
                                                                        {workout.sets_count} sets
                                                                    </div>
                                                                </div>
                                                                {workout.notes ? (
                                                                    <p className="mt-2 text-sm text-muted-foreground">
                                                                        {workout.notes}
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No workout logs yet for this client.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border bg-background p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <h3 className="text-sm font-semibold">
                                                    Weekly meals
                                                </h3>
                                                <div className="text-xs text-muted-foreground">
                                                    Last 7 days
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {entry.nutrition?.weekly_days.map((day) => (
                                                    <div
                                                        key={day.date}
                                                        className="rounded-2xl border p-3"
                                                    >
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <div className="font-medium">
                                                                {day.label}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {day.date}
                                                            </div>
                                                        </div>

                                                        {day.meals.length ? (
                                                            <div className="space-y-2">
                                                                {day.meals.map((meal) => (
                                                                    <div
                                                                        key={meal.meal_type}
                                                                        className="rounded-xl bg-muted/40 p-3"
                                                                    >
                                                                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                            {formatMealType(
                                                                                meal.meal_type,
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-2 space-y-1 text-sm">
                                                                            {meal.items.map((item) => (
                                                                                <div
                                                                                    key={item.id}
                                                                                    className="flex items-center justify-between gap-3"
                                                                                >
                                                                                    <span className="min-w-0 truncate">
                                                                                        {item.food_name}
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {item.servings !==
                                                                                        null
                                                                                            ? `${item.servings} serving(s)`
                                                                                            : ''}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">
                                                                No meals logged.
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>

            {appointmentDialog ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setAppointmentDialog(null)}
                    />

                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#1C2C64]/20 bg-white p-4 text-[#1C2C64] shadow-xl dark:border-white/15 dark:bg-[#0B1020] dark:text-white">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                                Send appointment
                            </div>

                            <button
                                type="button"
                                onClick={() => setAppointmentDialog(null)}
                                className="rounded-lg border border-[#1C2C64]/20 px-2 py-1 text-xs hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="font-semibold">
                                {appointmentDialog.client.name}
                            </div>
                            <div className="text-xs opacity-75">
                                {formatRoleLabel(roleMode)} appointment message
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label
                                    className="block text-sm"
                                    htmlFor="appointment-title"
                                >
                                    Title
                                </label>
                                <input
                                    id="appointment-title"
                                    type="text"
                                    value={appointmentDialog.title}
                                    onChange={(event) =>
                                        setAppointmentDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      title: event.target.value,
                                                  }
                                                : null,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                    placeholder="Weekly check-in"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-sm"
                                    htmlFor="appointment-date"
                                >
                                    Date
                                </label>
                                <input
                                    id="appointment-date"
                                    type="datetime-local"
                                    value={appointmentDialog.date}
                                    onChange={(event) =>
                                        setAppointmentDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      date: event.target.value,
                                                  }
                                                : null,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-sm"
                                    htmlFor="appointment-location"
                                >
                                    Location
                                </label>
                                <input
                                    id="appointment-location"
                                    type="text"
                                    value={appointmentDialog.location}
                                    onChange={(event) =>
                                        setAppointmentDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      location: event.target.value,
                                                  }
                                                : null,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                    placeholder="Online link or in-person location"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAppointmentDialog(null)}
                                className="rounded-lg border border-[#1C2C64]/20 px-3 py-2 text-sm hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => void submitAppointmentMessage()}
                                disabled={
                                    busyClientId === appointmentDialog.client.id
                                }
                                className="rounded-lg bg-[#1C2C64] px-4 py-2 text-sm font-medium text-white hover:opacity-95 focus:ring-2 focus:ring-[#1C2C64]/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#0B1020] dark:focus:ring-white/30"
                            >
                                Send appointment
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {mealNoteDialog ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setMealNoteDialog(null)}
                    />

                    <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-[#1C2C64]/20 bg-white p-4 text-[#1C2C64] shadow-xl dark:border-white/15 dark:bg-[#0B1020] dark:text-white">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">Send meal note</div>

                            <button
                                type="button"
                                onClick={() => setMealNoteDialog(null)}
                                className="rounded-lg border border-[#1C2C64]/20 px-2 py-1 text-xs hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="font-semibold">
                                {mealNoteDialog.client.name}
                            </div>
                            <div className="text-xs opacity-75">
                                Pick a logged meal, write the note, and optionally
                                suggest a substitute.
                            </div>
                        </div>

                        {!hasAnyLoggedMeals(mealNoteDialog.weeklyDays) ? (
                            <div className="rounded-lg border border-[#1C2C64]/15 p-4 text-sm opacity-80 dark:border-white/10">
                                This client has no logged meals in the last 7 days.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label
                                        className="block text-sm"
                                        htmlFor="meal-note-day"
                                    >
                                        Day
                                    </label>
                                    <select
                                        id="meal-note-day"
                                        value={mealNoteDialog.selectedDate}
                                        onChange={(event) => {
                                            const nextDate = event.target.value;
                                            const nextDay =
                                                mealNoteDialog.weeklyDays.find(
                                                    (day) => day.date === nextDate,
                                                ) ?? null;
                                            const nextChoices =
                                                getMealChoicesForDay(nextDay);

                                            setMealNoteDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          selectedDate: nextDate,
                                                          selectedEntryId:
                                                              nextChoices[0]?.entryId ??
                                                              null,
                                                          substituteQuery: '',
                                                          substitute: null,
                                                      }
                                                    : null,
                                            );
                                        }}
                                        className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                    >
                                        {mealNoteDialog.weeklyDays.map((day) => (
                                            <option key={day.date} value={day.date}>
                                                {day.label} ({day.date})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="mb-2 text-sm">Logged meal</div>

                                    {mealNoteSelection?.choices.length ? (
                                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-[#1C2C64]/15 p-2 dark:border-white/10">
                                            {mealNoteSelection.choices.map((choice) => (
                                                <button
                                                    key={choice.entryId}
                                                    type="button"
                                                    onClick={() =>
                                                        setMealNoteDialog((current) =>
                                                            current
                                                                ? {
                                                                      ...current,
                                                                      selectedEntryId:
                                                                          choice.entryId,
                                                                      substituteQuery:
                                                                          '',
                                                                      substitute:
                                                                          null,
                                                                  }
                                                                : null,
                                                        )
                                                    }
                                                    className={`w-full rounded-lg border px-3 py-3 text-left transition focus:ring-2 focus:outline-none ${
                                                        mealNoteDialog.selectedEntryId ===
                                                        choice.entryId
                                                            ? 'border-[#1C2C64]/60 bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/40 dark:bg-white/10 dark:focus:ring-white/25'
                                                            : 'border-[#1C2C64]/15 hover:bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/10 dark:hover:bg-white/10 dark:focus:ring-white/25'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="font-medium">
                                                            {choice.foodName}
                                                        </div>
                                                        <div className="text-xs opacity-75">
                                                            {formatMealType(choice.mealType)}
                                                        </div>
                                                    </div>
                                                    {choice.servings !== null ? (
                                                        <div className="mt-1 text-xs opacity-75">
                                                            {choice.servings} serving(s)
                                                        </div>
                                                    ) : null}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-[#1C2C64]/20 p-3 text-sm opacity-80 dark:border-white/15">
                                            No meals were logged for this day.
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label
                                        className="block text-sm"
                                        htmlFor="meal-note-message"
                                    >
                                        Message
                                    </label>
                                    <textarea
                                        id="meal-note-message"
                                        value={mealNoteDialog.message}
                                        onChange={(event) =>
                                            setMealNoteDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          message: event.target.value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        rows={4}
                                        className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                        placeholder="Explain the concern and what you want the client to change."
                                    />
                                </div>

                                <div className="rounded-lg border border-[#1C2C64]/15 p-3 dark:border-white/10">
                                    <div className="mb-2 text-sm font-medium">
                                        Optional substitute
                                    </div>

                                    <label
                                        className="block text-sm"
                                        htmlFor="meal-note-substitute-search"
                                    >
                                        Search foods
                                    </label>
                                    <input
                                        id="meal-note-substitute-search"
                                        type="text"
                                        value={mealNoteDialog.substituteQuery}
                                        onChange={(event) =>
                                            setMealNoteDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          substituteQuery:
                                                              event.target.value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-[#1C2C64]/20 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[#1C2C64]/30 dark:border-white/15 dark:bg-[#0B1020] dark:text-white dark:focus:ring-white/25"
                                        placeholder="Search substitute options"
                                    />

                                    {mealNoteDialog.substitute ? (
                                        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#1C2C64]/15 bg-[#1C2C64]/5 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10">
                                            <div>
                                                Selected: {mealNoteDialog.substitute.name}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMealNoteDialog((current) =>
                                                        current
                                                            ? {
                                                                  ...current,
                                                                  substitute: null,
                                                              }
                                                            : null,
                                                    )
                                                }
                                                className="rounded-lg border border-[#1C2C64]/20 px-2 py-1 text-xs hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    ) : null}

                                    {mealNoteDialog.substituteLoading ? (
                                        <div className="mt-3 text-sm opacity-80">
                                            Loading substitute options...
                                        </div>
                                    ) : mealNoteDialog.substituteError ? (
                                        <div className="mt-3 text-sm text-red-600 dark:text-red-300">
                                            {mealNoteDialog.substituteError}
                                        </div>
                                    ) : mealNoteSelection?.choice ? (
                                        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                                            {mealNoteDialog.substituteResults
                                                .filter(
                                                    (item) =>
                                                        item.name !==
                                                        mealNoteSelection.choice?.foodName,
                                                )
                                                .slice(0, 8)
                                                .map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setMealNoteDialog((current) =>
                                                                current
                                                                    ? {
                                                                          ...current,
                                                                          substitute:
                                                                              item,
                                                                      }
                                                                    : null,
                                                            )
                                                        }
                                                        className={`w-full rounded-lg border px-3 py-2 text-left transition focus:ring-2 focus:outline-none ${
                                                            mealNoteDialog.substitute?.id ===
                                                            item.id
                                                                ? 'border-[#1C2C64]/60 bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/40 dark:bg-white/10 dark:focus:ring-white/25'
                                                                : 'border-[#1C2C64]/15 hover:bg-[#1C2C64]/5 focus:ring-[#1C2C64]/30 dark:border-white/10 dark:hover:bg-white/10 dark:focus:ring-white/25'
                                                        }`}
                                                    >
                                                        <div className="font-medium">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-xs opacity-75">
                                                            Base: {item.serving_size}
                                                            {item.serving_unit}
                                                        </div>
                                                    </button>
                                                ))}

                                            {mealNoteDialog.substituteResults.filter(
                                                (item) =>
                                                    item.name !==
                                                    mealNoteSelection.choice?.foodName,
                                            ).length === 0 ? (
                                                <div className="text-sm opacity-80">
                                                    No substitute options found for this meal type.
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setMealNoteDialog(null)}
                                className="rounded-lg border border-[#1C2C64]/20 px-3 py-2 text-sm hover:bg-[#1C2C64]/5 focus:ring-2 focus:ring-[#1C2C64]/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => void submitMealNote()}
                                disabled={
                                    busyClientId === mealNoteDialog.client.id ||
                                    !hasAnyLoggedMeals(mealNoteDialog.weeklyDays)
                                }
                                className="rounded-lg bg-[#1C2C64] px-4 py-2 text-sm font-medium text-white hover:opacity-95 focus:ring-2 focus:ring-[#1C2C64]/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-[#0B1020] dark:focus:ring-white/30"
                            >
                                Send meal note
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
