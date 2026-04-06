import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import InputError from '@/components/input-error';
import { ProductBanner, ProductSection } from '@/components/product/page';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import SettingsLayout from '@/layouts/settings/layout';
import { disable, enable } from '@/routes/two-factor';
import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';

interface SecurityProps {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
}

export default function Security({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: SecurityProps) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [showSetupModal, setShowSetupModal] = useState(false);

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

    return (
        <>
            <Head title="Security settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <ProductSection
                        title="Security overview"
                        description="Manage sign-in protection in one place, including password updates and two-factor authentication."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">
                                            Password
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                            Use a long, unique password for your
                                            Hayetak account.
                                        </p>
                                    </div>
                                    <Badge
                                        variant="outline"
                                        className="rounded-full px-3 py-1"
                                    >
                                        Active
                                    </Badge>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-foreground">
                                            Two-factor authentication
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                            Add an authenticator code during
                                            sign-in for extra protection.
                                        </p>
                                    </div>
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
                                </div>
                            </div>
                        </div>
                    </ProductSection>

                    <ProductSection
                        title="Update password"
                        description="Change your password here without leaving the security workspace."
                    >
                        <Form
                            {...PasswordController.update.form()}
                            options={{ preserveScroll: true }}
                            resetOnError={[
                                'password',
                                'password_confirmation',
                                'current_password',
                            ]}
                            resetOnSuccess
                            onError={(formErrors) => {
                                if (formErrors.password) {
                                    passwordInput.current?.focus();
                                }

                                if (formErrors.current_password) {
                                    currentPasswordInput.current?.focus();
                                }
                            }}
                            className="space-y-6"
                        >
                            {({
                                errors: formErrors,
                                processing,
                                recentlySuccessful,
                            }) => (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2 sm:col-span-2">
                                            <Label htmlFor="current_password">
                                                Current password
                                            </Label>

                                            <Input
                                                id="current_password"
                                                ref={currentPasswordInput}
                                                name="current_password"
                                                type="password"
                                                className="mt-1 block w-full"
                                                autoComplete="current-password"
                                                placeholder="Current password"
                                            />

                                            <InputError
                                                message={
                                                    formErrors.current_password
                                                }
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password">
                                                New password
                                            </Label>

                                            <Input
                                                id="password"
                                                ref={passwordInput}
                                                name="password"
                                                type="password"
                                                className="mt-1 block w-full"
                                                autoComplete="new-password"
                                                placeholder="New password"
                                            />

                                            <InputError
                                                message={formErrors.password}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="password_confirmation">
                                                Confirm password
                                            </Label>

                                            <Input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                className="mt-1 block w-full"
                                                autoComplete="new-password"
                                                placeholder="Confirm password"
                                            />

                                            <InputError
                                                message={
                                                    formErrors.password_confirmation
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            disabled={processing}
                                            data-test="update-password-button"
                                        >
                                            Save password
                                        </Button>

                                        <Transition
                                            show={recentlySuccessful}
                                            enter="transition ease-in-out"
                                            enterFrom="opacity-0"
                                            leave="transition ease-in-out"
                                            leaveTo="opacity-0"
                                        >
                                            <p className="text-sm text-neutral-600">
                                                Saved
                                            </p>
                                        </Transition>
                                    </div>
                                </>
                            )}
                        </Form>
                    </ProductSection>

                    <ProductSection
                        title="Two-factor authentication"
                        description="Enable, continue, or disable 2FA from the same security page."
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
                                            ? 'Your account uses an authenticator code during sign-in. Keep your recovery codes somewhere safe in case you lose your device.'
                                            : 'Turn this on when you want an extra verification step during sign-in. You can finish setup here whenever you are ready.'}
                                    </p>
                                </div>
                            </div>

                            {twoFactorEnabled ? (
                                <div className="space-y-4">
                                    <ProductBanner tone="success">
                                        Two-factor authentication is active for
                                        this account.
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
                                        You can enable two-factor authentication
                                        now or skip it for later. If you started
                                        setup already, continue from this page.
                                    </ProductBanner>

                                    {hasSetupData ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setShowSetupModal(true)
                                            }
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
                </div>
            </SettingsLayout>
        </>
    );
}
