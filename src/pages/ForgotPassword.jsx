import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
        } catch (err) {
            console.error('Password reset error:', err);
            setError(err.message || 'Erro ao enviar email de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            icon={Mail}
            title="Redefinir senha"
            subtitle="Enviaremos um link de recuperação para seu email"
            footer={
                <Link to="/login" className="text-primary font-medium hover:underline text-sm inline-flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar para o login
                </Link>
            }
        >
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    {error}
                </div>
            )}

            {sent ? (
                <div className="text-center space-y-3 py-2 animate-fade">
                    <div className="text-3xl">✨</div>
                    <p className="text-sm text-foreground">
                        Se existir uma conta cadastrada para <span className="font-medium">{email}</span>, você receberá o link em breve.
                    </p>
                    <p className="text-xs text-muted-foreground">Verifique também sua caixa de spam.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Endereço de email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                autoFocus
                                placeholder="mariana@exemplo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 h-12 rounded-xl"
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl font-medium" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            "Enviar link de recuperação"
                        )}
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}