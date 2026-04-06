import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/password/confirm';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';

const fieldClass =
    'h-[52px] rounded-[20px] border-border/70 bg-background/78 px-4 text-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)] placeholder:text-muted-foreground/70';

export default function ConfirmPassword() {
    return (
        <AuthLayout
            title="Confirm your password"
            description="This action touches a protected area, so we need one more password check before continuing."
        >
            <Head title="Confirm password" />

            <div className="mb-6 rounded-[24px] border border-border/70 bg-background/72 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.75)]">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-4 text-secondary" />
                    <div className="text-sm leading-6 text-muted-foreground">
                        This extra confirmation helps protect profile settings,
                        health information, and other sensitive account actions.
                    </div>
                </div>
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="space-y-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="space-y-2.5">
                            <Label
                                htmlFor="password"
                                className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                            >
                                Password
                            </Label>
                            <div className="relative">
                                <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    autoFocus
                                    className={`${fieldClass} pl-11`}
                                />
                            </div>
                            <InputError message={errors.password} />
                        </div>

                        <Button
                            className="h-12 w-full rounded-full text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(23,38,60,0.45)]"
                            disabled={processing}
                            data-test="confirm-password-button"
                        >
                            {processing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="size-4" />
                            )}
                            Confirm and continue
                        </Button>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
