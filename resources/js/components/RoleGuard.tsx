import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

export default function RoleGuard({
    roles,
    children,
}: {
    roles: Array<'admin' | 'nutritionist' | 'trainer' | 'client'>;
    children: ReactNode;
}) {
    const { auth } = usePage<SharedData>().props;
    const role = auth.user?.role ?? 'client';

    if (!roles.includes(role)) {
        return (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                403 Unauthorized.
            </div>
        );
    }

    return <>{children}</>;
}
