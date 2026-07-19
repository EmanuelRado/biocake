/**
 * BioCake — Cart Logic (localStorage)
 * Etapa 2: Gestiunea coșului de cumpărături.
 *
 * Structura unui item în coș:
 * { id, name, price, unit, qty, step, weightNote, pieceGrams, image, emoji, bg }
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
    const cover = (product.images && product.images[0]) || null;

    if (existing) {
        existing.qty = Math.round((existing.qty + qty) * 100) / 100;
        // Actualizează coperta dacă lipsea (coș vechi) sau s-a schimbat
        if (cover) existing.image = cover;
        if (product.minQty != null) existing.minQty = product.minQty;
    } else {
        items.push({
            id:         product.id,
            name:       product.name,
            price:      product.price,
            unit:       product.unit,
            qty:        qty,
            step:       product.step,
            minQty:     product.minQty || 1,
            weightNote: product.weightNote || false,
            pieceGrams: product.pieceGrams || null,
            image:      cover,
            emoji:      product.emoji,
            bg:         product.bg,
        });
    }

    saveCart(items);
    _notifyCartChange();
}

/**
 * Modifică cantitatea unui produs existent.
 * Respectă minimul de comandă (minQty) — nu coboară sub el.
 * @param {string} id
 * @param {number} delta — poate fi negativ
 */
function changeQty(id, delta) {
    const items = loadCart();
    const item = items.find(i => i.id === id);
    if (!item) return;

    const minQty = _itemMinQty(item);
    const newQty = Math.round((item.qty + delta) * 100) / 100;

    // Sub minim → nu permite (ștergerea se face din butonul X)
    if (newQty < minQty) return;

    if (newQty <= 0) {
        removeFromCart(id);
        return;
    }

    item.qty = newQty;
    // Persistă minQty pe iteme vechi din localStorage
    if (item.minQty == null) item.minQty = minQty;
    saveCart(items);
    _notifyCartChange();
}

/** Minim comandă pentru un item din coș (cu fallback din catalog). */
function _itemMinQty(item) {
    if (item.minQty != null && item.minQty > 0) return Number(item.minQty);
    if (typeof getProductById === 'function') {
        const p = getProductById(item.id);
        if (p?.minQty != null) return Number(p.minQty);
    }
    return 1;
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
