/**
 * BioCake — Cart Logic (localStorage)
 * Etapa 2: Gestiunea coșului de cumpărături.
 *
 * Structura unui item în coș:
 * { id: string, name: string, price: number, unit: string,
 *   qty: number, step: number, weightNote: boolean }
 */

const CART_KEY = 'biocake_cart';
const ZONE_KEY = 'biocake_zone';

/* ── Livrare ─────────────────────────────────────────── */
const DELIVERY = {
    bucuresti: { fee: 20, freeAbove: 250 },
    ilfov:     { fee: 40, freeAbove: 600 },
};

/* ── Persistență ─────────────────────────────────────── */
function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function loadZone() {
    return localStorage.getItem(ZONE_KEY) || 'bucuresti';
}

function saveZone(zone) {
    localStorage.setItem(ZONE_KEY, zone);
}

/* ── Stare curentă ───────────────────────────────────── */
function getCart() {
    return loadCart();
}

function getZone() {
    return loadZone();
}

/* ── Operații ────────────────────────────────────────── */

/**
 * Adaugă un produs în coș sau crește cantitatea dacă există deja.
 * @param {Object} product — din PRODUCTS (data.js)
 * @param {number} qty — cantitatea de adăugat
 */
function addToCart(product, qty) {
    const items = loadCart();
    const existing = items.find(i => i.id === product.id);

    if (existing) {
        existing.qty = Math.round((existing.qty + qty) * 100) / 100;
    } else {
        items.push({
            id:         product.id,
            name:       product.name,
            price:      product.price,
            unit:       product.unit,
            qty:        qty,
            step:       product.step,
            weightNote: product.weightNote || false,
            emoji:      product.emoji,
            bg:         product.bg,
        });
    }

    saveCart(items);
    _notifyCartChange();
}

/**
 * Modifică cantitatea unui produs existent.
 * @param {string} id
 * @param {number} delta — poate fi negativ
 */
function changeQty(id, delta) {
    const items = loadCart();
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.round((item.qty + delta) * 100) / 100;

    if (newQty <= 0) {
        removeFromCart(id);
        return;
    }

    item.qty = newQty;
    saveCart(items);
    _notifyCartChange();
}

/**
 * Elimină complet un produs din coș.
 * @param {string} id
 */
function removeFromCart(id) {
    const items = loadCart().filter(i => i.id !== id);
    saveCart(items);
    _notifyCartChange();
}

/**
 * Setează direct cantitatea unui produs (folosit de pills torturi din coș).
 * @param {string} id
 * @param {number} qty
 */
function setItemQty(id, qty) {
    const items = loadCart();
    const item = items.find(i => i.id === id);
    if (!item || qty <= 0) return;
    item.qty = Math.round(qty * 100) / 100;
    saveCart(items);
    _notifyCartChange();
}

/** Golește complet coșul. */
function clearCart() {
    saveCart([]);
    _notifyCartChange();
}

/* ── Calcule ─────────────────────────────────────────── */

/** Numărul total de produse distincte în coș. */
function getCartCount() {
    return loadCart().length;
}

/** Suma produselor (fără livrare). */
function getSubtotal() {
    return loadCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

/**
 * Costul de livrare pentru zona selectată.
 * @param {string} zone — 'bucuresti' | 'ilfov'
 * @returns {number}
 */
function getDeliveryFee(zone) {
    const z = DELIVERY[zone] || DELIVERY.bucuresti;
    return getSubtotal() >= z.freeAbove ? 0 : z.fee;
}

/** Total final (produse + livrare). */
function getTotal(zone) {
    return getSubtotal() + getDeliveryFee(zone || loadZone());
}

/** Pragul de livrare gratuită pentru zona curentă. */
function getFreeDeliveryThreshold(zone) {
    return (DELIVERY[zone] || DELIVERY.bucuresti).freeAbove;
}

/* ── Notificări interne ──────────────────────────────── */
function _notifyCartChange() {
    // Actualizează badge-ul din header
    if (typeof updateCartBadge === 'function') {
        updateCartBadge(getCartCount());
    }
    // Notifică UI-ul coșului să se re-randeze
    document.dispatchEvent(new CustomEvent('cart:updated'));
}

/** Golește coșul complet (apelat după plasarea comenzii). */
function clearCart() {
    localStorage.removeItem(CART_KEY);
    _notifyCartChange();
}
