import {
    AdminDataTable,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminStickyBar,
    AdminToggleGroup,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    RiskBannerStack,
    StatusChip,
} from '@/components/admin/admin-workflows';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTableBody,
    ProductTableCell,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
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
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    ExternalLink,
    Flag,
    LockKeyhole,
    Power,
    RotateCcw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    UserCog,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type SettingsTab = 'roles' | 'permissions' | 'feature-flags' | 'ai-rollouts';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type ChangeAction =
    | 'assign_role'
    | 'revoke_role'
    | 'enable_flag'
    | 'disable_flag'
    | 'rollout_ai'
    | 'emergency_disable';

type ControlRow = {
    id: string;
    tab: SettingsTab;
    actor: string;
    name: string;
    affectedUsers: string;
    affectedFeatures: string[];
    currentState: string;
    proposedState: string;
    lastChangedBy: string;
    lastChangedAt: string;
    riskLevel: RiskLevel;
    owner: string;
    summary: string;
    confirmationRequired: boolean;
    recommendedAction: ChangeAction;
    auditHref: string;
};

const tabs: Array<{ value: SettingsTab; label: string }> = [
    { value: 'roles', label: 'Roles' },
    { value: 'permissions', label: 'Permissions' },
    { value: 'feature-flags', label: 'Feature Flags' },
    { value: 'ai-rollouts', label: 'AI Rollouts' },
];

const controls: ControlRow[] = [
    {
        id: 'role-admin-support-lead',
        tab: 'roles',
        actor: 'Maya Haddad',
        name: 'Support lead elevated access',
        affectedUsers: '3 support leads',
        affectedFeatures: ['Support Cases', 'Users', 'Meal Logs'],
        currentState: 'Support agent',
        proposedState: 'Support lead',
        lastChangedBy: 'Nour Admin',
        lastChangedAt: '2026-04-29 17:42',
        riskLevel: 'medium',
        owner: 'Operations',
        summary:
            'Allows selected support leads to resolve intervention cases and view linked user safety summaries.',
        confirmationRequired: true,
        recommendedAction: 'assign_role',
        auditHref: '/admin/logs',
    },
    {
        id: 'role-trainer-temp-admin',
        tab: 'roles',
        actor: 'Rami Trainer',
        name: 'Temporary admin role cleanup',
        affectedUsers: '1 professional',
        affectedFeatures: ['Admin Overview', 'Professional Directory'],
        currentState: 'Admin + trainer',
        proposedState: 'Trainer only',
        lastChangedBy: 'System import',
        lastChangedAt: '2026-04-28 09:15',
        riskLevel: 'high',
        owner: 'Platform',
        summary:
            'Imported professional account still has an admin role from a staging seed and should be revoked.',
        confirmationRequired: true,
        recommendedAction: 'revoke_role',
        auditHref: '/admin/logs',
    },
    {
        id: 'permission-user-delete',
        tab: 'permissions',
        actor: 'Admin group',
        name: 'Permanent user deletion permission',
        affectedUsers: '5 admins',
        affectedFeatures: ['Users', 'Audit Logs', 'Privacy & Compliance'],
        currentState: 'Restricted to owner admins',
        proposedState: 'Keep restricted',
        lastChangedBy: 'Nour Admin',
        lastChangedAt: '2026-04-26 13:10',
        riskLevel: 'critical',
        owner: 'Security',
        summary:
            'Deletion affects user safety history, AI context, privacy exports, and audit traceability.',
        confirmationRequired: true,
        recommendedAction: 'revoke_role',
        auditHref: '/admin/logs',
    },
    {
        id: 'permission-planner-regenerate',
        tab: 'permissions',
        actor: 'AI operators',
        name: 'Planner regeneration permission',
        affectedUsers: '4 AI operators',
        affectedFeatures: ['AI Planner', 'Safety Profiles', 'Diagnostics'],
        currentState: 'Review only',
        proposedState: 'Regenerate after review',
        lastChangedBy: 'AI Ops',
        lastChangedAt: '2026-04-27 11:34',
        riskLevel: 'high',
        owner: 'AI Safety',
        summary:
            'Lets AI operators regenerate plans after reviewing user restrictions and failed planner runs.',
        confirmationRequired: true,
        recommendedAction: 'assign_role',
        auditHref: '/admin/logs',
    },
    {
        id: 'flag-new-onboarding-safety',
        tab: 'feature-flags',
        actor: 'Feature flag service',
        name: 'Onboarding safety questions v2',
        affectedUsers: 'New client signups',
        affectedFeatures: ['Signup', 'Safety Profiles', 'Planner'],
        currentState: 'Enabled for 20%',
        proposedState: 'Enabled for 50%',
        lastChangedBy: 'Product Ops',
        lastChangedAt: '2026-04-30 08:40',
        riskLevel: 'medium',
        owner: 'Product',
        summary:
            'Expands the revised restrictions form that captures allergies, injuries, and diet type before plan generation.',
        confirmationRequired: true,
        recommendedAction: 'enable_flag',
        auditHref: '/admin/logs',
    },
    {
        id: 'flag-public-directory',
        tab: 'feature-flags',
        actor: 'Feature flag service',
        name: 'Public professionals directory',
        affectedUsers: 'All clients',
        affectedFeatures: ['Professionals', 'Places', 'Assignments'],
        currentState: 'Enabled',
        proposedState: 'Disable if profile quality drops',
        lastChangedBy: 'Directory Ops',
        lastChangedAt: '2026-04-25 16:22',
        riskLevel: 'low',
        owner: 'Directory',
        summary:
            'Controls visibility of curated trainer and dietitian profiles in client discovery surfaces.',
        confirmationRequired: false,
        recommendedAction: 'disable_flag',
        auditHref: '/admin/logs',
    },
    {
        id: 'rollout-coach-context-v2',
        tab: 'ai-rollouts',
        actor: 'AI rollout service',
        name: 'Coach context refresh v2',
        affectedUsers: 'Returning clients with meal history',
        affectedFeatures: ['AI Coach', 'Meal Logs', 'Safety Rules'],
        currentState: '25% rollout',
        proposedState: '50% rollout',
        lastChangedBy: 'Coach Safety',
        lastChangedAt: '2026-04-30 10:05',
        riskLevel: 'high',
        owner: 'AI Safety',
        summary:
            'Expands coach access to today plus last seven days meal context while enforcing allergy and injury restrictions.',
        confirmationRequired: true,
        recommendedAction: 'rollout_ai',
        auditHref: '/admin/logs',
    },
    {
        id: 'rollout-planner-json-v4',
        tab: 'ai-rollouts',
        actor: 'AI rollout service',
        name: 'Planner JSON schema v4',
        affectedUsers: 'New clients with complete onboarding',
        affectedFeatures: ['AI Planner', 'Plans', 'Diagnostics'],
        currentState: '10% rollout',
        proposedState: 'Emergency disable available',
        lastChangedBy: 'AI Ops',
        lastChangedAt: '2026-04-30 09:48',
        riskLevel: 'critical',
        owner: 'AI Platform',
        summary:
            'High-impact structured planner output change. Use emergency disable if safety or schema validity regresses.',
        confirmationRequired: true,
        recommendedAction: 'emergency_disable',
        auditHref: '/admin/logs',
    },
];

const tabLabel: Record<SettingsTab, string> = {
    roles: 'Roles',
    permissions: 'Permissions',
    'feature-flags': 'Feature Flags',
    'ai-rollouts': 'AI Rollouts',
};

const actionLabels: Record<ChangeAction, string> = {
    assign_role: 'Assign role',
    revoke_role: 'Revoke role',
    enable_flag: 'Enable flag',
    disable_flag: 'Disable flag',
    rollout_ai: 'Roll out AI feature',
    emergency_disable: 'Emergency disable',
};

const riskTone: Record<
    RiskLevel,
    { label: string; className: string; statusValue: string }
> = {
    low: {
        label: 'Low',
        className: 'border-success/35 bg-success/10 text-foreground',
        statusValue: 'success',
    },
    medium: {
        label: 'Medium',
        className: 'border-info/35 bg-info/10 text-foreground',
        statusValue: 'info',
    },
    high: {
        label: 'High',
        className: 'border-warning/35 bg-warning/10 text-foreground',
        statusValue: 'warning',
    },
    critical: {
        label: 'Critical',
        className: 'border-destructive/35 bg-destructive/10 text-foreground',
        statusValue: 'danger',
    },
};

function requiresPrivilegedConfirmation(row: ControlRow) {
    return (
        row.confirmationRequired ||
        row.riskLevel === 'high' ||
        row.riskLevel === 'critical' ||
        row.tab === 'ai-rollouts'
    );
}

function ActionIcon({ action }: { action: ChangeAction }) {
    if (action === 'assign_role' || action === 'revoke_role') {
        return <UserCog className="h-4 w-4" />;
    }

    if (action === 'rollout_ai') {
        return <Sparkles className="h-4 w-4" />;
    }

    if (action === 'emergency_disable') {
        return <Power className="h-4 w-4" />;
    }

    if (action === 'disable_flag') {
        return <RotateCcw className="h-4 w-4" />;
    }

    return <Flag className="h-4 w-4" />;
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] uppercase',
                riskTone[risk].className,
            )}
        >
            {riskTone[risk].label}
        </Badge>
    );
}

function DetailPanel({
    row,
    onAction,
}: {
    row: ControlRow;
    onAction: (action: ChangeAction) => void;
}) {
    const highRisk = row.riskLevel === 'high' || row.riskLevel === 'critical';

    return (
        <AdminPanel
            title="Detail panel"
            description="Review blast radius, current state, and proposed state before changing access or rollout behavior."
            className="xl:sticky xl:top-6"
        >
            <AdminScrollArea maxHeightClassName="max-h-[38rem]">
                <div className="space-y-4">
                    <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <div className="haye-kicker">
                                    {tabLabel[row.tab]}
                                </div>
                                <h3 className="mt-1 text-lg font-semibold text-foreground">
                                    {row.name}
                                </h3>
                            </div>
                            <RiskBadge risk={row.riskLevel} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {row.summary}
                        </p>
                    </div>

                    {highRisk ? (
                        <RiskBannerStack
                            items={[
                                {
                                    severity:
                                        row.riskLevel === 'critical'
                                            ? 'danger'
                                            : 'warning',
                                    title: 'Confirmation required',
                                    description:
                                        'This change affects privileged access, AI behavior, or broad user-facing surfaces. Confirm the action and keep audit traceability.',
                                    meta: `${row.affectedUsers} affected`,
                                },
                            ]}
                        />
                    ) : null}

                    <div className="grid gap-3">
                        <div className="rounded-[20px] border border-border/55 bg-background/68 px-4 py-3">
                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                Actor
                            </div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                                {row.actor}
                            </div>
                        </div>
                        <div className="rounded-[20px] border border-border/55 bg-background/68 px-4 py-3">
                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                Affected users
                            </div>
                            <div className="mt-1 text-sm font-medium text-foreground">
                                {row.affectedUsers}
                            </div>
                        </div>
                        <div className="rounded-[20px] border border-border/55 bg-background/68 px-4 py-3">
                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                Affected pages/features
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {row.affectedFeatures.map((feature) => (
                                    <StatusChip
                                        key={feature}
                                        value="info"
                                        label={feature}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                        <div className="rounded-[20px] border border-border/55 bg-background/68 px-4 py-3">
                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                Current state
                            </div>
                            <div className="mt-2 text-sm leading-6 text-foreground">
                                {row.currentState}
                            </div>
                        </div>
                        <div className="rounded-[20px] border border-primary/20 bg-primary/8 px-4 py-3">
                            <div className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                Proposed state
                            </div>
                            <div className="mt-2 text-sm leading-6 text-foreground">
                                {row.proposedState}
                            </div>
                        </div>
                    </div>

                    <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-1">
                        <div>
                            <dt className="text-muted-foreground">Owner</dt>
                            <dd className="mt-1 font-medium text-foreground">
                                {row.owner}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                Last changed by
                            </dt>
                            <dd className="mt-1 font-medium text-foreground">
                                {row.lastChangedBy}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                Last changed at
                            </dt>
                            <dd className="mt-1 font-medium text-foreground">
                                {row.lastChangedAt}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">
                                Audit trail
                            </dt>
                            <dd className="mt-1">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={row.auditHref}>
                                        <ExternalLink className="h-4 w-4" />
                                        Open logs
                                    </Link>
                                </Button>
                            </dd>
                        </div>
                    </dl>
                </div>
            </AdminScrollArea>

            <AdminStickyBar
                className="mt-4 rounded-[20px]"
                summary={
                    requiresPrivilegedConfirmation(row)
                        ? 'Privileged confirmation required'
                        : 'Low-risk action'
                }
            >
                <Button
                    type="button"
                    variant={
                        row.recommendedAction === 'emergency_disable'
                            ? 'destructive'
                            : 'default'
                    }
                    onClick={() => onAction(row.recommendedAction)}
                >
                    <ActionIcon action={row.recommendedAction} />
                    {actionLabels[row.recommendedAction]}
                </Button>
            </AdminStickyBar>
        </AdminPanel>
    );
}

function ConfirmationDialog({
    row,
    action,
    open,
    onOpenChange,
}: {
    row: ControlRow | null;
    action: ChangeAction | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const actionLabel = action ? actionLabels[action] : 'Confirm change';
    const requiresTypeConfirm = row ? requiresPrivilegedConfirmation(row) : true;
    const [confirmationText, setConfirmationText] = useState('');
    const canConfirm =
        !requiresTypeConfirm ||
        confirmationText.trim().toUpperCase() === 'CONFIRM';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        Confirm high-risk admin change
                    </DialogTitle>
                    <DialogDescription className="leading-6">
                        {row
                            ? `${actionLabel} for ${row.name}. Review the affected users and proposed state before proceeding.`
                            : 'Review this privileged change before proceeding.'}
                    </DialogDescription>
                </DialogHeader>

                {row ? (
                    <div className="space-y-3">
                        <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="font-semibold text-foreground">
                                    {row.name}
                                </div>
                                <RiskBadge risk={row.riskLevel} />
                            </div>
                            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <div className="text-muted-foreground">
                                        Current
                                    </div>
                                    <div className="mt-1 font-medium text-foreground">
                                        {row.currentState}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">
                                        Proposed
                                    </div>
                                    <div className="mt-1 font-medium text-foreground">
                                        {row.proposedState}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 text-sm leading-6 text-muted-foreground">
                                Affected users: {row.affectedUsers}
                            </div>
                        </div>

                        {requiresTypeConfirm ? (
                            <AdminField
                                label="Type CONFIRM"
                                helper="Required for privileged, high-risk, or AI-related changes."
                            >
                                <input
                                    value={confirmationText}
                                    onChange={(event) =>
                                        setConfirmationText(event.target.value)
                                    }
                                    className="dashboard-surface-soft h-10 w-full rounded-xl border border-border/60 bg-background/82 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                                    placeholder="CONFIRM"
                                />
                            </AdminField>
                        ) : null}
                    </div>
                ) : null}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant={
                            action === 'emergency_disable'
                                ? 'destructive'
                                : 'default'
                        }
                        disabled={!canConfirm}
                        onClick={() => onOpenChange(false)}
                    >
                        <ActionIcon action={action ?? 'assign_role'} />
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminRolesPermissionsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('roles');
    const [query, setQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(controls[0].id);
    const [pendingAction, setPendingAction] = useState<ChangeAction | null>(
        null,
    );
    const [dialogOpen, setDialogOpen] = useState(false);

    const rows = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return controls.filter((row) => {
            const matchesTab = row.tab === activeTab;
            const matchesRisk =
                riskFilter === 'all' || row.riskLevel === riskFilter;
            const matchesQuery =
                normalizedQuery.length === 0 ||
                [
                    row.actor,
                    row.name,
                    row.affectedUsers,
                    row.affectedFeatures.join(' '),
                    row.currentState,
                    row.proposedState,
                    row.lastChangedBy,
                    row.owner,
                    row.summary,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);

            return matchesTab && matchesRisk && matchesQuery;
        });
    }, [activeTab, query, riskFilter]);

    const selectedRow =
        controls.find((row) => row.id === selectedId && row.tab === activeTab) ??
        rows[0] ??
        controls.find((row) => row.tab === activeTab) ??
        controls[0];

    const highRiskCount = controls.filter(
        (row) => row.riskLevel === 'high' || row.riskLevel === 'critical',
    ).length;
    const aiRelatedCount = controls.filter(
        (row) => row.tab === 'ai-rollouts',
    ).length;
    const confirmationCount = controls.filter(requiresPrivilegedConfirmation).length;

    function openConfirmation(row: ControlRow, action: ChangeAction) {
        setSelectedId(row.id);
        setPendingAction(action);
        setDialogOpen(true);
    }

    return (
        <>
            <Head title="Admin Roles, Permissions & Feature Flags" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Roles, Permissions & Feature Flags"
                    description="High-risk admin control surface for access changes, feature flags, and AI rollouts with explicit blast-radius review."
                >
                    <div className="space-y-6">
                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Governed controls"
                                value={controls.length}
                                tone="accent"
                                helper="Roles, permissions, flags, and rollout controls."
                            />
                            <AdminStatCard
                                label="High-risk items"
                                value={highRiskCount}
                                helper="Critical or high risk changes visible in this surface."
                            />
                            <AdminStatCard
                                label="AI-related controls"
                                value={aiRelatedCount}
                                helper="Planner, coach, safety, and runtime rollout items."
                            />
                            <AdminStatCard
                                label="Confirmations required"
                                value={confirmationCount}
                                helper="Privileged changes that require explicit confirmation."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Safety Warning"
                            description="This page can change who has access and what users experience. Review affected users, pages, current state, proposed state, and audit trail before acting."
                        >
                            <RiskBannerStack
                                items={[
                                    {
                                        severity: 'danger',
                                        title: 'Privileged and AI-related changes require confirmation',
                                        description:
                                            'Role changes, broad permissions, AI rollout promotions, and emergency disables can affect user safety, privacy, and platform availability.',
                                        meta: 'Every action should be auditable',
                                    },
                                    {
                                        severity: 'warning',
                                        title: 'Use emergency disable only for active risk',
                                        description:
                                            'Emergency disable is reserved for unsafe AI behavior, privacy exposure, broken access boundaries, or severe production regressions.',
                                        meta: 'Review diagnostics after use',
                                    },
                                ]}
                            />
                        </AdminSection>

                        <AdminSection
                            title="Tabs"
                            description="Switch between access controls, feature flags, and AI rollout settings without losing the detail context."
                        >
                            <AdminToggleGroup
                                value={activeTab}
                                onChange={(value) => {
                                    const nextTab = value as SettingsTab;
                                    setActiveTab(nextTab);
                                    setSelectedId(
                                        controls.find(
                                            (row) => row.tab === nextTab,
                                        )?.id ?? controls[0].id,
                                    );
                                }}
                                options={tabs}
                            />
                        </AdminSection>

                        <AdminSection
                            title="Settings Table"
                            description="Compact table for high-risk settings. Dense JSON and backend configuration stay out of this page."
                        >
                            <div className="space-y-4">
                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField
                                            label="Search"
                                            className="min-w-[240px] flex-1"
                                        >
                                            <AdminSearchInput
                                                value={query}
                                                onChange={(event) =>
                                                    setQuery(event.target.value)
                                                }
                                                placeholder="Search actor, feature, state, owner, or summary"
                                            />
                                        </AdminField>
                                        <AdminField
                                            label="Risk"
                                            className="sm:w-52"
                                        >
                                            <AdminNativeSelect
                                                value={riskFilter}
                                                onChange={(event) =>
                                                    setRiskFilter(
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="all">
                                                    All risk levels
                                                </option>
                                                <option value="critical">
                                                    Critical
                                                </option>
                                                <option value="high">
                                                    High
                                                </option>
                                                <option value="medium">
                                                    Medium
                                                </option>
                                                <option value="low">Low</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                    </AdminToolbarGroup>
                                </AdminToolbar>

                                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] xl:items-start">
                                    <AdminPanel
                                        title={`${tabLabel[activeTab]} settings`}
                                        description="Select a row to inspect full blast radius and confirmation requirements."
                                        className="p-0"
                                    >
                                        <AdminScrollArea
                                            className="px-4 pb-4"
                                            maxHeightClassName="max-h-[38rem]"
                                        >
                                            <AdminDataTable
                                                className="mt-4"
                                                tableClassName="min-w-[1080px]"
                                            >
                                                <ProductTableHead>
                                                    <ProductTableRow>
                                                        <ProductTableHeaderCell>
                                                            Actor
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Control
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Affected users
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Pages/features
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Current state
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Proposed state
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Last changed by
                                                        </ProductTableHeaderCell>
                                                        <ProductTableHeaderCell>
                                                            Risk
                                                        </ProductTableHeaderCell>
                                                    </ProductTableRow>
                                                </ProductTableHead>
                                                <ProductTableBody>
                                                    {rows.map((row) => {
                                                        const selected =
                                                            row.id ===
                                                            selectedRow.id;

                                                        return (
                                                            <ProductTableRow
                                                                key={row.id}
                                                                interactive
                                                                className={
                                                                    selected
                                                                        ? 'bg-primary/8'
                                                                        : undefined
                                                                }
                                                            >
                                                                <ProductTableCell>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setSelectedId(
                                                                                row.id,
                                                                            )
                                                                        }
                                                                        className="text-left"
                                                                    >
                                                                        <div className="font-medium text-foreground">
                                                                            {
                                                                                row.actor
                                                                            }
                                                                        </div>
                                                                        <div className="mt-1 text-xs text-muted-foreground">
                                                                            Owner:{' '}
                                                                            {
                                                                                row.owner
                                                                            }
                                                                        </div>
                                                                    </button>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="font-medium text-foreground">
                                                                        {
                                                                            row.name
                                                                        }
                                                                    </div>
                                                                    <div className="mt-1 line-clamp-2 max-w-xs text-xs leading-5 text-muted-foreground">
                                                                        {
                                                                            row.summary
                                                                        }
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    {
                                                                        row.affectedUsers
                                                                    }
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="flex max-w-xs flex-wrap gap-1.5">
                                                                        {row.affectedFeatures.map(
                                                                            (
                                                                                feature,
                                                                            ) => (
                                                                                <Badge
                                                                                    key={`${row.id}-${feature}`}
                                                                                    variant="outline"
                                                                                    className="border-border/60 bg-background/72"
                                                                                >
                                                                                    {
                                                                                        feature
                                                                                    }
                                                                                </Badge>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <span className="text-sm text-muted-foreground">
                                                                        {
                                                                            row.currentState
                                                                        }
                                                                    </span>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <span className="font-medium text-foreground">
                                                                        {
                                                                            row.proposedState
                                                                        }
                                                                    </span>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <div className="font-medium text-foreground">
                                                                        {
                                                                            row.lastChangedBy
                                                                        }
                                                                    </div>
                                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                                        {
                                                                            row.lastChangedAt
                                                                        }
                                                                    </div>
                                                                </ProductTableCell>
                                                                <ProductTableCell>
                                                                    <RiskBadge
                                                                        risk={
                                                                            row.riskLevel
                                                                        }
                                                                    />
                                                                </ProductTableCell>
                                                            </ProductTableRow>
                                                        );
                                                    })}
                                                </ProductTableBody>
                                            </AdminDataTable>

                                            {rows.length === 0 ? (
                                                <div className="mt-4">
                                                    <AdminNotice tone="info">
                                                        No settings match the
                                                        current tab and filters.
                                                    </AdminNotice>
                                                </div>
                                            ) : null}
                                        </AdminScrollArea>
                                    </AdminPanel>

                                    <DetailPanel
                                        row={selectedRow}
                                        onAction={(action) =>
                                            openConfirmation(
                                                selectedRow,
                                                action,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </AdminSection>

                        <AdminStickyBar
                            summary={`Selected: ${selectedRow.name}`}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    openConfirmation(
                                        selectedRow,
                                        'assign_role',
                                    )
                                }
                            >
                                <UserCog className="h-4 w-4" />
                                Assign role
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    openConfirmation(
                                        selectedRow,
                                        'revoke_role',
                                    )
                                }
                            >
                                <LockKeyhole className="h-4 w-4" />
                                Revoke role
                            </Button>
                            <Button
                                type="button"
                                onClick={() =>
                                    openConfirmation(
                                        selectedRow,
                                        'enable_flag',
                                    )
                                }
                            >
                                <Flag className="h-4 w-4" />
                                Enable flag
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                    openConfirmation(
                                        selectedRow,
                                        'emergency_disable',
                                    )
                                }
                            >
                                <Power className="h-4 w-4" />
                                Emergency disable
                            </Button>
                        </AdminStickyBar>

                        <div className="flex flex-col gap-3 rounded-[22px] border border-border/60 bg-background/64 px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Confirmation outcomes should write to audit
                                logs and link back to affected records.
                            </span>
                            <div className="flex flex-wrap gap-2">
                                <Button asChild variant="outline">
                                    <Link href="/admin/logs">
                                        <ShieldCheck className="h-4 w-4" />
                                        Audit logs
                                    </Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link href="/admin/diagnostics">
                                        <ExternalLink className="h-4 w-4" />
                                        Diagnostics
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <ConfirmationDialog
                        row={selectedRow}
                        action={pendingAction}
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                    />
                </AdminShell>
            </RoleGuard>
        </>
    );
}
