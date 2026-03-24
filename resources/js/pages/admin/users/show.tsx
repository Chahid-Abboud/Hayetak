import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCallback, useEffect, useState, type ReactNode } from 'react';

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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

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

    async function deleteUser() {
        if (!window.confirm('Delete this user account?')) {
            return;
        }

        const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            setError(await readErrorMessage(res));
            return;
        }

        router.visit('/admin/users');
    }

    const displayName =
        detail?.user?.display_name ||
        [detail?.user?.first_name, detail?.user?.last_name]
            .filter(Boolean)
            .join(' ') ||
        detail?.user?.email ||
        `User #${userId}`;

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

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
                            <div className="space-y-6">
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
                                    <div className="mt-4 flex flex-wrap gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
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
                                            checked={userForm.email_verified}
                                            onCheckedChange={(checked) =>
                                                setUserForm((current) => ({
                                                    ...current,
                                                    email_verified: checked,
                                                }))
                                            }
                                        />
                                    </div>
                                </AdminSection>

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
                                                { value: '', label: 'Not set' },
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
                                                { value: '', label: 'Not set' },
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
                                            value={userForm.workout_location}
                                            onChange={(value) =>
                                                setUserForm((current) => ({
                                                    ...current,
                                                    workout_location: value,
                                                }))
                                            }
                                            options={[
                                                { value: '', label: 'Not set' },
                                                {
                                                    value: 'home',
                                                    label: 'Home',
                                                },
                                                { value: 'gym', label: 'Gym' },
                                                {
                                                    value: 'both',
                                                    label: 'Both',
                                                },
                                            ]}
                                        />
                                    </div>
                                </AdminSection>

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
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        tried_diet_before:
                                                            value as UserForm['tried_diet_before'],
                                                    }))
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
                                                    setUserForm((current) => ({
                                                        ...current,
                                                        diet_failure_other:
                                                            value,
                                                    }))
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
                                            value={userForm.availability_text}
                                            onChange={(value) =>
                                                setUserForm((current) => ({
                                                    ...current,
                                                    availability_text: value,
                                                }))
                                            }
                                        />
                                        <TextareaField
                                            label="Specialties"
                                            value={userForm.specialties_text}
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
                                            value={userForm.professional_bio}
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
                                            value={prefsForm.activity_factor}
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
                                                    daily_goal_calories: value,
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
                                                    daily_goal_protein_g: value,
                                                }))
                                            }
                                        />
                                        <TextField
                                            label="Carbs goal (g)"
                                            type="number"
                                            value={prefsForm.daily_goal_carbs_g}
                                            onChange={(value) =>
                                                setPrefsForm((current) => ({
                                                    ...current,
                                                    daily_goal_carbs_g: value,
                                                }))
                                            }
                                        />
                                        <TextField
                                            label="Fat goal (g)"
                                            type="number"
                                            value={prefsForm.daily_goal_fat_g}
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
                                            value={prefsForm.water_cups_per_day}
                                            onChange={(value) =>
                                                setPrefsForm((current) => ({
                                                    ...current,
                                                    water_cups_per_day: value,
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
                                                    workout_days_target: value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4">
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
                                            value={prefsForm.notifications_json}
                                            onChange={(value) =>
                                                setPrefsForm((current) => ({
                                                    ...current,
                                                    notifications_json: value,
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
                            </div>
                            <div className="space-y-6">
                                <AdminSection
                                    title="Record Snapshot"
                                    description="Quick account context and status badges."
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
                                        <div className="flex flex-wrap gap-2">
                                            <Badge className="rounded-full px-2.5 py-1 capitalize">
                                                {detail?.user.role ?? 'user'}
                                            </Badge>
                                            <Badge
                                                variant={
                                                    detail?.user.verified
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                className="rounded-full px-2.5 py-1"
                                            >
                                                {detail?.user.verified
                                                    ? 'Verified'
                                                    : 'Needs review'}
                                            </Badge>
                                            {detail?.user.status ? (
                                                <Badge
                                                    variant="outline"
                                                    className="rounded-full px-2.5 py-1"
                                                >
                                                    {detail.user.status}
                                                </Badge>
                                            ) : null}
                                        </div>
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
                                            onClick={() => void deleteUser()}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete user
                                        </Button>
                                    </div>
                                </AdminSection>

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
                                                <div className="rounded-2xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
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

                                <AdminSection
                                    title="Recent Activity"
                                    description="Fast review cards for the latest user actions."
                                >
                                    <div className="space-y-4">
                                        <ActivityCard
                                            icon={
                                                <BellRing className="h-4 w-4" />
                                            }
                                            title="Notifications"
                                            items={
                                                detail?.recent.notifications ??
                                                []
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
                                                detail?.recent.meal_entries ??
                                                []
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
                                                detail?.recent.workout_logs ??
                                                []
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
                                                detail?.recent.appointments ??
                                                []
                                            }
                                            render={(item) => ({
                                                title:
                                                    item.professional_role ||
                                                    'Appointment',
                                                subtitle:
                                                    item.status || 'scheduled',
                                                meta: formatDateTime(
                                                    item.scheduled_at,
                                                ),
                                            })}
                                        />
                                        <ActivityCard
                                            icon={<Brain className="h-4 w-4" />}
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
                                </AdminSection>
                            </div>
                        </div>
                    </div>
                </AdminShell>
            </RoleGuard>
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
        <div
            className={
                tone === 'error'
                    ? 'rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground'
                    : 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100'
            }
        >
            {children}
        </div>
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
        <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <Input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
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
        <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
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
        <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <textarea
                rows={rows}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {helper ? (
                <span className="text-xs text-muted-foreground">{helper}</span>
            ) : null}
        </label>
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
    const id = label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="flex items-center gap-3">
            <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(value) => onCheckedChange(Boolean(value))}
            />
            <Label htmlFor={id}>{label}</Label>
        </div>
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
        <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 px-3 py-3">
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
                                className="rounded-2xl border border-border/70 bg-background/80 px-3 py-3"
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
