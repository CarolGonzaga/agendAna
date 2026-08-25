-- ==============================================================================
-- AGENDANA — BANCO DE DADOS SUPABASE (SCHEMA COMPLETO + RLS + GAMIFICAÇÃO)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA: PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT DEFAULT 'Mariana',
    avatar_type TEXT DEFAULT 'emoji' CHECK (avatar_type IN ('emoji', 'upload')),
    avatar_emoji TEXT DEFAULT '🌙',
    avatar_url TEXT,
    current_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    events_completed INTEGER DEFAULT 0,
    onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: USER_SETTINGS
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_event_points INTEGER DEFAULT 10,
    allow_negative_points BOOLEAN DEFAULT FALSE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    notifications_enabled BOOLEAN DEFAULT FALSE,
    sounds_enabled BOOLEAN DEFAULT TRUE,
    app_volume INTEGER DEFAULT 70,
    notification_lead_minutes INTEGER DEFAULT 0,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    first_day_of_week INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: EVENT_SERIES (Definição de rotinas e eventos recorrentes/únicos)
CREATE TABLE IF NOT EXISTS public.event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Trabalho',
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    all_day BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekdays', 'weekly', 'custom')),
    recurrence_days INTEGER[] DEFAULT '{}',
    points INTEGER DEFAULT 10,
    event_type TEXT DEFAULT 'event' CHECK (event_type IN ('event', 'free_slot', 'reward')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: EVENT_OCCURRENCES (Instâncias reais de cada evento)
CREATE TABLE IF NOT EXISTS public.event_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_series_id UUID REFERENCES public.event_series(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    occurrence_date DATE NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    points_value INTEGER DEFAULT 10,
    points_processed BOOLEAN DEFAULT FALSE,
    xp_processed BOOLEAN DEFAULT FALSE,
    penalty_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA: POINTS_TRANSACTIONS (Ledger financeiro de pontos)
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    occurrence_id UUID,
    reward_redemption_id UUID,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('event_completed', 'event_missed', 'reward_redeemed', 'manual_adjustment')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_points_occ_type UNIQUE (occurrence_id, type)
);

-- 7. TABELA: XP_TRANSACTIONS (Ledger de evolução contínua)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    occurrence_id UUID UNIQUE,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA: REWARDS (Catálogo de recompensas pessoais)
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    emoji TEXT DEFAULT '✨',
    cost INTEGER NOT NULL CHECK (cost > 0),
    duration_minutes INTEGER DEFAULT 30,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA: REWARD_REDEMPTIONS (Recompensas resgatadas)
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cost INTEGER NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'scheduled', 'used')),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_occurrence_id UUID
);

-- 10. TABELA: FREE_SLOTS (Horários livres padrão)
CREATE TABLE IF NOT EXISTS public.free_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weekday INTEGER,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA: PUSH_SUBSCRIPTIONS (Dispositivos registrados para Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    device_name TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 12. TABELA: SCHEDULED_NOTIFICATIONS (Fila de notificações agendadas server-side)
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    occurrence_id UUID REFERENCES public.event_occurrences(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    attempt_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- POLICIES: PROFILES
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: USER_SETTINGS
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: EVENT_SERIES
DROP POLICY IF EXISTS "Users can manage own event_series" ON public.event_series;
CREATE POLICY "Users can manage own event_series" ON public.event_series
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: EVENT_OCCURRENCES
DROP POLICY IF EXISTS "Users can manage own event_occurrences" ON public.event_occurrences;
CREATE POLICY "Users can manage own event_occurrences" ON public.event_occurrences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: POINTS_TRANSACTIONS
DROP POLICY IF EXISTS "Users can manage own points_transactions" ON public.points_transactions;
CREATE POLICY "Users can manage own points_transactions" ON public.points_transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: XP_TRANSACTIONS
DROP POLICY IF EXISTS "Users can manage own xp_transactions" ON public.xp_transactions;
CREATE POLICY "Users can manage own xp_transactions" ON public.xp_transactions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: REWARDS
DROP POLICY IF EXISTS "Users can manage own rewards" ON public.rewards;
CREATE POLICY "Users can manage own rewards" ON public.rewards
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: REWARD_REDEMPTIONS
DROP POLICY IF EXISTS "Users can manage own reward_redemptions" ON public.reward_redemptions;
CREATE POLICY "Users can manage own reward_redemptions" ON public.reward_redemptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: FREE_SLOTS
DROP POLICY IF EXISTS "Users can manage own free_slots" ON public.free_slots;
CREATE POLICY "Users can manage own free_slots" ON public.free_slots
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: PUSH_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can manage own push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push_subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLICIES: SCHEDULED_NOTIFICATIONS
DROP POLICY IF EXISTS "Users can manage own scheduled_notifications" ON public.scheduled_notifications;
CREATE POLICY "Users can manage own scheduled_notifications" ON public.scheduled_notifications
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS
-- ==============================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_series;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_occurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reward_redemptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.points_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_transactions;

-- ==============================================================================
-- STORAGE BUCKET: AVATARS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar public select" ON storage.objects;
CREATE POLICY "Avatar public select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar authenticated insert" ON storage.objects;
CREATE POLICY "Avatar authenticated insert" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Avatar authenticated update" ON storage.objects;
CREATE POLICY "Avatar authenticated update" ON storage.objects FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
);
