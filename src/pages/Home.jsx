import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppDataContext';
import { fetchDayOccurrences } from '@/lib/occurrences';
import { completeOccurrence, updateOccurrenceStatus } from '@/lib/gamification';
import { greeting, formatDateLong, formatTime, minutesToLabel, durationMinutes } from '@/lib/datetime';
import { playChime } from '@/lib/sound';
import { supabase } from '@/lib/supabase';
import { Check, ChevronDown, ChevronUp, Plus, Award, Moon, Clock } from 'lucide-react';
import EventCard from '@/components/EventCard';
import EventCarousel from '@/components/EventCarousel';
import StarBurst from '@/components/StarBurst';
import LevelUpModal from '@/components/LevelUpModal';
import EventModal from '@/components/EventModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import Onboarding from '@/components/Onboarding';
import InstallHint from '@/components/InstallHint';
import AppIcon from '@/components/AppIcon';
import { Link, useNavigate } from 'react-router-dom';
import { openFocusMode } from '@/lib/focusHelper';
import { toast } from 'sonner';

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
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [nowTime, setNowTime] = useState(Date.now());

    // Ticker to refresh relative time
    useEffect(() => {
        const interval = setInterval(() => setNowTime(Date.now()), 10000);
        return () => clearInterval(interval);
    }, []);

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
            await load();
            setLoading(false);
        })();
    }, [user?.id, profile?.id, load]);

    const now = new Date();

    const actionableEvents = occs.filter((o) => o.series.event_type !== 'free_slot');
    const eventCount = actionableEvents.length;
    const doneCount = actionableEvents.filter((o) => o.status === 'completed').length;
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

    const handleStatusChange = async (series, occ, newStatus) => {
        if (!user?.id || !profile) return;
        const res = await updateOccurrenceStatus(series, occ, newStatus, profile, user.id);
        
        if (newStatus === 'completed' && res?.pointsGained) {
            if (settings?.sounds_enabled) {
                const vol = (settings.app_volume || 70) / 100;
                playChime(vol);
            }
            setBurst(res.pointsGained);
            if (res.leveledUp) {
                setTimeout(() => setLevelUp(res.newLevel), 1200);
            }
        }

        await reload();
        await load();
    };

    const handleDelete = async (deleteEntireSeries = true) => {
        if (!deleteTarget || !user?.id) return;
        if (deleteEntireSeries || !deleteTarget.series.is_recurring) {
            await supabase
                .from('event_series')
                .update({ active: false, updated_at: new Date().toISOString() })
                .eq('id', deleteTarget.series.id)
                .eq('user_id', user.id);
        } else {
            // Cancel just this occurrence
            await supabase.from('event_occurrences').upsert(
                {
                    user_id: user.id,
                    event_series_id: deleteTarget.series.id,
                    occurrence_date: deleteTarget.occurrence_date,
                    starts_at: deleteTarget.starts_at,
                    ends_at: deleteTarget.ends_at,
                    status: 'cancelled',
                },
                { onConflict: 'event_series_id,occurrence_date' }
            );
        }
        setDeleteTarget(null);
        toast.success('Evento excluído.');
        await load();
    };

    const handleSaveEvent = async (payload, editing, targetUserIds = [user.id]) => {
        if (!user?.id) return;
        const isShared = targetUserIds && targetUserIds.length > 1;
        if (editing?.id) {
            const { error } = await supabase
                .from('event_series')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', editing.id);
            if (error) console.error('Error updating event:', error);
        } else {
            const rows = (targetUserIds && targetUserIds.length ? targetUserIds : [user.id]).map((uid) => ({
                ...payload,
                user_id: uid,
                is_shared: isShared,
                target_user_ids: targetUserIds,
            }));
            let { error } = await supabase
                .from('event_series')
                .insert(rows);
            if (error && (error.message?.includes('is_shared') || error.message?.includes('target_user_ids'))) {
                const fallbackRows = rows.map(({ is_shared, target_user_ids, ...rest }) => ({
                    ...rest,
                    description: isShared ? (rest.description ? `${rest.description} [shared]` : '[shared]') : rest.description,
                }));
                const res = await supabase.from('event_series').insert(fallbackRows);
                error = res.error;
            }
            if (error) console.error('Error creating event:', error);
        }
        await load();
    };

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
                    <div className="h-44 rounded-2xl bg-card/60 border border-border/50 animate-pulse" />
                    <div className="h-24 rounded-2xl bg-card/60 border border-border/50 animate-pulse" />
                    <div className="h-24 rounded-2xl bg-card/60 border border-border/50 animate-pulse" />
                </div>
            ) : (
                <>
                    {/* Event Carousel Section */}
                    {actionableEvents.length > 0 ? (
                        <EventCarousel
                            events={occs}
                            nowTime={nowTime}
                            onComplete={handleComplete}
                            onEdit={(target) => setEditTarget(target)}
                            onOpenFocus={(occId) => openFocusMode(navigate, occId)}
                        />
                    ) : (
                        <section className="rounded-2xl bg-card border border-border p-6 text-center space-y-3 shadow-sm">
                            <Moon className="w-8 h-8 text-primary mx-auto opacity-80" />
                            <p className="text-muted-foreground text-sm md:text-base">
                                Nenhum compromisso agendado para hoje. Aproveite o seu tempo livre!
                            </p>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                            >
                                <Plus className="w-3.5 h-3.5" /> Adicionar primeiro compromisso
                            </button>
                        </section>
                    )}

                    {/* Progress Bar of the Day */}
                    <section className="rounded-2xl bg-card border border-border p-5 space-y-3 shadow-sm">
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

                    {/* Full Timeline List Accordion */}
                    <div className="pt-2">
                        <button
                            onClick={() => setExpanded((e) => !e)}
                            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {expanded ? 'Ocultar visão detalhada' : 'Ver todos os compromissos do dia'}
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

            {/* Create Event Modal */}
            <EventModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveEvent}
            />

            {/* Edit Event Modal */}
            <EventModal
                open={!!editTarget}
                editing={editTarget?.series}
                occurrence={editTarget}
                onClose={() => setEditTarget(null)}
                onSave={handleSaveEvent}
                onDelete={(target) => setDeleteTarget(target)}
                onStatusChange={handleStatusChange}
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Excluir evento"
                description={
                    deleteTarget?.series?.is_recurring
                        ? "Deseja excluir apenas esta ocorrência ou toda a série recorrente?"
                        : "O evento será removido da sua agenda. Tem certeza?"
                }
                confirmLabel={deleteTarget?.series?.is_recurring ? "Excluir toda a série" : "Excluir"}
                secondaryLabel={deleteTarget?.series?.is_recurring ? "Somente este evento" : null}
                onSecondary={() => handleDelete(false)}
                destructive
                onConfirm={() => handleDelete(true)}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}