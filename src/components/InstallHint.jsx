import React, { useState, useEffect } from 'react';
import { X, Moon } from 'lucide-react';

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
        <div className="md:hidden fixed bottom-20 inset-x-4 z-30 rounded-2xl bg-card border border-border shadow-lg p-4 animate-rise">
            <button onClick={dismiss} className="absolute right-2 top-2 p-1 text-muted-foreground" aria-label="Fechar">
                <X className="w-4 h-4" />
            </button>
            <p className="text-sm pr-6 flex items-start gap-2">
                <Moon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Instale o AgendAna na Tela de Início para receber seus lembretes mesmo quando o aplicativo estiver fechado.</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2 pl-6">
                Toque em <span className="font-medium">Compartilhar</span> → <span className="font-medium">Adicionar à Tela de Início</span>.
            </p>
        </div>
    );
}