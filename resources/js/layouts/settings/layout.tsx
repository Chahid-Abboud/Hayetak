import { ProductHero, ProductPageShell } from '@/components/product/page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    KeyRound,
    Palette,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { type PropsWithChildren } from 'react';

type SettingsNavGroup = {
    label: string;
    description: string;
    items: Array<{
        title: string;
        href: string;
        helper: string;
        icon: typeof UserRound;
        matches?: string[];
    }>;
};

const sidebarGroups: SettingsNavGroup[] = [
    {
        label: 'General',
        description:
            'Your profile page now includes identity, preferences, and appearance controls.',
        items: [
            {
                title: 'Profile',
                href: '/settings/profile',
                helper: 'Identity, goals, restrictions, and progress',
                icon: UserRound,
            },
            {
                title: 'Appearance',
                href: '/settings/appearance',
                helper: 'Theme and interface comfort',
                icon: Palette,
            },
        ],
    },
    {
        label: 'Account',
        description: 'Security stays together in one dedicated place.',
        items: [
            {
                title: 'Security',
                href: '/settings/security',
                helper: 'Sessions, password, and sign-in protection',
                icon: ShieldCheck,
                matches: ['/settings/password', '/settings/two-factor'],
            },
            {
                title: 'Password',
                href: '/settings/password',
                helper: 'Update password directly',
                icon: KeyRound,
            },
            {
                title: 'Two-factor',
                href: '/settings/two-factor',
                helper: 'Authenticator and recovery codes',
                icon: ShieldCheck,
            },
        ],
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const currentPath = usePage().url.split('?')[0];
    const activeItem =
        sidebarGroups
            .flatMap((group) => group.items)
            .find((item) =>
                [item.href, ...(item.matches ?? [])].includes(currentPath),
            ) ?? sidebarGroups[0].items[0];

    return (
        <ProductPageShell width="wide">
            <ProductHero
                eyebrow="Account settings"
                title="Settings workspace"
                description="Manage your health identity, sign-in protection, and interface preferences from one calm control layer."
                meta={
                    <div className="space-y-3">
                        <div className="rounded-[22px] border border-border/70 bg-background/80 p-4">
                            <p className="haye-kicker">Focused section</p>
                            <div className="mt-3 flex items-center gap-3">
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/90 text-foreground">
                                    <activeItem.icon className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                        {activeItem.title}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        {activeItem.helper}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[20px] border border-border/70 bg-card/85 p-4">
                                <p className="haye-kicker">Profile</p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Keep goals, allergies, and baseline data
                                    aligned.
                                </p>
                            </div>
                            <div className="rounded-[20px] border border-border/70 bg-card/85 p-4">
                                <p className="haye-kicker">Security</p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Password and two-factor stay in the same
                                    lane.
                                </p>
                            </div>
                        </div>
                    </div>
                }
                actions={
                    <>
                        <Button variant="outline" asChild>
                            <Link href="/settings/profile">Open profile</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/settings/security">Open security</Link>
                        </Button>
                    </>
                }
            />

            <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="xl:sticky xl:top-8 xl:self-start">
                    <div className="rounded-[28px] border border-border/70 bg-card/95 p-4 shadow-sm">
                        <div className="space-y-4">
                            {sidebarGroups.map((group) => (
                                <section
                                    key={group.label}
                                    className="space-y-2"
                                >
                                    <div className="space-y-1 px-2">
                                        <h2 className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                            {group.label}
                                        </h2>
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            {group.description}
                                        </p>
                                    </div>

                                    <nav className="grid gap-2">
                                        {group.items.map((item) => {
                                            const active = [
                                                item.href,
                                                ...(item.matches ?? []),
                                            ].includes(currentPath);

                                            return (
                                                <Button
                                                    key={item.href}
                                                    size="sm"
                                                    variant="ghost"
                                                    asChild
                                                    className={cn(
                                                        'h-auto justify-start rounded-[22px] px-4 py-3 text-left',
                                                        active
                                                            ? 'border border-primary/20 bg-primary/10 text-foreground shadow-[0_12px_30px_-24px_rgba(23,38,60,0.55)] hover:bg-primary/10'
                                                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                                                    )}
                                                >
                                                    <Link href={item.href}>
                                                        <div className="flex items-start gap-3">
                                                            <span
                                                                className={cn(
                                                                    'mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border',
                                                                    active
                                                                        ? 'border-primary/20 bg-primary/12 text-foreground'
                                                                        : 'border-border/70 bg-background/80 text-muted-foreground',
                                                                )}
                                                            >
                                                                <item.icon className="h-4 w-4" />
                                                            </span>
                                                            <div className="min-w-0 space-y-1">
                                                                <div className="font-medium">
                                                                    {item.title}
                                                                </div>
                                                                <div className="text-xs leading-5 text-muted-foreground">
                                                                    {
                                                                        item.helper
                                                                    }
                                                                </div>
                                                            </div>
                                                            {active ? (
                                                                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                                                            ) : null}
                                                        </div>
                                                    </Link>
                                                </Button>
                                            );
                                        })}
                                    </nav>
                                </section>
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="min-w-0 space-y-6">{children}</div>
            </div>
        </ProductPageShell>
    );
}
