import { supabase } from './supabase';
import { playChime } from './sound';

// Helper to convert base64 url-safe string to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function isPushSupported() {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'Notification' in window &&
        'PushManager' in window
    );
}

export function isPWAStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
    );
}

export function getNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

export async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        return registration;
    } catch (err) {
        console.error('ServiceWorker registration failed:', err);
        return null;
    }
}

export async function requestNotificationPermission() {
    if (!isPushSupported()) {
        throw new Error('Notificações não são suportadas neste navegador.');
    }
    const permission = await Notification.requestPermission();
    return permission;
}

export async function subscribeUserToPush(userId, vapidPublicKey) {
    if (!userId) throw new Error('Usuário não autenticado');
    if (!isPushSupported()) throw new Error('Web Push não suportado');

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada');
    }

    const reg = await registerServiceWorker();
    if (!reg) throw new Error('Falha ao inicializar Service Worker');

    let sub = await reg.pushManager.getSubscription();

    if (!sub && vapidPublicKey) {
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
        });
    }

    if (sub) {
        const subJson = sub.toJSON();
        const p256dh = subJson.keys?.p256dh || '';
        const auth = subJson.keys?.auth || '';

        const deviceName = navigator.userAgent.includes('iPhone')
            ? 'iPhone'
            : navigator.userAgent.includes('Mac')
            ? 'MacBook'
            : 'Navegador Web';

        await supabase.from('push_subscriptions').upsert(
            {
                user_id: userId,
                endpoint: sub.endpoint,
                p256dh,
                auth,
                user_agent: navigator.userAgent,
                device_name: deviceName,
                active: true,
                last_used_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
        );
    }

    return sub;
}

export async function sendLocalTestNotification(soundEnabled = true, volume = 0.7) {
    if (!('Notification' in window)) {
        throw new Error('Notificações não suportadas');
    }

    if (Notification.permission !== 'granted') {
        const p = await Notification.requestPermission();
        if (p !== 'granted') {
            throw new Error('Permissão de notificação não foi concedida');
        }
    }

    if (soundEnabled) {
        playChime(volume);
    }

    const title = 'AgendAna 🌙';
    const options = {
        body: '✨ Seu teste de lembrete do Grimório funcionou perfeitamente!',
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: 'test-notification',
    };

    if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, options);
    } else {
        new Notification(title, options);
    }

    localStorage.setItem('agendana_last_push_test', new Date().toISOString());
    return true;
}

export async function getNotificationDiagnostic(userId) {
    const isStandalone = isPWAStandalone();
    const permission = getNotificationPermission();
    let hasPushSub = false;

    if (isPushSupported()) {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                hasPushSub = !!sub;
            }
        } catch (e) {
            /* ignore */
        }
    }

    if (!hasPushSub && userId) {
        const { data } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('active', true)
            .limit(1);
        if (data && data.length) {
            hasPushSub = true;
        }
    }

    const lastTest = localStorage.getItem('agendana_last_push_test');

    return {
        pwaInstalled: isStandalone,
        permission: permission === 'granted',
        pushSubscription: hasPushSub,
        soundInApp: true,
        lastTest: lastTest ? new Date(lastTest) : null,
    };
}
