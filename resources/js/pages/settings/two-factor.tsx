import { ProductBanner, ProductSection } from '@/components/product/page';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import SettingsLayout from '@/layouts/settings/layout';
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

    return (
        <>
            <Head title="Two-Factor Authentication" />
            <SettingsLayout>
                <ProductSection
                    title="Two-factor authentication"
                    description="You can enable two-factor authentication for extra security, then manage recovery codes from the same place."
                >
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 p-5 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant={
                                            twoFactorEnabled
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className="rounded-full px-3 py-1"
                                    >
                                        {twoFactorEnabled
                                            ? 'Enabled'
                                            : 'Optional'}
                                    </Badge>
                                    {!twoFactorEnabled ? (
                                        <Badge
                                            variant="secondary"
                                            className="rounded-full px-3 py-1"
                                        >
                                            Recommended
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                    {twoFactorEnabled
                                        ? 'Your account now uses an authenticator code during sign-in. Keep your recovery codes somewhere safe so you can regain access if you lose your device.'
                                        : 'Turn this on when you want an extra step during sign-in. It is optional, and you can come back any time from your account settings.'}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    router.visit('/settings/profile')
                                }
                            >
                                Back to profile
                            </Button>
                        </div>

                        {twoFactorEnabled ? (
                            <div className="space-y-4">
                                <ProductBanner tone="success">
                                    Two-factor authentication is active for this
                                    account.
                                </ProductBanner>

                                <TwoFactorRecoveryCodes
                                    recoveryCodesList={recoveryCodesList}
                                    fetchRecoveryCodes={fetchRecoveryCodes}
                                    errors={errors}
                                />

                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button
                                            variant="destructive"
                                            type="submit"
                                            disabled={processing}
                                        >
                                            <ShieldBan />
                                            Disable 2FA
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <ProductBanner>
                                    You can enable two-factor authentication now
                                    or skip it for later. If you start setup and
                                    leave before finishing, you can continue
                                    right from this page.
                                </ProductBanner>

                                {hasSetupData ? (
                                    <Button
                                        type="button"
                                        onClick={() => setShowSetupModal(true)}
                                    >
                                        <ShieldCheck />
                                        Continue setup
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
                </ProductSection>
            </SettingsLayout>
        </>
    );
}
