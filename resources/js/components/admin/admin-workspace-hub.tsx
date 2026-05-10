import {
    AdminNotice,
    AdminPanel,
    AdminScrollArea,
    AdminStickyBar,
    AdminToggleGroup,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import { StatusChipSet } from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import RoleGuard from '@/components/RoleGuard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ExternalLink,
    FileSearch,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export type AdminWorkspaceHubStat = {
    label: string;
    value: string;
    helper: string;
    tone?: 'default' | 'accent';
};

export type AdminWorkspaceHubWorkflow = {
    id: string;
    title: string;
    summary: string;
    href: string;
    actionLabel: string;
    status?: string;
    statusLabel?: string;
    meta?: string;
    fields: Array<{ label: string; value: string }>;
    detail: string[];
};

export type AdminWorkspaceHubTab = {
    value: string;
    label: string;
    icon: LucideIcon;
    guidance: string;
    toolbarSummary: string;
    primaryHref: string;
    primaryActionLabel: string;
    diagnosticsHref?: string;
    workflows: AdminWorkspaceHubWorkflow[];
};

export function AdminWorkspaceHub({
    headTitle,
    title,
    description,
    stats,
    tabs,
    diagnosticsHref = '/admin/logs',
}: {
    headTitle: string;
    title: string;
    description: string;
    stats: AdminWorkspaceHubStat[];
    tabs: AdminWorkspaceHubTab[];
    diagnosticsHref?: string;
}) {
    const [activeTabValue, setActiveTabValue] = useState(tabs[0]?.value ?? '');
    const activeTab = useMemo(
        () => tabs.find((tab) => tab.value === activeTabValue) ?? tabs[0],
        [activeTabValue, tabs],
    );
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(
        activeTab?.workflows[0]?.id ?? '',
    );

    const selectedWorkflow = useMemo(() => {
        if (!activeTab) return null;

        return (
            activeTab.workflows.find(
                (workflow) => workflow.id === selectedWorkflowId,
            ) ?? activeTab.workflows[0]
        );
    }, [activeTab, selectedWorkflowId]);

    function updateActiveTab(value: string) {
        const nextTab = tabs.find((tab) => tab.value === value);
        setActiveTabValue(value);
        setSelectedWorkflowId(nextTab?.workflows[0]?.id ?? '');
    }

    return (
        <>
            <Head title={headTitle} />
            <RoleGuard roles={['admin']}>
                <AdminShell title={title} description={description}>
                    <div className="space-y-6">
                        <AdminStatsGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {stats.map((stat) => (
                                <AdminStatCard
                                    key={stat.label}
                                    label={stat.label}
                                    value={stat.value}
                                    helper={stat.helper}
                                    tone={stat.tone}
                                />
                            ))}
                        </AdminStatsGrid>

                        {activeTab ? (
                            <>
                                <AdminSection
                                    title="Guidance"
                                    description={activeTab.guidance}
                                >
                                    <AdminNotice tone="info">
                                        If a workflow needs more room, open it
                                        full-width. Raw payloads, transcripts,
                                        and technical traces stay in Logs &
                                        Diagnostics.
                                    </AdminNotice>
                                </AdminSection>

                                <AdminSection
                                    title="Workspace"
                                    description="Use tabs for separate workflows, then select one row to keep the detail panel anchored."
                                >
                                    <div className="space-y-4">
                                        <AdminToggleGroup
                                            value={activeTab.value}
                                            onChange={updateActiveTab}
                                            options={tabs.map((tab) => ({
                                                value: tab.value,
                                                label: tab.label,
                                            }))}
                                        />

                                        <AdminToolbar>
                                            <AdminToolbarGroup grow>
                                                <div className="flex min-h-10 items-center text-sm leading-6 text-muted-foreground">
                                                    {activeTab.toolbarSummary}
                                                </div>
                                            </AdminToolbarGroup>
                                            <AdminToolbarGroup className="xl:w-auto xl:justify-end">
                                                <Button asChild>
                                                    <Link
                                                        href={
                                                            activeTab.primaryHref
                                                        }
                                                    >
                                                        <activeTab.icon className="h-4 w-4" />
                                                        {
                                                            activeTab.primaryActionLabel
                                                        }
                                                    </Link>
                                                </Button>
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                >
                                                    <Link
                                                        href={
                                                            activeTab.diagnosticsHref ??
                                                            diagnosticsHref
                                                        }
                                                    >
                                                        <FileSearch className="h-4 w-4" />
                                                        Logs
                                                    </Link>
                                                </Button>
                                            </AdminToolbarGroup>
                                        </AdminToolbar>

                                        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.6fr)_minmax(320px,0.4fr)] xl:items-start">
                                            <AdminPanel
                                                title={`${activeTab.label} workspace`}
                                                description="Scrollable rows keep the workspace readable when queues grow."
                                            >
                                                <AdminScrollArea maxHeightClassName="max-h-[36rem]">
                                                    <div className="space-y-3">
                                                        {activeTab.workflows.map(
                                                            (workflow) => {
                                                                const selected =
                                                                    selectedWorkflow?.id ===
                                                                    workflow.id;

                                                                return (
                                                                    <button
                                                                        key={
                                                                            workflow.id
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setSelectedWorkflowId(
                                                                                workflow.id,
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'w-full rounded-[22px] border px-4 py-4 text-left transition',
                                                                            selected
                                                                                ? 'border-primary/30 bg-primary/8 shadow-[0_18px_46px_-38px_rgba(15,23,42,0.34)]'
                                                                                : 'border-border/60 bg-background/72 hover:border-primary/24 hover:bg-primary/5',
                                                                        )}
                                                                    >
                                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    {workflow.status ? (
                                                                                        <StatusChipSet
                                                                                            items={[
                                                                                                {
                                                                                                    value: workflow.status,
                                                                                                    label: workflow.statusLabel,
                                                                                                },
                                                                                            ]}
                                                                                        />
                                                                                    ) : null}
                                                                                    {workflow.meta ? (
                                                                                        <span className="text-xs font-medium text-muted-foreground">
                                                                                            {
                                                                                                workflow.meta
                                                                                            }
                                                                                        </span>
                                                                                    ) : null}
                                                                                </div>
                                                                                <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">
                                                                                    {
                                                                                        workflow.title
                                                                                    }
                                                                                </h3>
                                                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                                                    {
                                                                                        workflow.summary
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                                                        </div>
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </AdminScrollArea>
                                            </AdminPanel>

                                            <AdminPanel
                                                title="Detail panel"
                                                description="Selection context stays pinned while actions remain visible."
                                                className="xl:sticky xl:top-6"
                                            >
                                                {selectedWorkflow ? (
                                                    <AdminScrollArea maxHeightClassName="max-h-[34rem]">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                                                                    {
                                                                        selectedWorkflow.title
                                                                    }
                                                                </h3>
                                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                                    {
                                                                        selectedWorkflow.summary
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div className="grid gap-3">
                                                                {selectedWorkflow.fields.map(
                                                                    (field) => (
                                                                        <div
                                                                            key={`${selectedWorkflow.id}-${field.label}`}
                                                                            className="rounded-[18px] border border-border/60 bg-background/70 px-3 py-3"
                                                                        >
                                                                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                                                                {
                                                                                    field.label
                                                                                }
                                                                            </div>
                                                                            <div className="mt-1 text-sm font-medium text-foreground">
                                                                                {
                                                                                    field.value
                                                                                }
                                                                            </div>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                {selectedWorkflow.detail.map(
                                                                    (item) => (
                                                                        <div
                                                                            key={`${selectedWorkflow.id}-${item}`}
                                                                            className="rounded-[18px] border border-border/55 bg-background/64 px-3 py-3 text-sm leading-6 text-muted-foreground"
                                                                        >
                                                                            {
                                                                                item
                                                                            }
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>

                                                            <Button
                                                                asChild
                                                                className="w-full"
                                                            >
                                                                <Link
                                                                    href={
                                                                        selectedWorkflow.href
                                                                    }
                                                                >
                                                                    {
                                                                        selectedWorkflow.actionLabel
                                                                    }
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </AdminScrollArea>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        Select a workflow to
                                                        review its next action.
                                                    </p>
                                                )}
                                            </AdminPanel>
                                        </div>

                                        <AdminStickyBar
                                            summary={
                                                selectedWorkflow
                                                    ? `Selected: ${selectedWorkflow.title}`
                                                    : 'Select a row before acting.'
                                            }
                                        >
                                            {selectedWorkflow ? (
                                                <Button asChild>
                                                    <Link
                                                        href={
                                                            selectedWorkflow.href
                                                        }
                                                    >
                                                        {
                                                            selectedWorkflow.actionLabel
                                                        }
                                                    </Link>
                                                </Button>
                                            ) : null}
                                            <Button asChild variant="outline">
                                                <Link
                                                    href={
                                                        activeTab.diagnosticsHref ??
                                                        diagnosticsHref
                                                    }
                                                >
                                                    Logs & Diagnostics
                                                </Link>
                                            </Button>
                                        </AdminStickyBar>
                                    </div>
                                </AdminSection>
                            </>
                        ) : null}
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
