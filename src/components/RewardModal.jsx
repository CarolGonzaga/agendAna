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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AVAILABLE_REWARD_ICONS } from '@/components/AppIcon';

export default function RewardModal({ open, onClose, onSave, editing }) {
    const [title, setTitle] = useState('');
    const [emoji, setEmoji] = useState('film');
    const [description, setDescription] = useState('');
    const [cost, setCost] = useState(50);
    const [duration, setDuration] = useState(30);
    const [active, setActive] = useState(true);

    useEffect(() => {
        if (editing) {
            setTitle(editing.title || '');
            setEmoji(editing.emoji || 'film');
            setDescription(editing.description || '');
            setCost(editing.cost ?? 50);
            setDuration(editing.duration_minutes ?? 30);
            setActive(editing.active !== false);
        } else if (open) {
            setTitle('');
            setEmoji('film');
            setDescription('');
            setCost(50);
            setDuration(30);
            setActive(true);
        }
    }, [editing, open]);

    const save = () => {
        onSave(
            {
                title: title.trim(),
                emoji,
                description: description.trim(),
                cost: Number(cost) || 0,
                duration_minutes: Number(duration) || 30,
                active,
            },
            editing
        );
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="font-heading text-xl">
                        {editing ? 'Editar recompensa' : 'Nova recompensa'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Ícone da Recompensa</Label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {AVAILABLE_REWARD_ICONS.map((item) => {
                                const IconComponent = item.icon;
                                const isSelected = emoji === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setEmoji(item.id)}
                                        className={`h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground shadow-sm scale-105 ring-2 ring-primary/40'
                                                : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted'
                                        }`}
                                        title={item.label}
                                    >
                                        <IconComponent className="w-5 h-5" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label>Nome</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Filme, leitura sem culpa, café especial..."
                            autoFocus
                            className="h-10 rounded-xl"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Descrição</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Como você vai aproveitar?"
                            className="rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Custo (pontos)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="h-10 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Duração (minutos)</Label>
                            <Input
                                type="number"
                                min="5"
                                step="5"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="h-10 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <Label className="cursor-pointer">Recompensa ativa no catálogo</Label>
                        <Switch checked={active} onCheckedChange={setActive} />
                    </div>
                </div>

                <DialogFooter className="gap-2 pt-2 border-t border-border/60">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl h-9">
                        Cancelar
                    </Button>
                    <Button
                        onClick={save}
                        disabled={!title.trim()}
                        className="rounded-xl h-9 px-5 font-semibold"
                    >
                        Salvar recompensa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}