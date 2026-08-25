import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppDataContext';
import {
    fetchDayOccurrences,
    fetchSeries,
    fetchRangeOccurrences,
    buildDayOccurrences,
} from '@/lib/occurrences';
import { dateToStr, formatDateLong, formatTime } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import DayTimeline from '@/components/agenda/DayTimeline';
import WeekGrid from '@/components/agenda/WeekGrid';
import MonthGrid from '@/components/agenda/MonthGrid';
import EventModal from '@/components/EventModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import {
    startOfWeek,
    addDays,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Agenda() {
    const { user } = useAuth();
    const { profile, settings } = useAppData();
    const isDesktop = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true;
    const [view, setView] = useState(isDesktop ? 'week' : 'day');
    const [cursor, setCursor] = useState(new Date());
    const [occs, setOccs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [slotPrefill, setSlotPrefill] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const weekStart = useMemo(
        () => startOfWeek(cursor, { weekStartsOn: settings?.first_day_of_week ?? 1 }),
        [cursor, settings?.first_day_of_week]
    );

    const load = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            let start, end;
            if (view === 'month') {
                start = startOfMonth(cursor);
                end = endOfMonth(cursor);
            } else if (view === 'week') {
                start = weekStart;
                end = endOfWeek(cursor, { weekStartsOn: settings?.first_day_of_week ?? 1 });
            } else {
                start = cursor;
                end = cursor;
            }

            const all = await fetchRangeOccurrences(start, end, user.id);
            setOccs(all);
        } catch (e) {
            console.error('Error loading agenda occurrences:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id, view, cursor, weekStart, settings?.first_day_of_week]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (payload, editing) => {
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
        await load();
    };

    const openCreate = () => {
        setEditTarget(null);
        setSlotPrefill(null);
        setModalOpen(true);
    };

    const openEdit = (occ) => {
        setEditTarget(occ);
        setSlotPrefill(null);
        setModalOpen(true);
    };

    const openFromSlot = (occ) => {
        setEditTarget(null);
        setSlotPrefill({
            initialDate: occ.occurrence_date,
            initialStart: formatTime(new Date(occ.starts_at)),
            initialEnd: occ.ends_at ? formatTime(new Date(occ.ends_at)) : undefined,
        });
        setModalOpen(true);
    };

    const dayOccs = occs.filter((o) => o.occurrence_date === dateToStr(cursor));

    const monthCounts = useMemo(() => {
        const m = {};
        occs.forEach((o) => {
            m[o.occurrence_date] = (m[o.occurrence_date] || 0) + 1;
        });
        return m;
    }, [occs]);

    const prevDay = addDays(cursor, -1);
    const nextDay = addDays(cursor, 1);

    return (
        <div className="space-y-4 animate-rise pb-24 md:pb-12">
            <div className="flex items-center justify-between gap-3">
                <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Agenda</h1>
                <Button onClick={openCreate} className="h-10 gap-1.5 rounded-xl shadow-sm">
                    <Plus className="w-4 h-4" /> Novo evento
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Tabs value={view} onValueChange={setView}>
                    <TabsList className="bg-card border border-border p-1 rounded-xl">
                        <TabsTrigger value="day" className="rounded-lg text-xs md:text-sm">Dia</TabsTrigger>
                        <TabsTrigger value="week" className="rounded-lg text-xs md:text-sm">Semana</TabsTrigger>
                        <TabsTrigger value="month" className="rounded-lg text-xs md:text-sm">Mês</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center justify-between sm:justify-end gap-2 bg-card border border-border px-3 py-1.5 rounded-xl">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setCursor(addDays(cursor, view === 'week' ? -7 : view === 'month' ? -30 : -1))}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-center min-w-[140px] text-xs md:text-sm font-medium">
                        {view === 'day' && (
                            <span className="capitalize">{format(cursor, "EEE, d 'de' MMMM", { locale: ptBR })}</span>
                        )}
                        {view === 'week' && (
                            <span>
                                {format(weekStart, 'd')} – {format(endOfWeek(cursor, { weekStartsOn: settings?.first_day_of_week ?? 1 }), "d 'de' MMM", { locale: ptBR })}
                            </span>
                        )}
                        {view === 'month' && (
                            <span className="capitalize">{format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}</span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => setCursor(addDays(cursor, view === 'week' ? 7 : view === 'month' ? 30 : 1))}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-lg ml-1"
                        onClick={() => setCursor(new Date())}
                    >
                        Hoje
                    </Button>
                </div>
            </div>

            {/* Mobile Day Fast Switcher Header */}
            {view === 'day' && (
                <div className="flex md:hidden items-center justify-between text-xs text-muted-foreground px-1">
                    <button
                        onClick={() => setCursor(prevDay)}
                        className="flex items-center gap-1 hover:text-foreground capitalize"
                    >
                        ← {format(prevDay, 'EEE', { locale: ptBR })}
                    </button>
                    <span className="font-semibold text-foreground capitalize">
                        {format(cursor, "EEEE, d", { locale: ptBR })}
                    </span>
                    <button
                        onClick={() => setCursor(nextDay)}
                        className="flex items-center gap-1 hover:text-foreground capitalize"
                    >
                        {format(nextDay, 'EEE', { locale: ptBR })} →
                    </button>
                </div>
            )}

            {loading ? (
                <div className="h-96 rounded-2xl bg-card/60 border border-border animate-pulse" />
            ) : (
                <div className="rounded-2xl bg-card border border-border p-3 md:p-5 shadow-sm">
                    {view === 'day' && (
                        <>
                            <DayTimeline
                                occs={dayOccs}
                                date={cursor}
                                onEdit={openEdit}
                                onCreateSlot={openFromSlot}
                            />
                            {dayOccs.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-12">
                                    Nenhum compromisso marcado para este dia. Toque em "Novo evento" para adicionar.
                                </p>
                            )}
                        </>
                    )}
                    {view === 'week' && (
                        <WeekGrid
                            occs={occs}
                            weekStart={weekStart}
                            onEdit={openEdit}
                            onCreateSlot={openFromSlot}
                        />
                    )}
                    {view === 'month' && (
                        <MonthGrid
                            date={cursor}
                            occsByDate={monthCounts}
                            onSelectDay={(d) => {
                                setCursor(d);
                                setView('day');
                            }}
                        />
                    )}
                </div>
            )}

            {/* Mobile floating button */}
            <button
                onClick={openCreate}
                className="md:hidden fixed right-5 bottom-20 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Novo evento"
            >
                <Plus className="w-6 h-6" />
            </button>

            <EventModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSlotPrefill(null);
                }}
                onSave={handleSave}
                editing={editTarget?.series}
                initialDate={slotPrefill?.initialDate}
                initialStart={slotPrefill?.initialStart}
                initialEnd={slotPrefill?.initialEnd}
                onDelete={(occ) => setDeleteTarget(occ)}
            />

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