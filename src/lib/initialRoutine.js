import { supabase } from './supabase';
import { format } from 'date-fns';

export const INITIAL_ROUTINE = [
    { title: 'LIVRE', cat: 'Livre', s: '07:00', e: '08:00', type: 'free_slot', pts: 0 },
    { title: 'CAFÉ DA MANHÃ', cat: 'Rotina', s: '08:00', e: '09:00', type: 'event', pts: 10 },
    { title: 'Brivia • Publique • Mariana', cat: 'Trabalho', s: '09:00', e: '09:30', type: 'event', pts: 10 },
    { title: 'LENDO SÁFICOS', cat: 'Projeto', s: '09:30', e: '10:00', type: 'event', pts: 10 },
    { title: 'Brivia • Publique • Mariana • SAC', cat: 'Trabalho', s: '10:00', e: '10:30', type: 'event', pts: 10 },
    { title: 'LENDO SÁFICOS', cat: 'Projeto', s: '10:30', e: '11:00', type: 'event', pts: 10 },
    { title: 'Brivia • Publique • Mariana • SAC', cat: 'Trabalho', s: '11:00', e: '12:00', type: 'event', pts: 10 },
    { title: 'ALMOÇO', cat: 'Rotina', s: '12:00', e: '13:30', type: 'event', pts: 10 },
    { title: 'PASSEAR DOGS', cat: 'Rotina', s: '13:30', e: '14:00', type: 'event', pts: 10 },
    { title: 'Brivia • Publique • Mariana • SAC', cat: 'Trabalho', s: '14:00', e: '15:00', type: 'event', pts: 10 },
    { title: 'LIMPAR UM CÔMODO', cat: 'Casa', s: '15:00', e: '15:30', type: 'event', pts: 10 },
    { title: 'Brivia • Publique • Mariana • SAC', cat: 'Trabalho', s: '15:30', e: '16:00', type: 'event', pts: 10 },
    { title: 'LENDO SÁFICOS', cat: 'Projeto', s: '16:00', e: '16:30', type: 'event', pts: 10 },
    { title: 'Brivia • Publique • Mariana • SAC', cat: 'Trabalho', s: '16:30', e: '18:00', type: 'event', pts: 10 },
    { title: 'LENDO SÁFICOS', cat: 'Projeto', s: '18:00', e: '18:30', type: 'event', pts: 10 },
    { title: 'LIVRE', cat: 'Livre', s: '18:30', e: '20:00', type: 'free_slot', pts: 0 },
    { title: 'ACADEMIA', cat: 'Saúde', s: '20:00', e: '21:00', type: 'event', pts: 10 },
];

export const INITIAL_REWARDS = [
    { title: 'Filme', emoji: 'film', description: 'Tempo livre para assistir um bom filme sem culpa', cost: 100, duration_minutes: 120 },
    { title: 'Leitura sem culpa', emoji: 'book', description: 'Meia hora relaxando com meu livro favorito', cost: 50, duration_minutes: 30 },
    { title: 'Café especial', emoji: 'coffee', description: 'Pausa para saborear um café artesanal bem quentinho', cost: 30, duration_minutes: 30 },
];

export async function seedInitialData(userId) {
    if (!userId) return false;

    // Check if user already has event series
    const { data: existingSeries, error: seriesError } = await supabase
        .from('event_series')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

    if (seriesError) {
        console.error('Error checking event series:', seriesError);
    }

    if (!existingSeries || existingSeries.length === 0) {
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const records = INITIAL_ROUTINE.map((r) => ({
            user_id: userId,
            title: r.title,
            description: '',
            category: r.cat,
            start_date: dateStr,
            start_time: r.s,
            end_time: r.e,
            all_day: false,
            is_recurring: true,
            recurrence_type: 'weekdays',
            recurrence_days: [1, 2, 3, 4, 5],
            points: r.pts,
            event_type: r.type,
            active: true,
        }));

        const { error: insertError } = await supabase.from('event_series').insert(records);
        if (insertError) {
            console.error('Error seeding event_series:', insertError);
        }
    }

    // Check if user already has rewards
    const { data: existingRewards } = await supabase
        .from('rewards')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

    if (!existingRewards || existingRewards.length === 0) {
        const rewardRecords = INITIAL_REWARDS.map((rw) => ({
            user_id: userId,
            title: rw.title,
            emoji: rw.emoji,
            description: rw.description,
            cost: rw.cost,
            duration_minutes: rw.duration_minutes,
            active: true,
        }));

        await supabase.from('rewards').insert(rewardRecords);
    }

    return true;
}