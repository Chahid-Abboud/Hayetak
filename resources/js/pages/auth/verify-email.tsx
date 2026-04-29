import EmailVerificationNotificationController from '@/actions/App/Http/Controllers/Auth/EmailVerificationNotificationController';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthCardLayout from '@/layouts/auth/auth-card-layout';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle, MailCheck, Sparkles } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <AuthCardLayout
            title="Activate your account"
            description="Verify your email to unlock your personalized planner, daily tracking, and adaptive AI coaching."
        >
            <Head title="Email verification" />

            <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MailCheck className="size-6" />
                </div>

                <div className="space-y-3">
                    <p className="text-base font-semibold text-foreground">
                        Check your inbox and click the verification link to
                        finish activating your account.
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                        Once you open the email link, Hayetak will verify your
                        account and take you straight to the dashboard.
                    </p>
                </div>

                {status === 'verification-link-sent' ? (
                    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        A fresh verification link has been sent to your email
                        address.
                    </div>
                ) : null}
            </div>

            <Form
                {...EmailVerificationNotificationController.store.form()}
                className="mt-8 space-y-4 text-center"
            >
                {({ processing }) => (
                    <>
                        <Button
                            disabled={processing}
                            className="h-12 w-full rounded-full text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(23,38,60,0.45)]"
                        >
                            {processing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Sparkles className="size-4" />
                            )}
                            Resend verification email
                        </Button>

                        <TextLink
                            href="/logout"
                            method="post"
                            as="button"
                            className="mx-auto block text-sm font-medium text-primary"
                        >
                            Log out instead
                        </TextLink>
                    </>
                )}
            </Form>
        </AuthCardLayout>
    );
}
