import EmailVerificationNotificationController from '@/actions/App/Http/Controllers/Auth/EmailVerificationNotificationController';
import { ProductBanner } from '@/components/product/page';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Activate your account"
            description="Verify your email to unlock your personalized planner, daily tracking, and adaptive AI coaching."
        >
            <Head title="Email verification" />

            {status === 'verification-link-sent' ? (
                <ProductBanner tone="success">
                    A fresh verification link has been sent to your email
                    address.
                </ProductBanner>
            ) : null}

            <div className="mb-6 grid gap-3">
                {[
                    {
                        icon: MailCheck,
                        title: 'One last activation step',
                        copy: 'Open the message from Hayetak and confirm your email to finish account setup.',
                    },
                    {
                        icon: ShieldCheck,
                        title: 'Protection first',
                        copy: 'Email verification helps secure your planner, logs, and profile information before you continue.',
                    },
                ].map(({ icon: Icon, title, copy }) => (
                    <div
                        key={String(title)}
                        className="rounded-[22px] border border-border/70 bg-background/72 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.75)]"
                    >
                        <Icon className="size-4 text-secondary" />
                        <p className="mt-3 text-sm font-semibold text-foreground">
                            {title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {copy}
                        </p>
                    </div>
                ))}
            </div>

            <Form
                {...EmailVerificationNotificationController.store.form()}
                className="space-y-4 text-center"
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
        </AuthLayout>
    );
}
