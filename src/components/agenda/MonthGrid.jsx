import React from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addDays, isSameMonth } from 'date-fns';

export default function MonthGrid({ date, occsByDate, onSelectDay }) {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const gridStart = addDays(monthStart, -monthStart.getDay());
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const today = new Date();

    return (
        <div>
            <div className="grid grid-cols-7 text-center text-[10px] uppercase text-muted-foreground mb-1">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                    const ds = format(d, 'yyyy-MM-dd');
                    const inMonth = isSameMonth(d, date);
                    const isToday = isSameDay(d, today);
                    const count = (occsByDate[ds] || 0);
                    return (
                        <button
                            key={i}
                            onClick={() => onSelectDay(d)}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors ${!inMonth ? 'text-muted-foreground/40' : 'hover:bg-accent'
                                } ${isToday ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                            {d.getDate()}
                            {count > 0 && inMonth && (
                                <span className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-primary-foreground' : 'bg-primary'}`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}