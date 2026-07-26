// ============================================================
//  BioCake — Edge Function: send-order-paid-email
//  Trimite email Resend după plata confirmată (idempotent).
//
//  Secrets:
//    RESEND_API_KEY
//    RESEND_FROM              (ex: BioCake <comenzi@biocake.ro>)
//    RESEND_REPLY_TO          (opțional, default contact@biocake.ro)
//    EMAIL_HOOK_SECRET        (header x-email-hook-secret)
//  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto)
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-email-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
const RESEND_FROM = (Deno.env.get('RESEND_FROM') ?? 'BioCake <comenzi@biocake.ro>').trim();
const RESEND_REPLY_TO = (Deno.env.get('RESEND_REPLY_TO') ?? 'contact@biocake.ro').trim();
const HOOK_SECRET = (Deno.env.get('EMAIL_HOOK_SECRET') ?? '').trim();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' RON';
}

function formatDateRo(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.includes('T') ? '' : 'T12:00:00'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildHtml(order: Record<string, unknown>, items: Array<Record<string, unknown>>): string {
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const payMode = order.pay_mode === 'full' ? 'Plată integrală' : 'Avans 50%';
  const amountPaid = Number(order.amount_paid ?? 0);
  const total = Number(order.total ?? 0);
  const time = order.delivery_time
    ? String(order.delivery_time).slice(0, 5)
    : '—';

  const rows = items.map((it) => {
    const qty = Number(it.qty);
    const unit = it.unit === 'kg' ? 'kg' : 'buc';
    const name = esc(it.product_name);
    const line = Number(it.line_total ?? 0);
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e6e0;">${qty} ${unit} × ${name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e6e0;text-align:right;">${formatMoney(line)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ro">
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Georgia,serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;padding:32px 28px;border:1px solid #efe4dc;">
    <p style="margin:0 0 4px;font-size:13px;color:#FC6D9F;letter-spacing:0.08em;text-transform:uppercase;">BioCake</p>
    <h1 style="margin:0 0 16px;font-size:26px;color:#3D2014;font-weight:400;">Plata a fost înregistrată</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#5c4033;">
      Bună, ${esc(order.customer_name)}! Am confirmat plata pentru comanda
      <strong>#${shortId}</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:15px;color:#3D2014;">
      ${rows}
    </table>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:15px;color:#3D2014;">
      <tr>
        <td style="padding:4px 0;">Total comandă</td>
        <td style="padding:4px 0;text-align:right;"><strong>${formatMoney(total)}</strong></td>
      </tr>
      <tr>
        <td style="padding:4px 0;">${payMode}</td>
        <td style="padding:4px 0;text-align:right;color:#FC6D9F;"><strong>${formatMoney(amountPaid)}</strong></td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:15px;color:#5c4033;">
      <strong>Livrare:</strong> ${esc(formatDateRo(String(order.delivery_date || '')))} · ${esc(time)}
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:#5c4033;">
      <strong>Adresă:</strong> ${esc(order.delivery_address || '—')}
    </p>

    <p style="margin:0;font-size:14px;line-height:1.5;color:#8a6f60;">
      Dacă ai întrebări, răspunde la acest email sau scrie-ne pe WhatsApp.
      Mulțumim că ai ales BioCake!
    </p>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    if (HOOK_SECRET) {
      const got = req.headers.get('x-email-hook-secret') ?? '';
      if (got !== HOOK_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY lipsește' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    if (!orderId) return json({ error: 'orderId lipsă' }, 400);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(
        'id, customer_name, customer_email, customer_phone, delivery_address, delivery_date, delivery_time, total, amount_paid, pay_mode, payment_status, status, confirmation_email_sent_at',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) return json({ error: 'Comanda nu există' }, 404);

    if (order.confirmation_email_sent_at) {
      return json({ ok: true, skipped: 'already_sent' });
    }

    if (order.payment_status !== 'paid' && order.status !== 'paid') {
      return json({ ok: true, skipped: 'not_paid' });
    }

    const to = String(order.customer_email || '').trim();
    if (!to || !to.includes('@')) {
      console.warn('[send-order-paid-email] no customer_email', orderId);
      return json({ ok: true, skipped: 'no_email' });
    }

    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('product_name, qty, unit, line_total')
      .eq('order_id', orderId);

    if (itemsErr) throw itemsErr;

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const html = buildHtml(order, items ?? []);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        reply_to: RESEND_REPLY_TO,
        subject: `BioCake — plata confirmată #${shortId}`,
        html,
      }),
    });

    const resendJson = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      console.error('[send-order-paid-email] Resend', resendRes.status, resendJson);
      return json({ error: 'Resend a refuzat trimiterea', details: resendJson }, 502);
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', orderId)
      .is('confirmation_email_sent_at', null);

    if (updErr) console.error('[send-order-paid-email] DB update', updErr);

    return json({ ok: true, sent: true, resendId: resendJson?.id ?? null });
  } catch (e) {
    console.error('[send-order-paid-email]', e);
    return json({ error: String(e) }, 500);
  }
});
