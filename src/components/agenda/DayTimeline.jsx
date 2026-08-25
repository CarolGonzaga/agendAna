import React from 'react';
import EventCard from '@/components/EventCard';
import { categoryColor } from '@/lib/categories';
import { formatTime } from '@/lib/datetime';
import { Check, Moon, Gift } from 'lucide-react';

const SLOT_HEIGHT = 28; // px per 30 min

export default function DayTimeline({ occs, date, onComplete, onEdit, onCreateSlot }) {
    const startHour = 6;
    const endHour = 23;
    const rows = (endHour - startHour) * 2;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const nowTop = isToday
        ? ((now.getHours() - startHour) * 60 + now.getMinutes()) / 30 * SLOT_HEIGHT
        : null;

    return (
        <div className="relative" style={{ height: rows * SLOT_HEIGHT }}>
            {Array.from({ length: rows }).map((_, i) => {
                const h = startHour + Math.floor(i / 2);
                const m = i % 2 === 0 ? '00' : '30';
                const top = i * SLOT_HEIGHT;
                return (
                    <div key={i} className="absolute left-0 right-0 flex items-center" style={{ top }}>
                        <span className="w-12 text-[10px] text-muted-foreground -translate-y-1.5">{h.toString().padStart(2, '0')}:{m}</span>
                        <div className="flex-1 border-t border-border/60" />
                    </div>
                );
            })}
            {isToday && nowTop !== null && (
                <div className="absolute left-12 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                    <div className="w-2 h-2 rounded-full bg-primary -translate-x-1" />
                    <div className="flex-1 h-px bg-primary" />
                </div>
            )}
            {occs.map((o, idx) => {
                const start = new Date(o.starts_at);
                const end = o.ends_at ? new Date(o.ends_at) : new Date(start.getTime() + 30 * 60000);
                const top = ((start.getHours() - startHour) * 60 + start.getMinutes()) / 30 * SLOT_HEIGHT;
                const height = Math.max(SLOT_HEIGHT - 4, ((end - start) / 60000 / 30) * SLOT_HEIGHT - 4);
                const color = categoryColor(o.series.category);
                const isFree = o.series.event_type === 'free_slot';
                const isDone = o.status === 'completed';
                const left = 52;
                if (top < 0 || top > rows * SLOT_HEIGHT) return null;
                return (
                    <div
                        key={idx}
                        className="absolute z-0"
                        style={{ top, height, left, right: 4 }}
                    >
                        {isFree ? (
                            <button
                                onClick={() => onCreateSlot && onCreateSlot(o)}
                                className="w-full h-full rounded-md text-left px-2 py-1 text-[11px] text-muted-foreground/80 hover:bg-muted/60 transition-colors flex items-center gap-1.5"
                            >
                                <Moon className="w-3 h-3 text-muted-foreground" />
                                <span>Livre</span>
                            </button>
                        ) : (
                            <div
                                onClick={() => onEdit && onEdit(o)}
                                className={`w-full h-full rounded-md border-l-2 bg-card border border-border px-2 py-1 overflow-hidden cursor-pointer hover:shadow-sm transition-shadow ${isDone ? 'opacity-50' : ''}`}
                                style={{ borderLeftColor: color }}
                            >
                                <div className="text-[11px] font-medium truncate flex items-center gap-1">
                                    {o.series.event_type === 'reward' && <Gift className="w-3 h-3 text-primary shrink-0" />}
                                    {o.series.title}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{formatTime(start)}</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}