import { Link } from '@inertiajs/react';

export default function BackHomeButton({
    className = '',
}: {
    className?: string;
}) {
    return (
        <Link
            href="/dashboard"
            className={`rounded-lg border bg-white px-3 py-2 hover:bg-gray-50 ${className}`}
        >
            Back to Home
        </Link>
    );
}
