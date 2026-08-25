import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://gkysqmjxceegjkgfmfmm.supabase.co';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdreXNxbWp4Y2VlZ2prZ2ZtZm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2ODAyMTcsImV4cCI6MjEwMzI1NjIxN30.i2EPOgeE0E18Ba6NPjogYtaBITFUozl_1ezNcUg2il8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

export const APP_NAME = 'AgendAna';
