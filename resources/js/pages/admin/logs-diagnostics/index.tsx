import { AdminWorkspaceHub } from '@/components/admin/admin-workspace-hub';
import { ClipboardCheck, Cpu, FileSearch, ServerCog } from 'lucide-react';

export default function AdminLogsDiagnosticsWorkspace() {
    return (
        <AdminWorkspaceHub
            headTitle="Admin Logs & Diagnostics"
            title="Logs & Diagnostics"
            description="Read audit logs, AI traces, job failures, and system diagnostics in the one admin area where technical detail is expected."
            stats={[
                {
                    label: 'Audit',
                    value: '--',
                    helper: 'Admin actor, action, target, status, severity, and summary.',
                    tone: 'accent',
                },
                {
                    label: 'AI traces',
                    value: '--',
                    helper: 'Planner, coach, request IDs, tools, and payload inspection.',
                },
                {
                    label: 'Jobs',
                    value: '--',
                    helper: 'Queue failures, retries, imports, and background work.',
                },
                {
                    label: 'System',
                    value: '--',
                    helper: 'System health, degraded modes, and diagnostics.',
                },
            ]}
            tabs={[
                {
                    value: 'audit',
                    label: 'Audit',
                    icon: ClipboardCheck,
                    guidance:
                        'Use audit logs as a full-width table with detail drawer. Keep each row readable in one line where possible.',
                    toolbarSummary:
                        'Filter by timestamp, source, actor, action, target, status, severity, and short summary.',
                    primaryHref: '/admin/logs',
                    primaryActionLabel: 'Open audit logs',
                    diagnosticsHref: '/admin/logs',
                    workflows: [
                        {
                            id: 'audit-log-table',
                            title: 'Audit log table',
                            summary:
                                'Review admin actions with summary rows and drawer-based metadata, before and after values, and related records.',
                            href: '/admin/logs',
                            actionLabel: 'Open audit table',
                            status: 'info',
                            statusLabel: 'Traceability',
                            meta: 'Full-width table',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Timestamp, source, actor, action, target, status, severity, short summary',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Full message, metadata, before/after values, request ID, related user, related plan/chat',
                                },
                                {
                                    label: 'Raw payloads',
                                    value: 'Collapsed by default, monospace, internal scroll, copy action',
                                },
                            ],
                            detail: [
                                'Logs are not split into tiny cards.',
                                'The table scans first; the drawer provides technical depth only when selected.',
                            ],
                        },
                    ],
                },
                {
                    value: 'ai',
                    label: 'AI',
                    icon: FileSearch,
                    guidance:
                        'Use AI diagnostics for raw prompt and response payloads, schema failures, request IDs, model metadata, and tool traces.',
                    toolbarSummary:
                        'Normal AI Review pages link here instead of showing raw JSON first.',
                    primaryHref: '/admin/diagnostics',
                    primaryActionLabel: 'Open AI diagnostics',
                    diagnosticsHref: '/admin/diagnostics',
                    workflows: [
                        {
                            id: 'ai-diagnostics',
                            title: 'AI diagnostics',
                            summary:
                                'Inspect planner and coach traces, model responses, tool calls, failed validations, and degraded-mode behavior.',
                            href: '/admin/diagnostics',
                            actionLabel: 'Open diagnostics',
                            status: 'warning',
                            statusLabel: 'Technical detail',
                            meta: 'Raw payload drawer',
                            fields: [
                                {
                                    label: 'Sources',
                                    value: 'Planner, coach, AI requests, tool calls, model metadata',
                                },
                                {
                                    label: 'Detail',
                                    value: 'Request ID, related user, plan/chat link, raw payload if needed',
                                },
                                {
                                    label: 'Behavior',
                                    value: 'Payloads collapsed by default with internal scroll',
                                },
                            ],
                            detail: [
                                'This is the expected home for prompts, traces, JSON, and debugging context.',
                                'Operational pages should link here when the summarized signal needs evidence.',
                            ],
                        },
                    ],
                },
                {
                    value: 'jobs',
                    label: 'Jobs',
                    icon: ServerCog,
                    guidance:
                        'Use job diagnostics for queue failures, retries, imports, planner runs, and background sync status.',
                    toolbarSummary:
                        'Keep job rows full-width; inspect stack traces and payloads in a drawer.',
                    primaryHref: '/admin/diagnostics',
                    primaryActionLabel: 'Open job diagnostics',
                    diagnosticsHref: '/admin/diagnostics',
                    workflows: [
                        {
                            id: 'job-diagnostics',
                            title: 'Job failure review',
                            summary:
                                'Review failed jobs, retries, imports, planner audit runs, and context sync work from a technical table.',
                            href: '/admin/diagnostics',
                            actionLabel: 'Open job diagnostics',
                            status: 'warning',
                            statusLabel: 'Queue health',
                            meta: 'Retries and failures',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Timestamp, source, action, target, status, severity, short summary',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Full message, metadata, request ID, related user, raw payload',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Inspect, retry if supported, open related record',
                                },
                            ],
                            detail: [
                                'Queue details belong here so Overview and AI Review stay calm.',
                                'Long stack traces need internal scroll and collapsed raw payloads.',
                            ],
                        },
                    ],
                },
                {
                    value: 'system',
                    label: 'System',
                    icon: Cpu,
                    guidance:
                        'Use system diagnostics for degraded modes, runtime health, API issues, import anomalies, and technical watch signals.',
                    toolbarSummary:
                        'Use one full-width table and a drawer rather than multiple tiny diagnostic cards.',
                    primaryHref: '/admin/diagnostics',
                    primaryActionLabel: 'Open system diagnostics',
                    diagnosticsHref: '/admin/diagnostics',
                    workflows: [
                        {
                            id: 'system-diagnostics',
                            title: 'System diagnostics',
                            summary:
                                'Inspect system status and technical events only when normal workspace summaries are not enough.',
                            href: '/admin/diagnostics',
                            actionLabel: 'Open system diagnostics',
                            status: 'info',
                            statusLabel: 'System health',
                            meta: 'Technical only',
                            fields: [
                                {
                                    label: 'Sources',
                                    value: 'API, imports, traces, runtime, feature flags, degraded modes',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Full message, payload, before/after, related request, related record',
                                },
                                {
                                    label: 'Rule',
                                    value: 'Keep technical detail out of daily admin pages',
                                },
                            ],
                            detail: [
                                'Diagnostics is intentionally technical.',
                                'Every other admin page should show plain-language summaries and link here for evidence.',
                            ],
                        },
                    ],
                },
            ]}
            diagnosticsHref="/admin/logs-diagnostics"
        />
    );
}
