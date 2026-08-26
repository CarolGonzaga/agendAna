import React, { useState, useEffect, useRef } from 'react';
import { formatTime, minutesToLabel, durationMinutes } from '@/lib/datetime';
import { categoryColor } from '@/lib/categories';
import { EventUserBadges } from '@/components/UserAvatar';
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Clock,
    Calendar,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EventCarousel({
    events = [],
    nowTime = Date.now(),
    onComplete,
    onEdit,
    onOpenFocus,
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const touchStartX = useRef(null);
    const hasInitialSynced = useRef(false);

    // Filter actionable (non-free) events
    const actionable = events.filter((o) => o.series.event_type !== 'free_slot');

    // Find key indices
    const activeIndex = actionable.findIndex(
        (o) =>
            o.status !== 'completed' &&
            o.ends_at &&
            new Date(o.starts_at).getTime() <= nowTime &&
            new Date(o.ends_at).getTime() > nowTime
    );

    const firstPendingPastIndex = actionable.findIndex(
        (o) =>
            o.status !== 'completed' &&
            o.ends_at &&
            new Date(o.ends_at).getTime() <= nowTime
    );

    const firstUpcomingIndex = actionable.findIndex(
        (o) => new Date(o.starts_at).getTime() > nowTime
    );

    // Sync to the most relevant event on first load
    useEffect(() => {
        if (actionable.length === 0 || hasInitialSynced.current) return;
        hasInitialSynced.current = true;

        if (activeIndex !== -1) {
            setCurrentIndex(activeIndex);
        } else if (firstPendingPastIndex !== -1) {
            setCurrentIndex(firstPendingPastIndex);
        } else if (firstUpcomingIndex !== -1) {
            setCurrentIndex(firstUpcomingIndex);
        } else {
            setCurrentIndex(0);
        }
    }, [actionable.length, activeIndex, firstPendingPastIndex, firstUpcomingIndex]);

    // Handle touch gestures for mobile swipe
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > 40 && currentIndex < actionable.length - 1) {
            setCurrentIndex((i) => i + 1);
        } else if (diff < -40 && currentIndex > 0) {
            setCurrentIndex((i) => i - 1);
        }
        touchStartX.current = null;
    };

    if (actionable.length === 0) return null;

    const safeIndex = Math.min(currentIndex, actionable.length - 1);
    const currentEvent = actionable[safeIndex];
    if (!currentEvent) return null;

    const s = currentEvent.series;
    const color = categoryColor(s.category);
    const startsAtMs = new Date(currentEvent.starts_at).getTime();
    const endsAtMs = currentEvent.ends_at ? new Date(currentEvent.ends_at).getTime() : startsAtMs + 30 * 60000;
    const isDone = currentEvent.status === 'completed';
    const isNow = !isDone && startsAtMs <= nowTime && endsAtMs > nowTime;
    const isPast = endsAtMs <= nowTime;
    const isUpcoming = startsAtMs > nowTime;

    const durationMin = durationMinutes(currentEvent.starts_at, currentEvent.ends_at);
    const remainingMin = isNow ? Math.max(0, Math.round((endsAtMs - nowTime) / 60000)) : 0;
    const minutesToStart = isUpcoming ? Math.max(0, Math.round((startsAtMs - nowTime) / 60000)) : 0;

    return (
        <section className="space-y-2">
            {/* Carousel Navigation Header */}
            <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Compromissos do Dia
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
                        {safeIndex + 1} de {actionable.length}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    {activeIndex !== -1 && safeIndex !== activeIndex && (
                        <button
                            onClick={() => setCurrentIndex(activeIndex)}
                            className="text-[11px] font-semibold text-primary px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors flex items-center gap-1"
                            title="Ir para o evento que está ocorrendo agora"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span>Ir para Agora</span>
                        </button>
                    )}
                    <button
                        onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                        disabled={safeIndex === 0}
                        className="p-1.5 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Evento anterior"
                        aria-label="Evento anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setCurrentIndex((i) => Math.min(actionable.length - 1, i + 1))}
                        disabled={safeIndex === actionable.length - 1}
                        className="p-1.5 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="Próximo evento"
                        aria-label="Próximo evento"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Active Event Slide Card */}
            <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClick={() => onEdit && onEdit(currentEvent)}
                className={`relative rounded-2xl bg-card border p-5 shadow-sm overflow-hidden transition-all duration-300 cursor-pointer select-none animate-fade ${
                    isNow
                        ? 'border-primary/40 ring-1 ring-primary/20 shadow-md'
                        : isDone
                        ? 'border-border/60 opacity-85'
                        : isPast
                        ? 'border-amber-500/30 bg-amber-500/[0.02]'
                        : 'border-border'
                }`}
            >
                {/* Left category accent bar */}
                <div
                    className="absolute top-0 left-0 bottom-0 w-2 transition-colors"
                    style={{ background: isNow ? 'hsl(var(--primary))' : color }}
                />

                {/* Top Status & Points Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isDone ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                            </span>
                        ) : isNow ? (
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                Agora
                            </span>
                        ) : isPast ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
                                <Clock className="w-3 h-3" /> Passado (Pendente)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                                A Seguir
                            </span>
                        )}

                        <span className="text-xs text-muted-foreground font-medium">
                            {s.category}
                        </span>

                        <EventUserBadges series={s} size="xs" />
                    </div>

                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                        +{s.points || 10} pts
                    </span>
                </div>

                {/* Title & Timing */}
                <div className="space-y-1.5 mb-4">
                    <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground line-clamp-2">
                        {s.title}
                    </h2>

                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">
                            {formatTime(new Date(currentEvent.starts_at))} — {currentEvent.ends_at ? formatTime(new Date(currentEvent.ends_at)) : 'fim do dia'}
                        </span>
                        {currentEvent.ends_at && (
                            <>
                                <span>·</span>
                                <span>{minutesToLabel(durationMin)}</span>
                            </>
                        )}
                    </div>

                    {/* Context Time Feedback */}
                    <div className="pt-0.5">
                        {isNow ? (
                            <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span>{remainingMin} min restantes</span>
                            </div>
                        ) : isPast && !isDone ? (
                            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Horário já encerrado — Pode marcar como concluído a qualquer momento!</span>
                            </div>
                        ) : isUpcoming ? (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Começa em {minutesToLabel(minutesToStart)}</span>
                            </div>
                        ) : isDone && currentEvent.completed_at ? (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                <span>Concluído com sucesso</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Card Action Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        {/* Focus Mode button (Available for Current or Upcoming) */}
                        {isNow && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenFocus && onOpenFocus(currentEvent.id);
                                }}
                                className="h-10 px-3.5 rounded-xl border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-xs font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                title="Abrir Modo Foco para este compromisso"
                            >
                                <Clock className="w-4 h-4" />
                                <span>Modo Foco</span>
                            </button>
                        )}
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                            Toque no card para editar
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isDone ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onComplete && onComplete(currentEvent);
                                }}
                                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Check className="w-4 h-4" />
                                <span>Concluir ({isPast ? 'Concluir atividade' : 'Concluir'})</span>
                            </button>
                        ) : (
                            <div className="w-full sm:w-auto h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-500/20">
                                <Check className="w-4 h-4" />
                                <span>Atividade Concluída</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination Dots */}
            {actionable.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-1">
                    {actionable.map((evt, idx) => {
                        const isSelected = idx === safeIndex;
                        const isEvtDone = evt.status === 'completed';
                        const isEvtNow = !isEvtDone && evt.ends_at && new Date(evt.starts_at).getTime() <= nowTime && new Date(evt.ends_at).getTime() > nowTime;
                        return (
                            <button
                                key={evt.id || idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all ${
                                    isSelected
                                        ? 'w-6 bg-primary'
                                        : isEvtNow
                                        ? 'w-2.5 bg-primary/60'
                                        : isEvtDone
                                        ? 'w-1.5 bg-emerald-500/50'
                                        : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                }`}
                                title={`${evt.series.title} (${formatTime(new Date(evt.starts_at))})`}
                                aria-label={`Ir para evento ${idx + 1}`}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
}
