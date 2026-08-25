import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppDataContext';
import { fetchDayOccurrences } from '@/lib/occurrences';
import { completeOccurrence } from '@/lib/gamification';
import { formatTime, minutesToLabel } from '@/lib/datetime';
import { formatRemainingTimer } from '@/lib/focusHelper';
import { playChime } from '@/lib/sound';
import {
    Moon,
    Sparkles,
    Check,
    X,
    ExternalLink,
    Minimize2,
    Maximize2,
    Clock,
    ChevronDown,
    ChevronUp,
    WifiOff,
    ArrowRight,
    Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppIcon from '@/components/AppIcon';

export default function Focus() {
    const { occurrenceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, settings, reload } = useAppData();

    const [occs, setOccs] = useState([]);
    const [selectedOccId, setSelectedOccId] = useState(occurrenceId || null);
    const [loading, setLoading] = useState(true);
    const [isCompact, setIsCompact] = useState(false);
    const [showMultiSwitch, setShowMultiSwitch] = useState(false);
    const [nowTime, setNowTime] = useState(Date.now());
    const [completionReward, setCompletionReward] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const prevEndedRef = useRef(false);
    const lastAnnouncedRef = useRef('');

    // Online/offline tracking
    useEffect(() => {
        const onOnline = () => setIsOffline(false);
        const onOffline = () => setIsOffline(true);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    // Load occurrences from Supabase
    const load = useCallback(async () => {
        if (!user?.id) return;
        try {
            const today = new Date();
            const list = await fetchDayOccurrences(today, user.id);
            setOccs(list);
        } catch (e) {
            console.error('Error loading occurrences in Focus mode:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    // Resilient foreground recovery: recalculate immediately on tab focus / wake up
    useEffect(() => {
        const handleWakeup = () => {
            setNowTime(Date.now());
            load();
        };

        document.addEventListener('visibilitychange', handleWakeup);
        window.addEventListener('focus', handleWakeup);
        window.addEventListener('pageshow', handleWakeup);

        return () => {
            document.removeEventListener('visibilitychange', handleWakeup);
            window.removeEventListener('focus', handleWakeup);
            window.removeEventListener('pageshow', handleWakeup);
        };
    }, [load]);

    // Ticker: updates nowTime every second while page is open
    useEffect(() => {
        const interval = setInterval(() => {
            setNowTime(Date.now());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Filter active and upcoming events based on true time
    const activeEvents = occs.filter(
        (o) =>
            o.series.event_type !== 'free_slot' &&
            o.status === 'scheduled' &&
            o.ends_at &&
            new Date(o.starts_at).getTime() <= nowTime &&
            new Date(o.ends_at).getTime() > nowTime
    );

    // If a specific occurrenceId was requested or selected, use it; otherwise pick the first active
    let current = null;
    if (selectedOccId) {
        current = occs.find((o) => o.id === selectedOccId || o.event_series_id === selectedOccId);
    }
    if (!current || current.status !== 'scheduled' || (current.ends_at && new Date(current.ends_at).getTime() <= nowTime)) {
        current = activeEvents[0] || null;
    }

    const next = occs.find(
        (o) =>
            o.series.event_type !== 'free_slot' &&
            o.status === 'scheduled' &&
            new Date(o.starts_at).getTime() > nowTime
    );

    // Compute remaining time against DB ends_at
    const endsAtTime = current?.ends_at ? new Date(current.ends_at).getTime() : null;
    const startsAtTime = current?.starts_at ? new Date(current.starts_at).getTime() : null;
    const remainingMs = endsAtTime ? Math.max(0, endsAtTime - nowTime) : 0;
    const isEnded = endsAtTime ? remainingMs === 0 : false;

    // Trigger gentle chime once when event time finishes (00:00)
    useEffect(() => {
        if (isEnded && !prevEndedRef.current && current) {
            prevEndedRef.current = true;
            if (settings?.sounds_enabled) {
                const vol = (settings.app_volume || 70) / 100;
                playChime(vol);
            }
        }
        if (!isEnded) {
            prevEndedRef.current = false;
        }
    }, [isEnded, current, settings?.sounds_enabled, settings?.app_volume]);

    // Calculate progress percentage
    let progress = 0;
    if (startsAtTime && endsAtTime && endsAtTime > startsAtTime) {
        const total = endsAtTime - startsAtTime;
        const elapsed = nowTime - startsAtTime;
        progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    }

    // Handle "✓ Concluir"
    const handleComplete = async () => {
        if (!current || !user?.id || !profile) return;
        try {
            const res = await completeOccurrence(current.series, current, profile, user.id);
            if (!res.alreadyDone) {
                if (settings?.sounds_enabled) {
                    const vol = (settings.app_volume || 70) / 100;
                    playChime(vol);
                }
                setCompletionReward(res.pointsGained);
                await reload();
                await load();
                setTimeout(() => {
                    setCompletionReward(null);
                }, 2000);
            }
        } catch (e) {
            console.error('Error completing event in Focus mode:', e);
        }
    };

    // Close window / navigate back
    const handleClose = () => {
        if (window.opener && !window.opener.closed) {
            window.close();
        } else {
            navigate('/');
        }
    };

    // Focus / open main agenda
    const handleOpenMain = () => {
        if (window.opener && !window.opener.closed) {
            window.opener.focus();
        } else {
            window.open('/', '_blank');
        }
    };

    // Milestone announcement for screen readers
    const minutesLeft = Math.ceil(remainingMs / 60000);
    let announcement = '';
    if (isEnded) {
        announcement = 'Tempo do evento encerrado.';
    } else if (minutesLeft === 5 && lastAnnouncedRef.current !== '5min') {
        announcement = 'Faltam 5 minutos.';
        lastAnnouncedRef.current = '5min';
    }

    // ULTRA COMPACT / PILL MODE
    if (isCompact) {
        return (
            <div className="h-screen w-screen bg-card text-foreground flex items-center justify-between px-4 py-2 border-b border-border select-none animate-fade">
                <div className="flex items-center gap-2 min-w-0">
                    <Moon className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                    <span className="font-semibold text-xs truncate">
                        {current ? current.series.title : 'Tempo livre'}
                    </span>
                    <span className="font-heading text-sm font-bold text-primary shrink-0 tabular-nums">
                        {current ? formatRemainingTimer(remainingMs) : '--:--'}
                    </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {current && !isEnded && (
                        <button
                            onClick={handleComplete}
                            className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Concluir"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => setIsCompact(false)}
                        className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                        title="Expandir Modo Foco"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-1 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        title="Fechar"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6 safe-top safe-bottom select-none animate-fade">
            {/* Screen reader live updates */}
            <div aria-live="polite" className="sr-only">
                {announcement}
            </div>

            {/* Header controls */}
            <header className="flex items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Moon className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="font-heading text-sm font-bold tracking-tight block leading-tight">
                            Modo Foco
                        </span>
                        {isOffline && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                <WifiOff className="w-3 h-3 text-amber-500" /> Offline (timer ativo)
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={handleOpenMain}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                        title="Abrir agenda principal"
                        aria-label="Abrir agenda principal"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsCompact(true)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
                        title="Modo compacto"
                        aria-label="Modo compacto"
                    >
                        <Minimize2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleClose}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                        title="Fechar Modo Foco"
                        aria-label="Fechar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col items-center justify-center text-center my-auto py-4">
                {completionReward !== null ? (
                    <div className="space-y-3 animate-fade py-8">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto shadow-inner">
                            <Sparkles className="w-9 h-9 animate-spin-slow" />
                        </div>
                        <h2 className="font-heading text-2xl font-bold text-primary">
                            +{completionReward} pontos! ✨
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Atividade concluída com sucesso.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="space-y-3 py-12 animate-pulse">
                        <Moon className="w-10 h-10 text-primary mx-auto opacity-50" />
                        <div className="w-48 h-6 bg-secondary rounded-lg mx-auto" />
                        <div className="w-32 h-12 bg-secondary rounded-xl mx-auto mt-4" />
                    </div>
                ) : current ? (
                    <div className="w-full max-w-sm space-y-4">
                        {/* Multiple Simultaneous Events Indicator */}
                        {activeEvents.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowMultiSwitch((prev) => !prev)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <span>+{activeEvents.length - 1} atividade(s) acontecendo</span>
                                    {showMultiSwitch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                {showMultiSwitch && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-card border border-border rounded-2xl p-2 shadow-xl z-20 space-y-1 animate-fade text-left">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                                            Escolher foco atual:
                                        </div>
                                        {activeEvents.map((evt) => (
                                            <button
                                                key={evt.id}
                                                onClick={() => {
                                                    setSelectedOccId(evt.id);
                                                    setShowMultiSwitch(false);
                                                }}
                                                className={`w-full px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                                                    evt.id === current.id
                                                        ? 'bg-primary text-primary-foreground font-semibold'
                                                        : 'hover:bg-secondary text-foreground'
                                                }`}
                                            >
                                                <span className="truncate">{evt.series.title}</span>
                                                <span className="text-[10px] opacity-75 shrink-0 ml-2">
                                                    {formatTime(new Date(evt.starts_at))}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Title & Category */}
                        <div className="space-y-1">
                            <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground line-clamp-2 px-2">
                                {current.series.title}
                            </h2>
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <span>
                                    {formatTime(new Date(current.starts_at))} → {current.ends_at ? formatTime(new Date(current.ends_at)) : ''}
                                </span>
                                {current.ends_at && (
                                    <>
                                        <span>·</span>
                                        <span>{minutesToLabel(Math.round((endsAtTime - startsAtTime) / 60000))}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Large Relaxing Timer */}
                        <div className="py-3">
                            <div
                                className={`font-heading text-5xl sm:text-6xl font-bold tracking-tight tabular-nums transition-colors ${
                                    isEnded
                                        ? 'text-amber-500'
                                        : minutesLeft <= 5
                                        ? 'text-primary/90'
                                        : 'text-primary'
                                }`}
                            >
                                {formatRemainingTimer(remainingMs)}
                            </div>
                            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-1">
                                {isEnded ? 'Tempo encerrado' : 'restantes'}
                            </div>
                        </div>

                        {/* Subtle Progress Bar */}
                        <div className="space-y-1.5 px-4 sm:px-8">
                            <div className="h-2 rounded-full bg-secondary/80 overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Completion Button */}
                        <div className="pt-2">
                            <Button
                                onClick={handleComplete}
                                className="h-12 px-8 rounded-2xl font-semibold shadow-md gap-2 w-full max-w-xs transition-all active:scale-95"
                            >
                                <Check className="w-5 h-5" /> Concluir
                            </Button>
                        </div>
                    </div>
                ) : (
                    /* Free Time / No Event Active */
                    <div className="w-full max-w-sm space-y-4 py-6">
                        <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center text-primary mx-auto shadow-inner">
                            <Moon className="w-8 h-8 opacity-80" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                                Tempo livre
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Nenhum compromisso em andamento agora. Aproveite para relaxar e respirar.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {/* Next upcoming event footer */}
            <footer className="pt-3 border-t border-border/60">
                {next ? (
                    <div className="rounded-2xl bg-card/60 border border-border p-3 flex items-center justify-between gap-3 shadow-sm">
                        <div className="min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                Depois
                            </div>
                            <div className="font-medium text-xs sm:text-sm text-foreground truncate mt-0.5">
                                {next.series.title}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-xl bg-primary/10">
                                às {formatTime(new Date(next.starts_at))}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-[11px] text-muted-foreground py-1">
                        Sua agenda do dia está totalmente concluída. ✨
                    </div>
                )}
            </footer>
        </div>
    );
}
