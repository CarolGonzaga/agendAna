import { getLevel, LEVELS } from '../levels.js';
import { overlaps, occursOnDate } from '../occurrences.js';

export function runTests() {
    console.log('--- EXECUTANDO TESTES UNITÁRIOS DE REGRAS CRÍTICAS ---');
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✓ PASSOU: ${message}`);
            passed++;
        } else {
            console.error(`✗ FALHOU: ${message}`);
            failed++;
        }
    }

    // 1. Níveis e XP
    const lvl0 = getLevel(0);
    assert(lvl0.level === 1 && lvl0.name === 'Desperta', '0 XP deve ser Nível 1 - Desperta');

    const lvl100 = getLevel(100);
    assert(lvl100.level === 2 && lvl100.name === 'Aprendiz da Lua', '100 XP deve ser Nível 2 - Aprendiz da Lua');

    const lvl250 = getLevel(250);
    assert(lvl250.level === 3 && lvl250.name === 'Guardiã do Grimório', '250 XP deve ser Nível 3 - Guardiã do Grimório');

    const lvl450 = getLevel(450);
    assert(lvl450.level === 4 && lvl450.name === 'Bruxa da Névoa', '450 XP deve ser Nível 4 - Bruxa da Névoa');

    const lvl700 = getLevel(700);
    assert(lvl700.level === 5 && lvl700.name === 'Vampira do Crepúsculo', '700 XP deve ser Nível 5 - Vampira do Crepúsculo');

    const lvl1000 = getLevel(1000);
    assert(lvl1000.level === 6 && lvl1000.name === 'Feiticeira da Noite', '1000 XP deve ser Nível 6 - Feiticeira da Noite');

    const lvl1400 = getLevel(1400);
    assert(lvl1400.level === 7 && lvl1400.name === 'Mestra da Lua', '1400 XP deve ser Nível 7 - Mestra da Lua');

    const lvl1900 = getLevel(1900);
    assert(lvl1900.level === 8 && lvl1900.name === 'Lenda da Meia-Noite', '1900 XP deve ser Nível 8 - Lenda da Meia-Noite');

    // 2. Sobreposição
    const ov1 = overlaps('2026-08-25T10:00:00Z', '2026-08-25T11:00:00Z', '2026-08-25T10:30:00Z', '2026-08-25T11:30:00Z');
    assert(ov1 === true, 'Intervalos sobrepostos (10h-11h e 10h30-11h30) devem acusar overlap');

    const ov2 = overlaps('2026-08-25T10:00:00Z', '2026-08-25T11:00:00Z', '2026-08-25T11:00:00Z', '2026-08-25T12:00:00Z');
    assert(ov2 === false, 'Intervalos contíguos (10h-11h e 11h-12h) NÃO devem acusar overlap');

    // 3. Recorrência
    const weekdaySeries = {
        start_date: '2026-08-01',
        is_recurring: true,
        recurrence_type: 'weekdays',
    };
    // 2026-08-25 is Tuesday (weekday)
    assert(occursOnDate(weekdaySeries, new Date('2026-08-25T12:00:00')), 'Série de dias úteis deve ocorrer na terça-feira');
    // 4. Parsing e Validação de Horários
    import('../datetime.js').then(({ combine, normalizeTimeStr, formatTime, isTimeBefore, addMinutesToTimeStr }) => {
        const c1 = combine('2026-08-25', '07:00:00');
        assert(!isNaN(c1.getTime()) && c1.toISOString().includes('2026-08-25'), 'combine com formato PostgreSQL 07:00:00 deve gerar data válida');
        const c2 = combine('2026-08-25', '07:00');
        assert(!isNaN(c2.getTime()) && c2.toISOString().includes('2026-08-25'), 'combine com formato HTML 07:00 deve gerar data válida');
        assert(formatTime('07:00:00') === '07:00', 'formatTime deve formatar 07:00:00 como 07:00');
        assert(isTimeBefore('08:00', '09:00') === true, 'isTimeBefore deve acusar que 08:00 é anterior a 09:00');
        assert(isTimeBefore('10:00', '09:00') === false, 'isTimeBefore deve acusar que 10:00 NÃO é anterior a 09:00');
        assert(addMinutesToTimeStr('09:00', 30) === '09:30', 'addMinutesToTimeStr deve somar 30 minutos corretamente');
    });

    // 5. Formatação do Modo Foco
    import('../focusHelper.js').then(({ formatRemainingTimer }) => {
        assert(formatRemainingTimer(0) === '00:00', 'formatRemainingTimer(0) deve ser 00:00');
        assert(formatRemainingTimer(-5000) === '00:00', 'formatRemainingTimer negativo deve ser 00:00 (sem números negativos)');
        assert(formatRemainingTimer(42000) === '00:42', 'formatRemainingTimer(42s) deve ser 00:42');
        assert(formatRemainingTimer(1476000) === '24:36', 'formatRemainingTimer(24m36s) deve ser 24:36');
        assert(formatRemainingTimer(5076000) === '01:24:36', 'formatRemainingTimer(1h24m36s) deve ser 01:24:36');
    });

    console.log(`\nRESULTADO: ${passed} passaram, ${failed} falharam.`);
    return { passed, failed };
}
