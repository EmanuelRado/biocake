/**
 * BioCake — orders.js
 * Salvează comenzi în Supabase (orders + order_items).
 * Etapa 3.
 */

/* ── Livrare ─────────────────────────────────────────── */
const DELIVERY_FEES = {
    bucuresti: { free_threshold: 250, fee: 20 },
    ilfov:     { free_threshold: 600, fee: 40 },
};

function calculateOrderDeliveryFee(zone, subtotal) {
    const cfg = DELIVERY_FEES[zone] || DELIVERY_FEES.bucuresti;
    return subtotal >= cfg.free_threshold ? 0 : cfg.fee;
}

/* ── UUID Generator Fallback (for file:// and insecure contexts) ── */
function _generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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

    const subtotal    = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const deliveryFee = calculateOrderDeliveryFee(deliveryZone, subtotal);
    const total       = subtotal + deliveryFee;
    const advanceDue  = Math.round(total * 0.5 * 100) / 100;
    const orderId     = _generateUUID();

    // Normalize time to HH:MM:SS for Postgres `time`
    let timeValue = null;
    if (deliveryTime) {
        timeValue = /^\d{2}:\d{2}:\d{2}$/.test(deliveryTime)
            ? deliveryTime
            : `${deliveryTime}:00`;
    }

    // 1. Insert order header (no .select().single() to avoid RLS SELECT restrictions)
    const { error: orderErr } = await db
        .from('orders')
        .insert({
            id:               orderId,
            customer_name:    customerName,
            customer_phone:   customerPhone,
            customer_email:   customerEmail,
            delivery_zone:    deliveryZone,
            delivery_date:    deliveryDate,
            delivery_time:    timeValue,
            delivery_address: deliveryAddress,
            notes,
            subtotal,
            delivery_fee:     deliveryFee,
            total,
            advance_due:      advanceDue,
        });

    if (orderErr) throw orderErr;

    // 2. Insert order lines
    const lines = cart.map(item => ({
        order_id:     orderId,
        product_slug: item.id,
        product_name: item.name,
        qty:          item.qty,
        unit:         item.unit,
        unit_price:   item.price,
        line_total:   Math.round(item.price * item.qty * 100) / 100,
    }));

    const { error: linesErr } = await db.from('order_items').insert(lines);
    if (linesErr) throw linesErr;

    // Return custom mock structure matching expected returned values
    return { 
        order: { id: orderId }, 
        subtotal, 
        deliveryFee, 
        total, 
        advanceDue 
    };
}
