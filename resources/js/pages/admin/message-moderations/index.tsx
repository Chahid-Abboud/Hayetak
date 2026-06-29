import {
    AdminDataTable,
    AdminEmpty,
    AdminField,
    AdminNativeSelect,
    AdminNotice,
    AdminPanel,
    AdminScrollArea,
    AdminSearchInput,
    AdminToolbar,
    AdminToolbarGroup,
} from '@/components/admin/admin-ui';
import {
    AdminSection,
    AdminShell,
    AdminStatCard,
    AdminStatsGrid,
} from '@/components/admin/AdminShell';
import {
    ProductTableBody,
    ProductTableCell,
    ProductTableEmptyRow,
    ProductTableHead,
    ProductTableHeaderCell,
    ProductTableRow,
} from '@/components/product/table';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { CheckCheck, RefreshCcw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ModerationItem = {
    id: number;
    decision: 'allow' | 'allow_flagged' | 'hard_block' | 'escalate';
    severity: 'low' | 'medium' | 'high';
    categories: string[];
    reason?: string | null;
    original_body: string;
    sanitized_body?: string | null;
    created_at?: string | null;
    escalated_at?: string | null;
    resolved_at?: string | null;
    resolution?: string | null;
    resolution_notes?: string | null;
    signals?: {
        window_minutes?: number;
        same_body_count?: number;
        escalate_threshold?: number;
        hard_block_threshold?: number;
    } | null;
    sender?: {
        id?: number | null;
        name?: string | null;
        email?: string | null;
        role?: string | null;
    } | null;
    conversation_id: number;
};

type ResponseShape = {
    stats?: {
        total: number;
        hard_block: number;
        allow_flagged: number;
        escalate: number;
    };
    items?: ModerationItem[];
};

function formatDateTime(value?: string | null) {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function decisionTone(decision: ModerationItem['decision']) {
    const tones = {
        allow: 'secondary',
        allow_flagged: 'outline',
        escalate: 'default',
        hard_block: 'destructive',
    } as const satisfies Record<
        ModerationItem['decision'],
        'default' | 'secondary' | 'outline' | 'destructive'
    >;

    return tones[decision];
}

export default function AdminMessageModerationsIndex() {
    const [items, setItems] = useState<ModerationItem[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        hard_block: 0,
        allow_flagged: 0,
        escalate: 0,
    });
    const [decision, setDecision] = useState('all');
    const [state, setState] = useState<'open' | 'resolved' | 'all'>('open');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState<
        Record<number, string>
    >({});

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                decision,
                state,
            });
            const response = await fetch(
                `/api/admin/message-moderations?${params.toString()}`,
            );
            if (!response.ok) {
                throw new Error('Could not load message moderation queue.');
            }
            const json = (await response.json()) as ResponseShape;
            setItems(Array.isArray(json.items) ? json.items : []);
            setStats({
                total: Number(json.stats?.total ?? 0),
                hard_block: Number(json.stats?.hard_block ?? 0),
                allow_flagged: Number(json.stats?.allow_flagged ?? 0),
                escalate: Number(json.stats?.escalate ?? 0),
            });
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : 'Could not load message moderation queue.',
            );
        } finally {
            setLoading(false);
        }
    }, [decision, state]);

    useEffect(() => {
        void load();
    }, [load]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;

        return items.filter((item) => {
            return [
                item.original_body,
                item.sender?.name,
                item.sender?.email,
                item.reason,
                ...(item.categories ?? []),
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q));
        });
    }, [items, search]);

    async function resolve(item: ModerationItem, resolution: string) {
        setSavingId(item.id);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch(
                `/api/admin/message-moderations/${item.id}/resolve`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        resolution,
                        notes: resolutionNotes[item.id] ?? '',
                    }),
                },
            );

            const json = (await response.json().catch(() => null)) as {
                message?: string;
                item?: ModerationItem;
            } | null;

            if (!response.ok) {
                throw new Error(
                    json?.message || 'Could not resolve moderation item.',
                );
            }

            setItems((current) =>
                current.map((row) =>
                    row.id === item.id
                        ? {
                              ...row,
                              resolved_at:
                                  json?.item?.resolved_at ??
                                  new Date().toISOString(),
                              resolution: resolution,
                              resolution_notes: resolutionNotes[item.id] ?? '',
                          }
                        : row,
                ),
            );
            setResolutionNotes((current) => {
                const next = { ...current };
                delete next[item.id];
                return next;
            });
            setMessage('Moderation item resolved.');
        } catch (resolveError) {
            setError(
                resolveError instanceof Error
                    ? resolveError.message
                    : 'Could not resolve moderation item.',
            );
        } finally {
            setSavingId(null);
        }
    }

    return (
        <>
            <Head title="Message Moderation" />
            <RoleGuard roles={['admin']}>
                <AdminShell
                    title="Message Moderation"
                    description="Review flagged user-to-user messages, confirm blocked abuse, and close sensitive escalations with clear outcomes."
                >
                    <div className="space-y-6">
                        {error ? (
                            <AdminNotice tone="danger">{error}</AdminNotice>
                        ) : null}
                        {message ? (
                            <AdminNotice tone="success">{message}</AdminNotice>
                        ) : null}

                        <AdminStatsGrid>
                            <AdminStatCard
                                label="Visible items"
                                value={loading ? '...' : String(stats.total)}
                                tone="accent"
                                helper="Current queue slice."
                            />
                            <AdminStatCard
                                label="Escalated"
                                value={loading ? '...' : String(stats.escalate)}
                                helper="Sensitive cases needing follow-up."
                            />
                            <AdminStatCard
                                label="Hard blocked"
                                value={
                                    loading ? '...' : String(stats.hard_block)
                                }
                                helper="Clearly prohibited content."
                            />
                            <AdminStatCard
                                label="Flagged allowed"
                                value={
                                    loading
                                        ? '...'
                                        : String(stats.allow_flagged)
                                }
                                helper="Delivered with moderation visibility."
                            />
                        </AdminStatsGrid>

                        <AdminSection
                            title="Moderation Queue"
                            description="Open items stay separate from resolved ones so the team can work the queue without losing past decisions."
                        >
                            <AdminPanel
                                title="Queue filters"
                                description="Filter by moderation decision and queue state, then scan the message body, sender, and reason together."
                            >
                                <AdminToolbar>
                                    <AdminToolbarGroup grow>
                                        <AdminField
                                            label="Search"
                                            className="xl:flex-1"
                                        >
                                            <AdminSearchInput
                                                value={search}
                                                placeholder="Search sender, message, category, or reason"
                                                onChange={(event) =>
                                                    setSearch(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </AdminField>
                                        <AdminField
                                            label="Decision"
                                            className="sm:w-48"
                                        >
                                            <AdminNativeSelect
                                                value={decision}
                                                onChange={(event) =>
                                                    setDecision(
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="all">
                                                    All decisions
                                                </option>
                                                <option value="allow_flagged">
                                                    Allow flagged
                                                </option>
                                                <option value="escalate">
                                                    Escalate
                                                </option>
                                                <option value="hard_block">
                                                    Hard block
                                                </option>
                                                <option value="allow">
                                                    Allow
                                                </option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                        <AdminField
                                            label="State"
                                            className="sm:w-40"
                                        >
                                            <AdminNativeSelect
                                                value={state}
                                                onChange={(event) =>
                                                    setState(
                                                        event.target.value as
                                                            | 'open'
                                                            | 'resolved'
                                                            | 'all',
                                                    )
                                                }
                                            >
                                                <option value="open">
                                                    Open
                                                </option>
                                                <option value="resolved">
                                                    Resolved
                                                </option>
                                                <option value="all">All</option>
                                            </AdminNativeSelect>
                                        </AdminField>
                                    </AdminToolbarGroup>
                                    <AdminToolbarGroup className="w-full xl:w-auto xl:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={loading}
                                            onClick={() => void load()}
                                        >
                                            <RefreshCcw className="h-4 w-4" />
                                            Refresh
                                        </Button>
                                    </AdminToolbarGroup>
                                </AdminToolbar>

                                {loading && filteredItems.length === 0 ? (
                                    <AdminEmpty
                                        title="Loading moderation queue"
                                        description="Fetching the latest flagged and escalated messages."
                                    />
                                ) : (
                                    <AdminScrollArea maxHeightClassName="max-h-[68vh]">
                                        <AdminDataTable tableClassName="min-w-[1280px]">
                                            <ProductTableHead>
                                                <ProductTableRow>
                                                    <ProductTableHeaderCell>
                                                        Sender
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Message
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Decision
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Categories
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Reason
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Queue state
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell>
                                                        Created
                                                    </ProductTableHeaderCell>
                                                    <ProductTableHeaderCell className="w-56">
                                                        Actions
                                                    </ProductTableHeaderCell>
                                                </ProductTableRow>
                                            </ProductTableHead>
                                            <ProductTableBody>
                                                {filteredItems.map((item) => (
                                                    <ProductTableRow
                                                        key={item.id}
                                                    >
                                                        <ProductTableCell>
                                                            <div className="font-medium text-foreground">
                                                                {item.sender
                                                                    ?.name ||
                                                                    'Unknown sender'}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {
                                                                    item.sender
                                                                        ?.email
                                                                }
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {
                                                                    item.sender
                                                                        ?.role
                                                                }
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="max-w-[22rem] text-sm whitespace-pre-wrap text-foreground">
                                                                {
                                                                    item.original_body
                                                                }
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <Badge
                                                                variant={decisionTone(
                                                                    item.decision,
                                                                )}
                                                            >
                                                                {item.decision}
                                                            </Badge>
                                                            <div className="mt-2 text-xs text-muted-foreground">
                                                                Severity:{' '}
                                                                {item.severity}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="flex max-w-[14rem] flex-wrap gap-2">
                                                                {(
                                                                    item.categories ??
                                                                    []
                                                                ).map(
                                                                    (
                                                                        category,
                                                                    ) => (
                                                                        <Badge
                                                                            key={`${item.id}-${category}`}
                                                                            variant="outline"
                                                                        >
                                                                            {
                                                                                category
                                                                            }
                                                                        </Badge>
                                                                    ),
                                                                )}
                                                            </div>
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            <div className="max-w-[18rem] text-sm text-muted-foreground">
                                                                {item.reason ||
                                                                    'No explicit moderation note.'}
                                                            </div>
                                                            {item.signals
                                                                ?.same_body_count ? (
                                                                <div className="mt-2 text-xs text-muted-foreground">
                                                                    Repeat count
                                                                    in{' '}
                                                                    {
                                                                        item
                                                                            .signals
                                                                            .window_minutes
                                                                    }{' '}
                                                                    min:{' '}
                                                                    {
                                                                        item
                                                                            .signals
                                                                            .same_body_count
                                                                    }
                                                                </div>
                                                            ) : null}
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            {item.resolved_at ? (
                                                                <div className="space-y-1">
                                                                    <div className="text-sm font-medium text-foreground">
                                                                        {item.resolution ||
                                                                            'Resolved'}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {formatDateTime(
                                                                            item.resolved_at,
                                                                        )}
                                                                    </div>
                                                                    {item.resolution_notes ? (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {
                                                                                item.resolution_notes
                                                                            }
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700">
                                                                        <ShieldAlert className="h-3.5 w-3.5" />
                                                                        Open
                                                                    </div>
                                                                    <textarea
                                                                        className="min-h-[72px] w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground"
                                                                        placeholder="Resolution notes"
                                                                        value={
                                                                            resolutionNotes[
                                                                                item
                                                                                    .id
                                                                            ] ??
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setResolutionNotes(
                                                                                (
                                                                                    current,
                                                                                ) => ({
                                                                                    ...current,
                                                                                    [item.id]:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                }),
                                                                            )
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            {formatDateTime(
                                                                item.created_at,
                                                            )}
                                                        </ProductTableCell>
                                                        <ProductTableCell>
                                                            {item.resolved_at ? (
                                                                <div className="text-xs text-muted-foreground">
                                                                    Closed
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={
                                                                            savingId ===
                                                                            item.id
                                                                        }
                                                                        onClick={() =>
                                                                            void resolve(
                                                                                item,
                                                                                'resolved_safe',
                                                                            )
                                                                        }
                                                                    >
                                                                        Safe
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={
                                                                            savingId ===
                                                                            item.id
                                                                        }
                                                                        onClick={() =>
                                                                            void resolve(
                                                                                item,
                                                                                'resolved_confirmed',
                                                                            )
                                                                        }
                                                                    >
                                                                        Confirm
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        disabled={
                                                                            savingId ===
                                                                            item.id
                                                                        }
                                                                        onClick={() =>
                                                                            void resolve(
                                                                                item,
                                                                                'dismissed_false_positive',
                                                                            )
                                                                        }
                                                                    >
                                                                        <CheckCheck className="h-4 w-4" />
                                                                        Dismiss
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </ProductTableCell>
                                                    </ProductTableRow>
                                                ))}
                                                {!loading &&
                                                filteredItems.length === 0 ? (
                                                    <ProductTableEmptyRow
                                                        colSpan={8}
                                                        title="No moderation items found"
                                                        description="Try another decision/state filter or wait for new flagged messages."
                                                    />
                                                ) : null}
                                            </ProductTableBody>
                                        </AdminDataTable>
                                    </AdminScrollArea>
                                )}
                            </AdminPanel>
                        </AdminSection>
                    </div>
                </AdminShell>
            </RoleGuard>
        </>
    );
}
