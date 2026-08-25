import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const DefaultFallback = () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
        <div className="text-4xl mb-4 animate-pulse">🌙</div>
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
);

export default function ProtectedRoute({
    fallback = <DefaultFallback />,
    unauthenticatedElement,
    children,
}) {
    const { isAuthenticated, isLoadingAuth } = useAuth();

    if (isLoadingAuth) {
        return fallback;
    }

    if (!isAuthenticated) {
        return unauthenticatedElement;
    }

    return children ? children : <Outlet />;
}
