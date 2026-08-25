import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useAppData } from '@/lib/AppDataContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Plus, Gift, Award, Clock, Calendar, Check, Moon } from 'lucide-react';
import RewardModal from '@/components/RewardModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AppIcon from '@/components/AppIcon';
import { redeemReward, scheduleRewardRedemption } from '@/lib/gamification';
import { fetchDayOccurrences, findFreeSlots } from '@/lib/occurrences';
import { dateToStr, formatTime, addDaysStr, minutesToLabel } from '@/lib/datetime';
import { toast } from 'sonner';

export default function Rewards() {
    const { user } = useAuth();
    const { profile, settings, reload } = useAppData();
    const [rewards, setRewards] = useState([]);
    const [redemptions, setRedemptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [redeemTarget, setRedeemTarget] = useState(null);
    const [scheduleTarget, setScheduleTarget] = useState(null);
    const [freeSlots, setFreeSlots] = useState([]);
    const [slotDay, setSlotDay] = useState(dateToStr(new Date()));

    const load = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const [rewardsRes, redemptionsRes] = await Promise.all([
                supabase
                    .from('rewards')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('active', true)
                    .order('cost', { ascending: true }),
                supabase
                    .from('reward_redemptions')
                    .select('*, rewards(*)')
                    .eq('user_id', user.id)
                    .order('redeemed_at', { ascending: false })
                    .limit(50),
            ]);

            setRewards(rewardsRes.data || []);
            setRedemptions(redemptionsRes.data || []);
        } catch (err) {
            console.error('Error loading rewards:', err);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async (payload, editing) => {
        if (!user?.id) return;
        if (editing?.id) {
            await supabase
                .from('rewards')
                .update({ ...payload })
                .eq('id', editing.id)
                .eq('user_id', user.id);
        } else {
            await supabase
                .from('rewards')
                .insert({ ...payload, user_id: user.id });
        }
        await load();
    };

    const handleRedeem = async () => {
        if (!redeemTarget || !user?.id || !profile) return;
        const res = await redeemReward(
            redeemTarget,
            profile,
            settings?.allow_negative_points,
            user.id
        );
        if (!res.ok) {
            toast(`Você precisa de mais ${res.needed} pontos para desbloquear esta recompensa.`);
        } else {
            toast.success(`Recompensa ${redeemTarget.title} resgatada!`);
            await reload();
            await load();
            const chosen = redeemTarget;
            setRedeemTarget(null);
            setScheduleTarget({ ...res.redemption, reward: chosen });
        }
    };

    const loadSlotsForDate = useCallback(
        async (dayStr, durationMin) => {
            if (!user?.id) return;
            const occs = await fetchDayOccurrences(new Date(dayStr + 'T00:00:00'), user.id);
            setFreeSlots(findFreeSlots(occs, durationMin || 30));
        },
        [user?.id]
    );

    useEffect(() => {
        if (scheduleTarget) {
            const duration = scheduleTarget.reward?.duration_minutes || 30;
            setSlotDay(dateToStr(new Date()));
            loadSlotsForDate(dateToStr(new Date()), duration);
        }
    }, [scheduleTarget, loadSlotsForDate]);

    const handleSchedule = async (slot) => {
        if (!scheduleTarget || !user?.id) return;
        const reward = scheduleTarget.reward || (
            await supabase.from('rewards').select('*').eq('id', scheduleTarget.reward_id).single()
        ).data;

        await scheduleRewardRedemption(
            scheduleTarget,
            reward,
            dateToStr(slot.start),
            formatTime(slot.start),
            formatTime(slot.end),
            user.id
        );

        toast.success('Recompensa agendada com sucesso!');
        setScheduleTarget(null);
        await reload();
        await load();
    };

    const keepForLater = () => {
        toast('Recompensa guardada para depois. Você pode agendar quando quiser.');
        setScheduleTarget(null);
    };

    const availableRedemptions = redemptions.filter((r) => r.status === 'available');

    return (
        <div className="space-y-6 animate-rise pb-24 md:pb-12">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Recompensas</h1>
                <Button
                    onClick={() => {
                        setEditTarget(null);
                        setModalOpen(true);
                    }}
                    className="h-10 gap-1.5 rounded-xl shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nova
                </Button>
            </div>

            {/* Saldo card */}
            <div className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between shadow-sm">
                <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Seu saldo de pontos</div>
                    <div className="font-heading text-3xl md:text-4xl font-semibold text-primary mt-1">
                        {profile?.current_points ?? 0} <span className="text-sm font-normal text-muted-foreground">pts</span>
                    </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Award className="w-7 h-7" />
                </div>
            </div>

            {loading ? (
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="h-44 rounded-2xl bg-card/60 border border-border animate-pulse" />
                    <div className="h-44 rounded-2xl bg-card/60 border border-border animate-pulse" />
                </div>
            ) : rewards.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground rounded-2xl bg-card border border-border p-8">
                    <Gift className="w-12 h-12 mx-auto mb-3 text-primary/40" />
                    <p className="font-medium text-base text-foreground">Nenhuma recompensa criada ainda.</p>
                    <p className="text-sm mt-1">Crie seus agrados favoritos para trocar pelos seus pontos conquistados!</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3.5">
                    {rewards.map((r) => {
                        const canAfford = (profile?.current_points ?? 0) >= r.cost;
                        return (
                            <div
                                key={r.id}
                                className="rounded-2xl bg-card border border-border p-5 flex flex-col justify-between hover:border-primary/30 transition-colors shadow-sm"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                                                <AppIcon name={r.emoji} className="w-6 h-6" defaultIcon={Gift} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-base truncate">{r.title}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3.5 h-3.5" /> {minutesToLabel(r.duration_minutes)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="font-heading text-xl font-bold text-primary">{r.cost}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">pontos</div>
                                        </div>
                                    </div>
                                    {r.description && (
                                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                                            {r.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                                    <Button
                                        size="sm"
                                        className={`flex-1 h-9 rounded-xl font-medium ${
                                            canAfford ? '' : 'opacity-70'
                                        }`}
                                        onClick={() => setRedeemTarget(r)}
                                    >
                                        Resgatar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 rounded-xl text-xs text-muted-foreground"
                                        onClick={() => {
                                            setEditTarget(r);
                                            setModalOpen(true);
                                        }}
                                    >
                                        Editar
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recompensas resgatadas esperando agendamento */}
            {availableRedemptions.length > 0 && (
                <div className="pt-2">
                    <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary" /> Recompensas resgatadas para agendar
                    </h2>
                    <div className="space-y-2.5">
                        {availableRedemptions.map((red) => {
                            const rw = red.rewards || { title: 'Recompensa', emoji: 'gift', duration_minutes: 30 };
                            return (
                                <div
                                    key={red.id}
                                    className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                                            <AppIcon name={rw.emoji} className="w-5 h-5" defaultIcon={Gift} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{rw.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Custo: {red.cost} pts · {minutesToLabel(rw.duration_minutes || 30)}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="rounded-xl h-9 text-xs font-medium"
                                        onClick={() => setScheduleTarget({ ...red, reward: rw })}
                                    >
                                        <Calendar className="w-3.5 h-3.5 mr-1.5" /> Encaixar na Agenda
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <RewardModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                editing={editTarget}
            />

            <ConfirmDialog
                open={!!redeemTarget}
                title={`Resgatar por ${redeemTarget?.cost ?? 0} pontos?`}
                description={
                    redeemTarget
                        ? `Você trocará seus pontos por "${redeemTarget.title}". Depois você poderá escolher o melhor horário livre para aproveitar!`
                        : ''
                }
                confirmLabel="Resgatar recompensa"
                onConfirm={handleRedeem}
                onCancel={() => setRedeemTarget(null)}
            />

            {/* Modal: Agendar Recompensa em Horário Livre */}
            {scheduleTarget && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
                    <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl animate-fade">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <AppIcon name={scheduleTarget.reward?.emoji} className="w-5 h-5" defaultIcon={Gift} />
                            </div>
                            <h3 className="font-heading text-lg font-semibold">
                                Quando você quer aproveitar sua recompensa?
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                            Escolha um dos horários livres disponíveis para "{scheduleTarget.reward?.title}":
                        </p>

                        {/* Seletor de dia */}
                        <div className="flex gap-2 mb-3">
                            {[0, 1, 2, 3].map((n) => {
                                const d = addDaysStr(dateToStr(new Date()), n);
                                const isSelected = slotDay === d;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => {
                                            setSlotDay(d);
                                            loadSlotsForDate(d, scheduleTarget.reward?.duration_minutes);
                                        }}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                            isSelected
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary text-secondary-foreground hover:bg-muted'
                                        }`}
                                    >
                                        {n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : d.slice(5)}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Lista de Slots Livres */}
                        <div className="max-h-56 overflow-y-auto space-y-2 py-1">
                            {freeSlots.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-6 text-center">
                                    Nenhum horário livre contíguo de {minutesToLabel(scheduleTarget.reward?.duration_minutes || 30)} encontrado para esta data.
                                </p>
                            ) : (
                                freeSlots.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSchedule(s)}
                                        className="w-full text-left rounded-xl border border-border/80 p-3 hover:border-primary/40 hover:bg-secondary/40 transition-all flex items-center justify-between"
                                    >
                                        <div>
                                            <span className="text-sm font-semibold">
                                                {formatTime(s.start)} — {formatTime(s.end)}
                                            </span>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Moon className="w-3 h-3 text-muted-foreground" /> Horário Livre
                                            </div>
                                        </div>
                                        <span className="text-xs text-primary font-medium">Encaixar →</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="flex gap-2 mt-5 pt-3 border-t border-border/60">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl text-xs"
                                onClick={keepForLater}
                            >
                                Guardar para depois
                            </Button>
                            <Button
                                variant="ghost"
                                className="rounded-xl text-xs"
                                onClick={() => setScheduleTarget(null)}
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}