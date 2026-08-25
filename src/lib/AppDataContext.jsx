import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { seedInitialData } from './initialRoutine';

const Ctx = createContext(null);

export function AppDataProvider({ children }) {
    const { user, isAuthenticated } = useAuth();
    const [profile, setProfile] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!user?.id) {
            setProfile(null);
            setSettings(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // 1. Fetch or create Profile
            let { data: profData, error: profError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (profError) {
                console.error('Error loading profile:', profError);
            }

            if (!profData) {
                const displayName = user.user_metadata?.name || user.email?.split('@')[0] || 'Mariana';
                const { data: newProf, error: createProfError } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: user.id,
                        display_name: displayName,
                        avatar_type: 'emoji',
                        avatar_emoji: '🌙',
                        current_points: 0,
                        lifetime_points: 0,
                        total_xp: 0,
                        level: 1,
                        events_completed: 0,
                        onboarded: false,
                    })
                    .select()
                    .single();

                if (createProfError) {
                    console.error('Error creating default profile:', createProfError);
                }
                profData = newProf;
            }

            // 2. Fetch or create Settings
            let { data: settData, error: settError } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (settError) {
                console.error('Error loading settings:', settError);
            }

            if (!settData) {
                const { data: newSett, error: createSettError } = await supabase
                    .from('user_settings')
                    .insert({
                        user_id: user.id,
                        default_event_points: 10,
                        allow_negative_points: false,
                        theme: 'system',
                        notifications_enabled: false,
                        sounds_enabled: true,
                        app_volume: 70,
                        notification_lead_minutes: 0,
                        timezone: 'America/Sao_Paulo',
                        first_day_of_week: 1,
                    })
                    .select()
                    .single();

                if (createSettError) {
                    console.error('Error creating default settings:', createSettError);
                }
                settData = newSett;
            }

            // 3. Seed initial routine and rewards if needed
            await seedInitialData(user.id);

            setProfile(profData);
            setSettings(settData);
        } catch (e) {
            console.error('AppData load exception:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (isAuthenticated && user?.id) {
            load();
        } else {
            setProfile(null);
            setSettings(null);
            setLoading(false);
        }
    }, [isAuthenticated, user?.id, load]);

    // Setup Supabase Realtime channel for profile and user_settings
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user-sync-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.new) {
                        setProfile((prev) => ({ ...prev, ...payload.new }));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.new) {
                        setSettings((prev) => ({ ...prev, ...payload.new }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const updateProfile = async (patch) => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
        setProfile(data);
        return data;
    };

    const updateSettings = async (patch) => {
        if (!user?.id) return;
        const { data, error } = await supabase
            .from('user_settings')
            .update({ ...patch, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
        setSettings(data);
        return data;
    };

    return (
        <Ctx.Provider
            value={{
                profile,
                settings,
                loading: loading && !!user?.id,
                reload: load,
                updateProfile,
                updateSettings,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export const useAppData = () => {
    const context = useContext(Ctx);
    if (!context) {
        throw new Error('useAppData must be used within an AppDataProvider');
    }
    return context;
};