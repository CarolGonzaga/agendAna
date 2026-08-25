// Supabase Edge Function: send-push
// Cron schedule: * * * * * (runs every minute to dispatch scheduled notifications)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@agendana.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const now = new Date().toISOString();

        // 1. Fetch pending notifications scheduled for now or past
        const { data: notifications, error: notifError } = await supabase
            .from('scheduled_notifications')
            .select(`
                id,
                user_id,
                scheduled_for,
                occurrence_id,
                event_occurrences (
                    starts_at,
                    event_series (
                        title,
                        category
                    )
                )
            `)
            .eq('status', 'pending')
            .lte('scheduled_for', now)
            .limit(50);

        if (notifError) throw notifError;

        const results = [];

        for (const item of notifications || []) {
            // Find active push subscriptions for this user
            const { data: subscriptions } = await supabase
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', item.user_id)
                .eq('active', true);

            const title = item.event_occurrences?.event_series?.title || 'Compromisso';
            const payload = JSON.stringify({
                title: `AgendAna: ${title} 🌙`,
                body: 'Seu compromisso está começando agora.',
                icon: '/icon-192.svg',
                tag: `occ-${item.occurrence_id}`,
                data: { url: '/' },
            });

            let sentSuccess = false;

            for (const sub of subscriptions || []) {
                try {
                    const pushSub = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        },
                    };
                    await webpush.sendNotification(pushSub, payload);
                    sentSuccess = true;
                } catch (pushErr: any) {
                    console.error('Push send failed for endpoint:', sub.endpoint, pushErr);
                    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                        // Invalidate expired subscription
                        await supabase
                            .from('push_subscriptions')
                            .update({ active: false })
                            .eq('id', sub.id);
                    }
                }
            }

            // Update notification status
            await supabase
                .from('scheduled_notifications')
                .update({
                    status: sentSuccess ? 'sent' : 'failed',
                    sent_at: sentSuccess ? now : null,
                    attempt_count: (item.attempt_count || 0) + 1,
                })
                .eq('id', item.id);

            results.push({ id: item.id, sent: sentSuccess });
        }

        return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
