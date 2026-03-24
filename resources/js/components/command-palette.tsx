import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export type CommandPaletteItem = {
    id: string;
    title: string;
    description?: string;
    group: string;
    href?: string;
    keywords?: string[];
    tone?: 'default' | 'accent';
    onSelect?: () => void;
};

function groupItems(items: CommandPaletteItem[]) {
    const grouped = new Map<string, CommandPaletteItem[]>();

    items.forEach((item) => {
        const group = grouped.get(item.group) ?? [];
        group.push(item);
        grouped.set(item.group, group);
    });

    return Array.from(grouped.entries());
}

export default function CommandPalette({
    items,
    open,
    onOpenChange,
}: {
    items: CommandPaletteItem[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const [query, setQuery] = useState('');

    useEffect(() => {
        if (!open) {
            setQuery('');
        }
    }, [open]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            const isModifier = event.metaKey || event.ctrlKey;
            if (!isModifier || event.key.toLowerCase() !== 'k') return;
            event.preventDefault();
            onOpenChange(!open);
        }

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onOpenChange, open]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) return items;

        return items.filter((item) => {
            const haystack = [
                item.title,
                item.description ?? '',
                item.group,
                ...(item.keywords ?? []),
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(normalized);
        });
    }, [items, query]);

    const grouped = useMemo(() => groupItems(filtered), [filtered]);

    function activate(item: CommandPaletteItem) {
        onOpenChange(false);
        if (item.onSelect) {
            item.onSelect();
            return;
        }

        if (item.href) {
            router.visit(item.href);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl sm:max-w-2xl">
                <DialogHeader className="border-b border-border/70 px-6 pt-6 pb-4">
                    <DialogTitle className="flex items-center gap-2 text-left text-xl">
                        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Search className="h-4 w-4" />
                        </span>
                        Command Palette
                    </DialogTitle>
                    <DialogDescription className="text-left">
                        Jump around Hayetak, open key pages, and start common
                        actions with one quick search.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 px-6 py-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search pages, actions, and shortcuts"
                            className="h-11 rounded-2xl border-border/70"
                        />
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge
                                variant="outline"
                                className="rounded-full px-2 py-1 text-[10px] tracking-[0.16em] uppercase"
                            >
                                Ctrl/Cmd + K
                            </Badge>
                            <span>Open from anywhere</span>
                        </div>
                    </div>

                    <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                        {grouped.length === 0 ? (
                            <div className="rounded-[24px] border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-foreground">
                                        No matches for "{query}"
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Try searching for meal tracker, AI
                                        coach, dashboard, appointments, or
                                        nearby.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            grouped.map(([group, groupItems]) => (
                                <div key={group} className="space-y-2">
                                    <div className="px-1 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                                        {group}
                                    </div>
                                    <div className="space-y-2">
                                        {groupItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => activate(item)}
                                                className={cn(
                                                    'flex w-full items-start justify-between gap-4 rounded-[22px] border border-border/70 bg-background/80 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5',
                                                    item.tone === 'accent' &&
                                                        'border-primary/20 bg-primary/5',
                                                )}
                                            >
                                                <div className="space-y-1">
                                                    <div className="text-sm font-medium text-foreground">
                                                        {item.title}
                                                    </div>
                                                    {item.description ? (
                                                        <div className="text-sm leading-6 text-muted-foreground">
                                                            {item.description}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <span className="pt-1 text-xs font-medium text-muted-foreground">
                                                    Open
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/70 px-6 py-3 text-xs text-muted-foreground">
                    <span>
                        Use search to open pages or start quick actions.
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
