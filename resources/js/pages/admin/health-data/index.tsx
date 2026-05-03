import { AdminWorkspaceHub } from '@/components/admin/admin-workspace-hub';
import { Apple, Dumbbell, LineChart } from 'lucide-react';

export default function AdminHealthDataWorkspace() {
    return (
        <AdminWorkspaceHub
            headTitle="Admin Health Data"
            title="Health Data"
            description="Manage food, meal history, exercise safety, and progress records with room for tables, drawers, and correction context."
            stats={[
                {
                    label: 'Foods',
                    value: '--',
                    helper: 'Catalog items, macros, allergens, and planner suitability.',
                    tone: 'accent',
                },
                {
                    label: 'Meal logs',
                    value: '--',
                    helper: 'User meal history corrections and linked AI context.',
                },
                {
                    label: 'Exercises',
                    value: '--',
                    helper: 'Exercise catalog, equipment tags, and safer alternatives.',
                },
                {
                    label: 'Progress',
                    value: '--',
                    helper: 'Body metrics, trend review, and outlier handling.',
                },
            ]}
            tabs={[
                {
                    value: 'foods',
                    label: 'Foods',
                    icon: Apple,
                    guidance:
                        'Use the food catalog workflow for reusable nutrition data that affects meal tracking, planner filtering, and coach answers.',
                    toolbarSummary:
                        'Macro fields may use a two-column grid on medium screens; allergens and diet compatibility need readable full fields.',
                    primaryHref: '/admin/meals',
                    primaryActionLabel: 'Open foods',
                    workflows: [
                        {
                            id: 'food-catalog',
                            title: 'Food catalog management',
                            summary:
                                'Create, edit, hide, delete, and merge duplicate foods while keeping allergens and diet compatibility visible.',
                            href: '/admin/meals',
                            actionLabel: 'Open foods workflow',
                            status: 'needs_review',
                            statusLabel: 'Planner data',
                            meta: 'Drawer editor',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Food name, category, serving unit, calories, macros, visibility, planner suitability',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Serving, calories, protein, carbs, fat, allergens, diet compatibility, notes',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Create, edit, hide, delete, merge duplicate',
                                },
                            ],
                            detail: [
                                'The table gets the width; editing happens in a drawer so catalog rows stay scannable.',
                                'Planner suitability and allergen fields are admin-visible before saving.',
                            ],
                        },
                    ],
                },
                {
                    value: 'meal-logs',
                    label: 'Meal Logs',
                    icon: Apple,
                    guidance:
                        'Use meal log correction for user history, with before and after values stacked clearly.',
                    toolbarSummary:
                        'Corrections should record original value, corrected value, reason, affected user, and linked AI context.',
                    primaryHref: '/admin/meal-logs',
                    primaryActionLabel: 'Open meal logs',
                    workflows: [
                        {
                            id: 'meal-log-correction',
                            title: 'Meal log correction',
                            summary:
                                'Correct user meal history without squeezing before and after values into narrow table cells.',
                            href: '/admin/meal-logs',
                            actionLabel: 'Open meal logs',
                            status: 'warning',
                            statusLabel: 'Audit reason',
                            meta: 'Before and after drawer',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'User, date, meal type, food, servings, calories, source, last edited',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Original value, corrected value, reason, affected user, linked AI context',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Correct, delete, restore if supported, open user',
                                },
                            ],
                            detail: [
                                'Corrections need a clear reason because coach context can depend on the last seven days of meals.',
                                'Raw audit metadata belongs in Logs & Diagnostics, not in the table row.',
                            ],
                        },
                    ],
                },
                {
                    value: 'exercises',
                    label: 'Exercises',
                    icon: Dumbbell,
                    guidance:
                        'Use exercise data to keep planner and coach recommendations safe for injuries, equipment, and home or gym context.',
                    toolbarSummary:
                        'Contraindications and alternatives need full-width blocks inside the drawer.',
                    primaryHref: '/admin/exercises',
                    primaryActionLabel: 'Open exercises',
                    workflows: [
                        {
                            id: 'exercise-catalog',
                            title: 'Exercise catalog and alternatives',
                            summary:
                                'Manage exercise instructions, equipment, difficulty, injury warnings, visibility, planner tags, and safe alternatives.',
                            href: '/admin/exercises',
                            actionLabel: 'Open exercises',
                            status: 'warning',
                            statusLabel: 'Injury-aware',
                            meta: 'Catalog plus safety rules',
                            fields: [
                                {
                                    label: 'Table columns',
                                    value: 'Exercise, muscle group, equipment, difficulty, injury warning, visibility',
                                },
                                {
                                    label: 'Drawer fields',
                                    value: 'Instructions, equipment, compatibility, contraindications, alternatives, planner tags',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Create, edit, hide, add alternative, mark unsafe for injury type',
                                },
                            ],
                            detail: [
                                'Exercise safety data should be readable before alternatives are saved.',
                                'This supports the coach tool for safer exercise alternatives.',
                            ],
                        },
                    ],
                },
                {
                    value: 'progress',
                    label: 'Progress',
                    icon: LineChart,
                    guidance:
                        'Use progress correction with a full-width trend chart followed by a scrollable measurement table.',
                    toolbarSummary:
                        'Do not place the chart beside the table. The trend needs space, and edits happen in a drawer.',
                    primaryHref: '/admin/progress',
                    primaryActionLabel: 'Open progress',
                    workflows: [
                        {
                            id: 'progress-correction',
                            title: 'Progress measurements',
                            summary:
                                'Correct body metrics, mark outliers, and keep edit history readable for AI plan trust.',
                            href: '/admin/progress',
                            actionLabel: 'Open progress',
                            status: 'info',
                            statusLabel: 'Trend first',
                            meta: 'Chart, table, drawer',
                            fields: [
                                {
                                    label: 'Layout',
                                    value: 'Toolbar, selected user summary, full-width trend chart, scrollable table, edit drawer',
                                },
                                {
                                    label: 'Fields',
                                    value: 'User, metric type, value, measured date, source, outlier warning, edit history',
                                },
                                {
                                    label: 'Actions',
                                    value: 'Add measurement, correct measurement, delete, mark outlier',
                                },
                            ],
                            detail: [
                                'Progress data influences charts, projections, and user trust.',
                                'Outlier handling should be visible before a correction is saved.',
                            ],
                        },
                    ],
                },
            ]}
            diagnosticsHref="/admin/logs-diagnostics"
        />
    );
}
