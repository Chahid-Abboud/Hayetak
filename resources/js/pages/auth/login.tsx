import AuthenticatedSessionController from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';
<<<<<<< HEAD
import AppWordmark from '@/components/app-wordmark';
=======
import AppLogoIcon from '@/components/app-logo-icon';
>>>>>>> origin/main
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { register } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import {
    ArrowRight,
    Eye,
    EyeOff,
    LoaderCircle,
    Lock,
    Mail,
    Shield,
} from 'lucide-react';
import { useState } from 'react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

function PasswordField({ error }: { error?: string }) {
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
                    className={`w-full rounded-xl border bg-background/80 py-2.5 pr-10 pl-10 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 ${
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
    return (
        <>
            <Head title="Log in" />

            <div className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-8 sm:py-14 lg:px-12">
                <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
                    <div className="w-full rounded-[32px] border border-border/70 bg-card/92 p-6 shadow-[0_35px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur sm:p-8">
                        <div className="mb-8">
<<<<<<< HEAD
                            <div className="mb-6">
                                <AppWordmark
                                    iconClassName="size-8"
                                    textClassName="text-[1.38rem] text-foreground"
                                />
=======
                            <div className="mb-6 flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 shadow-[0_18px_34px_-24px_rgba(23,38,60,0.9)]">
                                    <AppLogoIcon className="size-4.5" />
                                </div>
                                <span className="font-semibold tracking-tight text-foreground">
                                    Hayetak
                                </span>
>>>>>>> origin/main
                            </div>
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
                                                className={`w-full rounded-xl border bg-background/80 py-2.5 pr-4 pl-10 text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 ${
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
                                            <span className="text-sm text-muted-foreground transition-colors select-none group-hover:text-foreground">
                                                Remember me
                                            </span>
                                        </label>

                                        {canResetPassword ? (
                                            <TextLink
<<<<<<< HEAD
                                                href="/forgot-password"
=======
                                                href={request()}
>>>>>>> origin/main
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
