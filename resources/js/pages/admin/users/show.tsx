import {
    AdminCheckboxField,
    AdminField,
    AdminInput,
    AdminNativeSelect,
    AdminNotice,
    AdminTextarea,
    AdminToggleGroup,
} from '@/components/admin/admin-ui';
import {
    ActivityTimeline,
    ConfirmActionDialogWithReason,
    MetricChartCard,
    RiskBannerStack,
    StatusChipSet,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    BellRing,
    Brain,
    CalendarDays,
    Dumbbell,
    MapPin,
    Save,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

type Props = { userId: number };

type AdminUserDetail = {
    id: number;
    name: string | null;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email: string;
    role: 'admin' | 'nutritionist' | 'trainer' | 'client';
    verified: boolean;
    status?: string | null;
    gender?: string | null;
    age?: number | null;
    height_cm?: number | null;
    weight_kg?: number | string | null;
    has_medical_history: boolean;
    medical_history?: string | null;
    dietary_goal?: string | null;
    fitness_goal?: string | null;
    diet_name?: string | null;
    allergies?: string[];
    activity_level?: string | null;
    workout_days_per_week?: number | null;
    workout_location?: string | null;
    tried_diet_before?: boolean | null;
    diet_failure_reasons?: string[];
    diet_failure_other?: string | null;
    city?: string | null;
    contact_display?: string | null;
    professional_bio?: string | null;
    specialties?: string[];
    availability_text?: string | null;
    profile_lat?: number | string | null;
    profile_lng?: number | string | null;
    email_verified_at?: string | null;
    created_at?: string | null;
};

type PrefsDetail = {
    units?: 'metric' | 'imperial' | null;
    theme?: 'light' | 'dark' | 'system' | null;
    home_gym?: string | null;
    is_public?: boolean;
    bmr_kcal?: number | null;
    tdee_kcal?: number | null;
    activity_factor?: number | string | null;
    daily_goal_calories?: number | null;
    daily_goal_protein_g?: number | string | null;
    daily_goal_carbs_g?: number | string | null;
    daily_goal_fat_g?: number | string | null;
    water_cups_per_day?: number | null;
    workout_days_target?: number | null;
    notifications?: Record<string, unknown>;
    settings?: Record<string, unknown>;
};

type PlanDiffSummary = {
    type: 'diet' | 'workout';
    has_current: boolean;
    has_previous: boolean;
    changed: boolean;
    current_version: number;
    previous_version?: number | null;
    current_ai_request_id?: number | null;
    previous_ai_request_id?: number | null;
    current_generated_at?: string | null;
    previous_generated_at?: string | null;
    current_metrics: Record<string, number>;
    previous_metrics?: Record<string, number> | null;
    changes: Record<string, string[]>;
};

type DetailResponse = {
    user: AdminUserDetail;
    prefs: PrefsDetail;
    summary: Record<string, number>;
    verification?: {
        role?: string | null;
        review_status?: string | null;
        full_legal_name?: string | null;
        authority?: string | null;
        notes?: string | null;
    } | null;
    recent: {
        notifications: Array<{
            id: number;
            title: string;
            body: string;
            created_at: string;
        }>;
        meal_entries: Array<{
            id: number;
            meal_type?: string | null;
            servings?: string | number | null;
            eaten_at?: string | null;
            food?: { name?: string | null } | null;
        }>;
        workout_logs: Array<{
            id: number;
            performed_at?: string | null;
            mood?: string | null;
            sets?: unknown[];
        }>;
        appointments: Array<{
            id: number;
            scheduled_at?: string | null;
            status?: string | null;
            professional_role?: string | null;
        }>;
        ai_conversations: Array<{
            id: number;
            title?: string | null;
            messages_count?: number | null;
            last_message_at?: string | null;
        }>;
        planner_feedback: Array<{
            ai_request_id: number;
            generated_at?: string | null;
            provider?: string | null;
            model?: string | null;
            horizon_days: number;
            feedback_period_start_date: string;
            feedback_period_end_date: string;
            baseline_weight_kg?: number | null;
            base_weekly_weight_change_kg?: number | null;
            adjusted_weekly_weight_change_kg?: number | null;
            projected_before_feedback_kg?: number | null;
            projected_after_feedback_kg?: number | null;
            last_prediction_error_kg_per_week?: number | null;
            feedback_applied: boolean;
            feedback_notes?: string | null;
            confidence?: string | null;
            inference_source?: string | null;
            actual_weight_kg?: number | null;
            actual_weight_date?: string | null;
        }>;
        plan_diffs: {
            diet?: PlanDiffSummary | null;
            workout?: PlanDiffSummary | null;
        };
    };
};

type UserForm = {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    role: AdminUserDetail['role'];
    status: string;
    verified: boolean;
    email_verified: boolean;
    gender: string;
    age: string;
    height_cm: string;
    weight_kg: string;
    dietary_goal: string;
    fitness_goal: string;
    diet_name: string;
    activity_level: string;
    workout_days_per_week: string;
    workout_location: string;
    city: string;
    contact_display: string;
    availability_text: string;
    profile_lat: string;
    profile_lng: string;
    medical_history: string;
    has_medical_history: boolean;
    tried_diet_before: 'unknown' | 'true' | 'false';
    diet_failure_other: string;
    professional_bio: string;
    allergies_text: string;
    diet_failure_reasons_text: string;
    specialties_text: string;
    password: string;
    password_confirmation: string;
};

type PrefsForm = {
    units: 'metric' | 'imperial';
    theme: 'light' | 'dark' | 'system';
    home_gym: string;
    is_public: boolean;
    bmr_kcal: string;
    tdee_kcal: string;
    activity_factor: string;
    daily_goal_calories: string;
    daily_goal_protein_g: string;
    daily_goal_carbs_g: string;
    daily_goal_fat_g: string;
    water_cups_per_day: string;
    workout_days_target: string;
    notifications_json: string;
    settings_json: string;
};

type DetailTab = 'access' | 'safety' | 'programs' | 'preferences';

const EMPTY_USER_FORM: UserForm = {
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    role: 'client',
    status: '',
    verified: false,
    email_verified: false,
    gender: '',
    age: '',
    height_cm: '',
    weight_kg: '',
    dietary_goal: '',
    fitness_goal: '',
    diet_name: '',
    activity_level: '',
    workout_days_per_week: '',
    workout_location: '',
    city: '',
    contact_display: '',
    availability_text: '',
    profile_lat: '',
    profile_lng: '',
    medical_history: '',
    has_medical_history: false,
    tried_diet_before: 'unknown',
    diet_failure_other: '',
    professional_bio: '',
    allergies_text: '',
    diet_failure_reasons_text: '',
    specialties_text: '',
    password: '',
    password_confirmation: '',
};

const EMPTY_PREFS_FORM: PrefsForm = {
    units: 'metric',
    theme: 'system',
    home_gym: '',
    is_public: false,
    bmr_kcal: '',
    tdee_kcal: '',
    activity_factor: '',
    daily_goal_calories: '',
    daily_goal_protein_g: '',
    daily_goal_carbs_g: '',
    daily_goal_fat_g: '',
    water_cups_per_day: '',
    workout_days_target: '',
    notifications_json: '{}',
    settings_json: '{}',
};

export default function AdminUserShow() {
    const { userId } = usePage<Props>().props;
    const [detail, setDetail] = useState<DetailResponse | null>(null);
    const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER_FORM);
    const [prefsForm, setPrefsForm] = useState<PrefsForm>(EMPTY_PREFS_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<DetailTab>('access');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}`);
            if (!res.ok) {
                throw new Error('Could not load the user record.');
            }

            const json = (await res.json()) as DetailResponse;
            setDetail(json);
            setUserForm(buildUserForm(json));
            setPrefsForm(buildPrefsForm(json));
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load the user record.',
            );
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void load();
    }, [load]);

    async function saveUser() {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload(userForm, prefsForm)),
            });

            if (!res.ok) {
                throw new Error(await readErrorMessage(res));
            }

            const json = (await res.json()) as DetailResponse;
            setDetail(json);
            setUserForm(buildUserForm(json));
            setPrefsForm(buildPrefsForm(json));
            setSuccess('User record updated successfully.');
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : 'Could not save the user record.',
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser(reason: string) {
        setDeleting(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            if (!res.ok) {
                setError(await readErrorMessage(res));
                return;
            }

            setDeleteDialogOpen(false);
            router.visit('/admin/users');
        } finally {
            setDeleting(false);
        }
    }

    const displayName =
        detail?.user?.display_name ||
        [detail?.user?.first_name, detail?.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        detail?.user?.email ||
        `User #${userId}`;

    const riskItems = useMemo(() => {
        if (!detail) {
            return [];
        }

        const items: Array<{
            severity: 'info' | 'warning' | 'danger' | 'success';
            title: string;
            description: string;
            meta?: string;
        }> = [];

        if ((detail.user.allergies ?? []).length > 0) {
            items.push({
                severity: 'danger',
                title: 'Allergies recorded',
                description: detail.user.allergies!.join(', '),
                meta: 'Planner and coach safety',
            });
        }

        if (detail.user.has_medical_history && detail.user.medical_history) {
            items.push({
                severity: 'warning',
                title: 'Medical history on file',
                description: detail.user.medical_history,
                meta: 'Review before training or nutrition changes',
            });
        }

        if (
            detail.user.status &&
            ['suspended', 'rejected'].includes(detail.user.status)
        ) {
            items.push({
                severity: 'danger',
                title: `Account status is ${detail.user.status}`,
                description:
                    'This account already has a high-risk state. Double-check the surrounding activity before making changes.',
            });
        } else if (
            detail.user.status &&
            ['needs_review', 'needs_info'].includes(detail.user.status)
        ) {
            items.push({
                severity: 'warning',
                title: `Account status is ${detail.user.status.replace(/_/g, ' ')}`,
                description:
                    'There is an open moderation or profile follow-up for this account.',
            });
        }

        if (
            detail.verification?.review_status &&
            detail.verification.review_status !== 'approved'
        ) {
            items.push({
                severity: 'info',
                title: 'Professional verification still open',
                description:
                    detail.verification.notes ||
                    'The latest professional verification record is not approved yet.',
                meta: detail.verification.review_status,
            });
        }

        if (!detail.user.email_verified_at) {
            items.push({
                severity: 'warning',
                title: 'Email is not verified',
                description:
                    'Access and notification issues may be related to an unverified email address.',
            });
        }

        return items;
    }, [detail]);

    const activityTimelineItems = useMemo(() => {
        if (!detail) {
            return [];
        }

        return [
            ...(detail.recent.notifications ?? []).map((item) => ({
                id: `notification-${item.id}`,
                title: item.title,
                description: item.body,
                meta: 'Notification',
                timestamp: formatDateTime(item.created_at),
                sortValue: new Date(item.created_at).getTime(),
                tone: 'info' as const,
            })),
            ...(detail.recent.meal_entries ?? []).map((item) => ({
                id: `meal-${item.id}`,
                title: item.food?.name || item.meal_type || 'Meal entry',
                description: `${item.meal_type ?? 'Meal'} - ${item.servings ?? '-'} serving(s)`,
                meta: 'Meal log',
                timestamp: formatDateTime(item.eaten_at),
                sortValue: item.eaten_at
                    ? new Date(item.eaten_at).getTime()
                    : 0,
                tone: 'success' as const,
            })),
            ...(detail.recent.workout_logs ?? []).map((item) => ({
                id: `workout-${item.id}`,
                title: `${item.sets?.length ?? 0} logged set(s)`,
                description: item.mood || 'Workout session',
                meta: 'Workout log',
                timestamp: formatDateTime(item.performed_at),
                sortValue: item.performed_at
                    ? new Date(item.performed_at).getTime()
                    : 0,
                tone: 'success' as const,
            })),
            ...(detail.recent.appointments ?? []).map((item) => ({
                id: `appointment-${item.id}`,
                title: item.professional_role || 'Appointment',
                description: item.status || 'scheduled',
                meta: 'Appointment',
                timestamp: formatDateTime(item.scheduled_at),
                sortValue: item.scheduled_at
                    ? new Date(item.scheduled_at).getTime()
                    : 0,
                tone: 'warning' as const,
            })),
            ...(detail.recent.ai_conversations ?? []).map((item) => ({
                id: `conversation-${item.id}`,
                title: item.title || 'Untitled conversation',
                description: `${item.messages_count ?? 0} messages`,
                meta: 'AI coach',
                timestamp: formatDateTime(item.last_message_at),
                sortValue: item.last_message_at
                    ? new Date(item.last_message_at).getTime()
                    : 0,
                tone: 'default' as const,
            })),
        ]
            .sort((a, b) => b.sortValue - a.sortValue)
            .slice(0, 10);
    }, [detail]);

    const plannerTrendPoints = useMemo(() => {
        const rows = [...(detail?.recent.planner_feedback ?? [])]
            .reverse()
            .map(
                (item) =>
                    item.projected_after_feedback_kg ??
                    item.actual_weight_kg ??
                    item.baseline_weight_kg,
            )
            .filter(
                (value): value is number =>
                    typeof value === 'number' && Number.isFinite(value),
            );

        return rows;
    }, [detail?.recent.planner_feedback]);

    return (
        <>
            <Head title="Admin User Detail" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title={displayName}
                    description="Edit account access, profile data, restrictions, and preferences while keeping recent activity visible for faster admin decisions."
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href="/admin/users">Back to users</Link>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => void load()}
                                disabled={loading}
                            >
                                Refresh
                            </Button>
                            <Button
                                type="button"
                                onClick={() => void saveUser()}
                                disabled={saving || loading}
                            >
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : 'Save changes'}
                            </Button>
                        </>
                    }
                >
                    <div className="space-y-6">
                        {error ? (
                            <MessageBox tone="error">{error}</MessageBox>
                        ) : null}
                        {success ? (
                            <MessageBox tone="success">{success}</MessageBox>
                        ) : null}

                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Meal Entries"
                                value={String(
                                    detail?.summary?.meal_entries ?? 0,
                                )}
                                tone="accent"
                            />
                            <AdminStatCard
                                label="Workout Logs"
                                value={String(
                                    detail?.summary?.workout_logs ?? 0,
                                )}
                            />
                            <AdminStatCard
                                label="Appointments"
                                value={String(
                                    detail?.summary?.appointments ?? 0,
                                )}
                            />
                            <AdminStatCard
                                label="Notifications"
                                value={String(
                                    detail?.summary?.notifications ?? 0,
                                )}
                            />
                        </AdminStatsGrid>

                        <div className="dashboard-surface rounded-[28px] px-5 py-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div className="max-w-2xl">
                                    <div className="haye-kicker">
                                        Investigation workspace
                                    </div>
                                    <h2
                                        className="mt-3 text-3xl tracking-tight text-foreground"
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                        }}
                                    >
                                        Keep the full editor, but only surface
                                        the section you are working on.
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Account access, safety context, program
                                        data, and preferences now live in one
                                        workflow with a fixed context rail for
                                        the details that should stay visible.
                                    </p>
                                </div>

                                <div className="w-full lg:max-w-xl">
                                    <AdminToggleGroup
                                        value={activeTab}
                                        onChange={(value) =>
                                            setActiveTab(value as DetailTab)
                                        }
                                        options={[
                                            {
                                                value: 'access',
                                                label: 'Access',
                                            },
                                            {
                                                value: 'safety',
                                                label: 'Safety',
                                            },
                                            {
                                                value: 'programs',
                                                label: 'Programs',
                                            },
                                            {
                                                value: 'preferences',
                                                label: 'Preferences',
                                            },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
                            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                                {activeTab === 'access' ? (
                                    <AdminSection
                                        title="Account Access"
                                        description="Core identity, permissions, and login settings."
                                    >
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <TextField
                                                label="First name"
                                                value={userForm.first_name}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        first_name: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Last name"
                                                value={userForm.last_name}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        last_name: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Username"
                                                value={userForm.username}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        username: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Email"
                                                type="email"
                                                value={userForm.email}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        email: value,
                                                    }))
                                                }
                                            />
                                            <SelectField
                                                label="Role"
                                                value={userForm.role}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        role: value as UserForm['role'],
                                                    }))
                                                }
                                                options={[
                                                    {
                                                        value: 'admin',
                                                        label: 'Admin',
                                                    },
                                                    {
                                                        value: 'client',
                                                        label: 'Client',
                                                    },
                                                    {
                                                        value: 'trainer',
                                                        label: 'Trainer',
                                                    },
                                                    {
                                                        value: 'nutritionist',
                                                        label: 'Nutritionist',
                                                    },
                                                ]}
                                            />
                                            <TextField
                                                label="Status"
                                                value={userForm.status}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        status: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Temporary password"
                                                type="password"
                                                value={userForm.password}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        password: value,
                                                    }))
                                                }
                                                placeholder="Leave blank to keep current password"
                                            />
                                            <TextField
                                                label="Confirm password"
                                                type="password"
                                                value={
                                                    userForm.password_confirmation
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        password_confirmation:
                                                            value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="dashboard-surface-soft mt-4 flex flex-wrap gap-4 rounded-2xl p-4">
                                            <BooleanField
                                                label="Professional verified"
                                                checked={userForm.verified}
                                                onCheckedChange={(checked) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        verified: checked,
                                                    }))
                                                }
                                            />
                                            <BooleanField
                                                label="Email verified"
                                                checked={
                                                    userForm.email_verified
                                                }
                                                onCheckedChange={(checked) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        email_verified: checked,
                                                    }))
                                                }
                                            />
                                        </div>
                                    </AdminSection>
                                ) : null}

                                {activeTab === 'safety' ? (
                                    <AdminSection
                                        title="Health And Goals"
                                        description="Physical profile, objectives, and workout cadence."
                                    >
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            <SelectField
                                                label="Gender"
                                                value={userForm.gender}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        gender: value,
                                                    }))
                                                }
                                                options={[
                                                    {
                                                        value: '',
                                                        label: 'Not set',
                                                    },
                                                    {
                                                        value: 'male',
                                                        label: 'Male',
                                                    },
                                                    {
                                                        value: 'female',
                                                        label: 'Female',
                                                    },
                                                    {
                                                        value: 'other',
                                                        label: 'Other',
                                                    },
                                                ]}
                                            />
                                            <TextField
                                                label="Age"
                                                type="number"
                                                value={userForm.age}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        age: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Height (cm)"
                                                type="number"
                                                value={userForm.height_cm}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        height_cm: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Weight (kg)"
                                                type="number"
                                                value={userForm.weight_kg}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        weight_kg: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Dietary goal"
                                                value={userForm.dietary_goal}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        dietary_goal: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Fitness goal"
                                                value={userForm.fitness_goal}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        fitness_goal: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Diet type"
                                                value={userForm.diet_name}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        diet_name: value,
                                                    }))
                                                }
                                            />
                                            <SelectField
                                                label="Activity level"
                                                value={userForm.activity_level}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        activity_level: value,
                                                    }))
                                                }
                                                options={[
                                                    {
                                                        value: '',
                                                        label: 'Not set',
                                                    },
                                                    {
                                                        value: 'Sedentary',
                                                        label: 'Sedentary',
                                                    },
                                                    {
                                                        value: 'Lightly Active',
                                                        label: 'Lightly Active',
                                                    },
                                                    {
                                                        value: 'Moderately Active',
                                                        label: 'Moderately Active',
                                                    },
                                                    {
                                                        value: 'Very Active',
                                                        label: 'Very Active',
                                                    },
                                                    {
                                                        value: 'Athlete',
                                                        label: 'Athlete',
                                                    },
                                                ]}
                                            />
                                            <TextField
                                                label="Workout days per week"
                                                type="number"
                                                value={
                                                    userForm.workout_days_per_week
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        workout_days_per_week:
                                                            value,
                                                    }))
                                                }
                                            />
                                            <SelectField
                                                label="Workout location"
                                                value={
                                                    userForm.workout_location
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        workout_location: value,
                                                    }))
                                                }
                                                options={[
                                                    {
                                                        value: '',
                                                        label: 'Not set',
                                                    },
                                                    {
                                                        value: 'home',
                                                        label: 'Home',
                                                    },
                                                    {
                                                        value: 'gym',
                                                        label: 'Gym',
                                                    },
                                                    {
                                                        value: 'both',
                                                        label: 'Both',
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </AdminSection>
                                ) : null}

                                {activeTab === 'safety' ? (
                                    <AdminSection
                                        title="Medical And Restrictions"
                                        description="Important safety details used by AI and professionals."
                                    >
                                        <div className="space-y-4">
                                            <BooleanField
                                                label="Has medical history"
                                                checked={
                                                    userForm.has_medical_history
                                                }
                                                onCheckedChange={(checked) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        has_medical_history:
                                                            checked,
                                                    }))
                                                }
                                            />
                                            <TextareaField
                                                label="Medical history"
                                                value={userForm.medical_history}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        medical_history: value,
                                                    }))
                                                }
                                                rows={4}
                                            />
                                            <TextareaField
                                                label="Allergies"
                                                value={userForm.allergies_text}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        allergies_text: value,
                                                    }))
                                                }
                                                rows={3}
                                                helper="Comma-separated."
                                            />
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <SelectField
                                                    label="Tried diet before"
                                                    value={
                                                        userForm.tried_diet_before
                                                    }
                                                    onChange={(value) =>
                                                        setUserForm(
                                                            (current) => ({
                                                                ...current,
                                                                tried_diet_before:
                                                                    value as UserForm['tried_diet_before'],
                                                            }),
                                                        )
                                                    }
                                                    options={[
                                                        {
                                                            value: 'unknown',
                                                            label: 'Unknown',
                                                        },
                                                        {
                                                            value: 'true',
                                                            label: 'Yes',
                                                        },
                                                        {
                                                            value: 'false',
                                                            label: 'No',
                                                        },
                                                    ]}
                                                />
                                                <TextField
                                                    label="Diet failure other"
                                                    value={
                                                        userForm.diet_failure_other
                                                    }
                                                    onChange={(value) =>
                                                        setUserForm(
                                                            (current) => ({
                                                                ...current,
                                                                diet_failure_other:
                                                                    value,
                                                            }),
                                                        )
                                                    }
                                                />
                                            </div>
                                            <TextareaField
                                                label="Diet failure reasons"
                                                value={
                                                    userForm.diet_failure_reasons_text
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        diet_failure_reasons_text:
                                                            value,
                                                    }))
                                                }
                                                rows={3}
                                                helper="Comma-separated."
                                            />
                                        </div>
                                    </AdminSection>
                                ) : null}

                                {activeTab === 'programs' ? (
                                    <AdminSection
                                        title="Professional And Contact Profile"
                                        description="Location, specialties, and public-facing details."
                                    >
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <TextField
                                                label="City"
                                                value={userForm.city}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        city: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Contact display"
                                                value={userForm.contact_display}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        contact_display: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Availability"
                                                value={
                                                    userForm.availability_text
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        availability_text:
                                                            value,
                                                    }))
                                                }
                                            />
                                            <TextareaField
                                                label="Specialties"
                                                value={
                                                    userForm.specialties_text
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        specialties_text: value,
                                                    }))
                                                }
                                                rows={3}
                                                helper="Comma-separated."
                                            />
                                            <TextField
                                                label="Profile latitude"
                                                type="number"
                                                value={userForm.profile_lat}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        profile_lat: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Profile longitude"
                                                type="number"
                                                value={userForm.profile_lng}
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        profile_lng: value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <TextareaField
                                                label="Professional bio"
                                                value={
                                                    userForm.professional_bio
                                                }
                                                onChange={(value) =>
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        professional_bio: value,
                                                    }))
                                                }
                                                rows={6}
                                            />
                                        </div>
                                    </AdminSection>
                                ) : null}

                                {activeTab === 'programs' ? (
                                    <AdminSection
                                        title="Planner Model Feedback"
                                        description="Inspect the planner predictor feedback loop for this user, including before and after adjustment plus logged outcomes."
                                    >
                                        {(detail?.recent.planner_feedback ?? [])
                                            .length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No planner feedback runs
                                                available yet.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {(
                                                    detail?.recent
                                                        .planner_feedback ?? []
                                                ).map((entry) => (
                                                    <div
                                                        key={`planner-feedback-${entry.ai_request_id}`}
                                                        className="dashboard-surface rounded-[24px] p-4"
                                                    >
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <div className="text-sm font-semibold text-foreground">
                                                                Request #
                                                                {
                                                                    entry.ai_request_id
                                                                }
                                                            </div>
                                                            <Badge
                                                                variant={
                                                                    entry.feedback_applied
                                                                        ? 'default'
                                                                        : 'secondary'
                                                                }
                                                            >
                                                                {entry.feedback_applied
                                                                    ? 'Feedback applied'
                                                                    : 'No adjustment'}
                                                            </Badge>
                                                            {entry.confidence ? (
                                                                <Badge variant="outline">
                                                                    {
                                                                        entry.confidence
                                                                    }{' '}
                                                                    confidence
                                                                </Badge>
                                                            ) : null}
                                                            {entry.inference_source ? (
                                                                <Badge variant="outline">
                                                                    {
                                                                        entry.inference_source
                                                                    }
                                                                </Badge>
                                                            ) : null}
                                                        </div>

                                                        <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                                            <div>
                                                                Generated:{' '}
                                                                {formatDateTime(
                                                                    entry.generated_at,
                                                                )}
                                                            </div>
                                                            <div>
                                                                Horizon:{' '}
                                                                {
                                                                    entry.horizon_days
                                                                }{' '}
                                                                days
                                                            </div>
                                                            <div>
                                                                Period:{' '}
                                                                {
                                                                    entry.feedback_period_start_date
                                                                }{' '}
                                                                to{' '}
                                                                {
                                                                    entry.feedback_period_end_date
                                                                }
                                                            </div>
                                                            <div>
                                                                Provider/model:{' '}
                                                                {entry.provider ??
                                                                    '-'}{' '}
                                                                /{' '}
                                                                {entry.model ??
                                                                    '-'}
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                                                            <MetricPill
                                                                label="Baseline"
                                                                value={`${formatMetricNumber(entry.baseline_weight_kg)} kg`}
                                                            />
                                                            <MetricPill
                                                                label="Before feedback"
                                                                value={`${formatMetricNumber(entry.projected_before_feedback_kg)} kg`}
                                                            />
                                                            <MetricPill
                                                                label="After feedback"
                                                                value={`${formatMetricNumber(entry.projected_after_feedback_kg)} kg`}
                                                            />
                                                            <MetricPill
                                                                label="Base weekly"
                                                                value={`${formatSignedMetric(entry.base_weekly_weight_change_kg)} kg/week`}
                                                            />
                                                            <MetricPill
                                                                label="Adjusted weekly"
                                                                value={`${formatSignedMetric(entry.adjusted_weekly_weight_change_kg)} kg/week`}
                                                            />
                                                            <MetricPill
                                                                label="Last error"
                                                                value={`${formatSignedMetric(entry.last_prediction_error_kg_per_week)} kg/week`}
                                                            />
                                                            <MetricPill
                                                                label="Actual logged"
                                                                value={`${formatMetricNumber(entry.actual_weight_kg)} kg`}
                                                            />
                                                            <MetricPill
                                                                label="Actual date"
                                                                value={
                                                                    entry.actual_weight_date ??
                                                                    '-'
                                                                }
                                                            />
                                                        </div>

                                                        {entry.feedback_notes ? (
                                                            <div className="dashboard-surface-soft mt-3 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                                                                {
                                                                    entry.feedback_notes
                                                                }
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </AdminSection>
                                ) : null}

                                {activeTab === 'programs' ? (
                                    <AdminSection
                                        title="Plan Differences by Request"
                                        description="Latest versus previous generated plans, so you can see what changed between requests."
                                    >
                                        <div className="grid gap-4 lg:grid-cols-2">
                                            <PlanDiffCard
                                                title="Meal Plan Diff"
                                                diff={
                                                    detail?.recent.plan_diffs
                                                        ?.diet ?? null
                                                }
                                            />
                                            <PlanDiffCard
                                                title="Workout Plan Diff"
                                                diff={
                                                    detail?.recent.plan_diffs
                                                        ?.workout ?? null
                                                }
                                            />
                                        </div>
                                    </AdminSection>
                                ) : null}

                                {activeTab === 'preferences' ? (
                                    <AdminSection
                                        title="Preferences"
                                        description="Units, targets, and raw JSON settings."
                                    >
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            <SelectField
                                                label="Units"
                                                value={prefsForm.units}
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        units: value as PrefsForm['units'],
                                                    }))
                                                }
                                                options={[
                                                    {
                                                        value: 'metric',
                                                        label: 'Metric',
                                                    },
                                                    {
                                                        value: 'imperial',
                                                        label: 'Imperial',
                                                    },
                                                ]}
                                            />
                                            <SelectField
                                                label="Theme"
                                                value={prefsForm.theme}
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        theme: value as PrefsForm['theme'],
                                                    }))
                                                }
                                                options={[
                                                    {
                                                        value: 'light',
                                                        label: 'Light',
                                                    },
                                                    {
                                                        value: 'dark',
                                                        label: 'Dark',
                                                    },
                                                    {
                                                        value: 'system',
                                                        label: 'System',
                                                    },
                                                ]}
                                            />
                                            <TextField
                                                label="Home gym"
                                                value={prefsForm.home_gym}
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        home_gym: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="BMR (kcal)"
                                                type="number"
                                                value={prefsForm.bmr_kcal}
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        bmr_kcal: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="TDEE (kcal)"
                                                type="number"
                                                value={prefsForm.tdee_kcal}
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        tdee_kcal: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Activity factor"
                                                type="number"
                                                value={
                                                    prefsForm.activity_factor
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        activity_factor: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Daily goal calories"
                                                type="number"
                                                value={
                                                    prefsForm.daily_goal_calories
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        daily_goal_calories:
                                                            value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Protein goal (g)"
                                                type="number"
                                                value={
                                                    prefsForm.daily_goal_protein_g
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        daily_goal_protein_g:
                                                            value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Carbs goal (g)"
                                                type="number"
                                                value={
                                                    prefsForm.daily_goal_carbs_g
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        daily_goal_carbs_g:
                                                            value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Fat goal (g)"
                                                type="number"
                                                value={
                                                    prefsForm.daily_goal_fat_g
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        daily_goal_fat_g: value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Water cups per day"
                                                type="number"
                                                value={
                                                    prefsForm.water_cups_per_day
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        water_cups_per_day:
                                                            value,
                                                    }))
                                                }
                                            />
                                            <TextField
                                                label="Workout days target"
                                                type="number"
                                                value={
                                                    prefsForm.workout_days_target
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        workout_days_target:
                                                            value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="dashboard-surface-soft mt-4 flex flex-wrap gap-4 rounded-2xl p-4">
                                            <BooleanField
                                                label="Public profile"
                                                checked={prefsForm.is_public}
                                                onCheckedChange={(checked) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        is_public: checked,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                            <TextareaField
                                                label="Notifications JSON"
                                                value={
                                                    prefsForm.notifications_json
                                                }
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        notifications_json:
                                                            value,
                                                    }))
                                                }
                                                rows={8}
                                            />
                                            <TextareaField
                                                label="Settings JSON"
                                                value={prefsForm.settings_json}
                                                onChange={(value) =>
                                                    setPrefsForm((current) => ({
                                                        ...current,
                                                        settings_json: value,
                                                    }))
                                                }
                                                rows={8}
                                            />
                                        </div>
                                    </AdminSection>
                                ) : null}
                            </div>
                            <div className="space-y-6">
                                <AdminSection
                                    title="Record Snapshot"
                                    description="Quick account context, safety posture, and escalation state."
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                <UserRound className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-lg font-semibold text-foreground">
                                                    {displayName}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {detail?.user.email}
                                                </div>
                                            </div>
                                        </div>
                                        <StatusChipSet
                                            items={[
                                                {
                                                    value:
                                                        detail?.user.role ?? '',
                                                    label:
                                                        detail?.user.role ??
                                                        undefined,
                                                },
                                                {
                                                    value: detail?.user.verified
                                                        ? 'verified'
                                                        : 'unverified',
                                                },
                                                {
                                                    value:
                                                        detail?.user.status ||
                                                        'pending',
                                                },
                                                {
                                                    value:
                                                        detail?.user
                                                            .workout_location ||
                                                        '',
                                                    label:
                                                        detail?.user
                                                            .workout_location ||
                                                        undefined,
                                                },
                                            ]}
                                        />
                                        <MetaRow
                                            icon={
                                                <CalendarDays className="h-4 w-4" />
                                            }
                                            label="Created"
                                            value={formatDateTime(
                                                detail?.user.created_at,
                                            )}
                                        />
                                        <MetaRow
                                            icon={
                                                <ShieldCheck className="h-4 w-4" />
                                            }
                                            label="Email verified"
                                            value={
                                                detail?.user.email_verified_at
                                                    ? formatDateTime(
                                                          detail.user
                                                              .email_verified_at,
                                                      )
                                                    : 'Not verified'
                                            }
                                        />
                                        <MetaRow
                                            icon={
                                                <MapPin className="h-4 w-4" />
                                            }
                                            label="City"
                                            value={
                                                detail?.user.city || 'Not set'
                                            }
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() =>
                                                setDeleteDialogOpen(true)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete user
                                        </Button>
                                    </div>
                                </AdminSection>

                                {riskItems.length > 0 ? (
                                    <RiskBannerStack items={riskItems} />
                                ) : (
                                    <AdminNotice tone="success">
                                        No active safety or moderation flags are
                                        surfaced from this quick view.
                                    </AdminNotice>
                                )}

                                <AdminSection
                                    title="Verification"
                                    description="Latest professional verification record."
                                >
                                    {detail?.verification ? (
                                        <div className="space-y-3 text-sm">
                                            <MetaRow
                                                icon={
                                                    <ShieldCheck className="h-4 w-4" />
                                                }
                                                label="Status"
                                                value={
                                                    detail.verification
                                                        .review_status ||
                                                    'pending'
                                                }
                                            />
                                            <MetaRow
                                                icon={
                                                    <Activity className="h-4 w-4" />
                                                }
                                                label="Role"
                                                value={
                                                    detail.verification.role ||
                                                    'n/a'
                                                }
                                            />
                                            <MetaRow
                                                icon={
                                                    <UserRound className="h-4 w-4" />
                                                }
                                                label="Legal name"
                                                value={
                                                    detail.verification
                                                        .full_legal_name ||
                                                    'n/a'
                                                }
                                            />
                                            <MetaRow
                                                icon={
                                                    <MapPin className="h-4 w-4" />
                                                }
                                                label="Authority"
                                                value={
                                                    detail.verification
                                                        .authority || 'n/a'
                                                }
                                            />
                                            {detail.verification.notes ? (
                                                <div className="dashboard-surface-soft rounded-2xl p-3 text-sm text-muted-foreground">
                                                    {detail.verification.notes}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No professional verification record
                                            for this user.
                                        </p>
                                    )}
                                </AdminSection>

                                <MetricChartCard
                                    title="Planner trend"
                                    value={
                                        plannerTrendPoints.length > 0
                                            ? `${plannerTrendPoints.at(-1)?.toFixed(1)} kg`
                                            : 'No data'
                                    }
                                    helper="Latest projected or logged body-weight signal from planner feedback."
                                    points={plannerTrendPoints}
                                    summary={
                                        detail?.recent.planner_feedback?.length
                                            ? `${detail.recent.planner_feedback.length} planner run(s) available for review.`
                                            : 'Planner feedback detail moves into the Programs tab once runs exist.'
                                    }
                                />

                                <AdminSection
                                    title="Recent Activity"
                                    description="The latest events across notifications, meals, workouts, appointments, and AI."
                                >
                                    <ActivityTimeline
                                        items={activityTimelineItems}
                                        emptyTitle="No recent activity"
                                        emptyDescription="Recent user events will appear here as meals, workouts, appointments, and conversations are recorded."
                                    />
                                    {detail?.summary?.notifications === -1 ? (
                                        <div className="space-y-4">
                                            <ActivityCard
                                                icon={
                                                    <BellRing className="h-4 w-4" />
                                                }
                                                title="Notifications"
                                                items={
                                                    detail?.recent
                                                        .notifications ?? []
                                                }
                                                render={(item) => ({
                                                    title: item.title,
                                                    subtitle: item.body,
                                                    meta: formatDateTime(
                                                        item.created_at,
                                                    ),
                                                })}
                                            />
                                            <ActivityCard
                                                icon={
                                                    <Activity className="h-4 w-4" />
                                                }
                                                title="Meal entries"
                                                items={
                                                    detail?.recent
                                                        .meal_entries ?? []
                                                }
                                                render={(item) => ({
                                                    title:
                                                        item.food?.name ||
                                                        item.meal_type ||
                                                        'Meal',
                                                    subtitle: `${item.meal_type ?? 'meal'} · ${item.servings ?? '-'} serving(s)`,
                                                    meta: formatDateTime(
                                                        item.eaten_at,
                                                    ),
                                                })}
                                            />
                                            <ActivityCard
                                                icon={
                                                    <Dumbbell className="h-4 w-4" />
                                                }
                                                title="Workout logs"
                                                items={
                                                    detail?.recent
                                                        .workout_logs ?? []
                                                }
                                                render={(item) => ({
                                                    title: `${item.sets?.length ?? 0} logged set(s)`,
                                                    subtitle:
                                                        item.mood ||
                                                        'Workout session',
                                                    meta: formatDateTime(
                                                        item.performed_at,
                                                    ),
                                                })}
                                            />
                                            <ActivityCard
                                                icon={
                                                    <CalendarDays className="h-4 w-4" />
                                                }
                                                title="Appointments"
                                                items={
                                                    detail?.recent
                                                        .appointments ?? []
                                                }
                                                render={(item) => ({
                                                    title:
                                                        item.professional_role ||
                                                        'Appointment',
                                                    subtitle:
                                                        item.status ||
                                                        'scheduled',
                                                    meta: formatDateTime(
                                                        item.scheduled_at,
                                                    ),
                                                })}
                                            />
                                            <ActivityCard
                                                icon={
                                                    <Brain className="h-4 w-4" />
                                                }
                                                title="AI conversations"
                                                items={
                                                    detail?.recent
                                                        .ai_conversations ?? []
                                                }
                                                render={(item) => ({
                                                    title:
                                                        item.title ||
                                                        'Untitled conversation',
                                                    subtitle: `${item.messages_count ?? 0} messages`,
                                                    meta: formatDateTime(
                                                        item.last_message_at,
                                                    ),
                                                })}
                                            />
                                        </div>
                                    ) : null}
                                </AdminSection>
                            </div>
                        </div>
                    </div>
                </AdminShell>
            </RoleGuard>
            <ConfirmActionDialogWithReason
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Delete user account"
                description="This will remove the user account and write the reason into the admin audit log."
                confirmLabel="Delete user"
                busy={deleting}
                onConfirm={(reason) => void deleteUser(reason)}
            />
        </>
    );
}

function buildPayload(userForm: UserForm, prefsForm: PrefsForm) {
    return {
        first_name: userForm.first_name || null,
        last_name: userForm.last_name || null,
        username: userForm.username || null,
        email: userForm.email || null,
        role: userForm.role,
        status: userForm.status || null,
        verified: userForm.verified,
        email_verified: userForm.email_verified,
        gender: userForm.gender || null,
        age: nullableNumber(userForm.age),
        height_cm: nullableNumber(userForm.height_cm),
        weight_kg: nullableNumber(userForm.weight_kg),
        dietary_goal: userForm.dietary_goal || null,
        fitness_goal: userForm.fitness_goal || null,
        diet_name: userForm.diet_name || null,
        activity_level: userForm.activity_level || null,
        workout_days_per_week: nullableNumber(userForm.workout_days_per_week),
        workout_location: userForm.workout_location || null,
        city: userForm.city || null,
        contact_display: userForm.contact_display || null,
        availability_text: userForm.availability_text || null,
        profile_lat: nullableNumber(userForm.profile_lat),
        profile_lng: nullableNumber(userForm.profile_lng),
        has_medical_history: userForm.has_medical_history,
        medical_history: userForm.medical_history || null,
        tried_diet_before:
            userForm.tried_diet_before === 'unknown'
                ? null
                : userForm.tried_diet_before === 'true',
        diet_failure_other: userForm.diet_failure_other || null,
        professional_bio: userForm.professional_bio || null,
        allergies: splitCommaText(userForm.allergies_text),
        diet_failure_reasons: splitCommaText(
            userForm.diet_failure_reasons_text,
        ),
        specialties: splitCommaText(userForm.specialties_text),
        password: userForm.password || undefined,
        password_confirmation: userForm.password_confirmation || undefined,
        prefs: {
            units: prefsForm.units,
            theme: prefsForm.theme,
            home_gym: prefsForm.home_gym || null,
            is_public: prefsForm.is_public,
            bmr_kcal: nullableNumber(prefsForm.bmr_kcal),
            tdee_kcal: nullableNumber(prefsForm.tdee_kcal),
            activity_factor: nullableNumber(prefsForm.activity_factor),
            daily_goal_calories: nullableNumber(prefsForm.daily_goal_calories),
            daily_goal_protein_g: nullableNumber(
                prefsForm.daily_goal_protein_g,
            ),
            daily_goal_carbs_g: nullableNumber(prefsForm.daily_goal_carbs_g),
            daily_goal_fat_g: nullableNumber(prefsForm.daily_goal_fat_g),
            water_cups_per_day: nullableNumber(prefsForm.water_cups_per_day),
            workout_days_target: nullableNumber(prefsForm.workout_days_target),
            notifications: parseJsonObject(
                prefsForm.notifications_json,
                'preferences notifications',
            ),
            settings: parseJsonObject(
                prefsForm.settings_json,
                'preferences settings',
            ),
        },
    };
}

function buildUserForm(detail: DetailResponse): UserForm {
    const user = detail.user;

    return {
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        username: user.username ?? '',
        email: user.email ?? '',
        role: user.role ?? 'client',
        status: user.status ?? '',
        verified: Boolean(user.verified),
        email_verified: Boolean(user.email_verified_at),
        gender: user.gender ?? '',
        age: toInputValue(user.age),
        height_cm: toInputValue(user.height_cm),
        weight_kg: toInputValue(user.weight_kg),
        dietary_goal: user.dietary_goal ?? '',
        fitness_goal: user.fitness_goal ?? '',
        diet_name: user.diet_name ?? '',
        activity_level: user.activity_level ?? '',
        workout_days_per_week: toInputValue(user.workout_days_per_week),
        workout_location: user.workout_location ?? '',
        city: user.city ?? '',
        contact_display: user.contact_display ?? '',
        availability_text: user.availability_text ?? '',
        profile_lat: toInputValue(user.profile_lat),
        profile_lng: toInputValue(user.profile_lng),
        medical_history: user.medical_history ?? '',
        has_medical_history: Boolean(user.has_medical_history),
        tried_diet_before:
            user.tried_diet_before === null ||
            user.tried_diet_before === undefined
                ? 'unknown'
                : user.tried_diet_before
                  ? 'true'
                  : 'false',
        diet_failure_other: user.diet_failure_other ?? '',
        professional_bio: user.professional_bio ?? '',
        allergies_text: (user.allergies ?? []).join(', '),
        diet_failure_reasons_text: (user.diet_failure_reasons ?? []).join(', '),
        specialties_text: (user.specialties ?? []).join(', '),
        password: '',
        password_confirmation: '',
    };
}

function buildPrefsForm(detail: DetailResponse): PrefsForm {
    const prefs = detail.prefs ?? {};

    return {
        units: prefs.units === 'imperial' ? 'imperial' : 'metric',
        theme:
            prefs.theme === 'light' || prefs.theme === 'dark'
                ? prefs.theme
                : 'system',
        home_gym: prefs.home_gym ?? '',
        is_public: Boolean(prefs.is_public),
        bmr_kcal: toInputValue(prefs.bmr_kcal),
        tdee_kcal: toInputValue(prefs.tdee_kcal),
        activity_factor: toInputValue(prefs.activity_factor),
        daily_goal_calories: toInputValue(prefs.daily_goal_calories),
        daily_goal_protein_g: toInputValue(prefs.daily_goal_protein_g),
        daily_goal_carbs_g: toInputValue(prefs.daily_goal_carbs_g),
        daily_goal_fat_g: toInputValue(prefs.daily_goal_fat_g),
        water_cups_per_day: toInputValue(prefs.water_cups_per_day),
        workout_days_target: toInputValue(prefs.workout_days_target),
        notifications_json: JSON.stringify(prefs.notifications ?? {}, null, 2),
        settings_json: JSON.stringify(prefs.settings ?? {}, null, 2),
    };
}

function MessageBox({
    children,
    tone,
}: {
    children: ReactNode;
    tone: 'error' | 'success';
}) {
    return (
        <AdminNotice tone={tone === 'error' ? 'danger' : 'success'}>
            {children}
        </AdminNotice>
    );
}

function TextField({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <AdminField label={label}>
            <AdminInput
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </AdminField>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <AdminField label={label}>
            <AdminNativeSelect
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </AdminNativeSelect>
        </AdminField>
    );
}

function TextareaField({
    label,
    value,
    onChange,
    rows = 4,
    helper,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    helper?: string;
}) {
    return (
        <AdminField label={label} helper={helper}>
            <AdminTextarea
                rows={rows}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </AdminField>
    );
}

function BooleanField({
    label,
    checked,
    onCheckedChange,
}: {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <AdminCheckboxField
            checked={checked}
            onCheckedChange={onCheckedChange}
            label={label}
        />
    );
}

function MetaRow({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="dashboard-surface-soft flex items-start gap-3 rounded-2xl px-3 py-3">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div className="min-w-0">
                <div className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                    {label}
                </div>
                <div className="mt-1 text-sm text-foreground">{value}</div>
            </div>
        </div>
    );
}

function ActivityCard<T>({
    icon,
    title,
    items,
    render,
}: {
    icon: ReactNode;
    title: string;
    items: T[];
    render: (item: T) => { title: string; subtitle: string; meta: string };
}) {
    return (
        <div className="rounded-2xl border border-border/70">
            <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-sm font-semibold text-foreground">
                {icon}
                {title}
            </div>
            <div className="space-y-3 px-4 py-4">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No recent items.
                    </p>
                ) : (
                    items.slice(0, 4).map((item, index) => {
                        const row = render(item);

                        return (
                            <div
                                key={`${title}-${index}`}
                                className="dashboard-surface-soft rounded-[20px] px-3 py-3"
                            >
                                <div className="text-sm font-medium text-foreground">
                                    {row.title}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {row.subtitle}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {row.meta}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="dashboard-surface-soft rounded-xl px-3 py-2">
            <div className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                {label}
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">
                {value}
            </div>
        </div>
    );
}

function PlanDiffCard({
    title,
    diff,
}: {
    title: string;
    diff: PlanDiffSummary | null;
}) {
    if (!diff || !diff.has_current) {
        return (
            <div className="dashboard-surface rounded-[24px] p-4">
                <div className="text-sm font-semibold text-foreground">
                    {title}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    No generated plan found yet.
                </p>
            </div>
        );
    }

    const currentMetrics = diff.current_metrics ?? {};
    const previousMetrics = diff.previous_metrics ?? {};
    const metricKeys = Array.from(
        new Set([
            ...Object.keys(currentMetrics),
            ...Object.keys(previousMetrics ?? {}),
        ]),
    );

    const changeEntries = Object.entries(diff.changes ?? {}).filter(
        ([, values]) => Array.isArray(values) && values.length > 0,
    );

    return (
        <div className="dashboard-surface rounded-[24px] p-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-foreground">
                    {title}
                </div>
                <Badge variant={diff.changed ? 'default' : 'secondary'}>
                    {diff.has_previous
                        ? diff.changed
                            ? 'Changed'
                            : 'No changes'
                        : 'Only one version'}
                </Badge>
            </div>

            <div className="mt-2 text-xs text-muted-foreground">
                Current v{diff.current_version}
                {diff.has_previous && diff.previous_version
                    ? ` vs previous v${diff.previous_version}`
                    : ''}
            </div>

            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>
                    Current generated:{' '}
                    {formatDateTime(diff.current_generated_at)}
                </div>
                {diff.has_previous ? (
                    <div>
                        Previous generated:{' '}
                        {formatDateTime(diff.previous_generated_at)}
                    </div>
                ) : null}
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {metricKeys.map((key) => (
                    <MetricPill
                        key={`${title}-${key}`}
                        label={formatDiffLabel(key)}
                        value={`${currentMetrics[key] ?? 0} (prev ${previousMetrics?.[key] ?? 0})`}
                    />
                ))}
            </div>

            {changeEntries.length ? (
                <div className="mt-3 space-y-2">
                    {changeEntries.map(([key, values]) => (
                        <div
                            key={`${title}-${key}`}
                            className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2"
                        >
                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                {formatDiffLabel(key)}
                            </div>
                            <ul className="mt-2 space-y-1 text-xs text-foreground">
                                {values.slice(0, 6).map((value) => (
                                    <li key={`${key}-${value}`}>- {value}</li>
                                ))}
                                {values.length > 6 ? (
                                    <li className="text-muted-foreground">
                                        - {values.length - 6} more...
                                    </li>
                                ) : null}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                    No structural differences detected in the latest two
                    versions.
                </p>
            )}
        </div>
    );
}

function splitCommaText(value: string) {
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function nullableNumber(value: string) {
    if (!value.trim()) {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}

function parseJsonObject(value: string, label: string) {
    const trimmed = value.trim();

    if (!trimmed) {
        return {};
    }

    const parsed = JSON.parse(trimmed);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error(`${label} must be a valid JSON object.`);
    }

    return parsed;
}

function toInputValue(value: number | string | null | undefined) {
    return value === null || value === undefined ? '' : String(value);
}

function formatDateTime(value?: string | null) {
    if (!value) {
        return 'Not available';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function formatMetricNumber(value?: number | null, fractionDigits = 2): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '-';
    }

    return value.toFixed(fractionDigits);
}

function formatSignedMetric(value?: number | null, fractionDigits = 2): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '-';
    }

    return value > 0
        ? `+${value.toFixed(fractionDigits)}`
        : value.toFixed(fractionDigits);
}

function formatDiffLabel(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function readErrorMessage(response: Response) {
    try {
        const json = await response.json();

        if (typeof json?.message === 'string' && json.message.trim()) {
            return json.message;
        }

        if (json?.errors && typeof json.errors === 'object') {
            const firstError = Object.values(json.errors)[0];
            if (
                Array.isArray(firstError) &&
                typeof firstError[0] === 'string'
            ) {
                return firstError[0];
            }
        }
    } catch {
        return 'Request failed.';
    }

    return 'Request failed.';
}
