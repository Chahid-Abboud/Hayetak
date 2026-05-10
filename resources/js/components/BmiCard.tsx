import { Link } from '@inertiajs/react';

type Profile = { height_cm: number; weight_kg: number };
type Props = {
    isGuest: boolean;
    profile?: Profile;
    loading?: boolean;
};

type BmiCatKey = 'under' | 'normal' | 'over' | 'obese';

function round1(value: number) {
    return Math.round(value * 10) / 10;
}

function category(bmi: number): {
    key: BmiCatKey;
    label: string;
    hint: string;
    range: string;
} {
    if (bmi < 18.5) {
        return {
            key: 'under',
            label: 'Underweight',
            hint: 'Aim for steady nutrition and strength work.',
            range: '< 18.5',
        };
    }

    if (bmi < 25) {
        return {
            key: 'normal',
            label: 'Normal range',
            hint: 'Keep the routine steady.',
            range: '18.5-24.9',
        };
    }

    if (bmi < 30) {
        return {
            key: 'over',
            label: 'Overweight',
            hint: 'Small consistent changes help.',
            range: '25-29.9',
        };
    }

    let cls = 'Class I';
    if (bmi >= 35 && bmi < 40) cls = 'Class II';
    if (bmi >= 40) cls = 'Class III';

    return {
        key: 'obese',
        label: `Obesity (${cls})`,
        hint: 'Use a tailored, sustainable plan.',
        range: '30+',
    };
}

const CAT_TEXT_CLASS: Record<BmiCatKey, string> = {
    under: 'text-warning',
    normal: 'text-success',
    over: 'text-warning',
    obese: 'text-destructive',
};

function ctaFor(key: BmiCatKey) {
    switch (key) {
        case 'obese':
        case 'over':
            return {
                toneClass:
                    'bg-destructive/10 border-destructive/30 text-destructive',
                title: 'Start with meal consistency',
                body: 'Track meals for a few days, then use the planner to make the adjustment realistic.',
                href: '/track-meals',
                btn: 'Open meal tracker',
            };
        case 'under':
            return {
                toneClass: 'bg-accent/10 border-accent/30 text-accent',
                title: 'Build a steady gain plan',
                body: 'Pair nutrient-dense meals with progressive strength sessions.',
                href: '/ai/planner',
                btn: 'Open AI planner',
            };
        default:
            return {
                toneClass: 'bg-success/10 border-success/30 text-success',
                title: 'Maintain and build strength',
                body: 'You are in the healthy range. Keep training, hydration, and protein consistent.',
                href: '/workouts/plan',
                btn: 'Open workout plan',
            };
    }
}

function Progress({ bmi }: { bmi: number }) {
    const min = 15;
    const max = 40;
    const clamped = Math.max(min, Math.min(max, bmi));
    const pct = ((clamped - min) / (max - min)) * 100;
    const pctAt = (value: number) => ((value - min) / (max - min)) * 100;

    return (
        <div aria-label="BMI progress">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct}%`, transition: 'width 300ms ease' }}
                    role="progressbar"
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={Number(clamped.toFixed(1))}
                    aria-label="BMI position"
                />
                {[18.5, 25, 30].map((value) => (
                    <span
                        key={value}
                        className="absolute top-0 h-full w-px bg-border"
                        style={{ left: `${pctAt(value)}%` }}
                        aria-hidden="true"
                    />
                ))}
            </div>

            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>15</span>
                <span>20</span>
                <span>25</span>
                <span>30</span>
                <span>35</span>
                <span>40</span>
            </div>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-10 w-36 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-20 rounded-2xl bg-muted" />
                <div className="h-20 rounded-2xl bg-muted" />
            </div>
        </div>
    );
}

export default function BmiCard({ isGuest, profile, loading }: Props) {
    if (loading) return <Skeleton />;

    if (!profile || !profile.height_cm || !profile.weight_kg) {
        return (
            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/60 p-4 text-sm leading-6 text-muted-foreground">
                {isGuest ? (
                    <>Sign in to calculate your BMI.</>
                ) : (
                    <>
                        Add your latest height and weight to see your BMI.{' '}
                        <Link
                            href="/profile"
                            className="font-medium text-accent hover:underline"
                        >
                            Update profile
                        </Link>
                    </>
                )}
            </div>
        );
    }

    const heightM = profile.height_cm / 100;
    if (!Number.isFinite(heightM) || heightM <= 0) {
        return (
            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                Height looks invalid. Update your profile measurements.
            </div>
        );
    }

    const bmi = round1(profile.weight_kg / (heightM * heightM));
    if (!Number.isFinite(bmi) || bmi <= 0) {
        return (
            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                Weight looks invalid. Update your profile measurements.
            </div>
        );
    }

    const { key, label, hint } = category(bmi);
    const cta = ctaFor(key);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    
                    <div className="mt-2 flex items-baseline gap-3">
                        <div className="text-4xl font-semibold tracking-tight text-foreground">
                            {bmi}
                        </div>
                        <div
                            className={`text-sm font-medium ${CAT_TEXT_CLASS[key]}`}
                        >
                            {label}
                        </div>
                    </div>
                </div>
                
            </div>

            <Progress bmi={bmi} />

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-border/70 bg-background/72 p-3">
                    <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Height
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                        {profile.height_cm.toFixed(1)} cm
                    </div>
                </div>
                <div className="rounded-[18px] border border-border/70 bg-background/72 p-3">
                    <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        Weight
                    </div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                        {profile.weight_kg.toFixed(1)} kg
                    </div>
                </div>
            </div>

            <div
                className={`rounded-[20px] border p-4 ${cta.toneClass}`}
                role="status"
                aria-live="polite"
            >
                <div className="font-medium">{cta.title}</div>
                <div className="mt-1 text-sm leading-6 opacity-90">
                    {hint} {cta.body}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Link
                        href={cta.href}
                        className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                    >
                        {cta.btn}
                    </Link>
                    <Link
                        href="/profile"
                        className="inline-flex items-center text-sm font-medium text-foreground/80 hover:text-foreground"
                    >
                        Update metrics
                    </Link>
                </div>
            </div>

            <div className="rounded-[18px] border border-border/70 bg-background/60 p-3 text-xs leading-5 text-muted-foreground">
                BMI is a broad screening metric. It does not account for muscle
                mass, pregnancy, age-specific ranges, or medical context.
            </div>
        </div>
    );
}
