import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/lib/AppDataContext';
import { Moon, Bell, Gift } from 'lucide-react';

const STEPS = [
    { icon: Moon, title: 'Seu Grimório está pronto.', text: 'Ele vai mostrar uma coisa de cada vez com calma e foco.' },
    { icon: Bell, title: 'Quer receber lembretes?', text: 'Você pode ativar agora ou depois nas Configurações.', actions: 'notifications' },
    { icon: Gift, title: 'Conclua tarefas, ganhe pontos e troque por recompensas.', text: 'Uma coisa de cada vez. Sem pressa.' },
];

export default function Onboarding() {
    const { profile, updateProfile, updateSettings } = useAppData();
    const [step, setStep] = useState(0);
    const s = STEPS[step];
    const IconComponent = s.icon;

    const finish = async () => {
        await updateProfile({ onboarded: true });
    };

    const enableNotifications = async () => {
        try {
            if ('Notification' in window) {
                const perm = await Notification.requestPermission();
                await updateSettings({ notifications_enabled: perm === 'granted' });
            }
        } catch (e) { }
        next();
    };

    const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center px-6">
            <div className="w-full max-w-sm text-center animate-fade">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-sm">
                    <IconComponent className="w-10 h-10" />
                </div>
                <h2 className="font-heading text-2xl font-semibold mb-3">{s.title}</h2>
                <p className="text-muted-foreground mb-10 leading-relaxed text-sm">{s.text}</p>
                <div className="flex flex-col gap-3">
                    {s.actions === 'notifications' ? (
                        <>
                            <Button onClick={enableNotifications} className="h-12 rounded-xl text-base font-semibold">Ativar lembretes</Button>
                            <Button variant="ghost" onClick={next} className="h-12 rounded-xl text-muted-foreground">Depois</Button>
                        </>
                    ) : (
                        <Button onClick={next} className="h-12 rounded-xl text-base font-semibold">{step === STEPS.length - 1 ? 'Começar' : 'Continuar'}</Button>
                    )}
                </div>
                <div className="flex justify-center gap-1.5 mt-8">
                    {STEPS.map((_, i) => (
                        <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}