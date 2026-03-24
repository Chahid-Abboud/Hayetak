import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { enable } from '@/routes/two-factor';
import { Form } from '@inertiajs/react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OptionalTwoFactorPrompt({
    open,
    onDismiss,
    requiresConfirmation,
}: {
    open: boolean;
    onDismiss: () => void;
    requiresConfirmation: boolean;
}) {
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        errors,
    } = useTwoFactorAuth();

    const [showPrompt, setShowPrompt] = useState(open);
    const [showSetupModal, setShowSetupModal] = useState(false);

    useEffect(() => {
        setShowPrompt(open);
    }, [open]);

    const handleDismiss = () => {
        setShowPrompt(false);
        onDismiss();
    };

    const handleOpenSetup = () => {
        setShowPrompt(false);
        setShowSetupModal(true);
    };

    return (
        <>
            <Dialog
                open={showPrompt}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        handleDismiss();
                    }
                }}
            >
                <DialogContent className="overflow-hidden border-border/70 bg-card/95 p-0 sm:max-w-lg">
                    <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,164,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.82))] px-6 py-6 dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.22),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(52,211,153,0.18),_transparent_24%),linear-gradient(180deg,rgba(11,16,32,0.96),rgba(11,16,32,0.9))]">
                        <DialogHeader className="items-start text-left">
                            <Badge
                                variant="outline"
                                className="rounded-full px-3 py-1 text-[11px] tracking-[0.18em] uppercase"
                            >
                                Optional but recommended
                            </Badge>
                            <div className="mt-4 flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div className="space-y-2">
                                    <DialogTitle className="text-2xl font-semibold tracking-tight">
                                        You can enable two-factor authentication
                                    </DialogTitle>
                                    <DialogDescription className="text-sm leading-6 text-muted-foreground">
                                        Add an extra security step to your
                                        account with an authenticator app. You
                                        can set it up now or skip for later from
                                        your settings.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    <div className="space-y-5 px-6 py-6">
                        <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                            You are fully verified and ready to continue. This
                            step is optional, and you can always come back to it
                            from your account settings.
                        </div>

                        <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleDismiss}
                            >
                                Maybe later
                            </Button>

                            {hasSetupData ? (
                                <Button type="button" onClick={handleOpenSetup}>
                                    Continue setup
                                </Button>
                            ) : (
                                <Form
                                    {...enable.form()}
                                    onSuccess={handleOpenSetup}
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="h-4 w-4" />
                                            )}
                                            Enable 2FA
                                        </Button>
                                    )}
                                </Form>
                            )}
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            <TwoFactorSetupModal
                isOpen={showSetupModal}
                onClose={() => {
                    setShowSetupModal(false);
                    onDismiss();
                }}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={false}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={errors}
            />
        </>
    );
}
