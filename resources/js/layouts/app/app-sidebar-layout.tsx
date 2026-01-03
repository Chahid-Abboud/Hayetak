import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({
  children,
  breadcrumbs = [],
  hideSidebar = false, // NEW PROP
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[]; hideSidebar?: boolean }>) {
  return (
    <AppShell variant="sidebar">
      {/* Conditionally render sidebar */}
      {!hideSidebar && <AppSidebar />}

      <AppContent
        variant={hideSidebar ? undefined : 'sidebar'} // remove left spacing if sidebar hidden
        className="overflow-x-hidden"
      >
        <AppSidebarHeader breadcrumbs={breadcrumbs} />
        {children}
      </AppContent>
    </AppShell>
  );
}
