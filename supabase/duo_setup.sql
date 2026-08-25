-- ==============================================================================
-- AGENDANA — CONFIGURAÇÃO DUPLA (ANA & CAROL) + RLS COMPARTILHADO + SEED CAROL
-- ==============================================================================

-- 0. ADICIONAR COLUNAS DE COMPARTILHAMENTO NA TABELA EVENT_SERIES
ALTER TABLE public.event_series ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE public.event_series ADD COLUMN IF NOT EXISTS target_user_ids UUID[] DEFAULT '{}';

-- 1. ATUALIZAR POLÍTICAS DE RLS PARA PERMITIR GERENCIAMENTO COMPARTILHADO ENTRE ANA E CAROL
DROP POLICY IF EXISTS "Users can manage own event_series" ON public.event_series;
CREATE POLICY "Duo can manage event_series" ON public.event_series
    FOR ALL USING (
        auth.uid() IN ('0ab9972c-7535-4cf1-803c-8f7964add982', '819f65ef-17c3-4e9a-a804-c56d5b5dbeeb')
    )
    WITH CHECK (
        auth.uid() IN ('0ab9972c-7535-4cf1-803c-8f7964add982', '819f65ef-17c3-4e9a-a804-c56d5b5dbeeb')
    );

DROP POLICY IF EXISTS "Users can manage own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Duo can view and manage profiles" ON public.profiles
    FOR ALL USING (
        auth.uid() IN ('0ab9972c-7535-4cf1-803c-8f7964add982', '819f65ef-17c3-4e9a-a804-c56d5b5dbeeb')
    )
    WITH CHECK (
        auth.uid() IN ('0ab9972c-7535-4cf1-803c-8f7964add982', '819f65ef-17c3-4e9a-a804-c56d5b5dbeeb')
    );

-- 2. SEED INICIAL PARA A CAROL (819f65ef-17c3-4e9a-a804-c56d5b5dbeeb)
DO $$
DECLARE
    carol_id UUID := '819f65ef-17c3-4e9a-a804-c56d5b5dbeeb';
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Perfil Carol
    INSERT INTO public.profiles (
        user_id, display_name, avatar_type, avatar_emoji, current_points, lifetime_points, total_xp, level, events_completed, onboarded
    )
    VALUES (
        carol_id, 'Carol', 'emoji', 'gem', 0, 0, 0, 1, 0, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = 'Carol',
        updated_at = NOW();

    -- Configurações Carol
    INSERT INTO public.user_settings (
        user_id, default_event_points, allow_negative_points, theme, notifications_enabled, sounds_enabled, app_volume, notification_lead_minutes, timezone, first_day_of_week
    )
    VALUES (
        carol_id, 10, false, 'system', false, true, 70, 0, 'America/Sao_Paulo', 1
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    -- Recompensas Carol
    IF NOT EXISTS (SELECT 1 FROM public.rewards WHERE user_id = carol_id) THEN
        INSERT INTO public.rewards (user_id, title, emoji, description, cost, duration_minutes, active)
        VALUES
            (carol_id, 'Filme', 'film', 'Tempo livre para assistir um bom filme sem culpa', 100, 120, true),
            (carol_id, 'Leitura sem culpa', 'book', 'Meia hora relaxando com meu livro favorito', 50, 30, true),
            (carol_id, 'Café especial', 'coffee', 'Pausa para saborear um café artesanal bem quentinho', 30, 30, true);
    END IF;

    -- Rotina Inicial da Carol (Segunda a Sexta)
    IF NOT EXISTS (SELECT 1 FROM public.event_series WHERE user_id = carol_id) THEN
        INSERT INTO public.event_series (
            user_id, title, description, category, start_date, start_time, end_time,
            all_day, is_recurring, recurrence_type, recurrence_days, points, event_type, is_shared, active
        )
        VALUES
            (carol_id, 'LIVRE', '', 'Livre', today_date, '07:00', '08:00', false, true, 'weekdays', '{1,2,3,4,5}', 0, 'free_slot', false, true),
            (carol_id, 'CAFÉ DA MANHÃ', '', 'Rotina', today_date, '08:00', '09:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true, true),
            (carol_id, 'TRABALHO / PROJETO', '', 'Trabalho', today_date, '09:00', '12:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', false, true),
            (carol_id, 'ALMOÇO', '', 'Rotina', today_date, '12:00', '13:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true, true),
            (carol_id, 'PASSEAR DOGS', '', 'Rotina', today_date, '13:30', '14:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true, true),
            (carol_id, 'TRABALHO / FOCO', '', 'Trabalho', today_date, '14:00', '18:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', false, true),
            (carol_id, 'LIVRE', '', 'Livre', today_date, '18:30', '20:00', false, true, 'weekdays', '{1,2,3,4,5}', 0, 'free_slot', false, true),
            (carol_id, 'ACADEMIA', '', 'Saúde', today_date, '20:00', '21:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true, true);
    END IF;

END $$;
