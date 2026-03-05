import { useMemo } from 'react';

type Props = {
    month: string; // "YYYY-MM"
    selectedDate: string; // "YYYY-MM-DD"
    daysWithEntries: Set<string>;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onSelectDate: (ymd: string) => void;
};

function ymd(y: number, m: number, d: number) {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
}

export default function MealHistoryCalendar({
    month,
    selectedDate,
    daysWithEntries,
    onPrevMonth,
    onNextMonth,
    onSelectDate,
}: Props) {
    const { year, monIndex, days, firstDow } = useMemo(() => {
        const [yy, mm] = month.split('-').map(Number);
        const first = new Date(yy, mm - 1, 1);
        const last = new Date(yy, mm, 0);
        return {
            year: yy,
            monIndex: mm - 1,
            days: last.getDate(),
            firstDow: (first.getDay() + 6) % 7, // Monday=0
        };
    }, [month]);

    const weeks = useMemo(() => {
        const cells: Array<{ ymd: string | null; day?: number }> = [];
        for (let i = 0; i < firstDow; i++) cells.push({ ymd: null });
        for (let d = 1; d <= days; d++)
            cells.push({ ymd: ymd(year, monIndex + 1, d), day: d });
        while (cells.length % 7 !== 0) cells.push({ ymd: null });

        const rows: (typeof cells)[] = [];
        for (let i = 0; i < cells.length; i += 7)
            rows.push(cells.slice(i, i + 7));
        return rows;
    }, [year, monIndex, days, firstDow]);

    return (
        <div className="rounded-2xl border border-[#1C2C64]/20 bg-white p-4 dark:border-white/20 dark:bg-[#0B1020]">
            <div className="flex items-center justify-between">
                <button
                    className="rounded-lg border px-2 py-1 text-sm dark:border-white/20"
                    onClick={onPrevMonth}
                    aria-label="Previous month"
                >
                    ←
                </button>
                <div className="text-sm font-semibold">
                    {new Date(year, monIndex, 1).toLocaleString(undefined, {
                        month: 'long',
                        year: 'numeric',
                    })}
                </div>
                <button
                    className="rounded-lg border px-2 py-1 text-sm dark:border-white/20"
                    onClick={onNextMonth}
                    aria-label="Next month"
                >
                    →
                </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-xs opacity-70">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} className="text-center">
                        {d}
                    </div>
                ))}
            </div>

            <div role="grid" className="mt-2 grid grid-cols-7 gap-1">
                {weeks.flat().map((c, i) => {
                    if (!c.ymd)
                        return <div key={i} className="h-9 rounded-lg" />;

                    const isSelected = c.ymd === selectedDate;
                    const hasEntries = daysWithEntries.has(c.ymd);

                    return (
                        <button
                            key={c.ymd}
                            role="gridcell"
                            onClick={() => onSelectDate(c.ymd!)}
                            className={[
                                'h-9 rounded-lg border text-sm transition',
                                isSelected
                                    ? 'border-[#1C2C64] bg-[#1C2C64] text-white'
                                    : 'border-transparent bg-transparent hover:border-[#1C2C64]/30',
                            ].join(' ')}
                            aria-label={`${c.ymd}${hasEntries ? ' (has meals)' : ''}`}
                        >
                            <span className="inline-flex items-center justify-center gap-1">
                                {c.day}
                                {hasEntries ? (
                                    <span className="text-[10px]">•</span>
                                ) : null}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-2 text-[11px] opacity-70">
                • indicates days with logged meals
            </div>
        </div>
    );
}
