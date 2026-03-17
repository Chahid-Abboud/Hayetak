import NavHeader from '@/components/NavHeader';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Conversation = {
    id: number;
    title: string;
    last_message_excerpt?: string | null;
    last_message_role?: string | null;
    last_message_at?: string | null;
    updated_at?: string | null;
};

type AiMessage = {
    id: number;
    conversation_id: number;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    metadata?: {
        warnings?: string[];
        used_context_keys?: string[];
        intent?: string;
        feature?: string;
        model?: string;
        provider?: string;
    } | null;
    created_at?: string | null;
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

function isAbortError(error: unknown) {
    return error instanceof Error && error.name === 'AbortError';
}

export default function AiChatPage() {
    const { auth } = usePage<SharedData>().props;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<
        number | null
    >(null);
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [text, setText] = useState('');
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesRequestRef = useRef<AbortController | null>(null);

    async function loadConversations(): Promise<number | null> {
        setLoadingConversations(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/conversations', {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Failed to load AI conversations.');
            }

            const json = await response.json();
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

            setActiveConversationId((current) => {
                if (
                    current &&
                    data.some((item: Conversation) => item.id === current)
                ) {
                    return current;
                }

                return nextActiveId;
            });

            return nextActiveId;
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Unable to load AI conversations.',
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
        setError(null);

        try {
            const response = await fetch(
                `/api/ai/conversations/${conversationId}/messages`,
                {
                    headers: { Accept: 'application/json' },
                    signal: controller.signal,
                },
            );

            if (!response.ok) {
                throw new Error('Failed to load AI messages.');
            }

            const json = await response.json();
            setMessages(Array.isArray(json?.data) ? json.data : []);
        } catch (err) {
            if (!isAbortError(err)) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Unable to load AI messages.',
                );
                setMessages([]);
            }
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
        }
    }, [activeConversationId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const url = new URL(window.location.href);
        if (activeConversationId) {
            url.searchParams.set('conversation', String(activeConversationId));
        } else {
            url.searchParams.delete('conversation');
        }

        window.history.replaceState({}, '', url.toString());
    }, [activeConversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    useEffect(() => {
        return () => {
            messagesRequestRef.current?.abort();
        };
    }, []);

    const activeConversation = useMemo(
        () =>
            conversations.find(
                (conversation) => conversation.id === activeConversationId,
            ) ?? null,
        [activeConversationId, conversations],
    );

    async function send(seedText?: string) {
        const message = (seedText ?? text).trim();
        if (!message || sending) return;

        setSending(true);
        setError(null);
        setWarnings([]);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    message,
                    conversation_id: activeConversationId,
                    screen_context: 'coach',
                    include_last_7_days: true,
                }),
            });

            if (!response.ok) {
                const json = await response.json().catch(() => null);
                throw new Error(
                    typeof json?.message === 'string'
                        ? json.message
                        : 'The AI coach could not answer right now.',
                );
            }

            const json = await response.json();
            const conversation = json?.conversation as Conversation | undefined;
            const userMessage = json?.user_message as AiMessage | undefined;
            const assistantMessage = json?.assistant_message as
                | AiMessage
                | undefined;
            const nextWarnings = Array.isArray(json?.warnings)
                ? json.warnings
                : [];

            setWarnings(nextWarnings);
            setText('');

            if (conversation) {
                setConversations((prev) => {
                    const filtered = prev.filter(
                        (item) => item.id !== conversation.id,
                    );

                    return [conversation, ...filtered];
                });
                setActiveConversationId(conversation.id);
            }

            setMessages((prev) => {
                const next =
                    activeConversationId &&
                    conversation &&
                    activeConversationId !== conversation.id
                        ? []
                        : [...prev];

                if (userMessage) next.push(userMessage);
                if (assistantMessage) next.push(assistantMessage);

                return next;
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'The AI coach could not answer right now.',
            );
        } finally {
            setSending(false);
        }
    }

    function startNewChat() {
        setActiveConversationId(null);
        setMessages([]);
        setWarnings([]);
        setText('');
        setError(null);
    }

    const promptSuggestions = [
        'What stands out from my meals today?',
        'How should I adjust dinner if my protein is low?',
        'Can I train today based on my recent workouts?',
        'Why is my plan not showing on the dashboard?',
    ];

    return (
        <>
            <Head title="AI Coach" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">AI Coach</h1>
                        <p className="text-sm text-muted-foreground">
                            Ask about meals, workouts, progress, plans, nearby
                            help, messages, appointments, or settings using your
                            in-app data.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                            Signed in as {auth.user.first_name ?? auth.user.name}
                        </div>
                        <button
                            type="button"
                            className="rounded-2xl border px-4 py-2 text-sm font-medium transition hover:bg-muted"
                            onClick={startNewChat}
                        >
                            New chat
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : null}

                {warnings.length > 0 ? (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {warnings.join(' ')}
                    </div>
                ) : null}

                <div className="grid min-h-[72vh] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="overflow-hidden rounded-3xl border bg-card">
                        <div className="border-b px-4 py-3">
                            <div className="text-sm font-semibold">
                                Conversations
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Your saved AI chat threads appear here.
                            </div>
                        </div>

                        <div className="max-h-[72vh] overflow-auto p-2">
                            {loadingConversations ? (
                                <div className="px-3 py-6 text-sm text-muted-foreground">
                                    Loading conversations...
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="space-y-3 px-3 py-6 text-sm text-muted-foreground">
                                    <p>No AI chats yet.</p>
                                    <p>
                                        Start with meals, workouts, progress,
                                        plan questions, or nearby support.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {conversations.map((conversation) => {
                                        const active =
                                            conversation.id ===
                                            activeConversationId;

                                        return (
                                            <button
                                                key={conversation.id}
                                                type="button"
                                                onClick={() =>
                                                    setActiveConversationId(
                                                        conversation.id,
                                                    )
                                                }
                                                className={
                                                    'block w-full rounded-2xl border px-3 py-3 text-left transition ' +
                                                    (active
                                                        ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/6'
                                                        : 'border-transparent hover:border-[color:var(--border)] hover:bg-accent/50')
                                                }
                                            >
                                                <div className="text-sm font-medium">
                                                    {conversation.title}
                                                </div>
                                                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                    {conversation.last_message_excerpt ??
                                                        'No messages yet'}
                                                </div>
                                                <div className="mt-2 text-[11px] text-muted-foreground">
                                                    {conversation.last_message_at
                                                        ? new Date(
                                                              conversation.last_message_at,
                                                          ).toLocaleString()
                                                        : 'New thread'}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className="flex min-h-[72vh] flex-col overflow-hidden rounded-3xl border bg-card">
                        <div className="border-b px-5 py-4">
                            <div className="text-base font-semibold">
                                {activeConversation?.title ?? 'New AI chat'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                                The current build uses the in-app chat scaffold.
                                When your FLAN-T5 endpoint is ready, this page
                                can switch to it through config.
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-[color:var(--muted)]/30 px-4 py-4">
                            {loadingMessages ? (
                                <div className="text-sm text-muted-foreground">
                                    Loading messages...
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="space-y-5">
                                    <div className="rounded-3xl border bg-background p-5">
                                        <div className="text-base font-semibold">
                                            Start with something practical
                                        </div>
                                        <div className="mt-2 text-sm text-muted-foreground">
                                            The coach can already use your saved
                                            profile, meals, workouts, plans, and
                                            recent progress context.
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        {promptSuggestions.map((prompt) => (
                                            <button
                                                key={prompt}
                                                type="button"
                                                onClick={() => void send(prompt)}
                                                className="rounded-2xl border bg-background p-4 text-left text-sm transition hover:border-[color:var(--primary)]/40 hover:bg-accent/40"
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {messages.map((message) => {
                                        const mine = message.role === 'user';
                                        const messageWarnings = Array.isArray(
                                            message.metadata?.warnings,
                                        )
                                            ? message.metadata?.warnings
                                            : [];

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
                                                        'max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-sm sm:max-w-[72%] ' +
                                                        (mine
                                                            ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                                                            : 'border bg-background text-foreground')
                                                    }
                                                >
                                                    <div className="mb-1 text-[11px] opacity-70">
                                                        {mine
                                                            ? 'You'
                                                            : 'AI Coach'}
                                                    </div>
                                                    <div className="whitespace-pre-wrap break-words">
                                                        {message.content}
                                                    </div>

                                                    {!mine &&
                                                    messageWarnings.length >
                                                        0 ? (
                                                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                            {messageWarnings.join(
                                                                ' ',
                                                            )}
                                                        </div>
                                                    ) : null}

                                                    {!mine &&
                                                    Array.isArray(
                                                        message.metadata?.used_context_keys,
                                                    ) &&
                                                    message.metadata
                                                        ?.used_context_keys
                                                        ?.length ? (
                                                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] opacity-70">
                                                            {message.metadata.used_context_keys
                                                                .slice(0, 4)
                                                                .map((key) => (
                                                                    <span
                                                                        key={
                                                                            key
                                                                        }
                                                                        className="rounded-full border px-2 py-1"
                                                                    >
                                                                        {key}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                    ) : null}

                                                    <div className="mt-2 text-[11px] opacity-70">
                                                        {message.created_at
                                                            ? new Date(
                                                                  message.created_at,
                                                              ).toLocaleString()
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
                                    className="min-h-[52px] flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-[color:var(--primary)]"
                                    value={text}
                                    disabled={sending}
                                    onChange={(event) =>
                                        setText(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' &&
                                            !event.shiftKey
                                        ) {
                                            event.preventDefault();
                                            void send();
                                        }
                                    }}
                                    placeholder="Ask about meals, workouts, plans, progress, nearby help, messages, or settings"
                                />
                                <button
                                    type="button"
                                    className="rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-[color:var(--primary-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={() => void send()}
                                    disabled={sending || !text.trim()}
                                >
                                    {sending ? 'Thinking...' : 'Send'}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                Press Enter to send and Shift+Enter for a new
                                line.
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
