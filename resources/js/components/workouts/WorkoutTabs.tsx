import { Link } from '@inertiajs/react';

type WorkoutTabsProps = {
    active: 'plan' | 'log';
};

export default function WorkoutTabs({ active }: WorkoutTabsProps) {
    const base =
        'inline-flex min-w-[8rem] items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold no-underline transition';

    return (
        <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/85 p-2 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.7)] backdrop-blur">
                <Link
                    href="/workouts/plan"
                    className={
                        base +
                        (active === 'plan'
                            ? ' bg-primary text-primary-foreground shadow-sm'
                            : ' text-muted-foreground hover:bg-background hover:text-foreground')
                    }
                >
                    Plan Builder
                </Link>

                <Link
                    href="/workouts/log"
                    className={
                        base +
                        (active === 'log'
                            ? ' bg-secondary text-secondary-foreground shadow-sm'
                            : ' text-muted-foreground hover:bg-background hover:text-foreground')
                    }
                >
                    Live Log
                </Link>
            </div>
        </div>
    );
}
