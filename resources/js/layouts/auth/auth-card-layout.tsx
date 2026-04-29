import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { home } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-6 py-10 md:px-10">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-72 bg-primary/8" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-secondary/10 blur-3xl" />
                <div className="absolute top-24 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            </div>

            <div className="relative flex w-full max-w-md flex-col gap-6">
                <Link
                    href={home()}
                    className="inline-flex items-center gap-3 self-center rounded-full border border-border/70 bg-card/72 px-4 py-2 font-medium shadow-sm backdrop-blur"
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <AppLogoIcon className="size-6" />
                    </div>
                    <span>Hayetak</span>
                </Link>

                <div className="flex flex-col gap-6">
                    <Card className="rounded-[30px] border-border/70 bg-card/92 shadow-[0_35px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur">
                        <CardHeader className="px-10 pt-8 pb-0 text-center">
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
                                Secure access
                            </p>
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">
                            {children}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
