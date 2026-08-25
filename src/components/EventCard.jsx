import React from 'react';
import { categoryColor } from '@/lib/categories';
import { formatTime, minutesToLabel, durationMinutes } from '@/lib/datetime';
import { Check, Gift, Moon } from 'lucide-react';
import { EventUserBadges } from '@/components/UserAvatar';

export default function EventCard({ occ, onComplete, onEdit, compact }) {
    const s = occ.series;
    const color = categoryColor(s.category);
    const isFree = s.event_type === 'free_slot';
    const isReward = s.event_type === 'reward';
    const isDone = occ.status === 'completed';
    const isMissed = occ.status === 'missed';

    return (
        <div
            onClick={() => onEdit && onEdit(occ)}
            className={`relative rounded-xl border border-border bg-card p-4 pl-5 transition-opacity ${isDone ? 'opacity-50' : ''} ${onEdit ? 'cursor-pointer hover:bg-accent/40' : ''}`}
        >
            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full" style={{ background: color }} />
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        {isReward && <Gift className="w-4 h-4 text-primary shrink-0" />}
                        {isFree && <Moon className="w-4 h-4 text-muted-foreground shrink-0" />}
                        <span className={`font-medium truncate ${isFree ? 'text-muted-foreground' : ''}`}>
                            {isMissed ? 'Encerrado' : s.title}
                        </span>
                        {!isFree && <EventUserBadges series={s} size="xs" className="shrink-0 ml-1" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(new Date(occ.starts_at))} — {occ.ends_at ? formatTime(new Date(occ.ends_at)) : 'fim do dia'}
                        {occ.ends_at && <span className="ml-2">· {minutesToLabel(durationMinutes(occ.starts_at, occ.ends_at))}</span>}
                    </div>
                    {!compact && s.category !== 'Livre' && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-muted-foreground">{s.category}</span>
                        </div>
                    )}
                </div>
                {onComplete && !isFree && !isReward && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onComplete(occ); }}
                        disabled={isDone}
                        aria-label="Concluir"
                        className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isDone ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border hover:border-primary hover:text-primary'
                        }`}
                    >
                        <Check className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}