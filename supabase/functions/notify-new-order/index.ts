// ============================================================
//  BioCake — Edge Function: notify-new-order
//  Trimite notificări push (Web Push / VAPID) când apare o comandă nouă.
//  Declanșată de un Database Webhook pe INSERT în tabela `orders`.
//
//  Secrete necesare (Project Settings → Edge Functions → Secrets):
//    VAPID_PUBLIC_KEY
//    VAPID_PRIVATE_KEY
//    VAPID_SUBJECT        (ex: mailto:contact@biocake.ro)
//  SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY sunt injectate automat.
// ============================================================
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@biocake.ro';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
    try {
        const body  = await req.json().catch(() => ({}));
        // Database Webhook trimite { type, table, record, old_record }
        const order = body.record ?? body;
        const name  = order?.customer_name ?? 'un client';
        const date  = order?.delivery_date ? ` (livrare ${order.delivery_date})` : '';

        const payload = JSON.stringify({
            title: 'Comandă nouă BioCake',
            body:  `Comandă de la ${name}${date}. Deschide panoul pentru detalii.`,
            url:   '/admin.html',
            tag:   'biocake-order-' + (order?.id ?? Date.now()),
        });

        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('*');
        if (error) throw error;

        const results = await Promise.allSettled(
            (subs ?? []).map((s) =>
                webpush.sendNotification(
                    { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                    payload,
                ).catch(async (err) => {
                    // 404/410 = subscription expirat → curăță-l
                    if (err?.statusCode === 404 || err?.statusCode === 410) {
                        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
                    }
                    throw err;
                })
            )
        );

        const sent = results.filter((r) => r.status === 'fulfilled').length;
        return new Response(
            JSON.stringify({ sent, total: subs?.length ?? 0 }),
            { headers: { 'Content-Type': 'application/json' } },
        );
    } catch (e) {
        return new Response(
            JSON.stringify({ error: String(e) }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
});
