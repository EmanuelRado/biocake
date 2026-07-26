// ============================================================
//  BioCake — Edge Function: netopia-confirm
//  Interogă Netopia /operation/status și actualizează comanda.
//  Fallback când IPN-ul întârzie / eșuează (sandbox sau producție).
//
//  Secrets: NETOPIA_API_KEY, NETOPIA_POS_SIGNATURE, NETOPIA_IS_LIVE
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const API_KEY = (Deno.env.get('NETOPIA_API_KEY') ?? '').trim();
const POS_SIGNATURE = (Deno.env.get('NETOPIA_POS_SIGNATURE') ?? '').trim();
const IS_LIVE = (Deno.env.get('NETOPIA_IS_LIVE') ?? 'false').toLowerCase() === 'true';

const STATUS_URL = IS_LIVE
  ? 'https://secure.netopia-payments.com/operation/status'
  : 'https://secure-sandbox.netopia-payments.com/operation/status';

const STATUS = {
  PAID: 3,
  CONFIRMED: 5,
  CANCELED: 4,
  CREDIT: 8,
  ERROR: 11,
  DECLINED: 12,
  FRAUD: 13,
};

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

function mapPaymentStatus(ntpStatus: number): {
  payment_status: string;
  order_status: string | null;
} {
  if (ntpStatus === STATUS.PAID || ntpStatus === STATUS.CONFIRMED) {
    return { payment_status: 'paid', order_status: 'paid' };
  }
  if (ntpStatus === STATUS.CANCELED || ntpStatus === STATUS.CREDIT) {
    return { payment_status: 'canceled', order_status: null };
  }
  if (
    ntpStatus === STATUS.ERROR ||
    ntpStatus === STATUS.DECLINED ||
    ntpStatus === STATUS.FRAUD
  ) {
    return { payment_status: 'failed', order_status: null };
  }
  return { payment_status: 'started', order_status: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    if (!API_KEY || !POS_SIGNATURE) {
      return json({ error: 'Netopia nu este configurat (lipsesc secrets).' }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const orderId = String(body.orderId || '').trim();
    if (!orderId) return json({ error: 'orderId lipsă' }, 400);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(
        'id, status, payment_status, netopia_ntp_id, amount_paid, total, advance_due, pay_mode, delivery_date, delivery_time, customer_name',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) return json({ error: 'Comanda nu există' }, 404);

    const orderSummary = {
      id: order.id,
      total: Number(order.total),
      advanceDue: Number(order.advance_due),
      payMode: order.pay_mode || 'advance',
      date: order.delivery_date || '',
      time: order.delivery_time ? String(order.delivery_time).slice(0, 5) : '',
      name: order.customer_name || '',
    };

    if (order.payment_status === 'paid' && order.status === 'paid') {
      return json({
        ok: true,
        alreadyPaid: true,
        payment_status: 'paid',
        status: 'paid',
        ntpStatus: null,
        confirmed: true,
        order: orderSummary,
      });
    }

    const ntpID = order.netopia_ntp_id ? String(order.netopia_ntp_id) : '';
    if (!ntpID) {
      return json({
        error: 'Comanda nu are ntpID Netopia — plata nu a fost pornită.',
        payment_status: order.payment_status,
        order: orderSummary,
      }, 409);
    }

    const statusRes = await fetch(STATUS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify({
        posID: POS_SIGNATURE,
        ntpID,
        orderID: order.id,
      }),
    });

    const statusJson = await statusRes.json().catch(() => ({}));
    if (!statusRes.ok) {
      console.error('[netopia-confirm] HTTP', statusRes.status, statusJson);
      return json({
        error: 'Nu am putut interoga statusul plății la Netopia',
        details: statusJson,
        status: statusRes.status,
      }, 502);
    }

    // Răspuns tipic: { payment: { status, amount, ntpID }, error: { code } }
    // sau nested sub data
    const payment =
      statusJson?.payment ||
      statusJson?.data?.payment ||
      statusJson?.order?.payment ||
      {};
    const ntpStatus = Number(
      payment?.status ?? statusJson?.status ?? statusJson?.data?.status,
    );

    if (!Number.isFinite(ntpStatus)) {
      console.error('[netopia-confirm] status invalid', statusJson);
      return json({
        error: 'Răspuns Netopia fără status de plată',
        details: statusJson,
      }, 502);
    }

    const mapped = mapPaymentStatus(ntpStatus);
    const amount = payment?.amount != null ? Number(payment.amount) : null;

    const patch: Record<string, unknown> = {
      payment_status: mapped.payment_status,
      netopia_ntp_id: ntpID,
    };
    if (amount != null && Number.isFinite(amount)) patch.amount_paid = amount;
    if (mapped.order_status === 'paid') {
      patch.status = 'paid';
      patch.paid_at = new Date().toISOString();
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', order.id);

    if (updErr) throw updErr;

    return json({
      ok: true,
      payment_status: mapped.payment_status,
      status: mapped.order_status ?? order.status,
      ntpStatus,
      amount: amount ?? order.amount_paid,
      confirmed: mapped.payment_status === 'paid',
      order: {
        ...orderSummary,
        payMode: order.pay_mode || orderSummary.payMode,
      },
    });
  } catch (e) {
    console.error('[netopia-confirm]', e);
    return json({ error: String(e) }, 500);
  }
});
