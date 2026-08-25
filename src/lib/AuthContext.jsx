import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function initAuth() {
            try {
                const { data: { session: initialSession }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('Error fetching session:', error);
                }
                if (mounted) {
                    setSession(initialSession);
                    setUser(initialSession?.user || null);
                    setIsAuthenticated(!!initialSession?.user);
                    setIsLoadingAuth(false);
                }
            } catch (err) {
                console.error('Unexpected auth init error:', err);
                if (mounted) {
                    setIsLoadingAuth(false);
                }
            }
        }

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            if (mounted) {
                setSession(currentSession);
                setUser(currentSession?.user || null);
                setIsAuthenticated(!!currentSession?.user);
                setIsLoadingAuth(false);
            }
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        setAuthError(null);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            setAuthError(error.message);
            throw error;
        }
        return data;
    };

    const logout = async () => {
        setAuthError(null);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) throw error;
        return data;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                isAuthenticated,
                isLoadingAuth,
                authError,
                login,
                logout,
                resetPassword,
                updatePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
