/**
 * BioCake — orders.js
 * Plasează comenzi via RPC place_order (preț din DB, insert atomic).
 * Pornește plata Netopia via Edge Function netopia-start.
 */

/* ── Livrare (UI coș / checkout — server recalculează la submit) ─ */
const DELIVERY_FEES = {
    bucuresti: { free_threshold: 250, fee: 20 },
    ilfov:     { free_threshold: 600, fee: 40 },
};

function calculateOrderDeliveryFee(zone, subtotal) {
    const cfg = DELIVERY_FEES[zone] || DELIVERY_FEES.bucuresti;
    return subtotal >= cfg.free_threshold ? 0 : cfg.fee;
}

function _functionsBaseUrl() {
    return 'https://trwnnbszsgmxezkrpued.supabase.co/functions/v1';
}

function _anonKey() {
    return 'sb_publishable_BKtT3xvutqKDc5eZicj2cg_mLogkvTU';
}

/* ── Submit order ────────────────────────────────────── */
async function submitOrder({
    cart,
    customerName,
    customerPhone,
    customerEmail = null,
    deliveryZone,
    deliveryDate,
    deliveryTime = null,
    deliveryAddress = null,
    notes = null,
}) {
    const db = window._biocakeSupabase;
    if (!db) throw new Error('Supabase client not initialized');
    if (!cart || !cart.length) throw new Error('Coșul este gol');

    // Normalize time to HH:MM:SS for Postgres `time`
    let timeValue = null;
    if (deliveryTime) {
        timeValue = /^\d{2}:\d{2}:\d{2}$/.test(deliveryTime)
            ? deliveryTime
            : `${deliveryTime}:00`;
    }

    const items = cart.map(item => ({
        slug: item.id,
        qty:  Number(item.qty),
    }));

    const { data, error } = await db.rpc('place_order', {
        p_customer_name:    customerName,
        p_customer_phone:   customerPhone,
        p_customer_email:   customerEmail,
        p_delivery_zone:    deliveryZone,
        p_delivery_date:    deliveryDate,
        p_delivery_time:    timeValue,
        p_delivery_address: deliveryAddress,
        p_notes:            notes,
        p_items:            items,
    });

    if (error) throw error;
    if (!data || !data.id) throw new Error('Răspuns invalid de la server');

    return {
        order:       { id: data.id },
        subtotal:    Number(data.subtotal),
        deliveryFee: Number(data.delivery_fee),
        total:       Number(data.total),
        advanceDue:  Number(data.advance_due),
    };
}

/**
 * Pornește plata Netopia (hosted). Amount din DB pe server.
 * @param {string} orderId
 * @param {'advance'|'full'} payMode
 */
async function startNetopiaPayment(orderId, payMode) {
    if (!orderId) throw new Error('orderId lipsă');
    if (payMode !== 'advance' && payMode !== 'full') {
        throw new Error('Mod de plată invalid');
    }

    const url = `${_functionsBaseUrl()}/netopia-start`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${_anonKey()}`,
            apikey: _anonKey(),
        },
        body: JSON.stringify({ orderId, payMode }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.paymentUrl) {
        const msg = data.error || data.message || `Eroare plată (${res.status})`;
        throw new Error(msg);
    }

    return {
        paymentUrl: data.paymentUrl,
        amount: Number(data.amount),
        payMode: data.payMode || payMode,
    };
}
