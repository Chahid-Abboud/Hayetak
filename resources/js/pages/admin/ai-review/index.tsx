import { AdminWorkspaceHub } from '@/components/admin/admin-workspace-hub';
import { BotMessageSquare, ShieldAlert, Sparkles } from 'lucide-react';

export default function AdminAiReviewWorkspace() {
    return (
        <AdminWorkspaceHub
            headTitle="Admin AI Review"
            title="AI Review"
            description="Review planner and coach quality in plain admin language, with raw prompts and traces kept in Logs & Diagnostics."
            stats={[
                {
                    label: 'Planner queue',
                    value: '--',
                    helper: 'Generation status, schema validity, safety warnings, and version review.',
                    tone: 'accent',
                },
                {
                    label: 'Coach queue',
                    value: '--',
                    helper: 'Flagged answers grounded in user restrictions and recent history.',
                },
                {
                    label: 'Safety warnings',
                    value: '--',
                    helper: 'Planner and coach issues needing human review.',
                },
                {
                    label: 'Diagnostics',
                    value: '--',
                    helper: 'Technical detail is linked, not shown first.',
                },
            ]}
            tabs={[
                {
                    value: 'planner',
                    label: 'Planner',
                    icon: Sparkles,
                    guidance:
                        'Use planner review to inspect user constraints, plan summary, validation result, version diff, and safety warnings before regeneration.',
                    toolbarSummary:
                        'Do not show raw JSON first. Keep constraints, allergies, injuries, diet type, and readable warnings ahead of diagnostics.',
                    primaryHref: '/admin/ai/planner',
                    primaryActionLabel: 'Open planner review',
                    workflows: [
                        {
                            id: 'planner-review',
                            title: 'Planner quality review',
                            summary:
                                'Review failed runs, schema validity, warning state, plan version, generated date, and readable plan summary.',
                            href: '/admin/ai/planner',
                            actionLabel: 'Open planner queue',
                            status: 'warning',
                            statusLabel: 'Safety gated',
                            meta: 'Plan summary before JSON',
                            fields: [
                                {
                                    label: 'Queue columns',
                                    value: 'User, generation status, schema validity, safety warnings, plan version, generated date',
                                },
                                {
                                    label: 'Detail sections',
                                    value: 'User constraints, allergies, injuries, diet type, plan summary, validation, diff, warnings',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Regenerate, mark reviewed, flag unsafe, open diagnostics',
                                },
                            ],
                            detail: [
                                'Planner output must remain strict JSON in storage, but normal review starts with a human-readable summary.',
                                'Unsafe or invalid plans should link directly to diagnostics for payload inspection.',
                            ],
                        },
                    ],
                },
                {
                    value: 'coach',
                    label: 'Coach',
                    icon: BotMessageSquare,
                    guidance:
                        "Use coach review to compare flagged answers with user restrictions, today's meals, last seven days summary, and tools used.",
                    toolbarSummary:
                        'The transcript viewer needs the most space; the context panel should be concise and safety-focused.',
                    primaryHref: '/admin/ai/coach',
                    primaryActionLabel: 'Open coach review',
                    workflows: [
                        {
                            id: 'coach-moderation',
                            title: 'Coach conversation review',
                            summary:
                                'Review flagged message, user question, coach answer, safety reason, restrictions, meal context, and tool usage.',
                            href: '/admin/ai/coach',
                            actionLabel: 'Open coach queue',
                            status: 'danger',
                            statusLabel: 'Flagged answers',
                            meta: 'Transcript first',
                            fields: [
                                {
                                    label: 'Layout',
                                    value: 'Conversation queue, transcript viewer, concise context panel',
                                },
                                {
                                    label: 'Context',
                                    value: "Restrictions, today's meals, last 7 days summary, tools used",
                                },
                                {
                                    label: 'Actions',
                                    value: 'Resolve, mark unsafe, escalate, open diagnostics, open user',
                                },
                            ],
                            detail: [
                                'Transcript review should be full-height and scrollable.',
                                'Context should explain why the answer was risky without dumping raw traces into the page.',
                            ],
                        },
                    ],
                },
                {
                    value: 'safety-warnings',
                    label: 'Safety Warnings',
                    icon: ShieldAlert,
                    guidance:
                        'Use safety warnings as the unified table for planner and coach issues that need human action.',
                    toolbarSummary:
                        'The drawer should explain the issue, affected restrictions, recommended admin action, and diagnostics link.',
                    primaryHref: '/admin/ai/coach',
                    primaryActionLabel: 'Open warning queue',
                    workflows: [
                        {
                            id: 'ai-safety-warnings',
                            title: 'AI safety warning review',
                            summary:
                                'Review planner and coach warnings by time, user, AI surface, warning type, severity, and status.',
                            href: '/admin/ai/coach',
                            actionLabel: 'Open safety warnings',
                            status: 'danger',
                            statusLabel: 'Human review',
                            meta: 'Planner and coach',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Time, user, AI surface, warning type, severity, status',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Human-readable issue, user restrictions, recommended action, diagnostics link',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Resolve, mark unsafe, escalate, open diagnostics',
                                },
                            ],
                            detail: [
                                'Safety issues stay accessible to non-technical admins first.',
                                'Raw prompt, response, tool call, and schema payloads remain behind diagnostics.',
                            ],
                        },
                    ],
                },
            ]}
            diagnosticsHref="/admin/logs-diagnostics"
        />
    );
}
