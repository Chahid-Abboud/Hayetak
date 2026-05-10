import { AdminWorkspaceHub } from '@/components/admin/admin-workspace-hub';
import { History, Send, StickyNote } from 'lucide-react';

export default function AdminCommunicationsWorkspace() {
    return (
        <AdminWorkspaceHub
            headTitle="Admin Communications"
            title="Communications"
            description="Compose notifications, review delivery history, and manage templates without shrinking delivery tables into side panels."
            stats={[
                {
                    label: 'Compose',
                    value: '--',
                    helper: 'Audience, message editor, preview, and send confirmation.',
                    tone: 'accent',
                },
                {
                    label: 'History',
                    value: '--',
                    helper: 'Full-width delivery table with pagination.',
                },
                {
                    label: 'Templates',
                    value: '--',
                    helper: 'Reusable admin notification drafts.',
                },
                {
                    label: 'Failures',
                    value: '--',
                    helper: 'Delivery issues link to logs and diagnostics.',
                },
            ]}
            tabs={[
                {
                    value: 'compose',
                    label: 'Compose',
                    icon: Send,
                    guidance:
                        'Use compose as a guided message flow: audience, editor, preview, then confirmation.',
                    toolbarSummary:
                        'Audience details can be full-width when needed. Keep title, message, audience type, role, specific users, and notification type explicit.',
                    primaryHref: '/admin/notifications',
                    primaryActionLabel: 'Open compose',
                    workflows: [
                        {
                            id: 'compose-flow',
                            title: 'Notification compose flow',
                            summary:
                                'Prepare targeted admin notifications with audience review, message preview, and send confirmation.',
                            href: '/admin/notifications',
                            actionLabel: 'Open communications',
                            status: 'info',
                            statusLabel: 'Guided send',
                            meta: 'Audience, editor, preview',
                            fields: [
                                {
                                    label: 'Audience fields',
                                    value: 'Audience type, user role, specific users',
                                },
                                {
                                    label: 'Message fields',
                                    value: 'Title, message, notification type',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Preview, send, save as template',
                                },
                            ],
                            detail: [
                                'The normal admin should not need delivery internals while composing.',
                                'Send confirmation should stay clear about who receives the notification.',
                            ],
                        },
                    ],
                },
                {
                    value: 'history',
                    label: 'History',
                    icon: History,
                    guidance:
                        'Use history as a full-width table so delivery status, read count, dismissed count, and failed recipients remain readable.',
                    toolbarSummary:
                        'Delivery history should never be placed in a small side panel. Open a drawer for body, recipients, failed recipients, and logs.',
                    primaryHref: '/admin/notifications',
                    primaryActionLabel: 'Open history',
                    workflows: [
                        {
                            id: 'delivery-history',
                            title: 'Delivery history review',
                            summary:
                                'Inspect sent notifications with sender, audience, title, delivery state, read count, and dismissed count.',
                            href: '/admin/notifications',
                            actionLabel: 'Open notification history',
                            status: 'warning',
                            statusLabel: 'Delivery review',
                            meta: 'Full-width table',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Sent time, sender, audience, title, delivery status, read count, dismissed count',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Message body, recipients, delivery state, failed recipients, related logs',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Review, resend failed, open logs',
                                },
                            ],
                            detail: [
                                'Use pagination and internal scroll for long delivery records.',
                                'Failed recipients belong in the detail drawer with a diagnostics link.',
                            ],
                        },
                    ],
                },
                {
                    value: 'templates',
                    label: 'Templates',
                    icon: StickyNote,
                    guidance:
                        'Use templates for reusable admin messages, choosing cards or a table based on count.',
                    toolbarSummary:
                        'Templates support create, edit, delete, and use-template actions.',
                    primaryHref: '/admin/notifications',
                    primaryActionLabel: 'Open templates',
                    workflows: [
                        {
                            id: 'template-management',
                            title: 'Notification templates',
                            summary:
                                'Create reusable admin messages while keeping send history in its own full-width table.',
                            href: '/admin/notifications',
                            actionLabel: 'Open templates',
                            status: 'success',
                            statusLabel: 'Reusable',
                            meta: 'Cards or table',
                            fields: [
                                {
                                    label: 'Content',
                                    value: 'Template title, message body, default type, intended audience',
                                },
                                {
                                    label: 'Display',
                                    value: 'Cards for a small set, table when the count grows',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Create template, edit template, delete template, use template',
                                },
                            ],
                            detail: [
                                'Templates should speed up repeat admin work without hiding the final send confirmation.',
                                'Delivery logs remain outside template editing.',
                            ],
                        },
                    ],
                },
            ]}
            diagnosticsHref="/admin/logs-diagnostics"
        />
    );
}
