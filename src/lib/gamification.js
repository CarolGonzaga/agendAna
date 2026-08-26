import { supabase } from './supabase';
import { getLevel } from './levels';

export async function findOccurrenceRecord(seriesId, occurrenceDate, userId) {
    const { data, error } = await supabase
        .from('event_occurrences')
        .select('*')
        .eq('event_series_id', seriesId)
        .eq('occurrence_date', occurrenceDate)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error finding occurrence record:', error);
        return null;
    }
    return data && data.length ? data[0] : null;
}

export async function ensureOccurrenceRecord(series, occ, userId) {
    let rec = await findOccurrenceRecord(series.id, occ.occurrence_date, userId);
    if (!rec) {
        const { data, error } = await supabase
            .from('event_occurrences')
            .insert({
                user_id: userId,
                event_series_id: series.id,
                occurrence_date: occ.occurrence_date,
                starts_at: occ.starts_at,
                ends_at: occ.ends_at,
                status: 'scheduled',
                points_value: series.points || 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating occurrence record:', error);
            // Fallback: try finding again in case of race condition
            return await findOccurrenceRecord(series.id, occ.occurrence_date, userId);
        }
        rec = data;
    }
    return rec;
}

export async function completeOccurrence(series, occ, profile, userId) {
    const rec = await ensureOccurrenceRecord(series, occ, userId);
    if (!rec || rec.status === 'completed' || rec.points_processed) {
        return { alreadyDone: true };
    }

    const pts = series.points || 0;
    const nowIso = new Date().toISOString();
    const hadPenalty = !!rec.penalty_processed;
    const effectivePointsGained = hadPenalty ? pts * 2 : pts;

    // 1. Update occurrence
    const { error: occError } = await supabase
        .from('event_occurrences')
        .update({
            status: 'completed',
            completed_at: nowIso,
            points_value: pts,
            points_processed: true,
            xp_processed: true,
            penalty_processed: false,
        })
        .eq('id', rec.id);

    if (occError) {
        console.error('Error updating occurrence status:', occError);
    }

    // 2. Insert points transaction (idempotent via unique constraint)
    const { error: ptError } = await supabase
        .from('points_transactions')
        .upsert(
            {
                user_id: userId,
                occurrence_id: rec.id,
                amount: pts,
                type: 'event_completed',
                description: `${series.title} concluído`,
            },
            { onConflict: 'occurrence_id,type' }
        );

    if (ptError) {
        console.error('Points transaction error:', ptError);
    }

    // 3. Insert XP transaction
    const { error: xpError } = await supabase
        .from('xp_transactions')
        .upsert(
            {
                user_id: userId,
                occurrence_id: rec.id,
                amount: pts,
            },
            { onConflict: 'occurrence_id', ignoreDuplicates: true }
        );

    if (xpError) {
        console.error('XP transaction error:', xpError);
    }

    // 4. Update profile points & XP
    const oldXp = profile.total_xp || 0;
    const newXp = oldXp + pts;
    const oldLevelInfo = getLevel(oldXp);
    const newLevelInfo = getLevel(newXp);
    const leveledUp = newLevelInfo.level > oldLevelInfo.level;

    const { error: profError } = await supabase
        .from('profiles')
        .update({
            current_points: (profile.current_points || 0) + effectivePointsGained,
            lifetime_points: (profile.lifetime_points || 0) + pts,
            total_xp: newXp,
            level: newLevelInfo.level,
            events_completed: (profile.events_completed || 0) + 1,
            updated_at: nowIso,
        })
        .eq('user_id', userId);

    if (profError) {
        console.error('Error updating profile:', profError);
    }

    return {
        pointsGained: pts,
        xpGained: pts,
        leveledUp,
        newLevel: newLevelInfo,
    };
}

export async function updateOccurrenceStatus(series, occ, newStatus, profile, userId) {
    if (newStatus === 'completed') {
        return await completeOccurrence(series, occ, profile, userId);
    }

    const rec = await ensureOccurrenceRecord(series, occ, userId);
    if (!rec) return null;

    const nowIso = new Date().toISOString();
    const previousStatus = rec.status;
    const pts = series.points || 0;

    // If it was completed before, revert points and XP
    if (previousStatus === 'completed' && rec.points_processed) {
        const newPoints = Math.max(0, (profile?.current_points || 0) - pts);
        const newXp = Math.max(0, (profile?.total_xp || 0) - pts);
        const newLevelInfo = getLevel(newXp);

        await supabase
            .from('profiles')
            .update({
                current_points: newPoints,
                total_xp: newXp,
                level: newLevelInfo.level,
                events_completed: Math.max(0, (profile?.events_completed || 1) - 1),
                updated_at: nowIso,
            })
            .eq('user_id', userId);

        await supabase
            .from('points_transactions')
            .delete()
            .eq('occurrence_id', rec.id)
            .eq('type', 'event_completed');

        await supabase
            .from('xp_transactions')
            .delete()
            .eq('occurrence_id', rec.id);
    }

    // Update occurrence record
    const { error: occError } = await supabase
        .from('event_occurrences')
        .update({
            status: newStatus,
            points_processed: false,
            xp_processed: false,
            penalty_processed: false,
            completed_at: null,
        })
        .eq('id', rec.id);

    if (occError) {
        console.error('Error updating occurrence status:', occError);
    }

    return { ok: true, status: newStatus };
}

export async function processMissed(occ, series, profile, allowNegative, userId) {
    const rec = await ensureOccurrenceRecord(series, occ, userId);
    if (!rec || rec.status !== 'scheduled' || rec.penalty_processed) {
        return null;
    }

    const pts = series.points || 0;

    // 1. Update occurrence status
    const { error: occError } = await supabase
        .from('event_occurrences')
        .update({
            status: 'missed',
            penalty_processed: true,
            points_value: pts,
        })
        .eq('id', rec.id);

    if (occError) {
        console.error('Error updating missed occurrence:', occError);
    }

    // 2. Insert negative points transaction
    await supabase
        .from('points_transactions')
        .upsert(
            {
                user_id: userId,
                occurrence_id: rec.id,
                amount: -pts,
                type: 'event_missed',
                description: `${series.title} encerrado`,
            },
            { onConflict: 'occurrence_id,type', ignoreDuplicates: true }
        );

    // 3. Update profile points
    let newPoints = (profile.current_points || 0) - pts;
    if (!allowNegative && newPoints < 0) {
        newPoints = 0;
    }

    await supabase
        .from('profiles')
        .update({
            current_points: newPoints,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    return { pointsLost: pts };
}

export async function redeemReward(reward, profile, allowNegative, userId) {
    const userPoints = profile.current_points || 0;
    if (userPoints < reward.cost) {
        return { ok: false, needed: reward.cost - userPoints };
    }

    // 1. Create redemption record
    const { data: redemption, error: redError } = await supabase
        .from('reward_redemptions')
        .insert({
            user_id: userId,
            reward_id: reward.id,
            cost: reward.cost,
            status: 'available',
            redeemed_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (redError) {
        console.error('Error creating redemption:', redError);
        return { ok: false, error: redError.message };
    }

    // 2. Insert transaction
    await supabase.from('points_transactions').insert({
        user_id: userId,
        reward_redemption_id: redemption.id,
        amount: -reward.cost,
        type: 'reward_redeemed',
        description: `Resgate: ${reward.title}`,
    });

    // 3. Deduct points from profile (XP never changes on reward redemption)
    let newPoints = userPoints - reward.cost;
    if (!allowNegative && newPoints < 0) {
        newPoints = 0;
    }

    await supabase
        .from('profiles')
        .update({
            current_points: newPoints,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    return { ok: true, redemption };
}

export async function scheduleRewardRedemption(redemption, reward, dateStr, startTime, endTime, userId) {
    const { data: series, error: seriesError } = await supabase
        .from('event_series')
        .insert({
            user_id: userId,
            title: reward.title,
            description: reward.description || '',
            category: 'Recompensa',
            start_date: dateStr,
            start_time: startTime,
            end_time: endTime,
            all_day: false,
            is_recurring: false,
            recurrence_type: 'none',
            recurrence_days: [],
            points: 0,
            event_type: 'reward',
            active: true,
        })
        .select()
        .single();

    if (seriesError) {
        console.error('Error creating reward event series:', seriesError);
        throw seriesError;
    }

    await supabase
        .from('reward_redemptions')
        .update({
            status: 'scheduled',
            scheduled_occurrence_id: series.id,
        })
        .eq('id', redemption.id);

    return series;
}