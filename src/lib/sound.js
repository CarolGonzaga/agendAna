let ctx;

export function playChime(volume = 0.5) {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = ctx || new AC();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const notes = [880, 1175, 1568];
        notes.forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = f;
            o.connect(g);
            g.connect(ctx.destination);
            const t = now + i * 0.14;
            const vol = Math.max(0, Math.min(1, volume)) * 0.25;
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(vol, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
            o.start(t);
            o.stop(t + 0.6);
        });
    } catch (e) {
        /* ignore */
    }
}