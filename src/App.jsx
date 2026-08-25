import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { AppDataProvider, useAppData } from '@/lib/AppDataContext';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppShell from '@/components/AppShell';
import Home from '@/pages/Home';
import Agenda from '@/pages/Agenda';
import Rewards from '@/pages/Rewards';
import Profile from '@/pages/Profile';
import Focus from '@/pages/Focus';
import PageNotFound from './lib/PageNotFound';
import { registerServiceWorker } from './lib/notifications';
import { Moon } from 'lucide-react';

const ThemeApplier = () => {
    const { settings } = useAppData();

    useEffect(() => {
        const theme = settings?.theme || 'system';
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [settings?.theme]);

    return null;
};

const ProtectedLayout = () => {
    return (
        <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />}>
            <AppDataProvider>
                <ThemeApplier />
                <AppShell />
            </AppDataProvider>
        </ProtectedRoute>
    );
};

const FocusLayout = () => {
    return (
        <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />}>
            <AppDataProvider>
                <ThemeApplier />
                <Outlet />
            </AppDataProvider>
        </ProtectedRoute>
    );
};

const AuthenticatedApp = () => {
    const { isLoadingAuth, isAuthenticated } = useAuth();

    useEffect(() => {
        registerServiceWorker();
    }, []);

    if (isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
                <Moon className="w-10 h-10 text-primary animate-pulse mb-4" />
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="mt-4 text-sm text-muted-foreground font-heading">Abrindo AgendAna...</p>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Standalone Focus Window / Fullscreen View */}
            <Route element={<FocusLayout />}>
                <Route path="/focus" element={<Focus />} />
                <Route path="/focus/:occurrenceId" element={<Focus />} />
            </Route>

            {/* Standard App Shell with Navigation */}
            <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/recompensas" element={<Rewards />} />
                <Route path="/perfil" element={<Profile />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};

export default function App() {
    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <Router>
                    <ScrollToTop />
                    <AuthenticatedApp />
                </Router>
                <Toaster />
                <SonnerToaster
                    position="top-center"
                    toastOptions={{
                        style: {
                            background: 'hsl(var(--card))',
                            color: 'hsl(var(--foreground))',
                            border: '1px solid hsl(var(--border))',
                        },
                    }}
                />
            </QueryClientProvider>
        </AuthProvider>
    );
}