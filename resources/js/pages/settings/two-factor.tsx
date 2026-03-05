import HeadingSmall from '@/components/heading-small';
import NavHeader from '@/components/NavHeader';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { disable, enable } from '@/routes/two-factor';
import { Form, Head, router } from '@inertiajs/react';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface TwoFactorProps {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: TwoFactorProps) {
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();

    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

    const FOCUS_RING =
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Two-Factor Authentication" />

            {/* Skip link for keyboard users */}
            <a
                href="#main-content"
                className={`sr-only rounded-md bg-card px-3 py-2 text-sm font-semibold shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 ${FOCUS_RING}`}
            >
                Skip to main content
            </a>

            <NavHeader />

            <main
                id="main-content"
                className="mx-auto max-w-6xl space-y-10 px-6 py-8"
            >
                <section className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Two-Factor Authentication"
                            description="Manage your two-factor authentication settings"
                        />

                        {twoFactorEnabled ? (
                            <div className="flex flex-col items-start justify-start space-y-4">
                                <Badge variant="default">Enabled</Badge>

                                <p className="text-muted-foreground">
                                    With two-factor authentication enabled, you
                                    will be prompted for a secure, random pin
                                    during login, which you can retrieve from
                                    the TOTP-supported application on your
                                    phone.
                                </p>

                                <TwoFactorRecoveryCodes
                                    recoveryCodesList={recoveryCodesList}
                                    fetchRecoveryCodes={fetchRecoveryCodes}
                                    errors={errors}
                                />

                                <div className="flex flex-wrap items-center gap-3">
                                    <Form {...disable.form()}>
                                        {({ processing }) => (
                                            <Button
                                                variant="destructive"
                                                type="submit"
                                                disabled={processing}
                                            >
                                                <ShieldBan /> Disable 2FA
                                            </Button>
                                        )}
                                    </Form>

                                    {/* Always show when enabled */}
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() =>
                                            router.visit('/dashboard')
                                        }
                                    >
                                        Go to Dashboard
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-start justify-start space-y-4">
                                <Badge variant="destructive">Disabled</Badge>

                                <p className="text-muted-foreground">
                                    When you enable two-factor authentication,
                                    you will be prompted for a secure pin during
                                    login. This pin can be retrieved from a
                                    TOTP-supported application on your phone.
                                </p>

                                <div>
                                    {hasSetupData ? (
                                        <Button
                                            onClick={() =>
                                                setShowSetupModal(true)
                                            }
                                        >
                                            <ShieldCheck />
                                            Continue Setup
                                        </Button>
                                    ) : (
                                        <Form
                                            {...enable.form()}
                                            onSuccess={() =>
                                                setShowSetupModal(true)
                                            }
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    disabled={processing}
                                                >
                                                    <ShieldCheck />
                                                    Enable 2FA
                                                </Button>
                                            )}
                                        </Form>
                                    )}
                                </div>
                            </div>
                        )}

                        <TwoFactorSetupModal
                            isOpen={showSetupModal}
                            onClose={() => setShowSetupModal(false)}
                            requiresConfirmation={requiresConfirmation}
                            twoFactorEnabled={twoFactorEnabled}
                            qrCodeSvg={qrCodeSvg}
                            manualSetupKey={manualSetupKey}
                            clearSetupData={clearSetupData}
                            fetchSetupData={fetchSetupData}
                            errors={errors}
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}
