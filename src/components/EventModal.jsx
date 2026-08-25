import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CATEGORIES } from '@/lib/categories';
import { useAppData } from '@/lib/AppDataContext';
import { useAuth } from '@/lib/AuthContext';
import { fetchDayOccurrences, overlaps } from '@/lib/occurrences';
import { dateToStr, formatTime } from '@/lib/datetime';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Trash2 } from 'lucide-react';

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export default function EventModal({
    open,
    onClose,
    onSave,
    editing,
    initialDate,
    initialStart,
    initialEnd,
    onDelete,
}) {
    const { settings } = useAppData();
    const { user } = useAuth();
    const today = dateToStr(new Date());
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(initialDate || today);
    const [startTime, setStartTime] = useState(initialStart || '09:00');
    const [endTime, setEndTime] = useState(initialEnd || '10:00');
    const [allDay, setAllDay] = useState(false);
    const [points, setPoints] = useState(settings?.default_event_points ?? 10);
    const [category, setCategory] = useState('Trabalho');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recType, setRecType] = useState('weekly');
    const [recDays, setRecDays] = useState([1, 2, 3, 4, 5]);
    const [conflict, setConflict] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editing) {
            setTitle(editing.title || '');
            setDate(editing.start_date || today);
            setStartTime(editing.start_time || '09:00');
            setEndTime(editing.end_time || '10:00');
            setAllDay(!!editing.all_day);
            setPoints(editing.points ?? settings?.default_event_points ?? 10);
            setCategory(editing.category || 'Trabalho');
            setIsRecurring(!!editing.is_recurring);
            setRecType(editing.recurrence_type || 'weekly');
            setRecDays(editing.recurrence_days || [1, 2, 3, 4, 5]);
        } else if (open) {
            setTitle('');
            setDate(initialDate || today);
            setStartTime(initialStart || '09:00');
            setEndTime(initialEnd || '10:00');
            setAllDay(false);
            setPoints(settings?.default_event_points ?? 10);
            setCategory('Trabalho');
            setIsRecurring(false);
            setRecType('weekly');
            setRecDays([1, 2, 3, 4, 5]);
        }
        setConflict(null);
    }, [editing, open, initialDate, initialStart, initialEnd, settings?.default_event_points]);

    const toggleDay = (d) => {
        setRecDays((prev) =>
            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
        );
    };

    const buildPayload = () => ({
        title: title.trim(),
        description: '',
        category,
        start_date: date,
        start_time: allDay ? '00:00' : startTime,
        end_time: allDay ? '23:59' : endTime,
        all_day: allDay,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recType : 'none',
        recurrence_days:
            recType === 'weekly'
                ? recDays
                : recType === 'weekdays'
                ? [1, 2, 3, 4, 5]
                : [],
        points: Number(points) || 0,
        event_type: 'event',
        active: true,
    });

    const checkConflict = async () => {
        if (allDay || !user?.id) return null;
        const dayOccs = await fetchDayOccurrences(new Date(date + 'T00:00:00'), user.id);
        const startIso = new Date(`${date}T${startTime}:00`).toISOString();
        const endIso = new Date(`${date}T${endTime}:00`).toISOString();
        const cl = dayOccs.find(
            (o) =>
                o.series.id !== editing?.id &&
                o.series.event_type === 'event' &&
                o.status !== 'cancelled' &&
                overlaps(startIso, endIso, o.starts_at, o.ends_at)
        );
        return cl || null;
    };

    const handleSave = async (force = false) => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            const payload = buildPayload();
            if (!force && !allDay) {
                const cl = await checkConflict();
                if (cl) {
                    setConflict({ occ: cl });
                    setSaving(false);
                    return;
                }
            }
            await onSave(payload, editing);
            onClose();
        } catch (e) {
            console.error('Error saving event:', e);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="font-heading text-xl">
                            {editing ? 'Editar evento' : 'Novo evento'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="title">Título do compromisso</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="O que você precisa fazer?"
                                autoFocus
                                className="h-11 rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Data</Label>
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>
                            <div className="space-y-1.5 flex items-end pb-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                    <Checkbox
                                        checked={allDay}
                                        onCheckedChange={(v) => setAllDay(!!v)}
                                    />
                                    Dia inteiro
                                </label>
                            </div>
                        </div>

                        {!allDay && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Horário Inicial</Label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Horário Final</Label>
                                    <Input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Categoria</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Pontos ao Concluir</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={points}
                                    onChange={(e) => setPoints(e.target.value)}
                                    className="h-10 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Repetição */}
                        <div className="rounded-xl border border-border p-3.5 space-y-3 bg-secondary/30">
                            <div className="flex items-center justify-between">
                                <Label className="cursor-pointer">Repetir compromisso</Label>
                                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
                            </div>
                            {isRecurring && (
                                <div className="space-y-2.5 pt-1 animate-fade">
                                    <Select value={recType} onValueChange={setRecType}>
                                        <SelectTrigger className="h-9 rounded-lg bg-card">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Todos os dias</SelectItem>
                                            <SelectItem value="weekdays">Dias úteis (Seg a Sex)</SelectItem>
                                            <SelectItem value="weekly">Semanal (dias específicos)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {recType === 'weekly' && (
                                        <div className="flex gap-1.5 flex-wrap pt-1">
                                            {WEEKDAYS.map((d, i) => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => toggleDay(i)}
                                                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                                                        recDays.includes(i)
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-card text-muted-foreground hover:bg-muted border border-border/60'
                                                    }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-row items-center justify-between gap-2 pt-2 border-t border-border/60">
                        {editing && onDelete ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    onClose();
                                    onDelete({ series: editing, occurrence_date: date });
                                }}
                                className="text-destructive hover:bg-destructive/10 text-xs px-2.5 h-9"
                            >
                                <Trash2 className="w-4 h-4 mr-1" /> Excluir
                            </Button>
                        ) : (
                            <div />
                        )}
                        <div className="flex gap-2">
                            <Button variant="ghost" className="rounded-xl h-9 text-xs" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handleSave(false)}
                                disabled={saving || !title.trim()}
                                className="rounded-xl h-9 px-4 text-xs font-semibold"
                            >
                                {saving ? 'Salvando...' : 'Salvar evento'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Conflito de Sobreposição */}
            <ConfirmDialog
                open={!!conflict}
                title="Já existe outro evento nesse horário."
                description={
                    conflict
                        ? `${conflict.occ.series.title} (${formatTime(new Date(conflict.occ.starts_at))} — ${
                              conflict.occ.ends_at ? formatTime(new Date(conflict.occ.ends_at)) : ''
                          }). Deseja adicionar mesmo assim?`
                        : ''
                }
                confirmLabel="Adicionar mesmo assim"
                onConfirm={() => handleSave(true)}
                onCancel={() => setConflict(null)}
            />
        </>
    );
}