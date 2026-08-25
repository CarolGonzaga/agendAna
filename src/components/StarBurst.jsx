import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function StarBurst({ points, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 1700);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 animate-fade bg-card/90 border border-primary/30 backdrop-blur-md px-8 py-6 rounded-3xl shadow-2xl">
                <Sparkles className="w-12 h-12 text-primary animate-spin-slow" />
                <div className="font-heading text-2xl font-semibold text-primary">+{points} pontos</div>
                <div className="text-xs text-muted-foreground">Seu grimório ficou mais forte</div>
            </div>
        </div>
    );
}