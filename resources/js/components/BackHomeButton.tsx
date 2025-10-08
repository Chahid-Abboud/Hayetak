import { Link } from "@inertiajs/react";

export default function BackHomeButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={`rounded-lg border px-3 py-2 bg-white hover:bg-gray-50 ${className}`}
    >
      Back to Home
    </Link>
  );
}
