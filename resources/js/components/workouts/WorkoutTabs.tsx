import { Link } from '@inertiajs/react';

type WorkoutTabsProps = {
    active: 'plan' | 'log';
};

export default function WorkoutTabs({ active }: WorkoutTabsProps) {
    const base =
        'inline-flex min-w-[10rem] items-center justify-center rounded-[20px] px-5 py-3 text-base font-semibold no-underline transition';

    return (
        <div className="flex justify-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-border/70 bg-card/90 p-2 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.7)] backdrop-blur">
                <Link
                    href="/workouts/plan"
                    className={
                        base +
                        (active === 'plan'
                            ? ' bg-primary text-primary-foreground shadow-sm'
                            : ' text-foreground/80 hover:bg-background hover:text-foreground')
                    }
                >
                    Workout Planner
                </Link>

                <Link
                    href="/workouts/log"
                    className={
                        base +
                        (active === 'log'
                            ? ' bg-secondary text-secondary-foreground shadow-sm'
                            : ' text-foreground/80 hover:bg-background hover:text-foreground')
                    }
                >
                    Workout Log
                </Link>
            </div>
        </div>
    );
}
