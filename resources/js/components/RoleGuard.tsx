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
            <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
                403 Unauthorized.
            </div>
        );
    }

    return <>{children}</>;
}
