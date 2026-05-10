import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarDays,
    Dumbbell,
    LayoutGrid,
    MessageSquare,
    ShieldAlert,
    Settings2,
    ShieldCheck,
    Sparkles,
    Users,
    UtensilsCrossed,
} from 'lucide-react';
import AppLogo from './app-logo';

export function AppSidebar() {
    const page = usePage<SharedData>();
    const role = page.props.auth.user?.role ?? 'client';
    const mainNavItems: NavItem[] =
        role === 'admin'
            ? [
                  {
                      title: 'Command Center',
                      href: '/admin',
                      icon: LayoutGrid,
                  },
                  {
                      title: 'Users',
                      href: '/admin/users',
                      icon: Users,
                  },
                  {
                      title: 'Verifications',
                      href: '/admin/professional-verifications',
                      icon: ShieldCheck,
                  },
                  {
                      title: 'Audit Logs',
                      href: '/admin/logs',
                      icon: Settings2,
                  },
                  {
                      title: 'Moderation',
                      href: '/admin/message-moderations',
                      icon: ShieldAlert,
                  },
              ]
            : [
                  {
                      title: 'Dashboard',
                      href: dashboard(),
                      icon: LayoutGrid,
                  },
                  {
                      title: 'AI Coach',
                      href: '/coach',
                      icon: Sparkles,
                  },
                  {
                      title: 'AI Planner',
                      href: '/ai/planner',
                      icon: Sparkles,
                  },
                  {
                      title: 'Meals',
                      href: '/track-meals',
                      icon: UtensilsCrossed,
                  },
                  {
                      title: 'Workouts',
                      href: '/workouts/log',
                      icon: Dumbbell,
                  },
              ];

    const footerNavItems: NavItem[] =
        role === 'admin'
            ? [
                  {
                      title: 'Notifications',
                      href: '/admin/notifications',
                      icon: Bell,
                  },
                  {
                      title: 'Audit Logs',
                      href: '/admin/logs',
                      icon: Settings2,
                  },
                  {
                      title: 'Moderation',
                      href: '/admin/message-moderations',
                      icon: ShieldAlert,
                  },
              ]
            : [
                  {
                      title: 'Messages',
                      href: '/messages',
                      icon: MessageSquare,
                  },
                  {
                      title: 'Appointments',
                      href: '/appointments',
                      icon: CalendarDays,
                  },
              ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
