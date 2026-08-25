import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TIMEZONE = 'America/Sao_Paulo';

export function todayISO() {
    return format(new Date(), 'yyyy-MM-dd');
}

export function dateToStr(d) {
    if (!d) return '';
    if (typeof d === 'string') return d.slice(0, 10);
    if (d instanceof Date && !isNaN(d.getTime())) {
        return format(d, 'yyyy-MM-dd');
    }
    return '';
}

export function formatDateLong(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatDateShort(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return format(d, "d 'de' MMMM", { locale: ptBR });
}

export function formatWeekday(date) {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return format(d, 'EEEE', { locale: ptBR });
}

export function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
}

export function formatTime(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        if (date.includes('T')) {
            const d = new Date(date);
            return isNaN(d.getTime()) ? '' : format(d, 'HH:mm');
        }
        // Time string "07:00:00" or "07:00"
        return date.slice(0, 5);
    }
    if (date instanceof Date && !isNaN(date.getTime())) {
        return format(date, 'HH:mm');
    }
    return '';
}

export function currentTimeHHMM() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

export function isTimeBefore(timeA, timeB) {
    if (!timeA || !timeB) return false;
    const [hA, mA] = timeA.slice(0, 5).split(':').map(Number);
    const [hB, mB] = timeB.slice(0, 5).split(':').map(Number);
    if (hA !== hB) return hA < hB;
    return mA < mB;
}

export function addMinutesToTimeStr(timeStr, minutesToAdd = 30) {
    if (!timeStr) return '10:00';
    const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
    const totalMin = Math.min(23 * 60 + 59, (h || 0) * 60 + (m || 0) + minutesToAdd);
    const newH = Math.floor(totalMin / 60);
    const newM = totalMin % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function normalizeTimeStr(timeStr) {
    if (!timeStr) return '00:00:00';
    const parts = String(timeStr).trim().split(':');
    const h = (parts[0] || '00').padStart(2, '0');
    const m = (parts[1] || '00').padStart(2, '0');
    const s = (parts[2] || '00').padStart(2, '0');
    return `${h}:${m}:${s}`;
}

export function combine(dateStr, timeStr) {
    const d = dateToStr(dateStr);
    const t = normalizeTimeStr(timeStr);
    const dt = new Date(`${d}T${t}`);
    if (isNaN(dt.getTime())) {
        return new Date();
    }
    return dt;
}

export function minutesToLabel(min) {
    if (!min && min !== 0) return '0 min';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export function durationMinutes(startIso, endIso) {
    if (!startIso || !endIso) return 0;
    const diff = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
    return isNaN(diff) ? 0 : diff;
}

export function addDaysStr(dateStr, n) {
    const d = typeof dateStr === 'string' ? parseISO(dateStr.slice(0, 10) + 'T00:00:00') : dateStr;
    return dateToStr(addDays(d, n));
}