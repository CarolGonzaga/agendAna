import React, { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Moon, Calendar, Gift, User as UserIcon } from 'lucide-react';
import { useAppData } from '@/lib/AppDataContext';
import { useAuth } from '@/lib/AuthContext';
import { fetchDayOccurrences } from '@/lib/occurrences';
import { playChime } from '@/lib/sound';
import AppIcon from '@/components/AppIcon';
import { toast } from 'sonner';

const NAV = [
    { to: '/', label: 'Hoje', icon: Moon },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/recompensas', label: 'Recompensas', icon: Gift },
    { to: '/perfil', label: 'Perfil', icon: UserIcon },
];

export default function AppShell() {
    const { profile, settings, loading } = useAppData();
    const { user } = useAuth();
    const loc = useLocation();
    const reminded = useRef(new Set());

    // In-app foreground reminder checking
    useEffect(() => {
        if (!settings || !settings.sounds_enabled || !user?.id) return;
        let active = true;

        const check = async () => {
            try {
                const occs = await fetchDayOccurrences(new Date(), user.id);
                const now = Date.now();
                for (const o of occs) {
                    const start = new Date(o.starts_at).getTime();
                    const key = `${o.event_series_id}-${o.occurrence_date}`;
                    if (
                        Math.abs(start - now) < 45000 &&
                        !reminded.current.has(key) &&
                        o.status === 'scheduled'
                    ) {
                        reminded.current.add(key);
                        if (o.series.event_type === 'event') {
                            const vol = (settings.app_volume || 70) / 100;
                            playChime(vol);
                            toast(o.series.title, {
                                description: 'Seu próximo compromisso está começando agora.',
                            });
                        }
                    }
                }
            } catch (e) {
                /* silent */
            }
        };

        check();
        const id = setInterval(check, 25000);
        return () => {
            active = false;
            clearInterval(id);
        };
    }, [settings?.sounds_enabled, settings?.app_volume, user?.id]);

    if (loading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
                <Moon className="w-10 h-10 text-primary animate-pulse mb-4" />
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-muted-foreground font-heading">Carregando AgendAna...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar safe-top safe-bottom z-30">
                <div className="px-6 py-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <Moon className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-heading text-xl font-bold tracking-tight block">
                            AgendAna
                        </span>
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                            Grimório Pessoal
                        </span>
                    </div>
                </div>

                <nav className="flex flex-col gap-1.5 px-4 flex-1">
                    {NAV.map((n) => {
                        const active = loc.pathname === n.to;
                        return (
                            <Link
                                key={n.to}
                                to={n.to}
                                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    active
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                                }`}
                            >
                                <n.icon className="w-4 h-4" />
                                {n.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border/60">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/40">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-primary">
                            <AppIcon name={profile?.avatar_emoji} className="w-4 h-4" defaultIcon={Moon} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate">{profile?.display_name || 'Ana'}</div>
                            <div className="text-[10px] text-primary font-medium">{profile?.current_points || 0} pts acumulados</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="md:ml-64 flex-1 min-h-screen pb-24 md:pb-12 safe-top">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-10">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
                <div className="grid grid-cols-4 py-1">
                    {NAV.map((n) => {
                        const active = loc.pathname === n.to;
                        return (
                            <Link
                                key={n.to}
                                to={n.to}
                                className={`flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-all ${
                                    active
                                        ? 'text-primary font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <n.icon className={`w-5 h-5 ${active ? 'scale-110 text-primary' : ''} transition-transform`} />
                                <span>{n.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}