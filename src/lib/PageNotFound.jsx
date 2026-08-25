import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Moon, ArrowLeft } from 'lucide-react';

export default function PageNotFound() {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground animate-fade">
            <div className="max-w-md w-full text-center space-y-6 bg-card border border-border p-8 rounded-3xl shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                    <Moon className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h1 className="font-heading text-4xl font-bold text-primary">404</h1>
                    <h2 className="text-xl font-semibold">Página não encontrada</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        A página <span className="font-medium text-foreground">"{pageName}"</span> não existe no seu grimório.
                    </p>
                </div>

                <div className="pt-4">
                    <Button asChild className="rounded-xl h-11 px-6 font-medium shadow-sm">
                        <Link to="/">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}