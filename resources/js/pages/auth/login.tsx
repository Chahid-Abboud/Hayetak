import AuthenticatedSessionController from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
import AppLogoIcon from '@/components/app-logo-icon';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { register } from '@/routes';
import { request } from '@/routes/password';
import { Form, Head } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    Brain,
    Check,
    Eye,
    EyeOff,
    LoaderCircle,
    Lock,
    Mail,
    Shield,
    Sparkles,
} from 'lucide-react';
import { useState } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

function PasswordField({
    error,
}: {
    error?: string;
}) {
    const [show, setShow] = useState(false);

    return (
        <div className="space-y-1.5">
            <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
            >
                Password
            </label>
            <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    id="password"
                    name="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`w-full rounded-xl border bg-background/80 py-2.5 pr-10 pl-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 ${
                        error
                            ? 'border-destructive/70'
                            : 'border-border/70 hover:border-secondary/50'
                    }`}
                />
                <button
                    type="button"
                    onClick={() => setShow((value) => !value)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? (
                        <EyeOff className="size-4" />
                    ) : (
                        <Eye className="size-4" />
                    )}
                </button>
            </div>
            <InputError message={error} className="text-xs text-destructive" />
        </div>
    );
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const features = [
        {
            icon: Brain,
            title: 'AI-personalized plans',
            desc: 'Nutrition and workout plans built from your unique profile.',
        },
        {
            icon: Activity,
            title: 'Context-aware coaching',
            desc: "Your AI coach knows today's meals, last 7 days, and your goals.",
        },
        {
            icon: Shield,
            title: 'Allergy & injury safe',
            desc: 'Recommendations stay grounded in your restrictions and history.',
        },
        {
            icon: Sparkles,
            title: 'Track everything',
            desc: 'Meals, workouts, water, and progress live in one intelligent system.',
        },
    ];

    return (
        <>
            <Head title="Log in" />

            <div className="min-h-screen bg-background text-foreground lg:flex">
                <div className="relative hidden overflow-hidden lg:flex lg:w-[42%] lg:flex-col lg:justify-between lg:p-10 xl:w-[45%] xl:p-14">
                    <div className="absolute inset-0 bg-[linear-gradient(160deg,#17263c_0%,#1b2a42_52%,#162033_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,164,76,0.18),transparent_40%)]" />
                    <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-secondary/12 blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/14 blur-3xl" />

                    <div className="relative">
                        <div className="mb-12 flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-secondary via-accent to-primary shadow-lg shadow-black/20">
                                <AppLogoIcon className="size-4 fill-current text-white" />
                            </div>
                            <span className="font-semibold tracking-tight text-white/92">
                                Hayetak
                            </span>
                        </div>

                        <div className="mb-10 space-y-4">
                            <h1
                                className="text-3xl leading-tight tracking-tight text-white/88 xl:text-4xl"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Welcome back to{' '}
                                <span className="bg-gradient-to-r from-[#f7efdf] via-[#f1c9aa] to-[#e0ba61] bg-clip-text text-transparent">
                                    your health OS
                                </span>
                            </h1>
                            <p className="leading-relaxed text-white/72">
                                Pick up right where you left off. Your AI plans,
                                logs, and coaching history are waiting for you.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {features.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="flex items-start gap-3"
                                >
                                    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-xl border border-white/10 bg-white/8">
                                        <feature.icon className="size-4 text-secondary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white/88">
                                            {feature.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-white/62">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative space-y-3 border-t border-white/10 pt-6">
                        <div className="flex flex-wrap gap-3">
                            {[
                                { icon: Lock, text: '256-bit encrypted' },
                                { icon: Shield, text: 'Safety-first AI' },
                                { icon: Check, text: 'No ads, ever' },
                            ].map((item) => (
                                <div
                                    key={item.text}
                                    className="flex items-center gap-1.5"
                                >
                                    <item.icon className="size-3.5 text-white/50" />
                                    <span className="text-xs text-white/52">
                                        {item.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-white/46">
                            Hayetak is not a medical service. Consult a
                            qualified professional for medical decisions.
                        </p>
                    </div>
                </div>

                <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:py-0">
                    <div className="mb-10 flex self-start lg:hidden">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-secondary via-accent to-primary">
                                <AppLogoIcon className="size-4 fill-current text-white" />
                            </div>
                            <span className="font-semibold text-foreground">
                                Hayetak
                            </span>
                        </div>
                    </div>

                    <div className="w-full max-w-sm">
                        <div className="mb-8">
                            <h2
                                className="mb-1.5 text-2xl tracking-tight text-foreground"
                                style={{ fontFamily: 'var(--font-display)' }}
                            >
                                Sign in
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Don&apos;t have an account?{' '}
                                <TextLink
                                    href={register()}
                                    className="font-medium text-primary no-underline hover:text-secondary"
                                >
                                    Create one free
                                </TextLink>
                            </p>
                        </div>

                        {status ? (
                            <div className="mb-5 rounded-xl border border-secondary/35 bg-secondary/12 px-4 py-3 text-sm text-foreground">
                                {status}
                            </div>
                        ) : null}

                        <Form
                            {...AuthenticatedSessionController.store.form()}
                            resetOnSuccess={['password']}
                            className="space-y-4"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {errors.email && !errors.password ? (
                                        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/12 px-4 py-3">
                                            <Shield className="size-4 flex-none text-destructive" />
                                            <p className="text-sm text-foreground">
                                                {errors.email}
                                            </p>
                                        </div>
                                    ) : null}

                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium text-foreground"
                                        >
                                            Email address
                                        </label>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoFocus
                                                autoComplete="email"
                                                placeholder="you@example.com"
                                                className={`w-full rounded-xl border bg-background/80 py-2.5 pr-4 pl-10 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 ${
                                                    errors.email
                                                        ? 'border-destructive/70'
                                                        : 'border-border/70 hover:border-secondary/50'
                                                }`}
                                            />
                                        </div>
                                        <InputError
                                            message={errors.email}
                                            className="text-xs text-destructive"
                                        />
                                    </div>

                                    <PasswordField error={errors.password} />

                                    <div className="flex items-center justify-between pt-1">
                                        <label className="group flex cursor-pointer items-center gap-2">
                                            <input
                                                type="checkbox"
                                                name="remember"
                                                className="h-4 w-4 rounded border-border bg-background text-secondary focus:ring-secondary/30"
                                            />
                                            <span className="select-none text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                                                Remember me
                                            </span>
                                        </label>

                                        {canResetPassword ? (
                                            <TextLink
                                                href={request()}
                                                className="text-sm font-medium text-primary no-underline hover:text-secondary"
                                            >
                                                Forgot password?
                                            </TextLink>
                                        ) : null}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-60"
                                        data-test="login-button"
                                    >
                                        {processing ? (
                                            <>
                                                <LoaderCircle className="size-4 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                Sign in
                                                <ArrowRight className="size-4" />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </Form>

                        <div className="mt-6 flex items-start gap-2 rounded-xl border border-border/70 bg-card/82 px-3 py-3">
                            <Shield className="mt-0.5 size-3.5 flex-none text-secondary" />
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                                Secured with encrypted transport. We never share
                                your health data with third parties.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
