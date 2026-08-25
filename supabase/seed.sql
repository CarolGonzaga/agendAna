-- ==============================================================================
-- AGENDANA — SEED DE DADOS INICIAIS
-- USUÁRIO: 0ab9972c-7535-4cf1-803c-8f7964add982
-- ==============================================================================

DO $$
DECLARE
    target_user_id UUID := '0ab9972c-7535-4cf1-803c-8f7964add982';
    today_date DATE := CURRENT_DATE;
BEGIN
    -- 1. PERFIL DO USUÁRIO
    INSERT INTO public.profiles (
        user_id,
        display_name,
        avatar_type,
        avatar_emoji,
        current_points,
        lifetime_points,
        total_xp,
        level,
        events_completed,
        onboarded
    )
    VALUES (
        target_user_id,
        'Ana',
        'emoji',
        'moon',
        0,
        0,
        0,
        1,
        0,
        true
    )
    ON CONFLICT (user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        updated_at = NOW();

    -- 2. CONFIGURAÇÕES DO USUÁRIO
    INSERT INTO public.user_settings (
        user_id,
        default_event_points,
        allow_negative_points,
        theme,
        notifications_enabled,
        sounds_enabled,
        app_volume,
        notification_lead_minutes,
        timezone,
        first_day_of_week
    )
    VALUES (
        target_user_id,
        10,
        false,
        'system',
        false,
        true,
        70,
        0,
        'America/Sao_Paulo',
        1
    )
    ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW();

    -- 3. RECOMPENSAS INICIAIS
    IF NOT EXISTS (SELECT 1 FROM public.rewards WHERE user_id = target_user_id) THEN
        INSERT INTO public.rewards (user_id, title, emoji, description, cost, duration_minutes, active)
        VALUES
            (target_user_id, 'Filme', 'film', 'Tempo livre para assistir um bom filme sem culpa', 100, 120, true),
            (target_user_id, 'Leitura sem culpa', 'book', 'Meia hora relaxando com meu livro favorito', 50, 30, true),
            (target_user_id, 'Café especial', 'coffee', 'Pausa para saborear um café artesanal bem quentinho', 30, 30, true);
    END IF;

    -- 4. ROTINA SEMANAL PADRÃO (SEGUNDA A SEXTA)
    IF NOT EXISTS (SELECT 1 FROM public.event_series WHERE user_id = target_user_id) THEN
        INSERT INTO public.event_series (
            user_id, title, description, category, start_date, start_time, end_time,
            all_day, is_recurring, recurrence_type, recurrence_days, points, event_type, active
        )
        VALUES
            (target_user_id, 'LIVRE', '', 'Livre', today_date, '07:00', '08:00', false, true, 'weekdays', '{1,2,3,4,5}', 0, 'free_slot', true),
            (target_user_id, 'CAFÉ DA MANHÃ', '', 'Rotina', today_date, '08:00', '09:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'Brivia • Publique • Mariana', '', 'Trabalho', today_date, '09:00', '09:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'LENDO SÁFICOS', '', 'Projeto', today_date, '09:30', '10:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'Brivia • Publique • Mariana • SAC', '', 'Trabalho', today_date, '10:00', '10:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'LENDO SÁFICOS', '', 'Projeto', today_date, '10:30', '11:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'Brivia • Publique • Mariana • SAC', '', 'Trabalho', today_date, '11:00', '12:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'ALMOÇO', '', 'Rotina', today_date, '12:00', '13:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'PASSEAR DOGS', '', 'Rotina', today_date, '13:30', '14:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'Brivia • Publique • Mariana • SAC', '', 'Trabalho', today_date, '14:00', '15:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'LIMPAR UM CÔMODO', '', 'Casa', today_date, '15:00', '15:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'Brivia • Publique • Mariana • SAC', '', 'Trabalho', today_date, '15:30', '16:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'LENDO SÁFICOS', '', 'Projeto', today_date, '16:00', '16:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'Brivia • Publique • Mariana • SAC', '', 'Trabalho', today_date, '16:30', '18:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'LENDO SÁFICOS', '', 'Projeto', today_date, '18:00', '18:30', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true),
            (target_user_id, 'LIVRE', '', 'Livre', today_date, '18:30', '20:00', false, true, 'weekdays', '{1,2,3,4,5}', 0, 'free_slot', true),
            (target_user_id, 'ACADEMIA', '', 'Saúde', today_date, '20:00', '21:00', false, true, 'weekdays', '{1,2,3,4,5}', 10, 'event', true);
    END IF;

END $$;
