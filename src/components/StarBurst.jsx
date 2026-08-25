import React, { useEffect } from 'react';
import { Award } from 'lucide-react';

export default function StarBurst({ points, onDone }) {
    useEffect(() => {
        const t = setTimeout(onDone, 1700);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 animate-fade bg-card/95 border border-primary/30 backdrop-blur-md px-8 py-6 rounded-3xl shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
                    <Award className="w-8 h-8" />
                </div>
                <div className="font-heading text-2xl font-bold text-primary">+{points} pontos</div>
                <div className="text-xs text-muted-foreground">Seu grimório evoluiu</div>
            </div>
        </div>
    );
}