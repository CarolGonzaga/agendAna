import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.");
            return;
        }
        if (newPassword.length < 6) {
            setError("A senha deve conter no mínimo 6 caracteres.");
            return;
        }
        setLoading(true);
        try {
            await updatePassword(newPassword);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 2000);
        } catch (err) {
            console.error('Update password error:', err);
            setError(err.message || "Não foi possível redefinir a senha.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            icon={Lock}
            title="Nova senha"
            subtitle="Defina sua nova senha de acesso"
            footer={
                <Link to="/login" className="text-primary font-medium hover:underline text-sm">
                    Ir para login
                </Link>
            }
        >
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    {error}
                </div>
            )}

            {success ? (
                <div className="text-center space-y-3 py-3 animate-fade">
                    <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
                    <p className="text-sm font-medium">Senha atualizada com sucesso!</p>
                    <p className="text-xs text-muted-foreground">Redirecionando para o seu Grimório...</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                autoFocus
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pl-10 h-12 rounded-xl"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm">Confirmar nova senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                id="confirm"
                                type="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-10 h-12 rounded-xl"
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl font-medium" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Salvando nova senha...
                            </>
                        ) : (
                            "Salvar nova senha"
                        )}
                    </Button>
                </form>
            )}
        </AuthLayout>
    );
}