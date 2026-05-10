import { AdminWorkspaceHub } from '@/components/admin/admin-workspace-hub';
import { ShieldCheck, UserCheck, UserRoundCog, Users } from 'lucide-react';

export default function AdminPeopleWorkspace() {
    return (
        <AdminWorkspaceHub
            headTitle="Admin People"
            title="People"
            description="Manage users, professionals, safety profiles, and assignments without turning people work into one crowded table."
            stats={[
                {
                    label: 'Users',
                    value: '--',
                    helper: 'Search accounts, status, verification, and recent activity.',
                    tone: 'accent',
                },
                {
                    label: 'Professionals',
                    value: '--',
                    helper: 'Clean up trainer and dietitian directory profiles.',
                },
                {
                    label: 'Safety reviews',
                    value: '--',
                    helper: 'Allergies, injuries, diet type, and blocked recommendations.',
                },
                {
                    label: 'Assignments',
                    value: '--',
                    helper: 'Client to trainer or dietitian matching workflows.',
                },
            ]}
            tabs={[
                {
                    value: 'users',
                    label: 'Users',
                    icon: Users,
                    guidance:
                        'Use the user workflow to search accounts, inspect the selected record, and take only the next clear account action.',
                    toolbarSummary:
                        'Filters belong with the user table; the selected account keeps identity, safety signals, recent meals, recent workouts, plan status, and notes visible.',
                    primaryHref: '/admin/users',
                    primaryActionLabel: 'Open users',
                    workflows: [
                        {
                            id: 'users-table',
                            title: 'User account table',
                            summary:
                                'Search by user, role, account status, verification, city, deleted state, and recent activity.',
                            href: '/admin/users',
                            actionLabel: 'Open user workflow',
                            status: 'info',
                            statusLabel: 'Primary list',
                            meta: '60 percent list, 40 percent detail',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'User, role, status, verification, city, recent activity',
                                },
                                {
                                    label: 'Detail sections',
                                    value: 'Identity, account state, safety signals, meals, workouts, AI plan status',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Verify, suspend, reactivate, edit, delete, open full profile',
                                },
                            ],
                            detail: [
                                'The user table and selected-user detail panel both use internal scroll when records are long.',
                                'Technical detail remains in Logs & Diagnostics through linked audit and diagnostics actions.',
                            ],
                        },
                    ],
                },
                {
                    value: 'professionals',
                    label: 'Professionals',
                    icon: UserCheck,
                    guidance:
                        'Use professional profile cleanup for public directory readiness, separate from legal credential decisions.',
                    toolbarSummary:
                        'Profile editor fields are stacked vertically so bio, availability, specialties, city, and contact display stay readable.',
                    primaryHref: '/admin/professionals',
                    primaryActionLabel: 'Open professionals',
                    workflows: [
                        {
                            id: 'professional-directory',
                            title: 'Professional directory cleanup',
                            summary:
                                'Review trainer and dietitian public profiles, readiness, specialties, availability, city, and verification snapshot.',
                            href: '/admin/professionals',
                            actionLabel: 'Open professionals',
                            status: 'needs_review',
                            statusLabel: 'Profile quality',
                            meta: 'Directory profile workflow',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Professional, role, city, directory readiness, verification snapshot',
                                },
                                {
                                    label: 'Detail sections',
                                    value: 'Public bio, specialties, availability, city, contact display, verification summary',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Save profile, mark verified, open verification queue',
                                },
                            ],
                            detail: [
                                'This workspace keeps public-facing profile quality separate from the trust decision in Verifications.',
                                'Bio, availability, and specialties should never be crammed into a tight grid.',
                            ],
                        },
                    ],
                },
                {
                    value: 'safety',
                    label: 'Safety',
                    icon: ShieldCheck,
                    guidance:
                        'Use safety review to protect AI planning and coach recommendations before generation or moderation work continues.',
                    toolbarSummary:
                        'Safety warnings are full-width in the detail panel and should name exactly what the AI must avoid.',
                    primaryHref: '/admin/safety-profiles',
                    primaryActionLabel: 'Open safety',
                    workflows: [
                        {
                            id: 'safety-review',
                            title: 'Safety profile review',
                            summary:
                                'Inspect allergies, diet restrictions, injuries, medical notes, blocked foods, blocked exercises, and planner lock state.',
                            href: '/admin/safety-profiles',
                            actionLabel: 'Open safety workflow',
                            status: 'warning',
                            statusLabel: 'AI constraints',
                            meta: 'Review before AI actions',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'User, allergies, diet type, medical history, injuries, review status',
                                },
                                {
                                    label: 'Detail sections',
                                    value: 'Allergies, blocked foods, restrictions, injuries, blocked exercises, medical notes',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Mark reviewed, request user update, lock planner generation, open user profile',
                                },
                            ],
                            detail: [
                                'Warnings get the full detail width so safety context is readable before action.',
                                'The plain-language safety summary stays here; raw context and traces stay in diagnostics.',
                            ],
                        },
                    ],
                },
                {
                    value: 'assignments',
                    label: 'Assignments',
                    icon: UserRoundCog,
                    guidance:
                        'Use assignment as a three-step workflow: select user, review professional matches, confirm assignment.',
                    toolbarSummary:
                        'Avoid wide comparison grids. Show goal, city, professional type, capacity, specialty match, and current assignments.',
                    primaryHref: '/admin/assignments',
                    primaryActionLabel: 'Open assignments',
                    workflows: [
                        {
                            id: 'assignment-flow',
                            title: 'Client assignment flow',
                            summary:
                                'Match users to trainers or dietitians with capacity, specialty, city, and current assignment context.',
                            href: '/admin/assignments',
                            actionLabel: 'Open assignment workflow',
                            status: 'info',
                            statusLabel: 'Three steps',
                            meta: 'Select, review, confirm',
                            fields: [
                                {
                                    label: 'Step 1',
                                    value: 'Select user and review goal, city, and needed professional type',
                                },
                                {
                                    label: 'Step 2',
                                    value: 'Review professional capacity, specialty match, and current assignments',
                                },
                                {
                                    label: 'Step 3',
                                    value: 'Confirm assignment or add an admin note',
                                },
                            ],
                            detail: [
                                'Assignments stay guided because they affect user trust and professional workload.',
                                'Use notes for reassignments and removals so the next admin knows what changed.',
                            ],
                        },
                    ],
                },
            ]}
        />
    );
}
