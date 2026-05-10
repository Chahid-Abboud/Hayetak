import {
    ProductBanner,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { Skeleton } from '@/components/ui/skeleton';
import { type ConversationContextPayload, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    RefreshCcw,
    Search,
    ShieldAlert,
    Sparkles,
    UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Conversation = {
    id: number;
    participants: Array<{ id: number; name: string }>;
    peer?: {
        id: number;
        name: string;
        role?: string | null;
        city?: string | null;
    } | null;
    last_message?: {
        id: number;
        sender_id: number;
        body: string;
        created_at: string;
        read_at?: string | null;
    } | null;
    unread_count: number;
    updated_at: string;
};

type Message = {
    id: number;
    sender_id: number;
    sender?: { id: number; name: string } | null;
    body: string;
    read_at?: string | null;
    created_at: string;
};

type ConversationFilter = 'all' | 'unread' | 'follow_up' | 'professional';

function getCsrfToken() {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

function roleLabel(role?: string | null) {
    if (!role) return 'User';
<<<<<<< HEAD
    if (role === 'nutritionist') return 'Dietitian';
    if (role === 'trainer') return 'Personal Trainer';
    return role.charAt(0).toUpperCase() + role.slice(1);
=======
    return role === 'nutritionist'
        ? 'Dietitian'
        : role.charAt(0).toUpperCase() + role.slice(1);
>>>>>>> origin/main
}

function formatThreadTime(value?: string | null) {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
}

function initialsFromName(name?: string | null) {
    return (
        name
            ?.split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || 'H'
    );
}

function isAbortError(error: unknown) {
    return error instanceof Error && error.name === 'AbortError';
}

function isProfessional(role?: string | null) {
    return role === 'trainer' || role === 'nutritionist';
}

function needsFollowUp(conversation: Conversation, actorId: number) {
    if (conversation.unread_count > 0) return true;
    if (!conversation.last_message) return false;
    if (conversation.last_message.sender_id === actorId) return false;
    const ageH =
        (Date.now() -
            new Date(conversation.last_message.created_at).getTime()) /
        (1000 * 60 * 60);
    return ageH >= 24;
}

function conversationState(
    conversation: Conversation,
    actorId: number,
): { label: string; className: string } {
    if (conversation.unread_count > 0) {
        return {
            label: `${conversation.unread_count} unread`,
            className: 'border-secondary/20 bg-secondary/12 text-foreground',
        };
    }

    if (needsFollowUp(conversation, actorId)) {
        return {
            label: 'Needs follow-up',
            className: 'border-warning/25 bg-warning/10 text-foreground',
        };
    }

    if (isProfessional(conversation.peer?.role)) {
        return {
            label: roleLabel(conversation.peer?.role),
            className:
                'border-border/70 bg-background/80 text-muted-foreground',
        };
    }

    return {
        label: 'Active',
        className: 'border-border/70 bg-background/80 text-muted-foreground',
    };
}

export default function MessagesPage() {
    const { auth } = usePage<SharedData>().props;
    const actorId = auth.user.id;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<
        number | null
    >(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ConversationFilter>('all');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [loadingContext, setLoadingContext] = useState(false);
    const [context, setContext] = useState<ConversationContextPayload | null>(
        null,
    );
    const [conversationError, setConversationError] = useState<string | null>(
        null,
    );
    const [messageError, setMessageError] = useState<string | null>(null);
    const [contextError, setContextError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messageControllerRef = useRef<AbortController | null>(null);
    const contextControllerRef = useRef<AbortController | null>(null);

    const error = messageError ?? conversationError;

    const loadConversations = async () => {
        setLoadingConversations(true);
        setConversationError(null);
        try {
            const res = await fetch('/api/messages/conversations', {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error('Failed to load conversations.');
            const json = await res.json();
            const data = Array.isArray(json?.data) ? json.data : [];
            setConversations(data);
            setActiveConversationId((prev) => {
                if (
                    prev &&
                    data.some((item: Conversation) => item.id === prev)
                ) {
                    return prev;
                }
                const requested = Number(
                    new URLSearchParams(window.location.search).get(
                        'conversation',
                    ),
                );
                return (
                    data.find((item: Conversation) => item.id === requested)
                        ?.id ??
                    data[0]?.id ??
                    null
                );
            });
        } catch (e) {
            setConversationError(
                e instanceof Error
                    ? e.message
                    : 'Unable to load conversations.',
            );
        } finally {
            setLoadingConversations(false);
        }
    };

    const loadMessages = async (conversationId: number) => {
        messageControllerRef.current?.abort();
        const controller = new AbortController();
        messageControllerRef.current = controller;
        setLoadingMessages(true);
        setMessageError(null);
        try {
            const res = await fetch(
                `/api/messages/conversations/${conversationId}/messages`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            );
            if (!res.ok) throw new Error('Failed to load messages.');
            const json = await res.json();
            setMessages(Array.isArray(json?.data) ? json.data : []);
            setConversations((prev) =>
                prev.map((conversation) =>
                    conversation.id === conversationId
                        ? { ...conversation, unread_count: 0 }
                        : conversation,
                ),
            );
        } catch (e) {
            if (isAbortError(e)) return;
            setMessageError(
                e instanceof Error ? e.message : 'Unable to load messages.',
            );
            setMessages([]);
        } finally {
            if (messageControllerRef.current === controller) {
                setLoadingMessages(false);
                messageControllerRef.current = null;
            }
        }
    };

    const loadContext = async (conversationId: number) => {
        contextControllerRef.current?.abort();
        const controller = new AbortController();
        contextControllerRef.current = controller;
        setLoadingContext(true);
        setContextError(null);
        try {
            const res = await fetch(
                `/api/messages/conversations/${conversationId}/context`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            );
            if (!res.ok) throw new Error('Failed to load thread context.');
            const json = await res.json();
            setContext((json?.data as ConversationContextPayload) ?? null);
        } catch (e) {
            if (isAbortError(e)) return;
            setContextError(
                e instanceof Error
                    ? e.message
                    : 'Unable to load conversation context.',
            );
            setContext(null);
        } finally {
            if (contextControllerRef.current === controller) {
                setLoadingContext(false);
                contextControllerRef.current = null;
            }
        }
    };

    useEffect(() => {
        void loadConversations();
    }, []);

    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            setContext(null);
            return;
        }
        void loadMessages(activeConversationId);
        void loadContext(activeConversationId);
    }, [activeConversationId]);

    useEffect(() => {
        return () => {
            messageControllerRef.current?.abort();
            contextControllerRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        if (!activeConversationId) return;
        const url = new URL(window.location.href);
        url.searchParams.set('conversation', String(activeConversationId));
        window.history.replaceState({}, '', url.toString());
    }, [activeConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
        if (!activeConversationId || !text.trim() || sending) return;
        setSending(true);
        setMessageError(null);
        try {
            const body = text.trim();
            const res = await fetch(
                `/api/messages/conversations/${activeConversationId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': getCsrfToken(),
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ body }),
                },
            );
<<<<<<< HEAD
            if (!res.ok) {
                const json = (await res.json().catch(() => null)) as
                    | { message?: string }
                    | null;
                throw new Error(
                    json?.message || 'Message could not be sent.',
                );
            }
=======
            if (!res.ok) throw new Error('Message could not be sent.');
>>>>>>> origin/main
            const json = await res.json();
            const nextMessage = json?.message as Message | undefined;
            setText('');
            setMessages((prev) =>
                nextMessage ? [...prev, nextMessage] : prev,
            );
            setConversations((prev) =>
                prev.map((conversation) =>
                    conversation.id === activeConversationId
                        ? {
                              ...conversation,
                              last_message: {
                                  id: nextMessage?.id ?? Date.now(),
                                  sender_id: actorId,
                                  body,
                                  created_at:
                                      nextMessage?.created_at ??
                                      new Date().toISOString(),
                              },
                              updated_at:
                                  nextMessage?.created_at ??
                                  new Date().toISOString(),
                          }
                        : conversation,
                ),
            );
        } catch (e) {
            setMessageError(
                e instanceof Error ? e.message : 'Message could not be sent.',
            );
        } finally {
            setSending(false);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return conversations.filter((conversation) => {
            const peerName =
                conversation.peer?.name ??
                conversation.participants.find((p) => p.id !== actorId)?.name ??
                '';
            const searchMatch =
                q === '' ||
                peerName.toLowerCase().includes(q) ||
                (conversation.last_message?.body ?? '')
                    .toLowerCase()
                    .includes(q);
            if (!searchMatch) return false;
            if (filter === 'unread') return conversation.unread_count > 0;
            if (filter === 'follow_up')
                return needsFollowUp(conversation, actorId);
            if (filter === 'professional')
                return isProfessional(conversation.peer?.role);
            return true;
        });
    }, [actorId, conversations, filter, search]);

    const activeConversation =
        conversations.find((item) => item.id === activeConversationId) ?? null;
    const activeState = activeConversation
        ? conversationState(activeConversation, actorId)
        : null;

    const left = (
        <aside className="h-full min-h-[70vh] overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-sm">
            <div className="space-y-3 border-b border-border/70 p-4">
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                        Care Threads
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                        Search across conversations, unread replies, and
                        follow-up needs.
                    </p>
                </div>
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        className="h-10 w-full rounded-2xl border border-border/70 bg-background/80 pr-3 pl-9 text-sm"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search person or message"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {(
                        [
                            'all',
                            'unread',
                            'follow_up',
                            'professional',
                        ] as ConversationFilter[]
                    ).map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setFilter(item)}
                            className={
                                'rounded-full border px-2 py-1.5 transition ' +
                                (filter === item
                                    ? 'border-primary/35 bg-primary/10 text-foreground'
                                    : 'border-border/70 bg-background text-muted-foreground')
                            }
                        >
                            {item === 'all'
                                ? 'All'
                                : item === 'unread'
                                  ? 'Unread'
                                  : item === 'follow_up'
                                    ? 'Follow-up'
                                    : 'Professionals'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="max-h-[70vh] overflow-auto p-2">
                {loadingConversations ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                                key={index}
                                className="h-16 w-full rounded-2xl"
                            />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">
                        No matching conversations.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((conversation) => (
                            <button
                                key={conversation.id}
                                type="button"
                                onClick={() =>
                                    setActiveConversationId(conversation.id)
                                }
                                className={
                                    'w-full rounded-[22px] border px-3 py-3 text-left transition ' +
                                    (conversation.id === activeConversationId
                                        ? 'border-primary/25 bg-primary/8 shadow-[0_18px_44px_-36px_rgba(17,24,39,0.68)]'
                                        : 'border-transparent hover:border-border/70 hover:bg-muted/35')
                                }
                            >
                                <div className="flex items-start gap-3">
                                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-xs font-semibold text-foreground">
                                        {initialsFromName(
                                            conversation.peer?.name,
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {conversation.peer?.name ??
                                                        `Conversation #${conversation.id}`}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {roleLabel(
                                                        conversation.peer?.role,
                                                    )}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[10px] text-muted-foreground">
                                                {formatThreadTime(
                                                    conversation.last_message
                                                        ?.created_at ??
                                                        conversation.updated_at,
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                            {conversation.last_message?.body ??
                                                'No messages yet'}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <span
                                                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${conversationState(conversation, actorId).className}`}
                                            >
                                                {
                                                    conversationState(
                                                        conversation,
                                                        actorId,
                                                    ).label
                                                }
                                            </span>
                                            {conversation.unread_count > 0 ? (
                                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-semibold text-secondary-foreground">
                                                    {conversation.unread_count}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );

    const right = (
        <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[30px] border border-border/70 bg-card/95 shadow-sm">
            {!activeConversation ? (
                <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                    Select a conversation to open the thread.
                </div>
            ) : (
                <>
                    <div className="border-b border-border/70 bg-background/70 px-5 py-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-card text-sm font-semibold text-foreground">
                                    {initialsFromName(
                                        activeConversation.peer?.name,
                                    )}
                                </span>
                                <div>
                                    <p className="text-base font-semibold text-foreground">
                                        {activeConversation.peer?.name ??
                                            'Conversation'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {roleLabel(
                                            activeConversation.peer?.role,
                                        )}
                                        {activeConversation.peer?.city
                                            ? ` • ${activeConversation.peer.city}`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                            {activeState ? (
                                <span
                                    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${activeState.className}`}
                                >
                                    {activeState.label}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="flex min-h-0 flex-col">
                            <div className="min-h-0 flex-1 overflow-auto bg-muted/25 px-4 py-5">
                                {loadingMessages ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 4 }).map(
                                            (_, index) => (
                                                <Skeleton
                                                    key={index}
                                                    className="h-16 w-full rounded-2xl"
                                                />
                                            ),
                                        )}
                                    </div>
                                ) : messages.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No messages in this conversation yet.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {messages.map((message) => {
                                            const mine =
                                                message.sender_id === actorId;
                                            return (
                                                <div
                                                    key={message.id}
                                                    className={
                                                        mine
                                                            ? 'flex justify-end'
                                                            : 'flex justify-start'
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            'max-w-[82%] rounded-[24px] px-4 py-3 text-sm shadow-sm ' +
                                                            (mine
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'border border-border/70 bg-background/95')
                                                        }
                                                    >
                                                        <p className="mb-1 text-[11px] opacity-70">
                                                            {mine
                                                                ? 'You'
                                                                : (message
                                                                      .sender
                                                                      ?.name ??
                                                                  activeConversation
                                                                      .peer
                                                                      ?.name ??
                                                                  'Contact')}
                                                        </p>
                                                        <p className="whitespace-pre-wrap">
                                                            {message.body}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-border/70 bg-background/75 p-4">
                                <div className="flex items-end gap-3">
                                    <textarea
                                        className="min-h-[52px] flex-1 resize-none rounded-[24px] border border-border/70 bg-card px-4 py-3 text-sm"
                                        value={text}
                                        disabled={loadingMessages || sending}
                                        onChange={(e) =>
                                            setText(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                void send();
                                            }
                                        }}
                                        placeholder="Write a message"
                                    />
                                    <button
                                        className="rounded-[22px] bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                                        onClick={() => void send()}
                                        disabled={
                                            loadingMessages ||
                                            sending ||
                                            !text.trim()
                                        }
                                    >
                                        {sending ? 'Sending...' : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <aside className="border-t border-border/70 bg-background/70 px-4 py-4 xl:border-t-0 xl:border-l xl:border-border/70">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-secondary" />
                                <p className="text-sm font-semibold">
                                    Context Snapshot
                                </p>
                            </div>
                            <div className="mt-3 space-y-3">
                                {loadingContext ? (
                                    <>
                                        <Skeleton className="h-20 w-full rounded-2xl" />
                                        <Skeleton className="h-20 w-full rounded-2xl" />
                                    </>
                                ) : contextError ? (
                                    <ProductBanner tone="danger">
                                        {contextError}
                                    </ProductBanner>
                                ) : context ? (
<<<<<<< HEAD
                                    context.context_mode ===
                                    'professional_summary' ? (
                                        <>
                                            <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                                <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    Professional
                                                </p>
                                                <p>
                                                    Role:{' '}
                                                    {context.professional_snapshot
                                                        ?.role_label ??
                                                        roleLabel(
                                                            context.peer?.role,
                                                        )}
                                                </p>
                                                <p>
                                                    Verified:{' '}
                                                    {context.professional_snapshot
                                                        ?.verified
                                                        ? 'Yes'
                                                        : 'No'}
                                                </p>
                                                {context.professional_snapshot
                                                    ?.city ? (
                                                    <p>
                                                        City:{' '}
                                                        {
                                                            context
                                                                .professional_snapshot
                                                                .city
                                                        }
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                                <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                    Focus
                                                </p>
                                                <p>
                                                    Specialties:{' '}
                                                    {context.professional_snapshot
                                                        ?.specialties?.length
                                                        ? context.professional_snapshot.specialties.join(
                                                              ', ',
                                                          )
                                                        : 'Not listed'}
                                                </p>
                                                <p>
                                                    Availability:{' '}
                                                    {context.professional_snapshot
                                                        ?.availability_text ??
                                                        'No availability note yet'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                                <p className="mb-1 font-medium">
                                                    Upcoming appointments
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {
                                                        context.appointments
                                                            .upcoming_count
                                                    }{' '}
                                                    planned
                                                </p>
                                                <a
                                                    href="/appointments"
                                                    className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-foreground no-underline"
                                                >
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    Open scheduler
                                                </a>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                                <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                    Client profile
                                                </p>
                                                <p>
                                                    Goals:{' '}
                                                    {context.client_snapshot
                                                        ?.goals?.length
                                                        ? context.client_snapshot.goals.join(
                                                              ', ',
                                                          )
                                                        : 'Not set'}
                                                </p>
                                                <p>
                                                    Diet type:{' '}
                                                    {context.client_snapshot
                                                        ?.diet_name ??
                                                        'Not set'}
                                                </p>
                                                <p>
                                                    Allergies:{' '}
                                                    {context.client_snapshot
                                                        ?.allergies?.length
                                                        ? context.client_snapshot.allergies.join(
                                                              ', ',
                                                          )
                                                        : 'None listed'}
                                                </p>
                                                <p>
                                                    Medical history:{' '}
                                                    {context.client_snapshot
                                                        ?.has_medical_history
                                                        ? 'Flagged'
                                                        : 'None flagged'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                                <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                                    <UtensilsCrossed className="h-3.5 w-3.5" />
                                                    Activity
                                                </p>
                                                <p>
                                                    Today:{' '}
                                                    {context.activity.today
                                                        ?.meals_logged ?? 0}{' '}
                                                    meals,{' '}
                                                    {context.activity.today
                                                        ?.workouts_logged ?? 0}{' '}
                                                    workouts
                                                </p>
                                                <p>
                                                    Last 7 days:{' '}
                                                    {context.activity
                                                        .last_7_days
                                                        ?.meals_logged ?? 0}{' '}
                                                    meals,{' '}
                                                    {context.activity
                                                        .last_7_days
                                                        ?.workouts_logged ?? 0}{' '}
                                                    workouts
                                                </p>
                                                <p>
                                                    Workout location:{' '}
                                                    {context.client_snapshot
                                                        ?.workout_location ??
                                                        'Not set'}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                                <p className="mb-1 font-medium">
                                                    Plan and appointments
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {context.plan
                                                        ? `Latest plan v${context.plan.version ?? '?'}`
                                                        : 'No active plan context'}
                                                </p>
                                                <p className="mt-1 text-muted-foreground">
                                                    {
                                                        context.appointments
                                                            .upcoming_count
                                                    }{' '}
                                                    upcoming appointment
                                                    {context.appointments
                                                        .upcoming_count === 1
                                                        ? ''
                                                        : 's'}
                                                </p>
                                            </div>
                                        </>
                                    )
=======
                                    <>
                                        <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                Safety
                                            </p>
                                            <p>
                                                Allergies:{' '}
                                                {context.safety.allergies
                                                    ?.length
                                                    ? context.safety.allergies.join(
                                                          ', ',
                                                      )
                                                    : 'None listed'}
                                            </p>
                                            <p>
                                                Medical history:{' '}
                                                {context.safety
                                                    .has_medical_history
                                                    ? 'Yes'
                                                    : 'No'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                                <UtensilsCrossed className="h-3.5 w-3.5" />
                                                Today
                                            </p>
                                            <p>
                                                Meals:{' '}
                                                {context.activity.today
                                                    ?.meals_logged ?? 0}
                                            </p>
                                            <p>
                                                Calories:{' '}
                                                {context.activity.today
                                                    ?.meal_calories ?? 0}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-border/70 bg-card p-3 text-sm">
                                            <p className="mb-1 font-medium">
                                                Upcoming appointments
                                            </p>
                                            <p className="text-muted-foreground">
                                                {
                                                    context.appointments
                                                        .upcoming_count
                                                }{' '}
                                                planned
                                            </p>
                                            <a
                                                href="/appointments"
                                                className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-foreground no-underline"
                                            >
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                Open scheduler
                                            </a>
                                        </div>
                                    </>
>>>>>>> origin/main
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No context available.
                                    </p>
                                )}
                            </div>
                        </aside>
                    </div>
                </>
            )}
<<<<<<< HEAD
        </div>
=======
        </section>
>>>>>>> origin/main
    );

    return (
        <>
            <Head title="Messages" />
            <ProductPageShell>
                <ProductHero
                    eyebrow="Messages"
                    title="Care Threads"
                    description="Context-aware messaging across coaching, meal/workout progress, plans, and appointments."
                    actions={
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl border border-border/70 px-4 py-2 text-sm font-medium transition hover:bg-muted"
                            onClick={() => void loadConversations()}
                            disabled={loadingConversations}
                        >
                            <RefreshCcw className="h-4 w-4" />
                            {loadingConversations ? 'Refreshing...' : 'Refresh'}
                        </button>
                    }
                />
                {error ? (
                    <ProductBanner tone="danger">{error}</ProductBanner>
                ) : null}
                <ResizablePanels
                    left={left}
                    right={right}
                    className="gap-0"
                    defaultLeftWidth={340}
                    minLeftWidth={300}
                    maxLeftWidth={460}
                />
            </ProductPageShell>
        </>
    );
}
