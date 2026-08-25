import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const TIMEZONE = 'America/Sao_Paulo';

export function todayISO() {
    return format(new Date(), 'yyyy-MM-dd');
}

export function dateToStr(d) {
    return format(d, 'yyyy-MM-dd');
}

export function formatDateLong(date) {
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatDateShort(date) {
    return format(date, "d 'de' MMMM", { locale: ptBR });
}

export function formatWeekday(date) {
    return format(date, 'EEEE', { locale: ptBR });
}

export function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
}

export function formatTime(date) {
    return format(date, 'HH:mm');
}

export function combine(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`);
}

export function minutesToLabel(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

export function durationMinutes(startIso, endIso) {
    return Math.round((new Date(endIso) - new Date(startIso)) / 60000);
}

export function addDaysStr(dateStr, n) {
    return dateToStr(addDays(parseISO(dateStr + 'T00:00:00'), n));
}