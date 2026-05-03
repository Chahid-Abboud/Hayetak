import {
    AdminDataTable,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminPanel,
    AdminScrollArea,
    AdminStickyBar,
    AdminToolbar,
    AdminToolbarGroup,
    AdminToggleGroup,
} from '@/components/admin/admin-ui';
import { StatusChip } from '@/components/admin/admin-workflows';
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
import { Head } from '@inertiajs/react';
import {
    CalendarDays,
    Download,
    LineChart,
    Save,
    SlidersHorizontal,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type AnalyticsTab =
    | 'growth'
    | 'retention'
    | 'ai-quality'
    | 'verification'
    | 'food-logging'
    | 'support-load';

type TrendPoint = {
    label: string;
    value: number;
    secondary?: number;
};

type SupportingRow = {
    segment: string;
    metric: string;
    current: string;
    previous: string;
    change: string;
    status: 'improving' | 'watch' | 'flat' | 'declining';
    note: string;
};

type AnalyticsDataset = {
    label: string;
    description: string;
    primaryMetric: string;
    primaryValue: string;
    primaryHelper: string;
    secondaryMetric: string;
    secondaryValue: string;
    secondaryHelper: string;
    chartTitle: string;
    chartDescription: string;
    points: TrendPoint[];
    barTitle: string;
    barDescription: string;
    bars: TrendPoint[];
    tableTitle: string;
    tableDescription: string;
    rows: SupportingRow[];
};

const tabs: Array<{ value: AnalyticsTab; label: string }> = [
    { value: 'growth', label: 'Growth' },
    { value: 'retention', label: 'Retention' },
    { value: 'ai-quality', label: 'AI Quality' },
    { value: 'verification', label: 'Verification Funnel' },
    { value: 'food-logging', label: 'Food Logging' },
    { value: 'support-load', label: 'Support Load' },
];

const datasets: Record<AnalyticsTab, AnalyticsDataset> = {
    growth: {
        label: 'Growth',
        description:
            'Top-of-funnel and activation trends across new accounts, verified users, and first plan completion.',
        primaryMetric: 'New users',
        primaryValue: '312',
        primaryHelper: '+14.2% vs previous period',
        secondaryMetric: 'Activated users',
        secondaryValue: '184',
        secondaryHelper: '58.9% completed the first useful action',
        chartTitle: 'Account growth trend',
        chartDescription:
            'New accounts and activated users by week. Read this as product momentum, not an action queue.',
        points: [
            { label: 'W1', value: 42, secondary: 24 },
            { label: 'W2', value: 47, secondary: 27 },
            { label: 'W3', value: 51, secondary: 31 },
            { label: 'W4', value: 58, secondary: 36 },
            { label: 'W5', value: 54, secondary: 34 },
            { label: 'W6', value: 60, secondary: 39 },
        ],
        barTitle: 'Activation path completion',
        barDescription:
            'Where new users complete meaningful setup milestones after registration.',
        bars: [
            { label: 'Profile', value: 86 },
            { label: 'Safety', value: 74 },
            { label: 'Plan', value: 59 },
            { label: 'Meal log', value: 41 },
            { label: 'Coach', value: 34 },
        ],
        tableTitle: 'Growth supporting segments',
        tableDescription:
            'Readable segment summary for quick trend interpretation.',
        rows: [
            {
                segment: 'Clients',
                metric: 'New registrations',
                current: '246',
                previous: '214',
                change: '+15.0%',
                status: 'improving',
                note: 'Signup flow is converting better after shorter onboarding copy.',
            },
            {
                segment: 'Professionals',
                metric: 'Directory applicants',
                current: '38',
                previous: '35',
                change: '+8.6%',
                status: 'improving',
                note: 'Most growth is from trainer profiles in Beirut.',
            },
            {
                segment: 'First plan',
                metric: 'Generated within 24h',
                current: '72%',
                previous: '69%',
                change: '+3 pts',
                status: 'improving',
                note: 'Planner queue delays are not limiting first value right now.',
            },
        ],
    },
    retention: {
        label: 'Retention',
        description:
            'Behavior over time for returning users, meal logging continuity, and coach follow-up.',
        primaryMetric: 'D7 retention',
        primaryValue: '46.8%',
        primaryHelper: '+2.1 pts vs previous period',
        secondaryMetric: 'Weekly active users',
        secondaryValue: '1,284',
        secondaryHelper: 'Users with health activity in the period',
        chartTitle: 'Retention by cohort week',
        chartDescription:
            'Weekly retained users against the prior cohort baseline.',
        points: [
            { label: 'W1', value: 51, secondary: 48 },
            { label: 'W2', value: 49, secondary: 47 },
            { label: 'W3', value: 47, secondary: 45 },
            { label: 'W4', value: 46, secondary: 44 },
            { label: 'W5', value: 48, secondary: 43 },
            { label: 'W6', value: 47, secondary: 42 },
        ],
        barTitle: 'Returning activity mix',
        barDescription:
            'Primary activities among retained users during the selected period.',
        bars: [
            { label: 'Meals', value: 68 },
            { label: 'Coach', value: 53 },
            { label: 'Workout', value: 39 },
            { label: 'Progress', value: 26 },
            { label: 'Messages', value: 19 },
        ],
        tableTitle: 'Retention supporting segments',
        tableDescription:
            'Use this table to read behavior patterns before changing operations.',
        rows: [
            {
                segment: 'Meal loggers',
                metric: 'D7 return',
                current: '54%',
                previous: '51%',
                change: '+3 pts',
                status: 'improving',
                note: 'Users who log two meals in week one retain best.',
            },
            {
                segment: 'Planner only',
                metric: 'D7 return',
                current: '31%',
                previous: '32%',
                change: '-1 pt',
                status: 'watch',
                note: 'Needs stronger follow-up after generated plan delivery.',
            },
            {
                segment: 'Coach users',
                metric: 'W2 active',
                current: '44%',
                previous: '40%',
                change: '+4 pts',
                status: 'improving',
                note: 'Coach conversations are creating repeat sessions.',
            },
        ],
    },
    'ai-quality': {
        label: 'AI Quality',
        description:
            'Planner and coach quality trends, safety pass rates, and moderation outcomes.',
        primaryMetric: 'Safe AI sessions',
        primaryValue: '98.4%',
        primaryHelper: 'No unresolved unsafe recommendation flags',
        secondaryMetric: 'Planner schema pass',
        secondaryValue: '94.1%',
        secondaryHelper: '+1.8 pts after retry tuning',
        chartTitle: 'AI quality trend',
        chartDescription:
            'Safety pass and planner schema validity over the selected period.',
        points: [
            { label: 'W1', value: 96, secondary: 90 },
            { label: 'W2', value: 97, secondary: 91 },
            { label: 'W3', value: 98, secondary: 93 },
            { label: 'W4', value: 97, secondary: 92 },
            { label: 'W5', value: 99, secondary: 94 },
            { label: 'W6', value: 98, secondary: 94 },
        ],
        barTitle: 'Quality issue distribution',
        barDescription:
            'Summarized AI quality signals. Technical payloads remain in diagnostics.',
        bars: [
            { label: 'Schema', value: 21 },
            { label: 'Safety', value: 7 },
            { label: 'Context', value: 12 },
            { label: 'Timeout', value: 9 },
            { label: 'Fallback', value: 14 },
        ],
        tableTitle: 'AI quality supporting segments',
        tableDescription:
            'Business result first; raw prompts and model output belong in diagnostics.',
        rows: [
            {
                segment: 'Planner',
                metric: 'Reviewed unsafe flags',
                current: '7',
                previous: '12',
                change: '-41.7%',
                status: 'improving',
                note: 'Most flags were blocked-food substitutions, not delivered recommendations.',
            },
            {
                segment: 'Coach',
                metric: 'Escalations',
                current: '11',
                previous: '10',
                change: '+1',
                status: 'flat',
                note: 'Medical escalation volume is stable.',
            },
            {
                segment: 'Planner',
                metric: 'Failed runs',
                current: '24',
                previous: '31',
                change: '-22.6%',
                status: 'improving',
                note: 'Retry policy is reducing operator-visible failures.',
            },
        ],
    },
    verification: {
        label: 'Verification Funnel',
        description:
            'Professional verification flow trends without turning this into the review queue.',
        primaryMetric: 'Approval rate',
        primaryValue: '71.3%',
        primaryHelper: '+4.5 pts vs previous period',
        secondaryMetric: 'Median review time',
        secondaryValue: '18h',
        secondaryHelper: 'From submission to first decision',
        chartTitle: 'Verification funnel trend',
        chartDescription:
            'Submitted, approved, and needs-info decisions by week.',
        points: [
            { label: 'W1', value: 28, secondary: 17 },
            { label: 'W2', value: 35, secondary: 22 },
            { label: 'W3', value: 31, secondary: 21 },
            { label: 'W4', value: 38, secondary: 27 },
            { label: 'W5', value: 34, secondary: 25 },
            { label: 'W6', value: 42, secondary: 30 },
        ],
        barTitle: 'Verification outcomes',
        barDescription:
            'Current period outcome mix for professional profile reviews.',
        bars: [
            { label: 'Approved', value: 71 },
            { label: 'Needs info', value: 19 },
            { label: 'Rejected', value: 6 },
            { label: 'Expired', value: 4 },
        ],
        tableTitle: 'Verification supporting segments',
        tableDescription:
            'Funnel health by role and geography.',
        rows: [
            {
                segment: 'Trainers',
                metric: 'Approval rate',
                current: '76%',
                previous: '73%',
                change: '+3 pts',
                status: 'improving',
                note: 'Most missing fields are public bio and specialties.',
            },
            {
                segment: 'Dietitians',
                metric: 'Needs info',
                current: '23%',
                previous: '18%',
                change: '+5 pts',
                status: 'watch',
                note: 'License authority names are the common blocker.',
            },
            {
                segment: 'Outside Lebanon',
                metric: 'Median review time',
                current: '31h',
                previous: '27h',
                change: '+4h',
                status: 'watch',
                note: 'Authority validation takes longer for unfamiliar jurisdictions.',
            },
        ],
    },
    'food-logging': {
        label: 'Food Logging',
        description:
            'Trends in meal history completeness, correction load, and catalog coverage.',
        primaryMetric: 'Logged meals',
        primaryValue: '8,942',
        primaryHelper: '+9.8% vs previous period',
        secondaryMetric: 'Correction rate',
        secondaryValue: '2.7%',
        secondaryHelper: 'Manual corrections as a share of logs',
        chartTitle: 'Meal logging trend',
        chartDescription:
            'Meal log volume and corrected entries across the selected range.',
        points: [
            { label: 'W1', value: 1190, secondary: 34 },
            { label: 'W2', value: 1260, secondary: 36 },
            { label: 'W3', value: 1375, secondary: 40 },
            { label: 'W4', value: 1450, secondary: 38 },
            { label: 'W5', value: 1542, secondary: 42 },
            { label: 'W6', value: 1615, secondary: 44 },
        ],
        barTitle: 'Logging source mix',
        barDescription:
            'How meals entered the system during this period.',
        bars: [
            { label: 'Manual', value: 64 },
            { label: 'Template', value: 17 },
            { label: 'AI assist', value: 11 },
            { label: 'Import', value: 8 },
        ],
        tableTitle: 'Food logging supporting segments',
        tableDescription:
            'Signals that affect AI coach context quality.',
        rows: [
            {
                segment: 'Breakfast',
                metric: 'Completion',
                current: '62%',
                previous: '59%',
                change: '+3 pts',
                status: 'improving',
                note: 'Morning reminders are improving coverage.',
            },
            {
                segment: 'Dinner',
                metric: 'Edited logs',
                current: '3.8%',
                previous: '3.1%',
                change: '+0.7 pts',
                status: 'watch',
                note: 'More multi-item meals require correction.',
            },
            {
                segment: 'Catalog matched',
                metric: 'Food item match rate',
                current: '88%',
                previous: '84%',
                change: '+4 pts',
                status: 'improving',
                note: 'Duplicate merges are improving planner suitability.',
            },
        ],
    },
    'support-load': {
        label: 'Support Load',
        description:
            'Support and intervention volume by owner, priority, and resolution time.',
        primaryMetric: 'Open cases',
        primaryValue: '42',
        primaryHelper: '-8 vs previous period',
        secondaryMetric: 'Median resolution',
        secondaryValue: '9h 20m',
        secondaryHelper: 'For cases resolved in the selected range',
        chartTitle: 'Support load trend',
        chartDescription:
            'Opened and resolved support cases by week.',
        points: [
            { label: 'W1', value: 39, secondary: 32 },
            { label: 'W2', value: 44, secondary: 38 },
            { label: 'W3', value: 41, secondary: 40 },
            { label: 'W4', value: 36, secondary: 39 },
            { label: 'W5', value: 35, secondary: 41 },
            { label: 'W6', value: 33, secondary: 43 },
        ],
        barTitle: 'Support category mix',
        barDescription:
            'Where operator time is being spent across the support surface.',
        bars: [
            { label: 'AI safety', value: 28 },
            { label: 'Planner', value: 21 },
            { label: 'Account', value: 18 },
            { label: 'Professional', value: 15 },
            { label: 'Billing', value: 7 },
        ],
        tableTitle: 'Support supporting segments',
        tableDescription:
            'Load indicators for staffing and process planning.',
        rows: [
            {
                segment: 'High priority',
                metric: 'Open cases',
                current: '9',
                previous: '13',
                change: '-4',
                status: 'improving',
                note: 'Escalation queue is shrinking.',
            },
            {
                segment: 'Unowned',
                metric: 'Cases without owner',
                current: '6',
                previous: '5',
                change: '+1',
                status: 'watch',
                note: 'Needs daily assignment discipline, but this page is trend-only.',
            },
            {
                segment: 'AI-related',
                metric: 'Share of cases',
                current: '49%',
                previous: '53%',
                change: '-4 pts',
                status: 'improving',
                note: 'AI quality improvements are reducing support share.',
            },
        ],
    },
};

const dateRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom range' },
];

const regions = [
    { value: 'all', label: 'All regions' },
    { value: 'beirut', label: 'Beirut' },
    { value: 'mount-lebanon', label: 'Mount Lebanon' },
    { value: 'north', label: 'North Lebanon' },
];

function statusTone(status: SupportingRow['status']) {
    if (status === 'improving') return 'success';
    if (status === 'watch') return 'warning';
    if (status === 'declining') return 'danger';
    return 'default';
}

function formatPoint(value: number) {
    return value >= 1000 ? value.toLocaleString() : String(value);
}

function buildPath(points: number[], width: number, height: number) {
    if (points.length === 0) {
        return '';
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;

    return points
        .map((point, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * width;
            const y = height - ((point - min) / span) * height;

            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
}

function TrendChartPanel({
    title,
    description,
    points,
}: {
    title: string;
    description: string;
    points: TrendPoint[];
}) {
    const width = 720;
    const height = 240;
    const primaryPath = buildPath(
        points.map((point) => point.value),
        width,
        height,
    );
    const secondaryValues = points.map((point) => point.secondary ?? 0);
    const secondaryPath = buildPath(secondaryValues, width, height);

    return (
        <AdminPanel title={title} description={description}>
            <div className="dashboard-surface-soft overflow-hidden rounded-[22px] p-4">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        Current
                    </span>
                    <span className="inline-flex items-center gap-2">
                        <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: 'var(--chart-4)' }}
                        />
                        Comparison
                    </span>
                </div>

                <svg
                    viewBox={`0 0 ${width} ${height + 34}`}
                    className="h-[18rem] w-full"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={title}
                >
                    <defs>
                        <linearGradient
                            id="analyticsTrendFill"
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="var(--primary)"
                                stopOpacity="0.2"
                            />
                            <stop
                                offset="100%"
                                stopColor="var(--primary)"
                                stopOpacity="0"
                            />
                        </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((line) => (
                        <line
                            key={line}
                            x1="0"
                            x2={width}
                            y1={(height / 3) * line}
                            y2={(height / 3) * line}
                            stroke="currentColor"
                            strokeOpacity="0.12"
                        />
                    ))}
                    <path
                        d={`${primaryPath} L ${width} ${height} L 0 ${height} Z`}
                        fill="url(#analyticsTrendFill)"
                    />
                    <path
                        d={secondaryPath}
                        fill="none"
                        stroke="var(--chart-4)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        strokeDasharray="8 8"
                    />
                    <path
                        d={primaryPath}
                        fill="none"
                        stroke="var(--primary)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="4"
                    />
                    {points.map((point, index) => {
                        const x =
                            (index / Math.max(points.length - 1, 1)) * width;

                        return (
                            <text
                                key={point.label}
                                x={x}
                                y={height + 26}
                                textAnchor={
                                    index === 0
                                        ? 'start'
                                        : index === points.length - 1
                                          ? 'end'
                                          : 'middle'
                                }
                                className="fill-muted-foreground text-[12px]"
                            >
                                {point.label}
                            </text>
                        );
                    })}
                </svg>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {points.slice(-3).map((point) => (
                        <div
                            key={`${point.label}-${point.value}`}
                            className="rounded-[18px] border border-border/55 bg-background/72 px-3 py-3"
                        >
                            <div className="text-xs font-medium text-muted-foreground">
                                {point.label}
                            </div>
                            <div className="mt-1 text-lg font-semibold text-foreground">
                                {formatPoint(point.value)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Compared with{' '}
                                {formatPoint(point.secondary ?? 0)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AdminPanel>
    );
}

function BarChartPanel({
    title,
    description,
    bars,
}: {
    title: string;
    description: string;
    bars: TrendPoint[];
}) {
    const max = Math.max(...bars.map((bar) => bar.value), 1);

    return (
        <AdminPanel title={title} description={description}>
            <div className="dashboard-surface-soft space-y-3 rounded-[22px] p-4">
                {bars.map((bar) => (
                    <div key={bar.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-foreground">
                                {bar.label}
                            </span>
                            <span className="text-muted-foreground">
                                {formatPoint(bar.value)}
                            </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-background/80">
                            <div
                                className="h-full rounded-full bg-primary"
                                style={{
                                    width: `${Math.max((bar.value / max) * 100, 3)}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </AdminPanel>
    );
}

export default function AdminAnalyticsPage() {
    const [activeTab, setActiveTab] = useState<AnalyticsTab>('growth');
    const [dateRange, setDateRange] = useState('30d');
    const [region, setRegion] = useState('all');
    const [compareWith, setCompareWith] = useState('previous');

    const dataset = datasets[activeTab];

    const topMetrics = useMemo(
        () => [
            {
                label: dataset.primaryMetric,
                value: dataset.primaryValue,
                helper: dataset.primaryHelper,
                tone: 'accent' as const,
            },
            {
                label: dataset.secondaryMetric,
                value: dataset.secondaryValue,
                helper: dataset.secondaryHelper,
                tone: 'default' as const,
            },
            {
                label: 'Selected range',
                value:
                    dateRanges.find((range) => range.value === dateRange)
                        ?.label ?? 'Last 30 days',
                helper: 'Used by all charts and supporting tables',
                tone: 'default' as const,
            },
            {
                label: 'Saved view',
                value: dataset.label,
                helper: 'Current tab and filters are ready to save',
                tone: 'default' as const,
            },
        ],
        [dataset, dateRange],
    );

    return (
        <>
            <Head title="Admin Analytics" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Analytics"
                    description="Product and operations trends for growth, retention, AI quality, verification, food logging, and support load."
                >
                    <div className="space-y-6">
                        <AdminSection
                            title="Date Range"
                            description="Change the analysis period before reading metrics. This page is for trend review, not daily queue work."
                        >
                            <AdminToolbar>
                                <AdminToolbarGroup grow>
                                    <AdminField
                                        label="Date range"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={dateRange}
                                            onChange={(event) =>
                                                setDateRange(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {dateRanges.map((range) => (
                                                <option
                                                    key={range.value}
                                                    value={range.value}
                                                >
                                                    {range.label}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>

                                    <AdminField
                                        label="Region"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={region}
                                            onChange={(event) =>
                                                setRegion(event.target.value)
                                            }
                                        >
                                            {regions.map((item) => (
                                                <option
                                                    key={item.value}
                                                    value={item.value}
                                                >
                                                    {item.label}
                                                </option>
                                            ))}
                                        </AdminNativeSelect>
                                    </AdminField>

                                    <AdminField
                                        label="Compare with"
                                        className="sm:w-52"
                                    >
                                        <AdminNativeSelect
                                            value={compareWith}
                                            onChange={(event) =>
                                                setCompareWith(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="previous">
                                                Previous period
                                            </option>
                                            <option value="last-quarter">
                                                Last quarter
                                            </option>
                                            <option value="none">
                                                No comparison
                                            </option>
                                        </AdminNativeSelect>
                                    </AdminField>
                                </AdminToolbarGroup>

                                <AdminToolbarGroup className="xl:w-auto xl:justify-end">
                                    <Button type="button" variant="outline">
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        Change date range
                                    </Button>
                                    <Button type="button" variant="outline">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export
                                    </Button>
                                    <Button type="button">
                                        <Save className="mr-2 h-4 w-4" />
                                        Save view
                                    </Button>
                                </AdminToolbarGroup>
                            </AdminToolbar>
                        </AdminSection>

                        <AdminStatsGrid>
                            {topMetrics.map((metric) => (
                                <AdminStatCard
                                    key={metric.label}
                                    label={metric.label}
                                    value={metric.value}
                                    helper={metric.helper}
                                    tone={metric.tone}
                                />
                            ))}
                        </AdminStatsGrid>

                        <AdminSection
                            title="Trend Tabs"
                            description={dataset.description}
                        >
                            <div className="space-y-4">
                                <AdminToggleGroup
                                    value={activeTab}
                                    onChange={(value) =>
                                        setActiveTab(value as AnalyticsTab)
                                    }
                                    options={tabs}
                                    className="max-w-5xl"
                                />

                                <AdminNotice tone="info">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="font-semibold text-foreground">
                                                {dataset.label} trend view
                                            </div>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                Detailed charts are stacked
                                                full-width so long trend lines
                                                remain readable. Queue actions
                                                stay in their operational admin
                                                pages.
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="w-fit rounded-full border-primary/25 bg-primary/10 px-3 py-1 text-primary"
                                        >
                                            Read-only trend surface
                                        </Badge>
                                    </div>
                                </AdminNotice>
                            </div>
                        </AdminSection>

                        <AdminSection
                            title="Full-Width Charts"
                            description="Detailed charts are stacked, not squeezed beside smaller modules."
                            contentClassName="space-y-5"
                        >
                            <TrendChartPanel
                                title={dataset.chartTitle}
                                description={dataset.chartDescription}
                                points={dataset.points}
                            />

                            <BarChartPanel
                                title={dataset.barTitle}
                                description={dataset.barDescription}
                                bars={dataset.bars}
                            />
                        </AdminSection>

                        <AdminSection
                            title="Supporting Tables"
                            description={dataset.tableDescription}
                            actions={
                                <Button type="button" variant="outline">
                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                    Customize columns
                                </Button>
                            }
                        >
                            <AdminPanel
                                title={dataset.tableTitle}
                                description="Compact table summary for trend interpretation. Detailed records and daily interventions remain in their dedicated admin surfaces."
                                className="p-0"
                            >
                                <AdminScrollArea
                                    className="px-4 pb-4"
                                    maxHeightClassName="max-h-[30rem]"
                                >
                                    <AdminDataTable
                                        className="mt-4"
                                        tableClassName="min-w-[880px]"
                                    >
                                        <ProductTableHead>
                                            <ProductTableRow>
                                                <ProductTableHeaderCell>
                                                    Segment
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Metric
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Current
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Previous
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Change
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Status
                                                </ProductTableHeaderCell>
                                                <ProductTableHeaderCell>
                                                    Reading
                                                </ProductTableHeaderCell>
                                            </ProductTableRow>
                                        </ProductTableHead>
                                        <ProductTableBody>
                                            {dataset.rows.map((row) => (
                                                <ProductTableRow
                                                    key={`${activeTab}-${row.segment}-${row.metric}`}
                                                >
                                                    <ProductTableCell>
                                                        <div className="font-medium text-foreground">
                                                            {row.segment}
                                                        </div>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {row.metric}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <span className="font-semibold">
                                                            {row.current}
                                                        </span>
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {row.previous}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        {row.change}
                                                    </ProductTableCell>
                                                    <ProductTableCell>
                                                        <StatusChip
                                                            value={statusTone(
                                                                row.status,
                                                            )}
                                                            label={row.status}
                                                        />
                                                    </ProductTableCell>
                                                    <ProductTableCell className="max-w-sm">
                                                        <p className="text-sm leading-6 text-muted-foreground">
                                                            {row.note}
                                                        </p>
                                                    </ProductTableCell>
                                                </ProductTableRow>
                                            ))}
                                        </ProductTableBody>
                                    </AdminDataTable>
                                </AdminScrollArea>
                            </AdminPanel>
                        </AdminSection>

                        <AdminStickyBar
                            summary={
                                <span className="inline-flex items-center gap-2">
                                    <LineChart className="h-4 w-4" />
                                    Viewing {dataset.label} for{' '}
                                    {dateRanges.find(
                                        (range) => range.value === dateRange,
                                    )?.label ?? 'Last 30 days'}
                                    .
                                </span>
                            }
                        >
                            <Button type="button" variant="outline">
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button type="button">
                                <Save className="mr-2 h-4 w-4" />
                                Save view
                            </Button>
                        </AdminStickyBar>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
