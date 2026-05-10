import { ProductHero, ProductPageShell } from '@/components/product/page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    KeyRound,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { type PropsWithChildren } from 'react';

type SettingsNavGroup = {
    label: string;
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
        items: [
            {
                title: 'Profile',
                href: '/settings/profile',
                helper: 'Identity, goals, restrictions, and progress',
                icon: UserRound,
            },
        ],
    },
    {
        label: 'Account',
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
    const navItems = sidebarGroups.flatMap((group) =>
        group.items.map((item) => ({
            ...item,
            group: group.label,
            active: [item.href, ...(item.matches ?? [])].includes(currentPath),
        })),
    );

    return (
        <ProductPageShell width="wide">
            <ProductHero
                eyebrow="Account settings"
                title={activeItem.title}
                description={activeItem.helper}
                meta={
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card/90 text-foreground">
                            <activeItem.icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                Current section
                            </p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {activeItem.title}
                            </p>
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

            <div className="space-y-6">
                <div className="rounded-[24px] border border-border/70 bg-card/95 p-3 shadow-sm">
                    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
                        {navItems.map((item) => (
                            <Button
                                key={item.href}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(
                                    'h-auto justify-start rounded-2xl px-3 py-3 text-left',
                                    item.active
                                        ? 'border border-primary/20 bg-primary/10 text-foreground shadow-[0_12px_30px_-24px_rgba(23,38,60,0.55)] hover:bg-primary/10'
                                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                                )}
                            >
                                <Link href={item.href}>
                                    <div className="flex w-full items-start gap-3">
                                        <span
                                            className={cn(
                                                'mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                                                item.active
                                                    ? 'border-primary/20 bg-primary/12 text-foreground'
                                                    : 'border-border/70 bg-background/80 text-muted-foreground',
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {item.title}
                                                </span>
                                                {item.active ? (
                                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                ) : null}
                                            </div>
                                            <div className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                                {item.group}
                                            </div>
                                            <div className="text-xs leading-5 break-words whitespace-normal text-muted-foreground">
                                                {item.helper}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="min-w-0 space-y-6">{children}</div>
            </div>
        </ProductPageShell>
    );
}
