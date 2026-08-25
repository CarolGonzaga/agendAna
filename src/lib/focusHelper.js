let focusWindowRef = null;

export function isMobileOrPwa() {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const isMobileDevice = /iphone|ipad|ipod|android/i.test(navigator.userAgent || '');
    const isSmallScreen = window.innerWidth < 768;
    return isStandalone || isMobileDevice || isSmallScreen;
}

export function openFocusMode(navigate, occurrenceId) {
    const path = occurrenceId ? `/focus/${occurrenceId}` : '/focus';

    if (isMobileOrPwa()) {
        if (navigate) {
            navigate(path);
        } else {
            window.location.href = path;
        }
        return null;
    }

    // On Desktop/macOS: open compact popup window
    try {
        if (focusWindowRef && !focusWindowRef.closed) {
            focusWindowRef.location.href = path;
            focusWindowRef.focus();
            return focusWindowRef;
        }

        const width = 400;
        const height = 440;
        const left = Math.max(0, window.screen.width - width - 80);
        const top = 100;
        const features = `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;

        focusWindowRef = window.open(path, 'agendana_focus', features);

        if (!focusWindowRef || focusWindowRef.closed) {
            // Popup blocked: fallback to same window navigation
            if (navigate) navigate(path);
            else window.location.href = path;
            return null;
        }

        return focusWindowRef;
    } catch (e) {
        if (navigate) navigate(path);
        else window.location.href = path;
        return null;
    }
}

export function formatRemainingTimer(ms) {
    if (!ms || ms <= 0) return '00:00';

    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}
