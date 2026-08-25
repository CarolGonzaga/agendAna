import React from 'react';
import { categoryColor } from '@/lib/categories';
import { formatTime, dateToStr } from '@/lib/datetime';
import { addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Moon, Sparkles } from 'lucide-react';

const SLOT_HEIGHT = 24;
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6..23

export default function WeekGrid({ occs, weekStart, onEdit, onCreateSlot }) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const now = new Date();
    const nowTop = ((now.getHours() - 6) * 60 + now.getMinutes()) / 30 * SLOT_HEIGHT;

    const occsByDay = days.map((d) => {
        const ds = dateToStr(d);
        return occs.filter((o) => o.occurrence_date === ds);
    });

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[640px]">
                <div className="grid grid-cols-[48px_repeat(7,1fr)] sticky top-0 bg-background z-20">
                    <div />
                    {days.map((d, i) => {
                        const isToday = d.toDateString() === now.toDateString();
                        return (
                            <div key={i} className="text-center py-2">
                                <div className="text-[10px] uppercase text-muted-foreground">{formatWeekdayShort(d)}</div>
                                <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="grid grid-cols-[48px_repeat(7,1fr)] relative">
                    <div className="relative">
                        {HOURS.map((h) => (
                            <div key={h} className="text-[10px] text-muted-foreground -translate-y-1.5" style={{ height: SLOT_HEIGHT * 2 }}>
                                {h.toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                    {days.map((d, di) => {
                        const isToday = d.toDateString() === now.toDateString();
                        return (
                            <div key={di} className="relative border-l border-border/60">
                                {HOURS.map((h) => (
                                    <div key={h} className="border-t border-border/40" style={{ height: SLOT_HEIGHT * 2 }} />
                                ))}
                                {isToday && (
                                    <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary -translate-x-0.5" />
                                        <div className="flex-1 h-px bg-primary" />
                                    </div>
                                )}
                                {occsByDay[di].map((o, oi) => {
                                    const start = new Date(o.starts_at);
                                    const end = o.ends_at ? new Date(o.ends_at) : new Date(start.getTime() + 30 * 60000);
                                    const top = ((start.getHours() - 6) * 60 + start.getMinutes()) / 30 * SLOT_HEIGHT;
                                    const height = Math.max(16, ((end - start) / 60000 / 30) * SLOT_HEIGHT - 2);
                                    if (top < 0) return null;
                                    const color = categoryColor(o.series.category);
                                    const isFree = o.series.event_type === 'free_slot';
                                    if (isFree) {
                                        return (
                                            <div key={oi} className="absolute left-0.5 right-0.5 rounded text-[9px] text-muted-foreground/70 px-1 py-0.5 bg-muted/30 flex items-center justify-center" style={{ top, height }}>
                                                <Moon className="w-2.5 h-2.5" />
                                            </div>
                                        );
                                    }
                                    return (
                                        <button
                                            key={oi}
                                            onClick={() => onEdit && onEdit(o)}
                                            className="absolute left-0.5 right-0.5 rounded text-left px-1 py-0.5 overflow-hidden bg-card border border-border text-[9px] leading-tight"
                                            style={{ top, height, borderLeftColor: color, borderLeftWidth: 2 }}
                                        >
                                            <div className="font-medium truncate flex items-center gap-0.5">
                                                {o.series.event_type === 'reward' && <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />}
                                                <span>{o.series.title}</span>
                                            </div>
                                            <div className="text-muted-foreground truncate">{formatTime(start)}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function formatWeekdayShort(d) {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}