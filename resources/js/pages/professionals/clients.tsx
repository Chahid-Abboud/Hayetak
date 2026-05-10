import {
    ProductBanner,
    ProductFilterRow,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
import { Input } from '@/components/ui/input';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

<<<<<<< HEAD
type DietPlanFood = {
    id: number;
    name?: string;
    servings?: number;
};

type DietPlanMeal = {
    meal_type: string;
    foods: DietPlanFood[];
};

type DietPlanDay = {
    date: string;
    meals: DietPlanMeal[];
};

type WorkoutPlanExercise = {
    name: string;
    sets: string;
    reps: string;
    notes: string;
};

type WorkoutPlanDay = {
    label: string;
    focus: string;
    exercises: WorkoutPlanExercise[];
};

=======
>>>>>>> origin/main
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
<<<<<<< HEAD
        allergens?: string[];
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
    diet_plan?: {
        id: number;
        title: string;
        start_date?: string | null;
        end_date?: string | null;
        plan_json?: DietPlanDay[] | null;
        notes?: string | null;
    } | null;
    workout_plan?: {
        id: number;
        title: string;
        plan_json?: WorkoutPlanDay[] | null;
        notes?: string | null;
    } | null;
=======
>>>>>>> origin/main
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

<<<<<<< HEAD
type DietPlanDialogState = {
    client: ClientCard['client'];
    diet_plan?: ClientCard['diet_plan'];
    title: string;
    start_date: string;
    end_date: string;
    days: DietPlanDay[];
    searchQuery: string;
    searchMealType: string;
    searchResults: SearchFood[];
    searchLoading: boolean;
    searchError: string | null;
    saving: boolean;
    saveError: string | null;
    mealTypeToAdd: string;
    showFoodSearchFor: { dayIndex: number; mealType: string } | null;
};

type WorkoutPlanDialogState = {
    client: ClientCard['client'];
    workout_plan?: ClientCard['workout_plan'];
    title: string;
    notes: string;
    days: WorkoutPlanDay[];
    saving: boolean;
    saveError: string | null;
};

=======
>>>>>>> origin/main
type ClientFilter = 'all' | 'attention' | 'stable';

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
<<<<<<< HEAD
    return role === 'nutritionist' ? 'Dietitian' : 'Personal Trainer';
=======
    return role === 'nutritionist' ? 'Dietitian' : 'Trainer';
>>>>>>> origin/main
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

function countLoggedMeals(days: WeeklyMealDay[]) {
    return days.reduce((total, day) => {
        return (
            total +
            day.meals.reduce(
                (mealTotal, meal) => mealTotal + meal.items.length,
                0,
            )
        );
    }, 0);
}

function getAttentionState(
    client: ClientCard,
    roleMode: 'trainer' | 'nutritionist',
) {
    if (roleMode === 'trainer') {
        const sessions = client.training?.summary.logged_sessions ?? 0;
        if (sessions <= 1) {
            return { label: 'Needs follow-up', tone: 'attention' as const };
        }
        if (sessions <= 3) {
            return { label: 'Monitor this week', tone: 'monitor' as const };
        }

        return { label: 'Stable adherence', tone: 'stable' as const };
    }

    const meals = countLoggedMeals(client.nutrition?.weekly_days ?? []);
    if (meals < 6) {
        return { label: 'Low meal logging', tone: 'attention' as const };
    }
    if (meals < 12) {
        return { label: 'Medium adherence', tone: 'monitor' as const };
    }

    return { label: 'Stable adherence', tone: 'stable' as const };
}

function isAttentionClient(
    client: ClientCard,
    roleMode: 'trainer' | 'nutritionist',
) {
    return getAttentionState(client, roleMode).tone === 'attention';
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
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<ClientFilter>('all');
    const [activeClientId, setActiveClientId] = useState<number | null>(
        clients[0]?.client.id ?? null,
    );
    const [appointmentDialog, setAppointmentDialog] =
        useState<AppointmentDialogState | null>(null);
    const [mealNoteDialog, setMealNoteDialog] =
        useState<MealNoteDialogState | null>(null);
<<<<<<< HEAD
    const [dietPlanDialog, setDietPlanDialog] =
        useState<DietPlanDialogState | null>(null);
    const [workoutPlanDialog, setWorkoutPlanDialog] =
        useState<WorkoutPlanDialogState | null>(null);
=======
>>>>>>> origin/main
    const mealNoteIsOpen = mealNoteDialog !== null;
    const mealNoteSubstituteQuery = mealNoteDialog?.substituteQuery ?? '';
    const mealNoteSelectedMealType = mealNoteDialog
        ? (findSelectedMealChoice(
              mealNoteDialog.weeklyDays,
              mealNoteDialog.selectedDate,
              mealNoteDialog.selectedEntryId,
          ).choice?.mealType ?? null)
        : null;

    const filteredClients = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        return clients.filter((entry) => {
            const searchMatch =
                normalized === '' ||
                entry.client.name.toLowerCase().includes(normalized) ||
                entry.client.email.toLowerCase().includes(normalized) ||
                (entry.client.username ?? '')
                    .toLowerCase()
                    .includes(normalized);

            if (!searchMatch) {
                return false;
            }

            if (filter === 'attention') {
                return isAttentionClient(entry, roleMode);
            }

            if (filter === 'stable') {
                return !isAttentionClient(entry, roleMode);
            }

            return true;
        });
    }, [clients, filter, query, roleMode]);

    useEffect(() => {
        if (
            activeClientId &&
            filteredClients.some((entry) => entry.client.id === activeClientId)
        ) {
            return;
        }

        setActiveClientId(filteredClients[0]?.client.id ?? null);
    }, [activeClientId, filteredClients]);

    const activeEntry = useMemo(
        () =>
            filteredClients.find(
                (entry) => entry.client.id === activeClientId,
            ) ?? null,
        [activeClientId, filteredClients],
    );

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
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
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
            const conversationId = await ensureConversation(
                mealNoteDialog.client.id,
            );
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

<<<<<<< HEAD
    function openDietPlanDialog(clientEntry: ClientCard) {
        const existingPlan = clientEntry.diet_plan;

        setDietPlanDialog({
            client: clientEntry.client,
            diet_plan: existingPlan,
            title: existingPlan?.title ?? '',
            start_date: existingPlan?.start_date ?? '',
            end_date: existingPlan?.end_date ?? '',
            days: existingPlan?.plan_json ?? [],
            searchQuery: '',
            searchMealType: 'breakfast',
            searchResults: [],
            searchLoading: false,
            searchError: null,
            saving: false,
            saveError: null,
            mealTypeToAdd: 'breakfast',
            showFoodSearchFor: null,
        });
    }

    async function submitDietPlan() {
        if (!dietPlanDialog) return;

        setDietPlanDialog((current) =>
            current ? { ...current, saving: true, saveError: null } : null,
        );
        setBusyClientId(dietPlanDialog.client.id);

        try {
            const method = dietPlanDialog.diet_plan ? 'PUT' : 'POST';
            const url = dietPlanDialog.diet_plan
                ? `/api/diet-plans/${dietPlanDialog.diet_plan.id}`
                : '/api/diet-plans';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    client_id: dietPlanDialog.client.id,
                    title: dietPlanDialog.title || 'Client diet plan',
                    start_date: dietPlanDialog.start_date || null,
                    end_date: dietPlanDialog.end_date || null,
                    plan_json: dietPlanDialog.days,
                }),
            });

            if (!response.ok) {
                const json = await response.json().catch(() => ({}));
                const message =
                    Array.isArray(json?.errors?.plan_json) &&
                    json.errors.plan_json.length > 0
                        ? json.errors.plan_json[0]
                        : json?.message || 'Failed to save diet plan';

                throw new Error(message);
            }

            setBanner({
                kind: 'success',
                text: 'Diet plan saved successfully.',
            });
            setDietPlanDialog(null);
        } catch (error) {
            setDietPlanDialog((current) =>
                current
                    ? {
                          ...current,
                          saving: false,
                          saveError:
                              error instanceof Error
                                  ? error.message
                                  : 'Failed to save diet plan',
                      }
                    : null,
            );
        } finally {
            setBusyClientId(null);
        }
    }

    async function searchFoodsForDietPlan() {
        if (!dietPlanDialog?.showFoodSearchFor) return;

        const { mealType } = dietPlanDialog.showFoodSearchFor;

        setDietPlanDialog((current) =>
            current
                ? { ...current, searchLoading: true, searchError: null }
                : null,
        );

        try {
            const params = new URLSearchParams({
                q: dietPlanDialog.searchQuery,
                meal_type: mealType,
                exclude_allergens: 'true',
                client_id: String(dietPlanDialog.client.id),
                page: '1',
            });

            const response = await fetch(
                `/api/foods/search?${params.toString()}`,
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const json = await response.json();
            setDietPlanDialog((current) =>
                current
                    ? {
                          ...current,
                          searchResults: json.data ?? [],
                          searchLoading: false,
                      }
                    : null,
            );
        } catch (error) {
            setDietPlanDialog((current) =>
                current
                    ? {
                          ...current,
                          searchLoading: false,
                          searchError:
                              error instanceof Error
                                  ? error.message
                                  : 'Search failed',
                      }
                    : null,
            );
        }
    }

    function addFoodToDietPlan(food: SearchFood) {
        if (!dietPlanDialog?.showFoodSearchFor) return;

        const { dayIndex, mealType } = dietPlanDialog.showFoodSearchFor;
        setDietPlanDialog((current) => {
            if (!current) return null;

            const days = [...current.days];

            if (!days[dayIndex]) {
                days[dayIndex] = {
                    date: new Date().toISOString().slice(0, 10),
                    meals: [],
                };
            }

            let meal = days[dayIndex].meals.find(
                (item) => item.meal_type === mealType,
            );

            if (!meal) {
                meal = { meal_type: mealType, foods: [] };
                days[dayIndex].meals.push(meal);
            }

            meal.foods.push({ id: food.id, name: food.name });

            return {
                ...current,
                days,
                showFoodSearchFor: null,
                searchResults: [],
                searchQuery: '',
            };
        });
    }

    function openWorkoutPlanDialog(clientEntry: ClientCard) {
        const existingPlan = clientEntry.workout_plan;

        setWorkoutPlanDialog({
            client: clientEntry.client,
            workout_plan: existingPlan,
            title: existingPlan?.title ?? '',
            notes: existingPlan?.notes ?? '',
            days:
                existingPlan?.plan_json && existingPlan.plan_json.length > 0
                    ? existingPlan.plan_json
                    : [
                          {
                              label: 'Day 1',
                              focus: '',
                              exercises: [
                                  {
                                      name: '',
                                      sets: '',
                                      reps: '',
                                      notes: '',
                                  },
                              ],
                          },
                      ],
            saving: false,
            saveError: null,
        });
    }

    async function submitWorkoutPlan() {
        if (!workoutPlanDialog) return;

        setWorkoutPlanDialog((current) =>
            current ? { ...current, saving: true, saveError: null } : null,
        );
        setBusyClientId(workoutPlanDialog.client.id);

        try {
            const method = workoutPlanDialog.workout_plan ? 'PUT' : 'POST';
            const url = workoutPlanDialog.workout_plan
                ? `/api/trainer-workout-plans/${workoutPlanDialog.workout_plan.id}`
                : '/api/trainer-workout-plans';

            const normalizedDays = workoutPlanDialog.days
                .map((day) => ({
                    label: day.label.trim(),
                    focus: day.focus.trim(),
                    exercises: day.exercises
                        .map((exercise) => ({
                            name: exercise.name.trim(),
                            sets: exercise.sets.trim(),
                            reps: exercise.reps.trim(),
                            notes: exercise.notes.trim(),
                        }))
                        .filter((exercise) => exercise.name !== ''),
                }))
                .filter(
                    (day) =>
                        day.label !== '' ||
                        day.focus !== '' ||
                        day.exercises.length > 0,
                );

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    client_id: workoutPlanDialog.client.id,
                    title: workoutPlanDialog.title || 'Client workout plan',
                    notes: workoutPlanDialog.notes || null,
                    plan_json: normalizedDays,
                }),
            });

            if (!response.ok) {
                const json = await response.json().catch(() => ({}));
                throw new Error(
                    json?.message || 'Failed to save workout plan',
                );
            }

            setBanner({
                kind: 'success',
                text: 'Workout plan saved successfully.',
            });
            setWorkoutPlanDialog(null);
        } catch (error) {
            setWorkoutPlanDialog((current) =>
                current
                    ? {
                          ...current,
                          saving: false,
                          saveError:
                              error instanceof Error
                                  ? error.message
                                  : 'Failed to save workout plan',
                      }
                    : null,
            );
        } finally {
            setBusyClientId(null);
        }
    }

=======
>>>>>>> origin/main
    return (
        <>
            <Head title={pageTitle} />
            <ProductPageShell>
                <ProductHero
                    eyebrow="Client workspace"
                    title={pageTitle}
                    description={`Private client view for your assigned ${roleMode === 'nutritionist' ? 'nutrition' : 'training'} clients.`}
                    actions={
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-border/70 bg-card/88 px-4 py-3 text-sm">
                                <div className="haye-kicker">In view</div>
                                <div className="mt-2 font-semibold text-foreground">
                                    {filteredClients.length} clients
                                </div>
                            </div>
                            <div className="rounded-[22px] border border-border/70 bg-card/88 px-4 py-3 text-sm">
                                <div className="haye-kicker">
                                    Needs follow-up
                                </div>
                                <div className="mt-2 font-semibold text-foreground">
                                    {
                                        filteredClients.filter((entry) =>
                                            isAttentionClient(entry, roleMode),
                                        ).length
                                    }{' '}
                                    flagged
                                </div>
                            </div>
                        </div>
                    }
                />

<<<<<<< HEAD
                {workoutPlanDialog ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setWorkoutPlanDialog(null)}
                        />

                        <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-white p-4 text-foreground shadow-xl dark:border-white/15 dark:bg-card dark:text-white">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="text-sm font-medium">
                                    {workoutPlanDialog.workout_plan
                                        ? 'Edit'
                                        : 'Create'}{' '}
                                    Workout plan for{' '}
                                    {workoutPlanDialog.client.name}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setWorkoutPlanDialog(null)}
                                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                                >
                                    Close
                                </button>
                            </div>

                            {workoutPlanDialog.saveError ? (
                                <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                    {workoutPlanDialog.saveError}
                                </div>
                            ) : null}

                            <div className="space-y-3">
                                <div>
                                    <label
                                        className="block text-sm"
                                        htmlFor="workout-plan-title"
                                    >
                                        Title
                                    </label>
                                    <input
                                        id="workout-plan-title"
                                        type="text"
                                        value={workoutPlanDialog.title}
                                        onChange={(event) =>
                                            setWorkoutPlanDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          title: event.target.value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                        placeholder="Strength and mobility plan"
                                    />
                                </div>

                                <div>
                                    <label
                                        className="block text-sm"
                                        htmlFor="workout-plan-notes"
                                    >
                                        Notes
                                    </label>
                                    <textarea
                                        id="workout-plan-notes"
                                        value={workoutPlanDialog.notes}
                                        onChange={(event) =>
                                            setWorkoutPlanDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          notes: event.target.value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        rows={3}
                                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                        placeholder="Programming notes, rest guidance, and progression cues"
                                    />
                                </div>

                                <div className="border-t pt-3">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium">
                                            Workout days
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setWorkoutPlanDialog(
                                                    (current) =>
                                                        current
                                                            ? {
                                                                  ...current,
                                                                  days: [
                                                                      ...current.days,
                                                                      {
                                                                          label: `Day ${current.days.length + 1}`,
                                                                          focus: '',
                                                                          exercises: [
                                                                              {
                                                                                  name: '',
                                                                                  sets: '',
                                                                                  reps: '',
                                                                                  notes: '',
                                                                              },
                                                                          ],
                                                                      },
                                                                  ],
                                                              }
                                                            : null,
                                                )
                                            }
                                            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5"
                                        >
                                            Add day
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {workoutPlanDialog.days.map(
                                            (day, dayIdx) => (
                                                <div
                                                    key={dayIdx}
                                                    className="rounded-lg border border-border/50 p-3"
                                                >
                                                    <div className="mb-3 flex items-start justify-between gap-3">
                                                        <div className="grid flex-1 gap-3 md:grid-cols-2">
                                                            <input
                                                                type="text"
                                                                value={day.label}
                                                                onChange={(event) =>
                                                                    setWorkoutPlanDialog(
                                                                        (
                                                                            current,
                                                                        ) => {
                                                                            if (!current) {
                                                                                return null;
                                                                            }
                                                                            const days = [
                                                                                ...current.days,
                                                                            ];
                                                                            days[dayIdx] = {
                                                                                ...days[
                                                                                    dayIdx
                                                                                ],
                                                                                label: event.target.value,
                                                                            };
                                                                            return {
                                                                                ...current,
                                                                                days,
                                                                            };
                                                                        },
                                                                    )
                                                                }
                                                                className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                                placeholder="Day label"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={day.focus}
                                                                onChange={(event) =>
                                                                    setWorkoutPlanDialog(
                                                                        (
                                                                            current,
                                                                        ) => {
                                                                            if (!current) {
                                                                                return null;
                                                                            }
                                                                            const days = [
                                                                                ...current.days,
                                                                            ];
                                                                            days[dayIdx] = {
                                                                                ...days[
                                                                                    dayIdx
                                                                                ],
                                                                                focus: event.target.value,
                                                                            };
                                                                            return {
                                                                                ...current,
                                                                                days,
                                                                            };
                                                                        },
                                                                    )
                                                                }
                                                                className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                                placeholder="Focus, for example Upper body or Recovery"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setWorkoutPlanDialog(
                                                                    (current) =>
                                                                        current
                                                                            ? {
                                                                                  ...current,
                                                                                  days: current.days.filter(
                                                                                      (
                                                                                          _,
                                                                                          index,
                                                                                      ) =>
                                                                                          index !==
                                                                                          dayIdx,
                                                                                  ),
                                                                              }
                                                                            : null,
                                                                )
                                                            }
                                                            className="text-xs text-destructive hover:underline"
                                                        >
                                                            Remove day
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {day.exercises.map(
                                                            (
                                                                exercise,
                                                                exerciseIdx,
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        exerciseIdx
                                                                    }
                                                                    className="grid gap-2 rounded-lg border border-border/40 p-3 md:grid-cols-[minmax(0,2fr)_110px_110px_minmax(0,1.5fr)_auto]"
                                                                >
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            exercise.name
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setWorkoutPlanDialog(
                                                                                (
                                                                                    current,
                                                                                ) => {
                                                                                    if (
                                                                                        !current
                                                                                    ) {
                                                                                        return null;
                                                                                    }
                                                                                    const days =
                                                                                        [
                                                                                            ...current.days,
                                                                                        ];
                                                                                    days[
                                                                                        dayIdx
                                                                                    ].exercises[
                                                                                        exerciseIdx
                                                                                    ] = {
                                                                                        ...days[
                                                                                            dayIdx
                                                                                        ]
                                                                                            .exercises[
                                                                                            exerciseIdx
                                                                                        ],
                                                                                        name: event
                                                                                            .target
                                                                                            .value,
                                                                                    };
                                                                                    return {
                                                                                        ...current,
                                                                                        days,
                                                                                    };
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                                        placeholder="Exercise name"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            exercise.sets
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setWorkoutPlanDialog(
                                                                                (
                                                                                    current,
                                                                                ) => {
                                                                                    if (
                                                                                        !current
                                                                                    ) {
                                                                                        return null;
                                                                                    }
                                                                                    const days =
                                                                                        [
                                                                                            ...current.days,
                                                                                        ];
                                                                                    days[
                                                                                        dayIdx
                                                                                    ].exercises[
                                                                                        exerciseIdx
                                                                                    ] = {
                                                                                        ...days[
                                                                                            dayIdx
                                                                                        ]
                                                                                            .exercises[
                                                                                            exerciseIdx
                                                                                        ],
                                                                                        sets: event
                                                                                            .target
                                                                                            .value,
                                                                                    };
                                                                                    return {
                                                                                        ...current,
                                                                                        days,
                                                                                    };
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                                        placeholder="Sets"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            exercise.reps
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setWorkoutPlanDialog(
                                                                                (
                                                                                    current,
                                                                                ) => {
                                                                                    if (
                                                                                        !current
                                                                                    ) {
                                                                                        return null;
                                                                                    }
                                                                                    const days =
                                                                                        [
                                                                                            ...current.days,
                                                                                        ];
                                                                                    days[
                                                                                        dayIdx
                                                                                    ].exercises[
                                                                                        exerciseIdx
                                                                                    ] = {
                                                                                        ...days[
                                                                                            dayIdx
                                                                                        ]
                                                                                            .exercises[
                                                                                            exerciseIdx
                                                                                        ],
                                                                                        reps: event
                                                                                            .target
                                                                                            .value,
                                                                                    };
                                                                                    return {
                                                                                        ...current,
                                                                                        days,
                                                                                    };
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                                        placeholder="Reps"
                                                                    />
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            exercise.notes
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setWorkoutPlanDialog(
                                                                                (
                                                                                    current,
                                                                                ) => {
                                                                                    if (
                                                                                        !current
                                                                                    ) {
                                                                                        return null;
                                                                                    }
                                                                                    const days =
                                                                                        [
                                                                                            ...current.days,
                                                                                        ];
                                                                                    days[
                                                                                        dayIdx
                                                                                    ].exercises[
                                                                                        exerciseIdx
                                                                                    ] = {
                                                                                        ...days[
                                                                                            dayIdx
                                                                                        ]
                                                                                            .exercises[
                                                                                            exerciseIdx
                                                                                        ],
                                                                                        notes: event
                                                                                            .target
                                                                                            .value,
                                                                                    };
                                                                                    return {
                                                                                        ...current,
                                                                                        days,
                                                                                    };
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                                        placeholder="Notes"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setWorkoutPlanDialog(
                                                                                (
                                                                                    current,
                                                                                ) => {
                                                                                    if (
                                                                                        !current
                                                                                    ) {
                                                                                        return null;
                                                                                    }
                                                                                    const days =
                                                                                        [
                                                                                            ...current.days,
                                                                                        ];
                                                                                    days[
                                                                                        dayIdx
                                                                                    ].exercises =
                                                                                        days[
                                                                                            dayIdx
                                                                                        ].exercises.filter(
                                                                                            (
                                                                                                _,
                                                                                                index,
                                                                                            ) =>
                                                                                                index !==
                                                                                                exerciseIdx,
                                                                                        );
                                                                                    return {
                                                                                        ...current,
                                                                                        days,
                                                                                    };
                                                                                },
                                                                            )
                                                                        }
                                                                        className="text-xs text-destructive hover:underline"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setWorkoutPlanDialog(
                                                                (current) => {
                                                                    if (!current) {
                                                                        return null;
                                                                    }
                                                                    const days =
                                                                        [
                                                                            ...current.days,
                                                                        ];
                                                                    days[
                                                                        dayIdx
                                                                    ].exercises.push(
                                                                        {
                                                                            name: '',
                                                                            sets: '',
                                                                            reps: '',
                                                                            notes: '',
                                                                        },
                                                                    );
                                                                    return {
                                                                        ...current,
                                                                        days,
                                                                    };
                                                                },
                                                            )
                                                        }
                                                        className="mt-3 text-xs text-primary hover:underline"
                                                    >
                                                        + Add exercise
                                                    </button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWorkoutPlanDialog(null)}
                                    className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitWorkoutPlan()}
                                    disabled={workoutPlanDialog.saving}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
                                >
                                    {workoutPlanDialog.saving
                                        ? 'Saving...'
                                        : 'Save plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {dietPlanDialog ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() => setDietPlanDialog(null)}
                        />

                        <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-white p-4 text-foreground shadow-xl dark:border-white/15 dark:bg-card dark:text-white">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="text-sm font-medium">
                                    {dietPlanDialog.diet_plan ? 'Edit' : 'Create'}{' '}
                                    Diet plan for {dietPlanDialog.client.name}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDietPlanDialog(null)}
                                    className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mb-4">
                                <div className="font-semibold">
                                    {dietPlanDialog.client.name}
                                </div>
                                <div className="text-xs opacity-75">
                                    Allergens:{' '}
                                    {dietPlanDialog.client.allergens?.join(
                                        ', ',
                                    ) || 'None'}
                                </div>
                            </div>

                            {dietPlanDialog.saveError ? (
                                <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                                    {dietPlanDialog.saveError}
                                </div>
                            ) : null}

                            <div className="space-y-3">
                                <div>
                                    <label
                                        className="block text-sm"
                                        htmlFor="diet-plan-title"
                                    >
                                        Title
                                    </label>
                                    <input
                                        id="diet-plan-title"
                                        type="text"
                                        value={dietPlanDialog.title}
                                        onChange={(event) =>
                                            setDietPlanDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          title: event.target.value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                        placeholder="Weekly meal plan"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label
                                            className="block text-sm"
                                            htmlFor="diet-plan-start"
                                        >
                                            Start date
                                        </label>
                                        <input
                                            id="diet-plan-start"
                                            type="date"
                                            value={dietPlanDialog.start_date}
                                            onChange={(event) =>
                                                setDietPlanDialog((current) =>
                                                    current
                                                        ? {
                                                              ...current,
                                                              start_date:
                                                                  event.target
                                                                      .value,
                                                          }
                                                        : null,
                                                )
                                            }
                                            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="block text-sm"
                                            htmlFor="diet-plan-end"
                                        >
                                            End date
                                        </label>
                                        <input
                                            id="diet-plan-end"
                                            type="date"
                                            value={dietPlanDialog.end_date}
                                            onChange={(event) =>
                                                setDietPlanDialog((current) =>
                                                    current
                                                        ? {
                                                              ...current,
                                                              end_date:
                                                                  event.target
                                                                      .value,
                                                          }
                                                        : null,
                                                )
                                            }
                                            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-3">
                                    <div className="mb-2 text-sm font-medium">
                                        Meal plan days
                                    </div>
                                    {dietPlanDialog.days.length === 0 ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDietPlanDialog((current) =>
                                                    current
                                                        ? {
                                                              ...current,
                                                              days: [
                                                                  {
                                                                      date: '',
                                                                      meals: [
                                                                          {
                                                                              meal_type:
                                                                                  'breakfast',
                                                                              foods: [],
                                                                          },
                                                                          {
                                                                              meal_type:
                                                                                  'lunch',
                                                                              foods: [],
                                                                          },
                                                                          {
                                                                              meal_type:
                                                                                  'dinner',
                                                                              foods: [],
                                                                          },
                                                                      ],
                                                                  },
                                                              ],
                                                          }
                                                        : null,
                                                )
                                            }
                                            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5"
                                        >
                                            Add day 1
                                        </button>
                                    ) : null}

                                    {dietPlanDialog.days.map((day, dayIdx) => (
                                        <div
                                            key={dayIdx}
                                            className="mb-4 rounded-lg border border-border/50 p-3"
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <input
                                                    type="date"
                                                    value={day.date}
                                                    onChange={(event) =>
                                                        setDietPlanDialog(
                                                            (current) => {
                                                                if (!current) {
                                                                    return null;
                                                                }
                                                                const days = [
                                                                    ...current.days,
                                                                ];
                                                                days[dayIdx] = {
                                                                    ...days[
                                                                        dayIdx
                                                                    ],
                                                                    date: event
                                                                        .target
                                                                        .value,
                                                                };
                                                                return {
                                                                    ...current,
                                                                    days,
                                                                };
                                                            },
                                                        )
                                                    }
                                                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDietPlanDialog(
                                                            (current) =>
                                                                current
                                                                    ? {
                                                                          ...current,
                                                                          days: current.days.filter(
                                                                              (
                                                                                  _,
                                                                                  index,
                                                                              ) =>
                                                                                  index !==
                                                                                  dayIdx,
                                                                          ),
                                                                      }
                                                                    : null,
                                                        )
                                                    }
                                                    className="text-xs text-destructive hover:underline"
                                                >
                                                    Remove day
                                                </button>
                                            </div>

                                            {day.meals.map((meal) => (
                                                <div
                                                    key={meal.meal_type}
                                                    className="mb-3"
                                                >
                                                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                                                        {formatMealType(
                                                            meal.meal_type,
                                                        )}
                                                    </div>
                                                    <div className="mt-1 space-y-1">
                                                        {meal.foods.map(
                                                            (food, foodIdx) => (
                                                                <div
                                                                    key={
                                                                        foodIdx
                                                                    }
                                                                    className="flex items-center justify-between rounded bg-muted/30 px-2 py-1 text-sm"
                                                                >
                                                                    <span>
                                                                        {
                                                                            food.name
                                                                        }
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDietPlanDialog(
                                                                                (
                                                                                    current,
                                                                                ) => {
                                                                                    if (
                                                                                        !current
                                                                                    ) {
                                                                                        return null;
                                                                                    }
                                                                                    const days =
                                                                                        [
                                                                                            ...current.days,
                                                                                        ];
                                                                                    days[
                                                                                        dayIdx
                                                                                    ].meals =
                                                                                        days[
                                                                                            dayIdx
                                                                                        ].meals.map(
                                                                                            (
                                                                                                item,
                                                                                            ) =>
                                                                                                item.meal_type ===
                                                                                                meal.meal_type
                                                                                                    ? {
                                                                                                          ...item,
                                                                                                          foods: item.foods.filter(
                                                                                                              (
                                                                                                                  _food,
                                                                                                                  index,
                                                                                                              ) =>
                                                                                                                  index !==
                                                                                                                  foodIdx,
                                                                                                          ),
                                                                                                      }
                                                                                                    : item,
                                                                                        );
                                                                                    return {
                                                                                        ...current,
                                                                                        days,
                                                                                    };
                                                                                },
                                                                            )
                                                                        }
                                                                        className="text-xs text-destructive hover:underline"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            ),
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDietPlanDialog(
                                                                    (current) =>
                                                                        current
                                                                            ? {
                                                                                  ...current,
                                                                                  showFoodSearchFor:
                                                                                      {
                                                                                          dayIndex:
                                                                                              dayIdx,
                                                                                          mealType:
                                                                                              meal.meal_type,
                                                                                      },
                                                                              }
                                                                            : null,
                                                                )
                                                            }
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            + Add food
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDietPlanDialog(null)}
                                    className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void submitDietPlan()}
                                    disabled={dietPlanDialog.saving}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
                                >
                                    {dietPlanDialog.saving
                                        ? 'Saving...'
                                        : 'Save plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {dietPlanDialog?.showFoodSearchFor ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <div
                            className="absolute inset-0 bg-black/40"
                            onClick={() =>
                                setDietPlanDialog((current) =>
                                    current
                                        ? {
                                              ...current,
                                              showFoodSearchFor: null,
                                              searchResults: [],
                                          }
                                        : null,
                                )
                            }
                        />
                        <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-4 text-foreground shadow-xl dark:border-white/15 dark:bg-card">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="text-sm font-medium">
                                    Search foods
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDietPlanDialog((current) =>
                                            current
                                                ? {
                                                      ...current,
                                                      showFoodSearchFor: null,
                                                      searchResults: [],
                                                  }
                                                : null,
                                        )
                                    }
                                    className="rounded-lg border border-border px-2 py-1 text-xs"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mb-3 text-xs opacity-75">
                                Foods containing saved allergens are excluded.
                            </div>

                            <input
                                type="text"
                                value={dietPlanDialog.searchQuery}
                                onChange={(event) =>
                                    setDietPlanDialog((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  searchQuery:
                                                      event.target.value,
                                              }
                                            : null,
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        void searchFoodsForDietPlan();
                                    }
                                }}
                                placeholder="Search foods..."
                                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card"
                            />

                            <div className="mt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() =>
                                        void searchFoodsForDietPlan()
                                    }
                                    className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5"
                                >
                                    Search
                                </button>
                            </div>

                            {dietPlanDialog.searchLoading ? (
                                <div className="mt-3 text-sm">Loading...</div>
                            ) : dietPlanDialog.searchError ? (
                                <div className="mt-3 text-sm text-red-600">
                                    {dietPlanDialog.searchError}
                                </div>
                            ) : (
                                <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
                                    {dietPlanDialog.searchResults.map(
                                        (food) => (
                                            <button
                                                key={food.id}
                                                type="button"
                                                onClick={() =>
                                                    addFoodToDietPlan(food)
                                                }
                                                className="w-full rounded-lg border border-border/50 px-3 py-2 text-left text-sm hover:bg-primary/5"
                                            >
                                                {food.name}
                                            </button>
                                        ),
                                    )}
                                    {dietPlanDialog.searchResults.length ===
                                        0 &&
                                    dietPlanDialog.searchQuery ? (
                                        <div className="text-sm opacity-75">
                                            No foods found.
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

=======
>>>>>>> origin/main
                {banner ? (
                    <ProductBanner
                        tone={banner.kind === 'success' ? 'success' : 'danger'}
                    >
                        {banner.text}
                    </ProductBanner>
                ) : null}

                {clients.length === 0 ? (
                    <div className="rounded-3xl border border-dashed bg-card p-8 text-sm text-muted-foreground">
                        No assigned clients found yet.
                    </div>
                ) : (
<<<<<<< HEAD
                    <div className="grid gap-5 xl:h-[calc(100vh-13rem)] xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
                        <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-border/70 bg-card/95 p-4 shadow-sm">
                            <div className="flex h-full min-h-0 flex-col space-y-4">
=======
                    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="rounded-[30px] border border-border/70 bg-card/95 p-4 shadow-sm">
                            <div className="space-y-4">
>>>>>>> origin/main
                                <ProductFilterRow>
                                    <label className="relative min-w-0 flex-1">
                                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={query}
                                            onChange={(event) =>
                                                setQuery(event.target.value)
                                            }
                                            className="h-10 rounded-2xl pl-9"
                                            placeholder="Search clients"
                                        />
                                    </label>
                                </ProductFilterRow>

                                <div className="flex flex-wrap gap-2">
                                    {(
                                        [
                                            'all',
                                            'attention',
                                            'stable',
                                        ] as ClientFilter[]
                                    ).map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                                filter === item
                                                    ? 'border-primary/35 bg-primary/10 text-foreground'
                                                    : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/40'
                                            }`}
                                            onClick={() => setFilter(item)}
                                        >
                                            {item === 'all'
                                                ? 'All'
                                                : item === 'attention'
                                                  ? 'Needs follow-up'
                                                  : 'Stable'}
                                        </button>
                                    ))}
                                </div>

<<<<<<< HEAD
                                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
=======
                                <div className="space-y-2">
>>>>>>> origin/main
                                    {filteredClients.length === 0 ? (
                                        <p className="rounded-2xl border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                                            No matching clients for this filter.
                                        </p>
                                    ) : (
                                        filteredClients.map((entry) => {
                                            const state = getAttentionState(
                                                entry,
                                                roleMode,
                                            );

                                            return (
                                                <button
                                                    key={`client-select-${entry.assignment_id}`}
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveClientId(
                                                            entry.client.id,
                                                        )
                                                    }
                                                    className={`w-full rounded-[22px] border p-3 text-left transition ${
                                                        activeClientId ===
                                                        entry.client.id
                                                            ? 'border-primary/25 bg-primary/10 shadow-[0_18px_44px_-36px_rgba(17,24,39,0.68)]'
                                                            : 'border-border/70 bg-background/70 hover:bg-muted/35'
                                                    }`}
                                                >
                                                    <div className="truncate text-sm font-medium text-foreground">
                                                        {entry.client.name}
                                                    </div>
                                                    <div className="truncate text-xs text-muted-foreground">
                                                        {entry.client.email}
                                                    </div>
                                                    <div
                                                        className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                            state.tone ===
                                                            'attention'
                                                                ? 'bg-destructive/10 text-foreground'
                                                                : state.tone ===
                                                                    'monitor'
                                                                  ? 'bg-warning/10 text-foreground'
                                                                  : 'bg-success/10 text-foreground'
                                                        }`}
                                                    >
                                                        {state.label}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </aside>

<<<<<<< HEAD
                        <div className="min-h-0 h-full overflow-hidden">
=======
                        <div className="space-y-5">
>>>>>>> origin/main
                            {filteredClients.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-border/70 bg-card p-8 text-sm text-muted-foreground">
                                    No clients match this filter.
                                </div>
                            ) : (
<<<<<<< HEAD
                                <div className="h-full overflow-y-auto pr-1">
                                    {(activeEntry
                                        ? [activeEntry]
                                        : filteredClients
                                    ).map((entry) => (
                                        <div
                                            key={entry.assignment_id}
                                            className="rounded-[30px] border border-border/70 bg-card/95 p-5 shadow-sm"
                                        >
=======
                                (activeEntry
                                    ? [activeEntry]
                                    : filteredClients
                                ).map((entry) => (
                                <div
                                    key={entry.assignment_id}
                                    className="rounded-[30px] border border-border/70 bg-card/95 p-5 shadow-sm"
                                >
>>>>>>> origin/main
                                        <div className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-background/72 p-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h2 className="text-xl font-semibold">
                                                        {entry.client.name}
                                                    </h2>
                                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                        {formatRoleLabel(
                                                            roleMode,
                                                        )}{' '}
                                                        client
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span>
                                                        {entry.client.email}
                                                    </span>
                                                    {entry.client.age ? (
                                                        <span>
                                                            Age{' '}
                                                            {entry.client.age}
                                                        </span>
                                                    ) : null}
                                                    {entry.client.username ? (
                                                        <span>
                                                            @
                                                            {
                                                                entry.client
                                                                    .username
                                                            }
                                                        </span>
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
                                                        void openConversation(
                                                            entry.client.id,
                                                        )
                                                    }
                                                    disabled={
                                                        busyClientId ===
                                                        entry.client.id
                                                    }
                                                >
                                                    Message
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)] transition hover:opacity-95"
                                                    onClick={() =>
                                                        openAppointmentDialog(
                                                            entry.client,
                                                        )
                                                    }
                                                    disabled={
                                                        busyClientId ===
                                                        entry.client.id
                                                    }
                                                >
                                                    Appointment
                                                </button>
                                                {roleMode === 'nutritionist' ? (
<<<<<<< HEAD
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                                                            onClick={() =>
                                                                openMealNoteDialog(
                                                                    entry,
                                                                )
                                                            }
                                                            disabled={
                                                                busyClientId ===
                                                                entry.client.id
                                                            }
                                                        >
                                                            Meal note
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                                                            onClick={() =>
                                                                openDietPlanDialog(
                                                                    entry,
                                                                )
                                                            }
                                                            disabled={
                                                                busyClientId ===
                                                                entry.client.id
                                                            }
                                                        >
                                                            Diet plan
                                                        </button>
                                                    </>
                                                ) : roleMode === 'trainer' ? (
=======
>>>>>>> origin/main
                                                    <button
                                                        type="button"
                                                        className="rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                                                        onClick={() =>
<<<<<<< HEAD
                                                            openWorkoutPlanDialog(
=======
                                                            openMealNoteDialog(
>>>>>>> origin/main
                                                                entry,
                                                            )
                                                        }
                                                        disabled={
                                                            busyClientId ===
                                                            entry.client.id
                                                        }
                                                    >
<<<<<<< HEAD
                                                        Workout plan
=======
                                                        Meal Note
>>>>>>> origin/main
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>

<<<<<<< HEAD
                                        <div className="mt-5 space-y-4">
=======
                                        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
>>>>>>> origin/main
                                            <div className="rounded-2xl border bg-background p-4">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                    <h3 className="text-sm font-semibold">
                                                        Height and weight
                                                        progress
                                                    </h3>
                                                    <div className="text-xs text-muted-foreground">
                                                        Latest:{' '}
                                                        {entry.progress
                                                            .latest_weight_kg !==
                                                        null
                                                            ? `${entry.progress.latest_weight_kg} kg`
                                                            : 'n/a'}
                                                        {' / '}
                                                        {entry.progress
                                                            .latest_height_cm !==
                                                        null
                                                            ? `${entry.progress.latest_height_cm} cm`
                                                            : 'n/a'}
                                                    </div>
                                                </div>

                                                {entry.progress.points
                                                    .length === 0 ? (
                                                    <p className="text-sm text-muted-foreground">
                                                        No measurement history
                                                        logged yet.
                                                    </p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="min-w-full text-sm">
                                                            <thead className="text-left text-muted-foreground">
                                                                <tr>
                                                                    <th className="py-2 pr-4">
                                                                        Date
                                                                    </th>
                                                                    <th className="py-2 pr-4">
                                                                        Weight
                                                                    </th>
                                                                    <th className="py-2">
                                                                        Height
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {entry.progress.points
                                                                    .slice(-6)
                                                                    .map(
                                                                        (
                                                                            point,
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    point.date
                                                                                }
                                                                                className="border-t"
                                                                            >
                                                                                <td className="py-2 pr-4">
                                                                                    {
                                                                                        point.date
                                                                                    }
                                                                                </td>
                                                                                <td className="py-2 pr-4">
                                                                                    {point.weight_kg !==
                                                                                    null
                                                                                        ? `${point.weight_kg} kg`
                                                                                        : '-'}
                                                                                </td>
                                                                                <td className="py-2">
                                                                                    {point.height_cm !==
                                                                                    null
                                                                                        ? `${point.height_cm} cm`
                                                                                        : '-'}
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            {roleMode === 'trainer' ? (
<<<<<<< HEAD
                                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                                                    <div className="rounded-2xl border bg-background p-4">
                                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                                            <h3 className="text-sm font-semibold">
                                                                Workout progress
                                                            </h3>
                                                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                                <span className="rounded-full bg-muted px-2.5 py-1">
                                                                    Sessions:{' '}
                                                                    {
                                                                        entry
                                                                            .training
                                                                            ?.summary
                                                                            .logged_sessions
                                                                    }
                                                                </span>
                                                                <span className="rounded-full bg-muted px-2.5 py-1">
                                                                    Sets:{' '}
                                                                    {
                                                                        entry
                                                                            .training
                                                                            ?.summary
                                                                            .total_sets
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {entry.training
                                                            ?.recent_workouts
                                                            .length ? (
                                                            <div className="space-y-3">
                                                                {entry.training.recent_workouts.map(
                                                                    (
                                                                        workout,
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                workout.id
                                                                            }
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
                                                                                    {
                                                                                        workout.sets_count
                                                                                    }{' '}
                                                                                    sets
                                                                                </div>
                                                                            </div>
                                                                            {workout.notes ? (
                                                                                <p className="mt-2 text-sm text-muted-foreground">
                                                                                    {
                                                                                        workout.notes
                                                                                    }
                                                                                </p>
                                                                            ) : null}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">
                                                                No workout logs
                                                                yet for this
                                                                client.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-2xl border bg-background p-4">
                                                        <h3 className="text-sm font-semibold">
                                                            Assigned workout
                                                            plan
                                                        </h3>
                                                        {entry.workout_plan ? (
                                                            <div className="mt-3 space-y-3 text-sm">
                                                                <div className="font-medium">
                                                                    {
                                                                        entry
                                                                            .workout_plan
                                                                            .title
                                                                    }
                                                                </div>
                                                                {entry.workout_plan.notes ? (
                                                                    <p className="text-muted-foreground">
                                                                        {
                                                                            entry
                                                                                .workout_plan
                                                                                .notes
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                                                                    {entry.workout_plan.plan_json?.map(
                                                                        (
                                                                            day,
                                                                            dayIdx,
                                                                        ) => (
                                                                            <div
                                                                                key={`${day.label}-${dayIdx}`}
                                                                                className="rounded-xl border px-3 py-3"
                                                                            >
                                                                                <div className="font-medium">
                                                                                    {day.label ||
                                                                                        `Day ${dayIdx + 1}`}
                                                                                </div>
                                                                                {day.focus ? (
                                                                                    <div className="text-xs text-muted-foreground">
                                                                                        {
                                                                                            day.focus
                                                                                        }
                                                                                    </div>
                                                                                ) : null}
                                                                                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                                                                    {day.exercises?.length ? (
                                                                                        day.exercises.map(
                                                                                            (
                                                                                                exercise,
                                                                                                exerciseIdx,
                                                                                            ) => (
                                                                                                <div
                                                                                                    key={`${exercise.name}-${exerciseIdx}`}
                                                                                                >
                                                                                                    <span className="font-medium text-foreground">
                                                                                                        {
                                                                                                            exercise.name
                                                                                                        }
                                                                                                    </span>
                                                                                                    {(exercise.sets ||
                                                                                                        exercise.reps) && (
                                                                                                        <>
                                                                                                            {' '}
                                                                                                            <span>
                                                                                                                {[
                                                                                                                    exercise.sets
                                                                                                                        ? `${exercise.sets} sets`
                                                                                                                        : null,
                                                                                                                    exercise.reps
                                                                                                                        ? `${exercise.reps} reps`
                                                                                                                        : null,
                                                                                                                ]
                                                                                                                    .filter(Boolean)
                                                                                                                    .join(
                                                                                                                        ' x ',
                                                                                                                    )}
                                                                                                            </span>
                                                                                                        </>
                                                                                                    )}
                                                                                                </div>
                                                                                            ),
                                                                                        )
                                                                                    ) : (
                                                                                        <div>
                                                                                            No
                                                                                            exercises
                                                                                            added.
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="mt-3 text-sm text-muted-foreground">
                                                                No workout plan
                                                                assigned yet.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                                    <div className="rounded-2xl border bg-background p-4">
                                                        <div className="mb-3 flex items-center justify-between gap-3">
                                                            <h3 className="text-sm font-semibold">
                                                                Weekly meals
                                                            </h3>
                                                            <div className="text-xs text-muted-foreground">
                                                                Last 7 days
                                                            </div>
                                                        </div>

                                                        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                                                            {entry.nutrition?.weekly_days.map(
                                                                (day) => (
                                                                    <div
                                                                        key={
                                                                            day.date
                                                                        }
                                                                        className="rounded-2xl border p-3"
                                                                    >
                                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                                            <div className="font-medium">
                                                                                {
                                                                                    day.label
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {
                                                                                    day.date
                                                                                }
                                                                            </div>
                                                                        </div>

                                                                        {day.meals
                                                                            .length ? (
                                                                            <div className="space-y-2">
                                                                                {day.meals.map(
                                                                                    (
                                                                                        meal,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                meal.meal_type
                                                                                            }
                                                                                            className="rounded-xl bg-muted/40 p-3"
                                                                                        >
                                                                                            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                                                {formatMealType(
                                                                                                    meal.meal_type,
                                                                                                )}
                                                                                            </div>
                                                                                            <div className="mt-2 space-y-1 text-sm">
                                                                                                {meal.items.map(
                                                                                                    (
                                                                                                        item,
                                                                                                    ) => (
                                                                                                        <div
                                                                                                            key={
                                                                                                                item.id
                                                                                                            }
                                                                                                            className="flex items-center justify-between gap-3"
                                                                                                        >
                                                                                                            <span className="min-w-0 truncate">
                                                                                                                {
                                                                                                                    item.food_name
                                                                                                                }
                                                                                                            </span>
                                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                                {item.servings !==
                                                                                                                null
                                                                                                                    ? `${item.servings} serving(s)`
                                                                                                                    : ''}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    ),
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-sm text-muted-foreground">
                                                                                No
                                                                                meals
                                                                                logged.
                                                                            </p>
                                                                        )}
=======
                                                <div className="rounded-2xl border bg-background p-4">
                                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                                        <h3 className="text-sm font-semibold">
                                                            Workout progress
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                            <span className="rounded-full bg-muted px-2.5 py-1">
                                                                Sessions:{' '}
                                                                {
                                                                    entry
                                                                        .training
                                                                        ?.summary
                                                                        .logged_sessions
                                                                }
                                                            </span>
                                                            <span className="rounded-full bg-muted px-2.5 py-1">
                                                                Sets:{' '}
                                                                {
                                                                    entry
                                                                        .training
                                                                        ?.summary
                                                                        .total_sets
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {entry.training
                                                        ?.recent_workouts
                                                        .length ? (
                                                        <div className="space-y-3">
                                                            {entry.training.recent_workouts.map(
                                                                (workout) => (
                                                                    <div
                                                                        key={
                                                                            workout.id
                                                                        }
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
                                                                                {
                                                                                    ' - '
                                                                                }
                                                                                {
                                                                                    workout.sets_count
                                                                                }{' '}
                                                                                sets
                                                                            </div>
                                                                        </div>
                                                                        {workout.notes ? (
                                                                            <p className="mt-2 text-sm text-muted-foreground">
                                                                                {
                                                                                    workout.notes
                                                                                }
                                                                            </p>
                                                                        ) : null}
>>>>>>> origin/main
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
<<<<<<< HEAD
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="rounded-2xl border bg-background p-4">
                                                            <h3 className="text-sm font-semibold">
                                                                Assigned diet
                                                                plan
                                                            </h3>
                                                            {entry.diet_plan ? (
                                                                <div className="mt-3 space-y-2 text-sm">
                                                                    <div className="font-medium">
                                                                        {
                                                                            entry
                                                                                .diet_plan
                                                                                .title
                                                                        }
                                                                    </div>
                                                                    <div className="text-muted-foreground">
                                                                        {entry.diet_plan.start_date ??
                                                                            'No start date'}{' '}
                                                                        to{' '}
                                                                        {entry.diet_plan.end_date ??
                                                                            'No end date'}
                                                                    </div>
                                                                    {entry.diet_plan.notes ? (
                                                                        <p className="text-muted-foreground">
                                                                            {
                                                                                entry
                                                                                    .diet_plan
                                                                                    .notes
                                                                            }
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            ) : (
                                                                <p className="mt-3 text-sm text-muted-foreground">
                                                                    No diet plan
                                                                    assigned yet.
                                                                </p>
                                                            )}
                                                        </div>

                                                        {entry.client.allergens
                                                            ?.length ? (
                                                            <div className="rounded-2xl border bg-background p-4">
                                                                <h3 className="text-sm font-semibold">
                                                                    Allergy
                                                                    guardrails
                                                                </h3>
                                                                <p className="mt-3 text-sm text-muted-foreground">
                                                                    Hidden from
                                                                    food search:{' '}
                                                                    {entry.client.allergens.join(
                                                                        ', ',
                                                                    )}
                                                                </p>
                                                            </div>
                                                        ) : null}
=======
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">
                                                            No workout logs yet
                                                            for this client.
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
                                                        {entry.nutrition?.weekly_days.map(
                                                            (day) => (
                                                                <div
                                                                    key={
                                                                        day.date
                                                                    }
                                                                    className="rounded-2xl border p-3"
                                                                >
                                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                                        <div className="font-medium">
                                                                            {
                                                                                day.label
                                                                            }
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {
                                                                                day.date
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    {day.meals
                                                                        .length ? (
                                                                        <div className="space-y-2">
                                                                            {day.meals.map(
                                                                                (
                                                                                    meal,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            meal.meal_type
                                                                                        }
                                                                                        className="rounded-xl bg-muted/40 p-3"
                                                                                    >
                                                                                        <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                                            {formatMealType(
                                                                                                meal.meal_type,
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="mt-2 space-y-1 text-sm">
                                                                                            {meal.items.map(
                                                                                                (
                                                                                                    item,
                                                                                                ) => (
                                                                                                    <div
                                                                                                        key={
                                                                                                            item.id
                                                                                                        }
                                                                                                        className="flex items-center justify-between gap-3"
                                                                                                    >
                                                                                                        <span className="min-w-0 truncate">
                                                                                                            {
                                                                                                                item.food_name
                                                                                                            }
                                                                                                        </span>
                                                                                                        <span className="text-xs text-muted-foreground">
                                                                                                            {item.servings !==
                                                                                                            null
                                                                                                                ? `${item.servings} serving(s)`
                                                                                                                : ''}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                ),
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">
                                                                            No
                                                                            meals
                                                                            logged.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ),
                                                        )}
>>>>>>> origin/main
                                                    </div>
                                                </div>
                                            )}
                                        </div>
<<<<<<< HEAD
                                        </div>
                                    ))}
                                </div>
=======
                                    </div>
                                ))
>>>>>>> origin/main
                            )}
                        </div>
                    </div>
                )}
            </ProductPageShell>

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

                    <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-4 text-foreground shadow-xl dark:border-white/15 dark:bg-card dark:text-white">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                                Send appointment
                            </div>

                            <button
                                type="button"
                                onClick={() => setAppointmentDialog(null)}
                                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
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
                                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white dark:focus:ring-white/25"
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
                                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white dark:focus:ring-white/25"
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
                                                      location:
                                                          event.target.value,
                                                  }
                                                : null,
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white dark:focus:ring-white/25"
                                    placeholder="Online link or in-person location"
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAppointmentDialog(null)}
                                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => void submitAppointmentMessage()}
                                disabled={
                                    busyClientId === appointmentDialog.client.id
                                }
<<<<<<< HEAD
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 focus:ring-2 focus:ring-ring/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-foreground dark:focus:ring-white/30"
=======
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 focus:ring-2 focus:ring-ring/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-foreground dark:focus:ring-white/30"
>>>>>>> origin/main
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

                    <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-border bg-white p-4 text-foreground shadow-xl dark:border-white/15 dark:bg-card dark:text-white">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">
                                Send meal note
                            </div>

                            <button
                                type="button"
                                onClick={() => setMealNoteDialog(null)}
                                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="font-semibold">
                                {mealNoteDialog.client.name}
                            </div>
                            <div className="text-xs opacity-75">
                                Pick a logged meal, write the note, and
                                optionally suggest a substitute.
                            </div>
                        </div>

                        {!hasAnyLoggedMeals(mealNoteDialog.weeklyDays) ? (
                            <div className="rounded-lg border border-border/70 p-4 text-sm opacity-80 dark:border-white/10">
                                This client has no logged meals in the last 7
                                days.
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
                                                    (day) =>
                                                        day.date === nextDate,
                                                ) ?? null;
                                            const nextChoices =
                                                getMealChoicesForDay(nextDay);

                                            setMealNoteDialog((current) =>
                                                current
                                                    ? {
                                                          ...current,
                                                          selectedDate:
                                                              nextDate,
                                                          selectedEntryId:
                                                              nextChoices[0]
                                                                  ?.entryId ??
                                                              null,
                                                          substituteQuery: '',
                                                          substitute: null,
                                                      }
                                                    : null,
                                            );
                                        }}
                                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white dark:focus:ring-white/25"
                                    >
                                        {mealNoteDialog.weeklyDays.map(
                                            (day) => (
                                                <option
                                                    key={day.date}
                                                    value={day.date}
                                                >
                                                    {day.label} ({day.date})
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <div className="mb-2 text-sm">
                                        Logged meal
                                    </div>

                                    {mealNoteSelection?.choices.length ? (
                                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/70 p-2 dark:border-white/10">
                                            {mealNoteSelection.choices.map(
                                                (choice) => (
                                                    <button
                                                        key={choice.entryId}
                                                        type="button"
                                                        onClick={() =>
                                                            setMealNoteDialog(
                                                                (current) =>
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
                                                                ? 'border-primary/60 bg-primary/5 focus:ring-ring/30 dark:border-white/40 dark:bg-white/10 dark:focus:ring-white/25'
                                                                : 'border-border/70 hover:bg-primary/5 focus:ring-ring/30 dark:border-white/10 dark:hover:bg-white/10 dark:focus:ring-white/25'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="font-medium">
                                                                {
                                                                    choice.foodName
                                                                }
                                                            </div>
                                                            <div className="text-xs opacity-75">
                                                                {formatMealType(
                                                                    choice.mealType,
                                                                )}
                                                            </div>
                                                        </div>
                                                        {choice.servings !==
                                                        null ? (
                                                            <div className="mt-1 text-xs opacity-75">
                                                                {
                                                                    choice.servings
                                                                }{' '}
                                                                serving(s)
                                                            </div>
                                                        ) : null}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-border p-3 text-sm opacity-80 dark:border-white/15">
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
                                                          message:
                                                              event.target
                                                                  .value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        rows={4}
                                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white dark:focus:ring-white/25"
                                        placeholder="Explain the concern and what you want the client to change."
                                    />
                                </div>

                                <div className="rounded-lg border border-border/70 p-3 dark:border-white/10">
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
                                                              event.target
                                                                  .value,
                                                      }
                                                    : null,
                                            )
                                        }
                                        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-ring/30 dark:border-white/15 dark:bg-card dark:text-white dark:focus:ring-white/25"
                                        placeholder="Search substitute options"
                                    />

                                    {mealNoteDialog.substitute ? (
                                        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-primary/5 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/10">
                                            <div>
                                                Selected:{' '}
                                                {mealNoteDialog.substitute.name}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMealNoteDialog(
                                                        (current) =>
                                                            current
                                                                ? {
                                                                      ...current,
                                                                      substitute:
                                                                          null,
                                                                  }
                                                                : null,
                                                    )
                                                }
                                                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
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
                                                        mealNoteSelection.choice
                                                            ?.foodName,
                                                )
                                                .slice(0, 8)
                                                .map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setMealNoteDialog(
                                                                (current) =>
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
                                                            mealNoteDialog
                                                                .substitute
                                                                ?.id === item.id
                                                                ? 'border-primary/60 bg-primary/5 focus:ring-ring/30 dark:border-white/40 dark:bg-white/10 dark:focus:ring-white/25'
                                                                : 'border-border/70 hover:bg-primary/5 focus:ring-ring/30 dark:border-white/10 dark:hover:bg-white/10 dark:focus:ring-white/25'
                                                        }`}
                                                    >
                                                        <div className="font-medium">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-xs opacity-75">
                                                            Base:{' '}
                                                            {item.serving_size}
                                                            {item.serving_unit}
                                                        </div>
                                                    </button>
                                                ))}

                                            {mealNoteDialog.substituteResults.filter(
                                                (item) =>
                                                    item.name !==
                                                    mealNoteSelection.choice
                                                        ?.foodName,
                                            ).length === 0 ? (
                                                <div className="text-sm opacity-80">
                                                    No substitute options found
                                                    for this meal type.
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
                                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-primary/5 focus:ring-2 focus:ring-ring/30 focus:outline-none dark:border-white/15 dark:hover:bg-white/10 dark:focus:ring-white/25"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => void submitMealNote()}
                                disabled={
                                    busyClientId === mealNoteDialog.client.id ||
                                    !hasAnyLoggedMeals(
                                        mealNoteDialog.weeklyDays,
                                    )
                                }
<<<<<<< HEAD
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 focus:ring-2 focus:ring-ring/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-foreground dark:focus:ring-white/30"
=======
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95 focus:ring-2 focus:ring-ring/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-foreground dark:focus:ring-white/30"
>>>>>>> origin/main
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
