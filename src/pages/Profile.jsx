import React, { useEffect, useState } from 'react';
import { useAppData } from '@/lib/AppDataContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { getLevel } from '@/lib/levels';
import { playChime } from '@/lib/sound';
import {
    isPushSupported,
    requestNotificationPermission,
    sendLocalTestNotification,
    getNotificationDiagnostic,
    subscribeUserToPush,
} from '@/lib/notifications';
import ConfirmDialog from '@/components/ConfirmDialog';
import AppIcon, { AVAILABLE_AVATAR_ICONS } from '@/components/AppIcon';
import { toast } from 'sonner';
import { Upload, LogOut, Bell, Volume2, Check, X, Shield, Award, User, Settings2, Moon, Sun, Laptop } from 'lucide-react';

export default function Profile() {
    const { profile, settings, updateProfile, updateSettings } = useAppData();
    const { user, logout } = useAuth();
    const [name, setName] = useState('');
    const [diag, setDiag] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

    useEffect(() => {
        setName(profile?.display_name || '');
    }, [profile?.id, profile?.display_name]);

    if (!profile || !settings) return null;

    const lvl = getLevel(profile.total_xp || 0);

    const saveName = async () => {
        try {
            await updateProfile({ display_name: name.trim() || 'Ana' });
            toast.success('Nome salvo com sucesso!');
        } catch (err) {
            toast.error('Não foi possível salvar o nome.');
        }
    };

    const pickIcon = async (iconId) => {
        try {
            await updateProfile({ avatar_type: 'emoji', avatar_emoji: iconId });
            toast.success('Avatar atualizado!');
        } catch (err) {
            toast.error('Erro ao atualizar avatar.');
        }
    };

    const onPhoto = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) {
                console.error('Avatar upload error:', uploadError);
                throw uploadError;
            }

            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(uploadData.path);

            await updateProfile({
                avatar_type: 'upload',
                avatar_url: publicData.publicUrl,
            });

            toast.success('Foto de perfil atualizada!');
        } catch (err) {
            console.error(err);
            toast.error('Não consegui enviar a foto. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const enableNotifications = async () => {
        if (!isPushSupported()) {
            toast.error('Notificações não são suportadas neste navegador.');
            return;
        }
        try {
            const perm = await requestNotificationPermission();
            if (perm === 'granted') {
                await updateSettings({ notifications_enabled: true });
                await subscribeUserToPush(user.id);
                toast.success('Notificações e lembretes ativados! ✓');
            } else {
                await updateSettings({ notifications_enabled: false });
                toast('Permissão de notificação foi negada no navegador.');
            }
        } catch (err) {
            toast.error('Erro ao solicitar permissão de notificações.');
        }
    };

    const handleSendTest = async () => {
        try {
            const vol = (settings.app_volume || 70) / 100;
            await sendLocalTestNotification(settings.sounds_enabled, vol);
            toast.success('Notificação de teste disparada!');
            runDiag();
        } catch (err) {
            toast.error(err.message || 'Ative as notificações primeiro nas configurações.');
        }
    };

    const runDiag = async () => {
        const d = await getNotificationDiagnostic(user?.id);
        setDiag(d);
    };

    const avatar = profile.avatar_type === 'upload' && profile.avatar_url ? (
        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
    ) : (
        <AppIcon name={profile.avatar_emoji} className="w-10 h-10 text-primary" defaultIcon={Moon} />
    );

    return (
        <div className="space-y-6 animate-rise pb-24 md:pb-12">
            <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">Perfil & Configurações</h1>

            {/* Avatar + Nome */}
            <section className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {uploading ? (
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                            avatar
                        )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                        <Label htmlFor="display-name" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                            Seu Nome no Grimório
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="display-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ana"
                                className="h-10 rounded-xl"
                            />
                            <Button size="sm" onClick={saveName} className="h-10 rounded-xl px-4">
                                Salvar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t border-border/60">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
                        Escolher Ícone de Avatar ou Foto
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 items-center">
                        {AVAILABLE_AVATAR_ICONS.map((item) => {
                            const IconComponent = item.icon;
                            const isSelected = profile.avatar_emoji === item.id && profile.avatar_type === 'emoji';
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => pickIcon(item.id)}
                                    className={`h-11 rounded-xl flex items-center justify-center transition-all ${
                                        isSelected
                                            ? 'bg-primary text-primary-foreground scale-105 shadow-sm ring-2 ring-primary/40'
                                            : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95'
                                    }`}
                                    title={item.label}
                                    aria-label={`Avatar ${item.label}`}
                                >
                                    <IconComponent className="w-5 h-5" />
                                </button>
                            );
                        })}
                        <label className="h-11 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground" title="Enviar Foto">
                            <Upload className="w-5 h-5" />
                            <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                        </label>
                    </div>
                </div>
            </section>

            {/* Nível + XP */}
            <section className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Evolução Pessoal</div>
                        <div className="font-heading text-xl font-bold text-foreground mt-0.5">
                            {lvl.name} — Nível {lvl.level}
                        </div>
                    </div>
                    <Award className="w-6 h-6 text-primary" />
                </div>

                <div className="space-y-1.5">
                    <div className="h-3 rounded-full bg-secondary overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${lvl.progress * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{profile.total_xp || 0} XP acumulados</span>
                        <span>{lvl.nextXp ? `${lvl.toNext} XP para ${lvl.nextName}` : 'Nível Máximo da Meia-Noite!'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                    <Stat label="Saldo Atual" value={`${profile.current_points ?? 0} pts`} />
                    <Stat label="Total Ganho" value={`${profile.lifetime_points ?? 0} pts`} />
                    <Stat label="Atividades Feitas" value={profile.events_completed ?? 0} />
                </div>
            </section>

            {/* Configurações da Agenda */}
            <section className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" /> Agenda
                </h2>
                <Row label="Pontuação padrão por evento">
                    <Input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.default_event_points}
                        onChange={(e) => updateSettings({ default_event_points: Number(e.target.value) || 10 })}
                        className="w-24 h-9 text-center rounded-xl"
                    />
                </Row>
                <Row label="Permitir saldo negativo">
                    <Switch
                        checked={settings.allow_negative_points}
                        onCheckedChange={(v) => updateSettings({ allow_negative_points: v })}
                    />
                </Row>
                <Row label="Primeiro dia da semana">
                    <Select
                        value={String(settings.first_day_of_week ?? 1)}
                        onValueChange={(v) => updateSettings({ first_day_of_week: Number(v) })}
                    >
                        <SelectTrigger className="w-40 h-9 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Segunda-feira</SelectItem>
                            <SelectItem value="0">Domingo</SelectItem>
                        </SelectContent>
                    </Select>
                </Row>
            </section>

            {/* Aparência */}
            <section className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Sun className="w-4 h-4 text-primary" /> Aparência
                </h2>
                <Row label="Tema do Grimório">
                    <Select
                        value={settings.theme || 'system'}
                        onValueChange={(v) => updateSettings({ theme: v })}
                    >
                        <SelectTrigger className="w-40 h-9 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="system">Sistema</SelectItem>
                            <SelectItem value="light">Claro</SelectItem>
                            <SelectItem value="dark">Escuro</SelectItem>
                        </SelectContent>
                    </Select>
                </Row>
            </section>

            {/* Notificações & Lembretes */}
            <section className="rounded-2xl bg-card border border-border p-5 shadow-sm space-y-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" /> Notificações & Lembretes
                </h2>
                <Row label="Lembretes Web Push">
                    <Button
                        size="sm"
                        variant={settings.notifications_enabled ? 'secondary' : 'default'}
                        onClick={enableNotifications}
                        className="rounded-xl h-9 text-xs"
                    >
                        {settings.notifications_enabled ? 'Ativadas ✓' : 'Ativar notificações'}
                    </Button>
                </Row>
                <Row label="Som dos lembretes">
                    <Switch
                        checked={settings.sounds_enabled}
                        onCheckedChange={(v) => updateSettings({ sounds_enabled: v })}
                    />
                </Row>
                <Row label="Volume dentro do aplicativo">
                    <div className="w-44 flex items-center gap-2">
                        <Slider
                            value={[settings.app_volume || 70]}
                            max={100}
                            step={5}
                            onValueChange={([v]) => {
                                updateSettings({ app_volume: v });
                            }}
                            onValueCommit={([v]) => {
                                if (settings.sounds_enabled) playChime(v / 100);
                            }}
                        />
                        <span className="text-xs text-muted-foreground w-8 text-right">
                            {settings.app_volume || 70}%
                        </span>
                    </div>
                </Row>
                <Row label="Momento da notificação">
                    <Select
                        value={String(settings.notification_lead_minutes || 0)}
                        onValueChange={(v) => updateSettings({ notification_lead_minutes: Number(v) })}
                    >
                        <SelectTrigger className="w-44 h-9 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">No horário de início</SelectItem>
                            <SelectItem value="5">5 min antes</SelectItem>
                            <SelectItem value="10">10 min antes</SelectItem>
                            <SelectItem value="15">15 min antes</SelectItem>
                            <SelectItem value="30">30 min antes</SelectItem>
                        </SelectContent>
                    </Select>
                </Row>

                <div className="pt-2 flex flex-col gap-3">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendTest}
                        className="h-10 rounded-xl text-xs font-medium"
                    >
                        <Bell className="w-3.5 h-3.5 mr-1.5" /> Enviar notificação de teste
                    </Button>

                    <div className="pt-3 border-t border-border/60">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                Diagnóstico de Lembretes
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={runDiag}
                                className="h-7 text-xs text-primary"
                            >
                                Verificar status
                            </Button>
                        </div>
                        {diag && (
                            <div className="text-xs space-y-2 bg-secondary/40 p-3 rounded-xl border border-border/50 animate-fade">
                                <DiagRow ok={diag.pwaInstalled} label="PWA instalada na Tela de Início" />
                                <DiagRow ok={diag.permission} label={`Permissão de Notificação: ${diag.permission ? 'Concedida' : 'Pendente'}`} />
                                <DiagRow ok={diag.pushSubscription} label="Push subscription do dispositivo registrada" />
                                <DiagRow ok={diag.soundInApp} label="Som suave sintetizado (Web Audio API)" />
                                {diag.lastTest && (
                                    <div className="text-[11px] text-muted-foreground pt-1">
                                        Último teste: {diag.lastTest.toLocaleString('pt-BR')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Logout button */}
            <div className="pt-2">
                <Button
                    variant="outline"
                    onClick={() => setLogoutDialogOpen(true)}
                    className="w-full h-11 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                >
                    <LogOut className="w-4 h-4 mr-2" /> Encerrar Sessão
                </Button>
            </div>

            <ConfirmDialog
                open={logoutDialogOpen}
                title="Deseja sair do Grimório?"
                description="Sua sessão será encerrada com segurança."
                confirmLabel="Sair"
                onConfirm={logout}
                onCancel={() => setLogoutDialogOpen(false)}
            />
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="rounded-xl bg-secondary/50 border border-border/40 p-3 text-center">
            <div className="font-heading text-lg md:text-xl font-bold text-foreground">{value}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{label}</div>
        </div>
    );
}

function Row({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-4 py-0.5">
            <Label className="text-sm font-medium text-foreground">{label}</Label>
            {children}
        </div>
    );
}

function DiagRow({ ok, label }) {
    return (
        <div className="flex items-center gap-2">
            {ok ? (
                <Check className="w-4 h-4 text-primary shrink-0" />
            ) : (
                <X className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span className={ok ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
        </div>
    );
}