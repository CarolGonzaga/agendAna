import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Sparkles } from 'lucide-react';

export default function LevelUpModal({ level, onDone }) {
    return (
        <Dialog open={!!level} onOpenChange={(o) => !o && onDone()}>
            <DialogContent className="max-w-sm text-center rounded-2xl p-6">
                <DialogHeader className="items-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner">
                        <Award className="w-9 h-9" />
                    </div>
                    <DialogTitle className="text-center font-heading text-xl">Novo nível desbloqueado</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    <p className="font-heading text-2xl font-semibold text-primary">{level?.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">Seu grimório ficou um pouco mais poderoso.</p>
                </div>
                <DialogFooter className="justify-center pt-2">
                    <Button onClick={onDone} className="h-11 px-8 rounded-xl font-semibold">
                        Continuar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}