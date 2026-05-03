import { AdminWorkspaceHub } from '@/components/admin/admin-workspace-hub';
import { Flag, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function AdminSettingsWorkspace() {
    return (
        <AdminWorkspaceHub
            headTitle="Admin Settings"
            title="Settings"
            description="Manage rare high-risk admin controls through conservative tabs, explicit detail panels, and confirmation-heavy actions."
            stats={[
                {
                    label: 'Access',
                    value: '--',
                    helper: 'Roles, permissions, and admin users.',
                    tone: 'accent',
                },
                {
                    label: 'Features',
                    value: '--',
                    helper: 'Feature flags, AI rollout controls, and emergency disables.',
                },
                {
                    label: 'Privacy',
                    value: '--',
                    helper: 'Export requests, deletion requests, and compliance notes.',
                },
                {
                    label: 'Audit trail',
                    value: '--',
                    helper: 'Every sensitive change should link to logs.',
                },
            ]}
            tabs={[
                {
                    value: 'access',
                    label: 'Access',
                    icon: LockKeyhole,
                    guidance:
                        'Use access settings for roles, permissions, and admin users with a detail drawer and confirmation modal for role changes.',
                    toolbarSummary:
                        'Access changes must show who is affected, current role, proposed role, and audit link before confirmation.',
                    primaryHref: '/admin/roles-permissions',
                    primaryActionLabel: 'Open access controls',
                    workflows: [
                        {
                            id: 'access-controls',
                            title: 'Roles and permissions',
                            summary:
                                'Review admin users, roles, permissions, affected features, risk level, and confirmation requirements.',
                            href: '/admin/roles-permissions',
                            actionLabel: 'Open access settings',
                            status: 'warning',
                            statusLabel: 'High risk',
                            meta: 'Confirmation modal',
                            fields: [
                                {
                                    label: 'Includes',
                                    value: 'Roles, permissions, admin users',
                                },
                                {
                                    label: 'Layout',
                                    value: 'Table of users or roles, detail drawer, confirmation modal',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Assign role, revoke role, review impact, open audit trail',
                                },
                            ],
                            detail: [
                                'Settings should remain conservative and clear.',
                                'Never mix all settings into one long form.',
                            ],
                        },
                    ],
                },
                {
                    value: 'features',
                    label: 'Features',
                    icon: Flag,
                    guidance:
                        'Use feature settings for rollout controls, feature flags, AI rollout state, and emergency disables.',
                    toolbarSummary:
                        'Feature rows should show status, affected area, last changed by, and confirmation state.',
                    primaryHref: '/admin/settings-feature-flags',
                    primaryActionLabel: 'Open feature controls',
                    workflows: [
                        {
                            id: 'feature-controls',
                            title: 'Feature flags and AI rollouts',
                            summary:
                                'Review feature flags, affected area, rollout state, last changed by, and emergency-disable behavior.',
                            href: '/admin/settings-feature-flags',
                            actionLabel: 'Open feature settings',
                            status: 'danger',
                            statusLabel: 'Sensitive controls',
                            meta: 'Rollout and disable',
                            fields: [
                                {
                                    label: 'Includes',
                                    value: 'Feature flags, AI rollout controls, emergency disables',
                                },
                                {
                                    label: 'Table columns',
                                    value: 'Feature, status, affected area, last changed by, risk',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Enable, disable, emergency disable, review impact',
                                },
                            ],
                            detail: [
                                'AI rollout controls are high impact because planner and coach safety depend on them.',
                                'Emergency disables need confirmation and audit links.',
                            ],
                        },
                    ],
                },
                {
                    value: 'privacy',
                    label: 'Privacy',
                    icon: ShieldCheck,
                    guidance:
                        'Use privacy settings for export requests, deletion requests, and compliance checklists.',
                    toolbarSummary:
                        'Privacy requests need a queue, checklist detail panel, and audit trail link.',
                    primaryHref: '/admin/privacy-compliance',
                    primaryActionLabel: 'Open privacy controls',
                    workflows: [
                        {
                            id: 'privacy-requests',
                            title: 'Privacy and compliance requests',
                            summary:
                                'Review export requests, deletion requests, compliance notes, and audit trail links.',
                            href: '/admin/privacy-compliance',
                            actionLabel: 'Open privacy settings',
                            status: 'warning',
                            statusLabel: 'Compliance',
                            meta: 'Checklist detail',
                            fields: [
                                {
                                    label: 'Includes',
                                    value: 'Export requests, deletion requests, compliance notes',
                                },
                                {
                                    label: 'Layout',
                                    value: 'Request queue, checklist detail panel, audit trail link',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Review checklist, complete request, open logs',
                                },
                            ],
                            detail: [
                                'Privacy work is rare but high-trust, so it belongs in Settings rather than People.',
                                'Deletion and export outcomes should be traceable in audit logs.',
                            ],
                        },
                    ],
                },
            ]}
            diagnosticsHref="/admin/logs-diagnostics"
        />
    );
}
