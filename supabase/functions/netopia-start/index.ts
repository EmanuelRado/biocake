// ============================================================
//  BioCake — Edge Function: netopia-start
//  Pornește plata Netopia (hosted page, instrument=null).
//  Amount din DB (advance_due sau total) — nu din client.
//
//  Secrets:
//    NETOPIA_API_KEY
//    NETOPIA_POS_SIGNATURE
//    NETOPIA_IS_LIVE          ("true" | "false")
//    SITE_URL                 (ex: https://biocake.ro)
//  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto)
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const API_KEY = Deno.env.get('NETOPIA_API_KEY') ?? '';
const POS_SIGNATURE = Deno.env.get('NETOPIA_POS_SIGNATURE') ?? '';
const IS_LIVE = (Deno.env.get('NETOPIA_IS_LIVE') ?? 'false').toLowerCase() === 'true';
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://biocake.ro').replace(/\/$/, '');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

const START_URL = IS_LIVE
  ? 'https://secure.netopia-payments.com/payment/card/start'
  : 'https://secure.sandbox.netopia-payments.com/payment/card/start';

const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
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
    const payMode = String(body.payMode || '').trim();

    if (!orderId) return json({ error: 'orderId lipsă' }, 400);
    if (payMode !== 'advance' && payMode !== 'full') {
      return json({ error: 'payMode invalid (advance|full)' }, 400);
    }

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, customer_email, delivery_address, delivery_zone, total, advance_due, status, payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) return json({ error: 'Comanda nu există' }, 404);

    if (order.payment_status === 'paid' || order.status === 'paid' || order.status === 'delivered') {
      return json({ error: 'Comanda este deja plătită' }, 409);
    }

    const amount = payMode === 'full'
      ? Number(order.total)
      : Number(order.advance_due);

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'Sumă invalidă pentru plată' }, 400);
    }

    const notifyUrl = `${SUPABASE_URL}/functions/v1/netopia-ipn`;
    const redirectUrl = `${SITE_URL}/?paid=1&order=${encodeURIComponent(order.id)}`;
    const cancelUrl = `${SITE_URL}/?paid=0&order=${encodeURIComponent(order.id)}`;

    const { firstName, lastName } = splitName(order.customer_name || 'Client BioCake');
    const email = order.customer_email || 'contact@biocake.ro';
    const phone = String(order.customer_phone || '').replace(/\D/g, '') || '0700000000';
    const city = order.delivery_zone === 'ilfov' ? 'Ilfov' : 'Bucuresti';

    const shortId = String(order.id).slice(0, 8).toUpperCase();
    const description = payMode === 'full'
      ? `BioCake comandă #${shortId} — plată integrală`
      : `BioCake comandă #${shortId} — avans 50%`;

    const payload = {
      config: {
        emailTemplate: '',
        emailSubject: '',
        cancelUrl,
        notifyUrl,
        redirectUrl,
        language: 'ro',
      },
      payment: {
        options: { installments: 1, bonus: 0 },
        instrument: null,
        data: {},
      },
      order: {
        ntpID: null,
        posSignature: POS_SIGNATURE,
        dateTime: new Date().toISOString(),
        orderID: order.id,
        description,
        amount,
        currency: 'RON',
        billing: {
          email,
          phone,
          firstName,
          lastName,
          city,
          country: 642,
          countryName: 'Romania',
          state: city,
          postalCode: '000000',
          details: order.delivery_address || '',
        },
        shipping: {
          email,
          phone,
          firstName,
          lastName,
          city,
          country: 642,
          countryName: 'Romania',
          state: city,
          postalCode: '000000',
          details: order.delivery_address || '',
        },
        products: [
          {
            name: description,
            code: shortId,
            category: 'dessert',
            price: amount,
            vat: 0,
          },
        ],
        installments: { selected: 0, available: [] },
        data: {
          biocakePayMode: payMode,
        },
      },
    };

    const netopiaRes = await fetch(START_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const netopiaJson = await netopiaRes.json().catch(() => ({}));
    if (!netopiaRes.ok) {
      console.error('[netopia-start] HTTP', netopiaRes.status, netopiaJson);
      return json({
        error: 'Netopia a refuzat inițierea plății',
        details: netopiaJson,
      }, 502);
    }

    const paymentUrl =
      netopiaJson?.data?.payment?.paymentURL ||
      netopiaJson?.data?.customerAction?.url ||
      null;

    const ntpID = netopiaJson?.data?.payment?.ntpID ?? null;

    if (!paymentUrl) {
      // error code 101 = redirect to payment page — URL should still be present
      console.error('[netopia-start] no paymentURL', netopiaJson);
      return json({
        error: 'Nu am primit URL de plată de la Netopia',
        details: netopiaJson,
      }, 502);
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update({
        pay_mode: payMode,
        payment_provider: 'netopia',
        payment_status: 'started',
        netopia_order_id: order.id,
        netopia_ntp_id: ntpID != null ? String(ntpID) : null,
        amount_paid: amount,
      })
      .eq('id', order.id);

    if (updErr) {
      console.error('[netopia-start] DB update', updErr);
      // tot redirectăm — plata e pornită
    }

    return json({
      paymentUrl,
      orderId: order.id,
      amount,
      payMode,
      ntpID,
    });
  } catch (e) {
    console.error('[netopia-start]', e);
    return json({ error: String(e) }, 500);
  }
});
