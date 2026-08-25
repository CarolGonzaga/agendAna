import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppDataContext';
import { fetchDayOccurrences } from '@/lib/occurrences';
import { completeOccurrence, processMissed } from '@/lib/gamification';
import { greeting, formatDateLong, formatTime, minutesToLabel, durationMinutes } from '@/lib/datetime';
import { categoryColor } from '@/lib/categories';
import { playChime } from '@/lib/sound';
import { supabase } from '@/lib/supabase';
import { Check, ChevronDown, ChevronUp, Plus, Award, Moon, Clock, Flame } from 'lucide-react';
import EventCard from '@/components/EventCard';
import StarBurst from '@/components/StarBurst';
import LevelUpModal from '@/components/LevelUpModal';
import EventModal from '@/components/EventModal';
import Onboarding from '@/components/Onboarding';
import InstallHint from '@/components/InstallHint';
import AppIcon from '@/components/AppIcon';
import { Link, useNavigate } from 'react-router-dom';
import { openFocusMode } from '@/lib/focusHelper';

export default function Home() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, settings, reload, updateProfile } = useAppData();
    const [occs, setOccs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [burst, setBurst] = useState(null);
    const [levelUp, setLevelUp] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const processedRef = useRef(false);

    const load = useCallback(async () => {
        if (!user?.id) return [];
        const today = new Date();
        const list = await fetchDayOccurrences(today, user.id);
        setOccs(list);
        return list;
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            setLoading(true);
            const list = await load();

            // Process missed events once per load
            if (!processedRef.current && profile && settings) {
                processedRef.current = true;
                const now = Date.now();
                const missed = list.filter(
                    (o) =>
                        o.series.event_type === 'event' &&
                        o.status === 'scheduled' &&
                        o.ends_at &&
                        new Date(o.ends_at).getTime() < now
                );
                for (const o of missed) {
                    await processMissed(o, o.series, profile, settings.allow_negative_points, user.id);
                }
                if (missed.length) {
                    await reload();
                    await load();
                }
            }
            setLoading(false);
        })();
    }, [user?.id, profile?.id, load, reload, settings]);

    const now = new Date();
    const nowTime = now.getTime();

    const current = occs.find(
        (o) =>
            o.series.event_type !== 'free_slot' &&
            o.status === 'scheduled' &&
            o.ends_at &&
            new Date(o.starts_at).getTime() <= nowTime &&
            new Date(o.ends_at).getTime() > nowTime
    );

    const next = occs.find(
        (o) =>
            o.series.event_type !== 'free_slot' &&
            o.status === 'scheduled' &&
            new Date(o.starts_at).getTime() > nowTime
    );

    const eventCount = occs.filter((o) => o.series.event_type === 'event').length;
    const doneCount = occs.filter((o) => o.series.event_type === 'event' && o.status === 'completed').length;
    const progress = eventCount ? Math.round((doneCount / eventCount) * 100) : 0;
    const pointsToday = occs
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + (o.series.points || 0), 0);

    const handleComplete = async (occ) => {
        if (!user?.id || !profile) return;
        const res = await completeOccurrence(occ.series, occ, profile, user.id);
        if (res.alreadyDone) return;

        if (settings?.sounds_enabled) {
            const vol = (settings.app_volume || 70) / 100;
            playChime(vol);
        }

        await reload();
        await load();

        setBurst(res.pointsGained);
        if (res.leveledUp) {
            setTimeout(() => setLevelUp(res.newLevel), 1200);
        }
    };

    const handleSaveEvent = async (payload, editing) => {
        if (!user?.id) return;
        if (editing?.id) {
            const { error } = await supabase
                .from('event_series')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', editing.id)
                .eq('user_id', user.id);
            if (error) console.error('Error updating event:', error);
        } else {
            const { error } = await supabase
                .from('event_series')
                .insert({ ...payload, user_id: user.id });
            if (error) console.error('Error creating event:', error);
        }
        await load();
    };

    const remaining = current && current.ends_at
        ? Math.max(0, Math.round((new Date(current.ends_at).getTime() - nowTime) / 60000))
        : 0;

    return (
        <div className="space-y-6 animate-rise pb-24 md:pb-12">
            {profile && !profile.onboarded && (
                <Onboarding onFinish={() => updateProfile({ onboarded: true })} />
            )}

            <InstallHint />

            {burst !== null && <StarBurst points={burst} onDone={() => setBurst(null)} />}
            {levelUp && <LevelUpModal level={levelUp} onDone={() => setLevelUp(null)} />}

            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
                        <span>{greeting()}{profile?.display_name ? `, ${profile.display_name}` : ''}</span>
                        <AppIcon name={profile?.avatar_emoji} className="w-6 h-6 text-primary inline" defaultIcon={Moon} />
                    </h1>
                    <p className="text-muted-foreground mt-1 capitalize text-sm md:text-base">
                        {formatDateLong(now)}
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Novo evento
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="space-y-4">
                    <div className="h-36 rounded-2xl bg-card/60 border border-border/50 animate-pulse" />
                    <div className="h-24 rounded-2xl bg-card/60 border border-border/50 animate-pulse" />
                    <div className="h-24 rounded-2xl bg-card/60 border border-border/50 animate-pulse" />
                </div>
            ) : (
                <>
                    {/* Agora */}
                    {current ? (
                        <section className="rounded-2xl bg-card border border-primary/20 p-5 shadow-sm relative overflow-hidden animate-fade">
                            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" />
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Agora</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                    +{current.series.points || 10} pts
                                </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="font-heading text-xl md:text-2xl font-semibold truncate">
                                        {current.series.title}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                        <span>{formatTime(new Date(current.starts_at))} — {current.ends_at ? formatTime(new Date(current.ends_at)) : ''}</span>
                                        {current.ends_at && (
                                            <>
                                                <span>·</span>
                                                <span>{minutesToLabel(durationMinutes(current.starts_at, current.ends_at))}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium text-primary mt-1.5 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{remaining} min restantes</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openFocusMode(navigate, current.id)}
                                        className="inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-xl border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 text-xs font-semibold active:scale-95 transition-all shadow-sm"
                                        title="Abrir janela compacta do Modo Foco"
                                    >
                                        <Clock className="w-4 h-4" /> Abrir Modo Foco
                                    </button>
                                    <button
                                        onClick={() => handleComplete(current)}
                                        className="shrink-0 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                    >
                                        <Check className="w-5 h-5" /> Concluir
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="rounded-2xl bg-card border border-border p-6 text-center space-y-3">
                            <Moon className="w-8 h-8 text-primary mx-auto opacity-80" />
                            <p className="text-muted-foreground text-sm md:text-base">
                                {next
                                    ? `Seu próximo compromisso começa às ${formatTime(new Date(next.starts_at))}.`
                                    : 'Nenhum compromisso agora. Um tempo livre para você relaxar.'}
                            </p>
                            <button
                                onClick={() => openFocusMode(navigate)}
                                className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                            >
                                <Clock className="w-3.5 h-3.5" /> Abrir Modo Foco
                            </button>
                        </section>
                    )}

                    {/* Depois */}
                    {next && (
                        <section className="rounded-2xl bg-card border border-border p-5">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-medium">Depois</div>
                            <div className="flex items-center gap-3.5">
                                <div
                                    className="w-1.5 h-10 rounded-full shrink-0"
                                    style={{ background: categoryColor(next.series.category) }}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-base truncate">{next.series.title}</div>
                                    <div className="text-sm text-muted-foreground mt-0.5">
                                        {formatTime(new Date(next.starts_at))} — {next.ends_at ? formatTime(new Date(next.ends_at)) : ''}
                                    </div>
                                </div>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground shrink-0">
                                    {next.series.category || 'Trabalho'}
                                </span>
                            </div>
                        </section>
                    )}

                    {/* Progresso do dia */}
                    <section className="rounded-2xl bg-card border border-border p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Seu dia</div>
                            <div className="text-sm font-medium text-primary">{progress}%</div>
                        </div>
                        <div className="h-3 rounded-full bg-secondary overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm text-muted-foreground pt-1">
                            <span>{doneCount} de {eventCount} atividades concluídas</span>
                            <span className="text-primary font-medium flex items-center gap-1">
                                <Award className="w-3.5 h-3.5" /> +{pointsToday} pontos hoje
                            </span>
                        </div>
                    </section>

                    {/* Ver todo o dia */}
                    <div className="pt-2">
                        <button
                            onClick={() => setExpanded((e) => !e)}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {expanded ? 'Ocultar visão detalhada' : 'Ver todo o dia'}
                        </button>
                        {expanded && (
                            <div className="space-y-2.5 mt-3 animate-fade">
                                {occs.length === 0 && (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        Nada planejado para hoje. <Link to="/agenda" className="text-primary underline font-medium">Abrir agenda completa</Link>
                                    </p>
                                )}
                                {occs.map((o, i) => (
                                    <EventCard
                                        key={o.id || i}
                                        occ={o}
                                        onComplete={handleComplete}
                                        onEdit={(target) => setEditTarget(target)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mobile FAB */}
                    <button
                        onClick={() => setModalOpen(true)}
                        className="fixed md:hidden right-5 bottom-20 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="Novo evento"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </>
            )}

            <EventModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveEvent}
            />
            <EventModal
                open={!!editTarget}
                editing={editTarget?.series}
                onClose={() => setEditTarget(null)}
                onSave={handleSaveEvent}
            />
        </div>
    );
}