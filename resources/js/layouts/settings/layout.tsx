import { ProductHero, ProductPageShell } from '@/components/product/page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editPassword } from '@/routes/password';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Password',
        href: editPassword(),
        icon: null,
    },
    {
        title: 'Two-Factor Auth',
        href: show(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const currentPath = usePage().url.split('?')[0];

    return (
        <ProductPageShell width="wide">
            <ProductHero
                eyebrow="Account settings"
                title="Settings"
                description="Manage your profile, security, and appearance from one consistent workspace."
            />

            <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="rounded-[24px] border border-border/70 bg-card/95 p-4 shadow-sm">
                    <div className="space-y-2 px-2 pb-4">
                        <h2 className="text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                            Sections
                        </h2>
                        <p className="text-sm leading-6 text-muted-foreground">
                            These pages stay aligned with the rest of Hayetak so
                            security, profile, and appearance changes all feel
                            like part of the same product.
                        </p>
                    </div>

                    <nav className="grid gap-2">
                        {sidebarNavItems.map((item, index) => {
                            const href =
                                typeof item.href === 'string'
                                    ? item.href
                                    : item.href.url;

                            return (
                                <Button
                                    key={`${href}-${index}`}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        'h-auto justify-start rounded-2xl px-4 py-3 text-left',
                                        currentPath === href
                                            ? 'bg-primary/10 text-foreground hover:bg-primary/10'
                                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                                    )}
                                >
                                    <Link href={item.href}>
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                {item.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.title === 'Profile'
                                                    ? 'Personal details and goals'
                                                    : item.title ===
                                                        'Two-Factor Auth'
                                                      ? 'Optional account protection'
                                                      : item.title ===
                                                          'Password'
                                                        ? 'Update your sign-in credentials'
                                                        : 'Theme and visual preference'}
                                            </div>
                                        </div>
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                <div className="min-w-0 space-y-6">{children}</div>
            </div>
        </ProductPageShell>
    );
}
