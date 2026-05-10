import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    csrf_token?: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    flash?: {
        status?: string;
        success?: string;
        error?: string;
        verificationArrival?: {
            account_id: number;
            verified_at?: string | null;
            headline?: string | null;
            message?: string | null;
        } | null;
        showOptionalTwoFactorPrompt?: boolean;
    };
    security?: {
        requiresTwoFactorConfirmation?: boolean;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    role?: 'admin' | 'nutritionist' | 'trainer' | 'client';
    verified?: boolean;
    status?: string | null;
    city?: string | null;
    professional_bio?: string | null;
    specialties?: string[];
    availability_text?: string | null;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export type AppointmentStatus =
    | 'requested'
    | 'accepted'
    | 'declined'
    | 'completed'
    | 'cancelled';

export type ConversationContextPayload = {
    conversation_id: number;
    context_mode?: 'client_summary' | 'professional_summary';
    peer: {
        id: number;
        name: string;
        role?: 'admin' | 'nutritionist' | 'trainer' | 'client' | string | null;
        city?: string | null;
        verified?: boolean;
        status?: string | null;
    } | null;
    relationship: {
        assigned?: boolean;
        assignment_role?: string | null;
        has_upcoming_appointment?: boolean;
    } | null;
    safety: {
        allergies?: string[];
        has_medical_history?: boolean;
        diet_name?: string | null;
        dietary_goal?: string | null;
        fitness_goal?: string | null;
        workout_location?: string | null;
        badges?: string[];
    };
    client_snapshot?: {
        goals?: string[];
        diet_name?: string | null;
        allergies?: string[];
        has_medical_history?: boolean;
        workout_location?: string | null;
    } | null;
    professional_snapshot?: {
        role_label?: string | null;
        specialties?: string[];
        availability_text?: string | null;
        city?: string | null;
        verified?: boolean;
    } | null;
    activity: {
        today?: {
            meals_logged?: number;
            meal_calories?: number;
            workouts_logged?: number;
            workout_minutes?: number;
            workout_sets?: number;
        };
        last_7_days?: {
            meals_logged?: number;
            meal_calories?: number;
            workouts_logged?: number;
            workout_minutes?: number;
            workout_sets?: number;
        };
    };
    plan: {
        id: number;
        type?: string | null;
        version?: number | null;
        created_at?: string | null;
    } | null;
    appointments: {
        next: {
            id: number;
            status: AppointmentStatus | string;
            scheduled_at?: string | null;
            professional_role?: string | null;
        } | null;
        upcoming_count: number;
    };
};

export type AdminBulkUserAction =
    | 'verify'
    | 'unverify'
    | 'suspend'
    | 'reactivate'
    | 'delete'
    | 'set_status';

export type AdminBulkUsersPayload = {
    user_ids: number[];
    action: AdminBulkUserAction;
    status?: string;
};

export type AdminBulkUserResult = {
    user_id: number;
    updated: boolean;
    reason?: 'missing_user' | 'no_change' | string;
    before?: {
        verified?: boolean;
        status?: string | null;
    };
    after?: {
        verified?: boolean;
        status?: string | null;
    };
};

export type AdminBulkUsersResponse = {
    ok: boolean;
    action: AdminBulkUserAction;
    status?: string | null;
    summary: {
        requested_count: number;
        updated_count: number;
        skipped_count: number;
    };
    results: AdminBulkUserResult[];
};
