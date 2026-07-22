// ============================================================
//  BioCake — Edge Function: netopia-ipn
//  IPN Netopia: verifică JWT (Verification-token) + actualizează comanda.
//
//  Secrets:
//    NETOPIA_POS_SIGNATURE
//    NETOPIA_PUBLIC_KEY     (PEM RSA public key)
//  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (auto)
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as jose from 'npm:jose@5';

const POS_SIGNATURE = Deno.env.get('NETOPIA_POS_SIGNATURE') ?? '';
const PUBLIC_KEY_PEM = (Deno.env.get('NETOPIA_PUBLIC_KEY') ?? '').replace(/\\n/g, '\n');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

/** Netopia PaymentStatus */
const STATUS = {
  NEW: 1,
  OPENED: 2,
  PAID: 3,
  CANCELED: 4,
  CONFIRMED: 5,
  CREDIT: 8,
  ERROR: 11,
  DECLINED: 12,
  FRAUD: 13,
};

function ipnOk(message: string, status: number | null = null) {
  return new Response(
    JSON.stringify({
      errorType: 0x00,
      errorCode: null,
      errorMessage: null,
      status,
      message,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function ipnFail(errorMessage: string, errorCode = 0x10000101) {
  return new Response(
    JSON.stringify({
      errorType: 0x02,
      errorCode,
      errorMessage,
      status: null,
      message: null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

async function sha512Base64(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest('SHA-512', data);
  const bytes = new Uint8Array(hash);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function verifyToken(verificationToken: string, rawBody: string) {
  if (!PUBLIC_KEY_PEM) {
    throw new Error('NETOPIA_PUBLIC_KEY lipsește');
  }
  if (!POS_SIGNATURE) {
    throw new Error('NETOPIA_POS_SIGNATURE lipsește');
  }

  const key = await jose.importSPKI(PUBLIC_KEY_PEM, 'RS512');
  const { payload } = await jose.jwtVerify(verificationToken, key, {
    algorithms: ['RS512', 'RS256'],
  });

  if (payload.iss !== 'NETOPIA Payments') {
    throw new Error('Issuer invalid');
  }

  const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
  if (aud !== POS_SIGNATURE) {
    throw new Error('Audience (POS) invalid');
  }

  const expected = await sha512Base64(rawBody);
  if (payload.sub !== expected) {
    throw new Error('Payload hash mismatch');
  }

  return payload;
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
    return new Response('ok', { status: 200 });
  }
  if (req.method !== 'POST') {
    return ipnFail('Method not allowed');
  }

  const rawBody = await req.text();
  const verificationToken =
    req.headers.get('Verification-token') ||
    req.headers.get('verification-token') ||
    '';

  try {
    if (!verificationToken) {
      return ipnFail('Missing Verification-token', 0x10000102);
    }

    await verifyToken(verificationToken, rawBody);

    const payload = JSON.parse(rawBody);
    const payment = payload?.payment ?? {};
    const order = payload?.order ?? {};
    const ntpStatus = Number(payment?.status);
    const orderID = String(order?.orderID || payment?.orderID || '').trim();
    const ntpID = payment?.ntpID != null ? String(payment.ntpID) : null;
    const amount = payment?.amount != null ? Number(payment.amount) : null;

    if (!orderID || Number.isNaN(ntpStatus)) {
      return ipnFail('IPN payload invalid');
    }

    const mapped = mapPaymentStatus(ntpStatus);
    const patch: Record<string, unknown> = {
      payment_status: mapped.payment_status,
      netopia_order_id: orderID,
    };
    if (ntpID) patch.netopia_ntp_id = ntpID;
    if (amount != null && Number.isFinite(amount)) patch.amount_paid = amount;
    if (mapped.order_status === 'paid') {
      patch.status = 'paid';
      patch.paid_at = new Date().toISOString();
    }

    const { data: existing, error: findErr } = await supabase
      .from('orders')
      .select('id, payment_status, status')
      .eq('id', orderID)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      // încearcă pe netopia_order_id
      const { data: byNtp, error: e2 } = await supabase
        .from('orders')
        .select('id, payment_status, status')
        .eq('netopia_order_id', orderID)
        .maybeSingle();
      if (e2) throw e2;
      if (!byNtp) {
        console.error('[netopia-ipn] order not found', orderID);
        return ipnFail('Order not found');
      }
      if (byNtp.payment_status === 'paid') {
        return ipnOk('already paid', ntpStatus);
      }
      const { error: upd } = await supabase.from('orders').update(patch).eq('id', byNtp.id);
      if (upd) throw upd;
      return ipnOk('payment updated', ntpStatus);
    }

    if (existing.payment_status === 'paid' && existing.status === 'paid') {
      return ipnOk('already paid', ntpStatus);
    }

    const { error: updErr } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', existing.id);

    if (updErr) throw updErr;

    const msg =
      mapped.payment_status === 'paid'
        ? 'payment was confirmed; deliver goods'
        : `payment status ${ntpStatus}`;

    return ipnOk(msg, ntpStatus);
  } catch (e) {
    console.error('[netopia-ipn]', e);
    return ipnFail(String(e));
  }
});
