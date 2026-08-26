import { parseISO, getDay, isSameDay, eachDayOfInterval } from 'date-fns';
import { supabase } from './supabase.js';
import { combine, dateToStr } from './datetime.js';

export function occursOnDate(series, date) {
    if (!series || !series.start_date) return false;
    const start = parseISO(series.start_date + 'T00:00:00');
    // For single occurrence events
    if (!series.is_recurring || series.recurrence_type === 'none') {
        return isSameDay(date, start);
    }
    // If date is before the series started, do not show
    if (date < start && !isSameDay(date, start)) {
        return false;
    }
    const dow = getDay(date); // 0 Sun .. 6 Sat
    if (series.recurrence_type === 'daily') return true;
    if (series.recurrence_type === 'weekdays') return dow >= 1 && dow <= 5;
    if (series.recurrence_type === 'weekly') {
        return (series.recurrence_days || []).includes(dow);
    }
    if (series.recurrence_type === 'custom') {
        return (series.recurrence_days || []).includes(dow);
    }
    return false;
}

export function buildOccurrence(series, date) {
    const ds = dateToStr(date);
    const startsAt = combine(ds, series.start_time);
    const endsAt = series.all_day ? null : combine(ds, series.end_time || series.start_time);
    return {
        event_series_id: series.id,
        occurrence_date: ds,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        series,
    };
}

export async function fetchSeries(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
        .from('event_series')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching event series:', error);
        return [];
    }
    return data || [];
}

export async function fetchDayOccurrences(date, userId) {
    if (!userId) return [];
    const ds = dateToStr(date);
    const [seriesList, { data: records, error }] = await Promise.all([
        fetchSeries(userId),
        supabase
            .from('event_occurrences')
            .select('*')
            .eq('user_id', userId)
            .eq('occurrence_date', ds),
    ]);

    if (error) {
        console.error('Error fetching day occurrences:', error);
    }

    return buildDayOccurrences(seriesList, date, records || []);
}

export async function fetchRangeOccurrences(startDate, endDate, userId) {
    if (!userId) return [];
    const startStr = dateToStr(startDate);
    const endStr = dateToStr(endDate);

    const [seriesList, { data: records, error }] = await Promise.all([
        fetchSeries(userId),
        supabase
            .from('event_occurrences')
            .select('*')
            .eq('user_id', userId)
            .gte('occurrence_date', startStr)
            .lte('occurrence_date', endStr),
    ]);

    if (error) {
        console.error('Error fetching range occurrences:', error);
    }

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const allOccs = [];
    for (const d of days) {
        const dayOccs = buildDayOccurrences(seriesList, d, records || []);
        allOccs.push(...dayOccs);
    }
    return allOccs;
}

export function isExpired24h(endsAt) {
    if (!endsAt) return false;
    const endMs = new Date(endsAt).getTime();
    return Date.now() > endMs + 24 * 60 * 60 * 1000;
}

export function buildDayOccurrences(seriesList, date, records = []) {
    const occs = [];
    for (const s of seriesList) {
        if (!s.active) continue;
        if (!occursOnDate(s, date)) continue;
        const o = buildOccurrence(s, date);
        const rec = records.find(
            (r) => r.event_series_id === s.id && r.occurrence_date === o.occurrence_date
        );
        o.id = rec?.id || `virtual-${s.id}-${o.occurrence_date}`;

        let status = rec ? rec.status : 'scheduled';
        // Regra: considerar tarefa como não concluída quando passarem 24h da data/horário de fim
        if (status === 'scheduled' && o.ends_at && isExpired24h(o.ends_at)) {
            status = 'missed';
        }

        o.status = status;
        o.record = rec || null;
        o.points_value = s.points || 0;
        occs.push(o);
    }
    occs.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    return occs;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
    const aS = new Date(aStart).getTime();
    const aE = new Date(aEnd || aStart).getTime();
    const bS = new Date(bStart).getTime();
    const bE = new Date(bEnd || bStart).getTime();
    return aS < bE && bS < aE;
}

export function findFreeSlots(occs, durationMin = 30) {
    const slots = occs.filter((o) => o.series.event_type === 'free_slot');
    const busy = occs.filter((o) => o.series.event_type !== 'free_slot' && o.series.event_type !== 'reward');
    const blocks = [];

    for (const s of slots) {
        let cur = new Date(s.starts_at);
        const end = new Date(s.ends_at || s.starts_at);
        while (cur < end) {
            const blockEnd = new Date(cur.getTime() + 30 * 60000);
            if (blockEnd > end) break;
            const overlap = busy.some(
                (b) => new Date(b.starts_at) < blockEnd && new Date(b.ends_at || b.starts_at) > cur
            );
            if (!overlap) {
                blocks.push({ start: new Date(cur), end: new Date(blockEnd) });
            }
            cur = blockEnd;
        }
    }

    // merge contiguous blocks
    const merged = [];
    for (const b of blocks) {
        const last = merged[merged.length - 1];
        if (last && last.end.getTime() === b.start.getTime()) {
            last.end = b.end;
        } else {
            merged.push({ start: b.start, end: b.end });
        }
    }

    return merged.filter((m) => (m.end - m.start) / 60000 >= durationMin);
}