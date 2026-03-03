import NavHeader from '@/components/NavHeader';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { type SharedData } from '@/types';

type Conversation = {
    id: number;
    participants: Array<{ id: number; name: string }>;
};

type Message = {
    id: number;
    sender_id: number;
    body: string;
    created_at: string;
};

export default function MessagesPage() {
    const { auth } = usePage<SharedData>().props;
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');

    async function loadConversations() {
        const res = await fetch('/api/messages/conversations');
        const json = await res.json();
        setConversations(Array.isArray(json?.data) ? json.data : json);
    }

    async function loadMessages(conversationId: number) {
        const res = await fetch(`/api/messages/conversations/${conversationId}/messages`);
        const json = await res.json();
        setMessages(Array.isArray(json?.data) ? json.data : []);
    }

    useEffect(() => {
        void loadConversations();
    }, []);

    useEffect(() => {
        if (activeConversationId) {
            void loadMessages(activeConversationId);
        }
    }, [activeConversationId]);

    async function send() {
        if (!activeConversationId || !text.trim()) return;
        await fetch(`/api/messages/conversations/${activeConversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: text }),
        });
        setText('');
        await loadMessages(activeConversationId);
    }

    return (
        <>
            <Head title="Messages" />
            <NavHeader />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <h1 className="mb-4 text-2xl font-semibold">Messages</h1>
                <div className="grid gap-4 md:grid-cols-3">
                    <aside className="rounded border p-3">
                        <div className="mb-2 text-sm font-medium">Threads</div>
                        <div className="space-y-2">
                            {conversations.map((c) => {
                                const peer = c.participants.find((p) => p.id !== auth.user.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setActiveConversationId(c.id)}
                                        className="block w-full rounded border px-2 py-1 text-left text-sm"
                                    >
                                        {peer?.name ?? `Conversation #${c.id}`}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>
                    <section className="md:col-span-2 rounded border p-3">
                        <div className="mb-3 text-sm font-medium">Chat</div>
                        <div className="mb-3 max-h-80 space-y-2 overflow-auto">
                            {messages.map((m) => (
                                <div key={m.id} className="rounded bg-slate-50 p-2 text-sm">
                                    <div className="text-xs text-slate-500">
                                        {m.sender_id === auth.user.id ? 'You' : `User #${m.sender_id}`}
                                    </div>
                                    <div>{m.body}</div>
                                </div>
                            ))}
                            {messages.length === 0 && <div className="text-xs text-slate-500">No messages.</div>}
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 rounded border px-2 py-1 text-sm"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Write a message"
                            />
                            <button className="rounded bg-blue-700 px-3 py-1 text-sm text-white" onClick={() => void send()}>
                                Send
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

