import PasswordResetLinkController from '@/actions/App/Http/Controllers/Auth/PasswordResetLinkController';
import InputError from '@/components/input-error';
import { ProductBanner } from '@/components/product/page';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';
import { Form, Head } from '@inertiajs/react';
import {
    ArrowLeft,
    LoaderCircle,
    Mail,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

const fieldClass =
    'h-[52px] rounded-[20px] border-border/70 bg-background/78 px-4 text-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)] placeholder:text-muted-foreground/70';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your email and we’ll send a secure reset link so you can get back to your plan safely."
        >
            <Head title="Forgot password" />

            {status ? (
                <ProductBanner tone="success">{status}</ProductBanner>
            ) : null}

            <div className="mb-6 rounded-[24px] border border-border/70 bg-background/72 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.75)]">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-4 text-secondary" />
                    <div className="text-sm leading-6 text-muted-foreground">
                        Reset links expire automatically and can only be used
                        once. If this request wasn’t you, no action is needed.
                    </div>
                </div>
            </div>

            <Form
                {...PasswordResetLinkController.store.form()}
                className="space-y-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-2.5">
                            <Label
                                htmlFor="email"
                                className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                            >
                                Email address
                            </Label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder="you@example.com"
                                    className={`${fieldClass} pl-11`}
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            className="h-12 w-full rounded-full text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(23,38,60,0.45)]"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Sparkles className="size-4" />
                            )}
                            Email reset link
                        </Button>
                    </>
                )}
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
                <TextLink
                    href={login()}
                    className="inline-flex items-center gap-1.5"
                >
                    <ArrowLeft className="size-3.5" />
                    Back to sign in
                </TextLink>
            </div>
        </AuthLayout>
    );
}
