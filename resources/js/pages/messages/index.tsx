import {
    ProductBanner,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { Skeleton } from '@/components/ui/skeleton';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
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
    sender?: {
        id: number;
        name: string;
    } | null;
    body: string;
    read_at?: string | null;
    created_at: string;
};

function getCsrfToken() {
    return (
        (
            document.querySelector(
                'meta[name="csrf-token"]',
            ) as HTMLMetaElement | null
        )?.content ?? ''
    );
}

function formatRoleLabel(role?: string | null) {
    if (!role) return 'User';
    return role === 'nutritionist'
        ? 'Dietitian'
        : role.charAt(0).toUpperCase() + role.slice(1);
}

function isAbortError(error: unknown) {
    return error instanceof Error && error.name === 'AbortError';
}

export default function MessagesPage() {
    const { auth } = usePage<SharedData>().props;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<
        number | null
    >(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [conversationError, setConversationError] = useState<string | null>(
        null,
    );
    const [messageError, setMessageError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesRequestRef = useRef<AbortController | null>(null);

    const error = messageError ?? conversationError;

    async function loadConversations(): Promise<number | null> {
        setLoadingConversations(true);
        setConversationError(null);

        try {
            const res = await fetch('/api/messages/conversations', {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Failed to load conversations.',
                );
            }

            const json = await res.json();
            const data = Array.isArray(json?.data) ? json.data : [];
            setConversations(data);

            const requestedId = Number(
                new URLSearchParams(window.location.search).get('conversation'),
            );
            const nextActiveId =
                data.find((item: Conversation) => item.id === requestedId)
                    ?.id ??
                data[0]?.id ??
                null;

            let selectedConversationId = nextActiveId;

            setActiveConversationId((current) => {
                selectedConversationId =
                    current &&
                    data.some((item: Conversation) => item.id === current)
                        ? current
                        : nextActiveId;

                return selectedConversationId;
            });

            return selectedConversationId;
        } catch (err) {
            setConversationError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load conversations.',
            );
            return null;
        } finally {
            setLoadingConversations(false);
        }
    }

    async function loadMessages(conversationId: number) {
        messagesRequestRef.current?.abort();
        const controller = new AbortController();
        messagesRequestRef.current = controller;

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

            if (!res.ok) {
                const json = await res.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Failed to load messages.',
                );
            }

            const json = await res.json();
            setMessages(Array.isArray(json?.data) ? json.data : []);
            setConversations((prev) =>
                prev.map((conversation) =>
                    conversation.id === conversationId
                        ? { ...conversation, unread_count: 0 }
                        : conversation,
                ),
            );
        } catch (err) {
            if (isAbortError(err)) return;

            setMessages([]);
            setMessageError(
                err instanceof Error ? err.message : 'Unable to load messages.',
            );
        } finally {
            if (messagesRequestRef.current === controller) {
                setLoadingMessages(false);
                messagesRequestRef.current = null;
            }
        }
    }

    useEffect(() => {
        void loadConversations();
    }, []);

    useEffect(() => {
        if (activeConversationId) {
            void loadMessages(activeConversationId);
        } else {
            setMessages([]);
            setMessageError(null);
        }
    }, [activeConversationId]);

    useEffect(() => {
        return () => {
            messagesRequestRef.current?.abort();
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

    async function send() {
        if (!activeConversationId || !text.trim() || sending) return;

        setSending(true);
        setMessageError(null);

        try {
            const body = text.trim();
            const response = await fetch(
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

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'Message could not be sent.',
                );
            }

            const json = await response.json();
            const nextMessage = json?.message as Message | undefined;

            setText('');
            setMessages((prev) =>
                nextMessage ? [...prev, nextMessage] : prev,
            );
            setConversations((prev) =>
                prev
                    .map((conversation) =>
                        conversation.id === activeConversationId
                            ? {
                                  ...conversation,
                                  last_message: {
                                      id: nextMessage?.id ?? Date.now(),
                                      sender_id: auth.user.id,
                                      body,
                                      created_at:
                                          nextMessage?.created_at ??
                                          new Date().toISOString(),
                                      read_at: nextMessage?.read_at ?? null,
                                  },
                                  updated_at:
                                      nextMessage?.created_at ??
                                      new Date().toISOString(),
                              }
                            : conversation,
                    )
                    .sort(
                        (a, b) =>
                            new Date(b.updated_at).getTime() -
                            new Date(a.updated_at).getTime(),
                    ),
            );
        } catch (err) {
            setMessageError(
                err instanceof Error
                    ? err.message
                    : 'Message could not be sent.',
            );
        } finally {
            setSending(false);
        }
    }

    const activeConversation = useMemo(
        () =>
            conversations.find(
                (conversation) => conversation.id === activeConversationId,
            ) ?? null,
        [activeConversationId, conversations],
    );
    const canCompose = !!activeConversation && !loadingMessages;
    const conversationPanel = (
        <aside className="h-full overflow-hidden rounded-3xl border bg-card">
            <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">Conversations</div>
                <div className="text-xs text-muted-foreground">
                    Your recent threads appear here.
                </div>
            </div>

            <div className="max-h-[70vh] overflow-auto p-2">
                {loadingConversations ? (
                    <div className="space-y-3 px-3 py-4">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-border/70 bg-background/70 p-3"
                            >
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="mt-3 h-3 w-full" />
                                <Skeleton className="mt-2 h-3 w-24" />
                            </div>
                        ))}
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">
                        No conversations yet. Start one from the{' '}
                        <a href="/nearby" className="underline">
                            Nearby
                        </a>{' '}
                        page to message a professional.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {conversations.map((conversation) => {
                            const peer =
                                conversation.peer ??
                                conversation.participants.find(
                                    (participant) =>
                                        participant.id !== auth.user.id,
                                );
                            const active =
                                conversation.id === activeConversationId;

                            return (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    onClick={() =>
                                        setActiveConversationId(conversation.id)
                                    }
                                    className={
                                        'block w-full rounded-2xl border px-3 py-3 text-left transition ' +
                                        (active
                                            ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/6'
                                            : 'border-transparent hover:border-[color:var(--border)] hover:bg-accent/50')
                                    }
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-medium">
                                                {peer?.name ??
                                                    `Conversation #${conversation.id}`}
                                            </div>
                                            <div className="mt-1 truncate text-xs text-muted-foreground">
                                                {conversation.last_message
                                                    ?.body ?? 'No messages yet'}
                                            </div>
                                        </div>
                                        {conversation.unread_count > 0 ? (
                                            <span className="rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--primary-foreground)]">
                                                {conversation.unread_count}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                                        <span>
                                            {formatRoleLabel(
                                                conversation.peer?.role,
                                            )}
                                        </span>
                                        <span>
                                            {conversation.last_message
                                                ?.created_at
                                                ? new Date(
                                                      conversation.last_message.created_at,
                                                  ).toLocaleString()
                                                : ''}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
    const threadPanel = (
        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border bg-card">
            {activeConversation ? (
                <>
                    <div className="border-b px-5 py-4">
                        <div className="text-base font-semibold">
                            {activeConversation.peer?.name ?? 'Conversation'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {formatRoleLabel(activeConversation.peer?.role)}
                            {activeConversation.peer?.city
                                ? ` • ${activeConversation.peer.city}`
                                : ''}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-[color:var(--muted)]/30 px-4 py-4">
                        {loadingMessages ? (
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div className="w-full max-w-[72%] rounded-3xl border bg-background px-4 py-3">
                                            <Skeleton className="h-3 w-20" />
                                            <Skeleton className="mt-3 h-3 w-full" />
                                            <Skeleton className="mt-2 h-3 w-4/5" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                                No messages in this conversation yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {messages.map((message) => {
                                    const mine =
                                        message.sender_id === auth.user.id;

                                    return (
                                        <div
                                            key={message.id}
                                            className={
                                                'flex ' +
                                                (mine
                                                    ? 'justify-end'
                                                    : 'justify-start')
                                            }
                                        >
                                            <div
                                                className={
                                                    'max-w-[85%] rounded-3xl px-4 py-3 text-sm shadow-sm sm:max-w-[70%] ' +
                                                    (mine
                                                        ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                                                        : 'border bg-background text-foreground')
                                                }
                                            >
                                                <div className="mb-1 text-[11px] opacity-70">
                                                    {mine
                                                        ? 'You'
                                                        : (message.sender
                                                              ?.name ??
                                                          activeConversation
                                                              .peer?.name ??
                                                          'Contact')}
                                                </div>
                                                <div className="break-words whitespace-pre-wrap">
                                                    {message.body}
                                                </div>
                                                <div className="mt-2 text-[11px] opacity-70">
                                                    {new Date(
                                                        message.created_at,
                                                    ).toLocaleString()}
                                                    {mine && message.read_at
                                                        ? ' • Read'
                                                        : ''}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    <div className="border-t px-4 py-4">
                        <div className="flex items-end gap-3">
                            <textarea
                                className="min-h-[48px] flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-sm transition outline-none focus:border-[color:var(--primary)]"
                                value={text}
                                disabled={!canCompose || sending}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        void send();
                                    }
                                }}
                                placeholder="Write a message"
                            />
                            <button
                                className="rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-[color:var(--primary-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => void send()}
                                disabled={
                                    !canCompose || sending || !text.trim()
                                }
                            >
                                {sending ? 'Sending...' : 'Send'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Press Enter to send, Shift+Enter for a new line.
                        </p>
                    </div>
                </>
            ) : (
                <div className="flex h-full min-h-[50vh] items-center justify-center px-6 text-center">
                    <div>
                        <div className="text-base font-semibold">
                            Select a conversation
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                            Choose a thread from the list to view its history
                            and send messages.
                        </div>
                    </div>
                </div>
            )}
        </section>
    );

    return (
        <>
            <Head title="Messages" />
            <ProductPageShell>
                <ProductHero
                    eyebrow="Messages"
                    title="Messages"
                    description="View conversations, read history, and reply in one thread."
                    actions={
                        <button
                            type="button"
                            className="rounded-2xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                            onClick={async () => {
                                const selectedConversationId =
                                    await loadConversations();
                                if (selectedConversationId) {
                                    await loadMessages(selectedConversationId);
                                }
                            }}
                            disabled={loadingConversations}
                        >
                            {loadingConversations ? 'Refreshing...' : 'Refresh'}
                        </button>
                    }
                />

                {error ? (
                    <ProductBanner tone="danger">{error}</ProductBanner>
                ) : null}

                <ResizablePanels
                    left={conversationPanel}
                    right={threadPanel}
                    className="gap-0"
                />
            </ProductPageShell>
        </>
    );
}
