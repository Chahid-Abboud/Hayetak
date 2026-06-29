import {
    ProductBanner,
    ProductHero,
    ProductPageShell,
} from '@/components/product/page';
import {
    ProductButton,
    ProductTextarea,
} from '@/components/product/product-ui';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { Skeleton } from '@/components/ui/skeleton';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Fragment,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

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
        context_sources?: Array<{
            key: string;
            label: string;
            fields?: string[];
        }>;
    };
    created_at?: string | null;
};

type PendingBubble = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

type RetryState = {
    conversationId: number | null;
    message: string;
};

const SEND_TIMEOUT_MS = 45_000;

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

function renderInlineMessageText(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = /(\*\*([^*]+?)\*\*|\*([^*\n]+?)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        const boldText = match[2];
        const italicText = match[3];

        nodes.push(
            boldText ? (
                <strong
                    key={`bold-${match.index}`}
                    className="font-semibold text-current"
                >
                    {boldText}
                </strong>
            ) : (
                <em key={`italic-${match.index}`} className="italic">
                    {italicText}
                </em>
            ),
        );

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : [text];
}

function MessageTextLines({ lines }: { lines: string[] }) {
    return (
        <>
            {lines.map((line, index) => (
                <Fragment key={`${line}-${index}`}>
                    {index > 0 ? <br /> : null}
                    {renderInlineMessageText(line)}
                </Fragment>
            ))}
        </>
    );
}

function MessageContent({ content }: { content: string }) {
    const blocks = content
        .replace(/\r\n/g, '\n')
        .trim()
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean);

    if (blocks.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3 leading-7 break-words">
            {blocks.map((block, blockIndex) => {
                const lines = block
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                const groups = lines.reduce<
                    Array<{
                        type: 'paragraph' | 'ordered' | 'unordered';
                        lines: string[];
                    }>
                >((grouped, line) => {
                    const type = /^\d+[.)]\s+/.test(line)
                        ? 'ordered'
                        : /^[-*\u2022]\s+/.test(line)
                          ? 'unordered'
                          : 'paragraph';
                    const previous = grouped[grouped.length - 1];

                    if (previous?.type === type) {
                        previous.lines.push(line);
                    } else {
                        grouped.push({ type, lines: [line] });
                    }

                    return grouped;
                }, []);

                return (
                    <Fragment key={blockIndex}>
                        {groups.map((group, groupIndex) => {
                            if (group.type === 'ordered') {
                                return (
                                    <ol
                                        key={groupIndex}
                                        className="list-decimal space-y-2 pl-5"
                                    >
                                        {group.lines.map((line, lineIndex) => (
                                            <li
                                                key={`${line}-${lineIndex}`}
                                                className="pl-1"
                                            >
                                                {renderInlineMessageText(
                                                    line.replace(
                                                        /^\d+[.)]\s+/,
                                                        '',
                                                    ),
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                );
                            }

                            if (group.type === 'unordered') {
                                return (
                                    <ul
                                        key={groupIndex}
                                        className="list-disc space-y-2 pl-5"
                                    >
                                        {group.lines.map((line, lineIndex) => (
                                            <li
                                                key={`${line}-${lineIndex}`}
                                                className="pl-1"
                                            >
                                                {renderInlineMessageText(
                                                    line.replace(
                                                        /^[-*\u2022]\s+/,
                                                        '',
                                                    ),
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                );
                            }

                            return (
                                <p key={groupIndex}>
                                    <MessageTextLines lines={group.lines} />
                                </p>
                            );
                        })}
                    </Fragment>
                );
            })}
        </div>
    );
}

export default function AiChatPage() {
    const { auth } = usePage<SharedData>().props;
    const role = auth.user.role ?? 'client';
    const isAdmin = role === 'admin';
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
    const [pendingBubbles, setPendingBubbles] = useState<PendingBubble[]>([]);
    const [retryState, setRetryState] = useState<RetryState | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messagesRequestRef = useRef<AbortController | null>(null);
    const sendRequestRef = useRef<AbortController | null>(null);

    async function loadConversations(): Promise<number | null> {
        setLoadingConversations(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/conversations', {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Could not load your coach chats.');
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
                    : 'Could not load your coach chats.',
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
                throw new Error('Could not load this coach conversation.');
            }

            const json = await response.json();
            setMessages(Array.isArray(json?.data) ? json.data : []);
        } catch (err) {
            if (!isAbortError(err)) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Could not load this coach conversation.',
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
            sendRequestRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        setPendingBubbles([]);
        setRetryState(null);
    }, [activeConversationId]);

    const activeConversation = useMemo(
        () =>
            conversations.find(
                (conversation) => conversation.id === activeConversationId,
            ) ?? null,
        [activeConversationId, conversations],
    );

    async function send(
        seedText?: string,
        forcedConversationId?: number | null,
    ) {
        const message = (seedText ?? text).trim();
        if (!message || sending) return;

        const pendingUserId = `pending-user-${Date.now()}`;
        const pendingAssistantId = `pending-assistant-${Date.now() + 1}`;
        const conversationIdAtSend =
            forcedConversationId ?? activeConversationId;
        const controller = new AbortController();
        const timeoutId = window.setTimeout(
            () => controller.abort(),
            SEND_TIMEOUT_MS,
        );

        sendRequestRef.current?.abort();
        sendRequestRef.current = controller;
        setPendingBubbles([
            { id: pendingUserId, role: 'user', content: message },
            { id: pendingAssistantId, role: 'assistant', content: '' },
        ]);
        setText('');
        setSending(true);
        setError(null);
        setRetryState(null);
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
                    conversation_id: conversationIdAtSend,
                    screen_context: 'coach',
                    include_last_7_days: true,
                }),
                signal: controller.signal,
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
            setPendingBubbles([]);

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
            setPendingBubbles([]);
            setText(message);
            setRetryState({
                conversationId: conversationIdAtSend,
                message,
            });
            setError(
                isAbortError(err)
                    ? 'The AI coach took too long to answer. Retry the message or start a new chat.'
                    : err instanceof Error
                      ? err.message
                      : 'The AI coach could not answer right now.',
            );
        } finally {
            window.clearTimeout(timeoutId);
            if (sendRequestRef.current === controller) {
                sendRequestRef.current = null;
            }
            setSending(false);
        }
    }

    function startNewChat() {
        sendRequestRef.current?.abort();
        setActiveConversationId(null);
        setMessages([]);
        setPendingBubbles([]);
        setText('');
        setError(null);
        setRetryState(null);
    }

    const promptSuggestions = isAdmin
        ? [
              'What should I check if a plan is not showing on the dashboard?',
              'How can I explain protein targets using saved profile data?',
              'What recovery advice fits my recent workouts?',
              'What app settings should I review if data looks stale?',
          ]
        : [
              'What stands out from my meals today?',
              'How should I adjust dinner if my protein is low?',
              'Can I train today based on my recent workouts?',
              "How can I stay more consistent with today's plan?",
          ];

    const coachDescription = isAdmin
        ? "Use AI Coach for your own wellness context and Hayetak workflows. Other users' data stays private."
        : 'Ask about meals, workouts, recovery, progress, plans, nearby help, messages, appointments, or settings using your saved app data when relevant.';
    const coachDescriptionText = isAdmin
        ? 'Use AI Coach for your own wellness context and Hayetak workflows. Other users data stays private.'
        : coachDescription;
    const visibleMessages = useMemo(
        () => [...messages, ...pendingBubbles],
        [messages, pendingBubbles],
    );

    function contextSourceLabel(message: AiMessage | PendingBubble) {
        if (message.role !== 'assistant' || !('metadata' in message)) {
            return null;
        }

        const sources = Array.isArray(message.metadata?.context_sources)
            ? message.metadata.context_sources
            : [];

        const labels = sources
            .filter(
                (source) =>
                    Array.isArray(source.fields) && source.fields.length > 0,
            )
            .map((source) => source.label)
            .slice(0, 4);

        if (labels.length === 0) {
            return null;
        }

        return `Loaded context: ${labels.join(', ')}`;
    }

    return (
        <>
            <Head title="AI Coach" />
            <ProductPageShell>
                <ProductHero
                    eyebrow="AI coach"
                    title="AI Coach"
                    description={coachDescriptionText}
                    actions={
                        <div className="flex items-center gap-2">
                            <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                                Signed in as{' '}
                                {auth.user.first_name ?? auth.user.name}
                            </div>
                            <ProductButton
                                type="button"
                                emphasis="secondary"
                                onClick={startNewChat}
                            >
                                New chat
                            </ProductButton>
                        </div>
                    }
                />

                {error ? (
                    <ProductBanner tone="danger" role="alert">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span>{error}</span>
                            {retryState ? (
                                <ProductButton
                                    type="button"
                                    emphasis="secondary"
                                    size="sm"
                                    onClick={() => {
                                        setActiveConversationId(
                                            retryState.conversationId,
                                        );
                                        void send(
                                            retryState.message,
                                            retryState.conversationId,
                                        );
                                    }}
                                >
                                    Retry last message
                                </ProductButton>
                            ) : null}
                        </div>
                    </ProductBanner>
                ) : null}

                {isAdmin ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="rounded-3xl border bg-card p-4">
                            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Triage
                            </div>
                            <div className="mt-2 text-base font-semibold">
                                Conversation safety first
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Keep transcript review readable and escalate
                                only flagged or unsafe patterns.
                            </p>
                        </div>
                        <div className="rounded-3xl border bg-card p-4">
                            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Context
                            </div>
                            <div className="mt-2 text-base font-semibold">
                                Use profile constraints
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Review replies against allergies, injuries, and
                                recent logs before marking issues resolved.
                            </p>
                        </div>
                        <div className="rounded-3xl border bg-card p-4">
                            <div className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                                Follow-up
                            </div>
                            <div className="mt-2 text-base font-semibold">
                                Open dedicated surfaces
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <ProductButton asChild emphasis="secondary">
                                    <Link href="/ai/planner">AI Planner</Link>
                                </ProductButton>
                                <ProductButton asChild emphasis="secondary">
                                    <Link href="/admin/logs">Audit Logs</Link>
                                </ProductButton>
                            </div>
                        </div>
                    </div>
                ) : null}

                <ResizablePanels
                    className="gap-0"
                    left={
                        <aside className="h-full overflow-hidden rounded-3xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <div className="text-sm font-semibold">
                                    Conversations
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Your saved coach threads.
                                </div>
                            </div>

                            <div className="max-h-[72vh] overflow-auto p-2">
                                {loadingConversations ? (
                                    <div className="space-y-3 px-3 py-4">
                                        {Array.from({ length: 5 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="rounded-2xl border border-border/70 bg-background/70 p-3"
                                                >
                                                    <Skeleton className="h-4 w-32" />
                                                    <Skeleton className="mt-3 h-3 w-full" />
                                                    <Skeleton className="mt-2 h-3 w-24" />
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="space-y-3 px-3 py-6 text-sm text-muted-foreground">
                                        <p>No coach chats yet.</p>
                                        <p>
                                            Start with meals, workouts,
                                            progress, plan questions, or nearby
                                            support.
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
                                                    <div className="mt-2 text-xs text-muted-foreground">
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
                    }
                    right={
                        <div className="flex min-h-[72vh] flex-col overflow-hidden rounded-3xl border bg-card">
                            <div className="border-b px-5 py-4">
                                <div className="text-base font-semibold">
                                    {activeConversation?.title ??
                                        'New coach chat'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {isAdmin
                                        ? 'Admin view: coaching for your own wellness context and workflow guidance only.'
                                        : 'Ask about your profile, meals, workouts, recovery, or plans.'}
                                </div>
                            </div>

                            <div
                                className="flex-1 overflow-auto bg-[color:var(--muted)]/30 px-4 py-4"
                                aria-live="polite"
                            >
                                {loadingMessages ? (
                                    <div className="space-y-3">
                                        {Array.from({ length: 5 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                                                >
                                                    <div className="w-full max-w-[76%] rounded-3xl border bg-background px-4 py-3">
                                                        <Skeleton className="h-3 w-16" />
                                                        <Skeleton className="mt-3 h-3 w-full" />
                                                        <Skeleton className="mt-2 h-3 w-5/6" />
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : visibleMessages.length === 0 ? (
                                    <div className="space-y-5">
                                        <div className="rounded-3xl border bg-background p-5">
                                            <div className="text-base font-semibold">
                                                Start with something practical
                                            </div>
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                {isAdmin
                                                    ? 'Use the coach for your own profile, plans, and admin workflow support.'
                                                    : 'The coach can use your saved profile, recent meals/workouts, and this thread.'}
                                            </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2">
                                            {promptSuggestions.map((prompt) => (
                                                <ProductButton
                                                    key={prompt}
                                                    type="button"
                                                    onClick={() =>
                                                        void send(prompt)
                                                    }
                                                    emphasis="secondary"
                                                    className="h-auto justify-start p-4 text-left whitespace-normal"
                                                >
                                                    {prompt}
                                                </ProductButton>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {visibleMessages.map((message) => {
                                            const mine =
                                                message.role === 'user';
                                            const isPending = String(
                                                message.id,
                                            ).startsWith('pending-');
                                            const createdAt =
                                                'created_at' in message
                                                    ? message.created_at
                                                    : null;
                                            const sourceLabel =
                                                contextSourceLabel(message);

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
                                                            'max-w-[92%] rounded-3xl px-5 py-4 text-[15px] leading-7 shadow-sm sm:max-w-[78%] sm:text-base ' +
                                                            (mine
                                                                ? 'bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                                                                : 'border bg-background text-foreground') +
                                                            (isPending
                                                                ? ' opacity-90'
                                                                : '')
                                                        }
                                                    >
                                                        <div className="mb-2 text-xs opacity-70">
                                                            <div className="flex items-center gap-2">
                                                                <span>
                                                                    {mine
                                                                        ? 'You'
                                                                        : 'AI Coach'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {isPending &&
                                                        !mine &&
                                                        message.content ===
                                                            '' ? (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <span className="inline-flex gap-1">
                                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--primary)]/70" />
                                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--primary)]/55 [animation-delay:120ms]" />
                                                                    <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--primary)]/40 [animation-delay:240ms]" />
                                                                </span>
                                                                <span>
                                                                    Thinking
                                                                    through your
                                                                    thread...
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <MessageContent
                                                                content={
                                                                    message.content
                                                                }
                                                            />
                                                        )}

                                                        <div className="mt-3 text-xs leading-5 opacity-70">
                                                            {isPending
                                                                ? mine
                                                                    ? 'Sending...'
                                                                    : 'Reply on the way'
                                                                : createdAt
                                                                  ? new Date(
                                                                        createdAt,
                                                                    ).toLocaleString()
                                                                  : ''}
                                                        </div>
                                                        {!mine &&
                                                        sourceLabel ? (
                                                            <div className="mt-3 border-t border-current/10 pt-3 text-xs leading-5 opacity-70">
                                                                {sourceLabel}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            <div className="border-t px-4 py-4">
                                <div className="mb-3 flex flex-wrap gap-2">
                                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                                        Follow-ups stay in context
                                    </span>
                                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                                        Saved profile data is only used when
                                        relevant
                                    </span>
                                </div>
                                <div className="flex items-end gap-3">
                                    <ProductTextarea
                                        className="min-h-[52px] flex-1 resize-none"
                                        value={text}
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
                                        placeholder={
                                            isAdmin
                                                ? 'Ask about your own wellness context or an admin workflow issue'
                                                : 'Ask a follow-up about this thread, your meals, workouts, plans, or progress'
                                        }
                                    />
                                    <ProductButton
                                        type="button"
                                        onClick={() => void send()}
                                        disabled={sending || !text.trim()}
                                    >
                                        {sending ? 'Working...' : 'Send'}
                                    </ProductButton>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    Press Enter to send, Shift+Enter for a new
                                    line, and keep follow-ups in the same thread
                                    for the best context.
                                </p>
                            </div>
                        </div>
                    }
                />
            </ProductPageShell>
        </>
    );
}
