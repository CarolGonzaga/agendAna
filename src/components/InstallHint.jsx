import React, { useState, useEffect } from 'react';
import { X, Moon, Share } from 'lucide-react';

export default function InstallHint() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem('agendana_install_dismissed');
        if (dismissed) return;
        const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if (!standalone && ios) setShow(true);
    }, []);

    const dismiss = () => {
        localStorage.setItem('agendana_install_dismissed', '1');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="md:hidden fixed bottom-36 inset-x-4 z-40 rounded-2xl bg-card/95 backdrop-blur-md border border-primary/20 shadow-2xl p-4 animate-rise">
            <button
                onClick={dismiss}
                className="absolute right-2.5 top-2.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                aria-label="Fechar aviso de instalação"
            >
                <X className="w-4 h-4" />
            </button>
            <div className="pr-6 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Moon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-heading text-xs font-bold text-foreground">
                        Instalar na Tela de Início
                    </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                    Receba seus lembretes mesmo quando o aplicativo estiver fechado.
                </p>
                <div className="text-[11px] text-primary/90 font-medium pt-0.5 flex items-center gap-1">
                    <span>Toque em</span>
                    <Share className="w-3 h-3 inline text-primary" />
                    <span className="font-semibold">Compartilhar</span>
                    <span>→</span>
                    <span className="font-semibold">Adicionar à Tela de Início</span>
                </div>
            </div>
        </div>
    );
}