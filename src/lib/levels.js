export const LEVELS = [
    { level: 1, name: 'Desperta', minXp: 0 },
    { level: 2, name: 'Aprendiz da Lua', minXp: 100 },
    { level: 3, name: 'Guardiã do Grimório', minXp: 250 },
    { level: 4, name: 'Bruxa da Névoa', minXp: 450 },
    { level: 5, name: 'Vampira do Crepúsculo', minXp: 700 },
    { level: 6, name: 'Feiticeira da Noite', minXp: 1000 },
    { level: 7, name: 'Mestra da Lua', minXp: 1400 },
    { level: 8, name: 'Lenda da Meia-Noite', minXp: 1900 },
];

export function getLevel(xp) {
    xp = Math.max(0, xp || 0);
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) {
        if (xp >= LEVELS[i].minXp) idx = i;
    }
    const cur = LEVELS[idx];
    const next = LEVELS[idx + 1] || null;
    const progress = next
        ? (xp - cur.minXp) / (next.minXp - cur.minXp)
        : 1;
    return {
        level: cur.level,
        name: cur.name,
        minXp: cur.minXp,
        nextXp: next ? next.minXp : null,
        nextName: next ? next.name : null,
        progress: Math.min(1, Math.max(0, progress)),
        toNext: next ? next.minXp - xp : 0,
    };
}