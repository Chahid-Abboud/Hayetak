import NewPasswordController from '@/actions/App/Http/Controllers/Auth/NewPasswordController';
import InputError from '@/components/input-error';
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
    LockKeyhole,
    ShieldCheck,
} from 'lucide-react';

interface ResetPasswordProps {
    token: string;
    email: string;
}

const fieldClass =
    'h-[52px] rounded-[20px] border-border/70 bg-background/78 px-4 text-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)] placeholder:text-muted-foreground/70';

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    return (
        <AuthLayout
            title="Create a new password"
            description="Choose a strong new password. We’ll apply it to this account and keep the reset flow secure."
        >
            <Head title="Reset password" />

            <div className="mb-6 rounded-[24px] border border-border/70 bg-background/72 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.75)]">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-4 text-secondary" />
                    <div className="text-sm leading-6 text-muted-foreground">
                        After the password is updated, other active sessions may
                        be invalidated as a security measure.
                    </div>
                </div>
            </div>

            <Form
                {...NewPasswordController.store.form()}
                transform={(data) => ({ ...data, token, email })}
                resetOnSuccess={['password', 'password_confirmation']}
                className="space-y-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <Label
                                    htmlFor="email"
                                    className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                                >
                                    Account email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={email}
                                    className={fieldClass}
                                    readOnly
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="space-y-2.5">
                                <Label
                                    htmlFor="password"
                                    className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                                >
                                    New password
                                </Label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        name="password"
                                        autoComplete="new-password"
                                        placeholder="Use 8+ characters"
                                        className={`${fieldClass} pl-11`}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <div className="space-y-2.5">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                                >
                                    Confirm password
                                </Label>
                                <div className="relative">
                                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        autoComplete="new-password"
                                        placeholder="Repeat your new password"
                                        className={`${fieldClass} pl-11`}
                                    />
                                </div>
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>
                        </div>

                        <Button
                            className="h-12 w-full rounded-full text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(23,38,60,0.45)]"
                            disabled={processing}
                        >
                            {processing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="size-4" />
                            )}
                            Update password
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
