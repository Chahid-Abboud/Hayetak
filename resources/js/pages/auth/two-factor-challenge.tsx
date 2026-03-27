import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import AuthLayout from '@/layouts/auth-layout';
import { store } from '@/routes/two-factor/login';
import { Form, Head } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { KeyRound, LoaderCircle, ShieldCheck, Smartphone } from 'lucide-react';
import { useMemo, useState } from 'react';

const recoveryFieldClass =
    'h-[52px] rounded-[20px] border-border/70 bg-background/78 px-4 text-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)] placeholder:text-muted-foreground/70';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState(false);
    const [code, setCode] = useState('');

    const authConfigContent = useMemo(() => {
        if (showRecoveryInput) {
            return {
                title: 'Use a recovery code',
                description:
                    'Enter one of your saved emergency recovery codes to continue securely.',
                toggleText: 'Use my authentication code instead',
            };
        }

        return {
            title: 'Two-factor challenge',
            description:
                'Open your authenticator app and enter the current 6-digit code to verify your identity.',
            toggleText: 'Use a recovery code instead',
        };
    }, [showRecoveryInput]);

    const toggleRecoveryMode = (clearErrors: () => void) => {
        setShowRecoveryInput((current) => !current);
        clearErrors();
        setCode('');
    };

    return (
        <AuthLayout title={authConfigContent.title} description={authConfigContent.description}>
            <Head title="Two-factor authentication" />

            <div className="mb-6 rounded-[24px] border border-border/70 bg-background/72 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.75)]">
                <div className="flex items-start gap-3">
                    {showRecoveryInput ? (
                        <KeyRound className="mt-0.5 size-4 text-secondary" />
                    ) : (
                        <Smartphone className="mt-0.5 size-4 text-secondary" />
                    )}
                    <div className="text-sm leading-6 text-muted-foreground">
                        {showRecoveryInput
                            ? 'Recovery codes are meant for emergency access. Use one only if your authenticator app is unavailable.'
                            : 'Two-factor authentication adds a second identity check before Hayetak opens your health data and account tools.'}
                    </div>
                </div>
            </div>

            <Form
                {...store.form()}
                className="space-y-5"
                resetOnError
                resetOnSuccess={!showRecoveryInput}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {showRecoveryInput ? (
                            <div className="space-y-2.5">
                                <label className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                                    Recovery code
                                </label>
                                <Input
                                    name="recovery_code"
                                    type="text"
                                    placeholder="Enter your recovery code"
                                    autoFocus
                                    required
                                    className={recoveryFieldClass}
                                />
                                <InputError message={errors.recovery_code} />
                            </div>
                        ) : (
                            <div className="space-y-3 text-center">
                                <label className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                                    Authentication code
                                </label>
                                <div className="flex justify-center">
                                    <InputOTP
                                        name="code"
                                        maxLength={OTP_MAX_LENGTH}
                                        value={code}
                                        onChange={(value) => setCode(value)}
                                        disabled={processing}
                                        pattern={REGEXP_ONLY_DIGITS}
                                    >
                                        <InputOTPGroup className="gap-2">
                                            {Array.from(
                                                { length: OTP_MAX_LENGTH },
                                                (_, index) => (
                                                    <InputOTPSlot
                                                        key={index}
                                                        index={index}
                                                        className="h-[52px] w-11 rounded-[18px] border border-border/70 bg-background/78 text-base font-semibold shadow-[0_18px_36px_-28px_rgba(15,23,42,0.78)] first:rounded-[18px] first:border last:rounded-[18px]"
                                                    />
                                                ),
                                            )}
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Enter the code currently shown in your app.
                                </p>
                                <InputError message={errors.code} />
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="h-12 w-full rounded-full text-sm font-semibold shadow-[0_20px_40px_-22px_rgba(23,38,60,0.45)]"
                            disabled={processing}
                        >
                            {processing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="size-4" />
                            )}
                            Continue securely
                        </Button>

                        <div className="text-center text-sm text-muted-foreground">
                            <button
                                type="button"
                                className="font-medium text-primary"
                                onClick={() => toggleRecoveryMode(clearErrors)}
                            >
                                {authConfigContent.toggleText}
                            </button>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
