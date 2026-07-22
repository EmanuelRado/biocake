/**
 * BioCake — Cart UI (Drawer lateral)
 * Etapa 2: Interfața vizuală a coșului de cumpărături.
 */

/* ── Inițializare ────────────────────────────────────── */
let _cartFocusBefore = null;

function initCartUI() {
    // Deschide drawer la click pe butonul din header
    document.getElementById('btn-cart')?.addEventListener('click', openCartDrawer);

    // Închide la click pe overlay
    document.getElementById('cart-overlay')?.addEventListener('click', closeCartDrawer);

    // Închide la butonul X
    document.getElementById('cart-close')?.addEventListener('click', closeCartDrawer);

    // Escape → închide drawer
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const drawer = document.getElementById('cart-drawer');
        if (drawer?.classList.contains('cart-drawer--open')) {
            e.preventDefault();
            closeCartDrawer();
        }
    });

    // Selector zonă livrare
    document.getElementById('zone-select')?.addEventListener('change', e => {
        saveZone(e.target.value);
        renderCartContents();
    });

    // Buton "Continuă spre comandă" → deschide checkout
    document.getElementById('cart-checkout-btn')?.addEventListener('click', () => {
        closeCartDrawer();
        setTimeout(() => openCheckout(), 180);
    });

    // Re-randează coșul la orice schimbare
    document.addEventListener('cart:updated', renderCartContents);

    // Încarcă starea inițială
    renderCartContents();
}

/* ── Open / Close ────────────────────────────────────── */
function openCartDrawer() {
    const drawer  = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer) return;

    _cartFocusBefore = document.activeElement;
    drawer.classList.add('cart-drawer--open');
    drawer.setAttribute('aria-modal', 'true');
    overlay?.classList.add('cart-overlay--visible');
    if (overlay) overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    renderCartContents();
    document.getElementById('cart-close')?.focus();
}

function closeCartDrawer() {
    const drawer  = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    drawer?.classList.remove('cart-drawer--open');
    drawer?.setAttribute('aria-modal', 'false');
    overlay?.classList.remove('cart-overlay--visible');
    if (overlay) overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (_cartFocusBefore && typeof _cartFocusBefore.focus === 'function') {
        _cartFocusBefore.focus();
    }
    _cartFocusBefore = null;
}

/* ── Render conținut drawer ──────────────────────────── */
function renderCartContents() {
    const items    = getCart();
    const zone     = getZone();
    const subtotal = getSubtotal();
    const delivery = getDeliveryFee(zone);
    const total    = subtotal + delivery;
    const threshold= getFreeDeliveryThreshold(zone);
    const remaining= Math.max(0, threshold - subtotal);

    // Badge header
    updateCartBadge(getCartCount());

    // Items list
    const listEl = document.getElementById('cart-items');
    if (listEl) {
        if (items.length === 0) {
            listEl.innerHTML = `
            <div class="cart-empty">
                <span aria-hidden="true">🛒</span>
                <p>Coșul tău este gol.</p>
                <p class="cart-empty-sub">Adaugă câteva delicii din meniu!</p>
            </div>`;
        } else {
            listEl.innerHTML = items.map(item => _cartItemHTML(item)).join('');
            _bindCartItemActions(listEl);
        }
    }

    // Zone selector sync
    const zoneEl = document.getElementById('zone-select');
    if (zoneEl) zoneEl.value = zone;

    // Totals
    _updateTotals({ subtotal, delivery, total, remaining, threshold, zone });
}

/* ── Item HTML ───────────────────────────────────────── */
function _cartCoverImage(item) {
    if (item.image) {
        if (typeof _safeImgSrc === 'function') {
            const safe = _safeImgSrc(item.image);
            return safe || null;
        }
        return item.image;
    }
    // Coș vechi fără image: încearcă din catalogul încărcat
    if (typeof getProductById === 'function') {
        const p = getProductById(item.id);
        if (p?.images?.length) {
            return typeof _safeImgSrc === 'function' ? (_safeImgSrc(p.images[0]) || null) : p.images[0];
        }
    }
    return null;
}

function _cartItemHTML(item) {
    const lineTotal = (item.price * item.qty).toFixed(2).replace('.', ',');
    const cover = _cartCoverImage(item);
    const esc = typeof _escHtml === 'function' ? _escHtml : _escCartAttr;

    const weightWarn = item.weightNote
        ? `<span class="cart-item-note">± max 100g variație greutate</span>`
        : '';
    const pieceNote = item.unit === 'buc' && item.pieceGrams
        ? `<span class="cart-item-note">${Number(item.pieceGrams)} g / buc</span>`
        : '';

    // Torturi (kg) → pills din min/step/max produs
    let qtyControl = '';
    if (item.unit === 'kg') {
        const opts = _cartWeightOptions(item);
        qtyControl = `
        <div class="cart-weight-pills" data-id="${esc(item.id)}" role="group" aria-label="Greutate">
            ${opts.map(w => `
            <button class="cart-weight-pill ${Math.abs(item.qty - w.kg) < 0.001 ? 'cart-weight-pill--active' : ''}"
                    data-id="${esc(item.id)}" data-kg="${w.kg}" type="button"
                    aria-pressed="${Math.abs(item.qty - w.kg) < 0.001 ? 'true' : 'false'}">
                ${esc(w.label)}
            </button>`).join('')}
        </div>
        <span class="cart-custom-note">Altă greutate? <a href="#comenzi-custom" class="cart-custom-link">Comandă custom</a></span>`;
    } else {
        // Prăjituri & cutii → +/−
        const qtyLabel = item.unit === 'cutie' ? `${item.qty} cutie` : `${item.qty} buc`;
        const minQty = _cartItemMinQty(item);
        const atMin = item.unit !== 'kg' && item.qty <= minQty;
        qtyControl = `
        <div class="qty-control">
            <button class="qty-btn qty-minus" data-id="${esc(item.id)}" aria-label="Scade cantitatea"
                    ${atMin ? 'disabled' : ''} title="${atMin ? `Minim ${minQty} ${esc(item.unit)}` : ''}">−</button>
            <span class="qty-value">${esc(qtyLabel)}</span>
            <button class="qty-btn qty-plus" data-id="${esc(item.id)}" aria-label="Crește cantitatea">+</button>
        </div>`;
    }

    const thumb = cover
        ? `<img src="${_escCartAttr(cover)}" alt="" class="cart-item-photo" loading="lazy" width="48" height="48">`
        : esc(item.emoji || '🍰');

    return `
    <div class="cart-item" data-id="${esc(item.id)}">
        <div class="cart-item-thumb${cover ? ' cart-item-thumb--photo' : ''}"
             style="${cover ? '' : `background:${esc(item.bg || 'var(--bg)')};`}"
             aria-hidden="true">
            ${thumb}
        </div>
        <div class="cart-item-info">
            <span class="cart-item-name">${esc(item.name)}</span>
            ${pieceNote}
            ${weightWarn}
            ${qtyControl}
        </div>
        <div class="cart-item-right">
            <span class="cart-item-price">${lineTotal} RON</span>
            <button class="cart-item-remove" data-id="${esc(item.id)}" aria-label="Elimină din coș">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    </div>`;
}

function _escCartAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function _cartItemMinQty(item) {
    if (typeof _itemMinQty === 'function') return _itemMinQty(item);
    if (item.minQty != null && item.minQty > 0) return Number(item.minQty);
    if (typeof getProductById === 'function') {
        const p = getProductById(item.id);
        if (p?.minQty != null) return Number(p.minQty);
    }
    return 1;
}

function _cartWeightOptions(item) {
    let product = item;
    if (typeof getProductById === 'function') {
        const live = getProductById(item.id);
        if (live) {
            product = {
                minQty: live.minQty ?? item.minQty,
                step:   live.step ?? item.step,
                maxQty: live.maxQty ?? item.maxQty,
            };
        }
    }
    if (typeof weightOptionsForProduct === 'function') {
        return weightOptionsForProduct(product);
    }
    return typeof WEIGHT_OPTIONS !== 'undefined' ? WEIGHT_OPTIONS : [];
}

/* ── Binding butoane item ─────────────────────────────── */
function _bindCartItemActions(container) {
    // Weight pills pentru torturi
    container.querySelectorAll('.cart-weight-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const id = pill.dataset.id;
            const kg = parseFloat(pill.dataset.kg);
            setItemQty(id, kg);
        });
    });

    // Comandă custom link → închide drawer
    container.querySelectorAll('.cart-custom-link').forEach(link => {
        link.addEventListener('click', () => closeCartDrawer());
    });

    // +/- pentru prăjituri & cutii
    container.querySelectorAll('.qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = btn.dataset.id;
            const item = getCart().find(i => i.id === id);
            if (item) changeQty(id, -item.step);
        });
    });

    container.querySelectorAll('.qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id   = btn.dataset.id;
            const item = getCart().find(i => i.id === id);
            if (item) changeQty(id, item.step);
        });
    });

    container.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });
}

/* ── Totaluri ────────────────────────────────────────── */
function _updateTotals({ subtotal, delivery, total, remaining, threshold, zone }) {
    const subtotalEl  = document.getElementById('cart-subtotal');
    const deliveryEl  = document.getElementById('cart-delivery');
    const totalEl     = document.getElementById('cart-total');
    const freeBarWrap = document.getElementById('cart-free-bar-wrap');
    const freeBar     = document.getElementById('cart-free-bar');
    const freeLabel   = document.getElementById('cart-free-label');
    const checkoutBtn = document.getElementById('cart-checkout-btn');

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2).replace('.', ',')} RON`;

    if (deliveryEl) {
        deliveryEl.textContent = delivery === 0
            ? 'Gratuită 🎉'
            : `${delivery} RON`;
    }

    if (totalEl) totalEl.textContent = `${total.toFixed(2).replace('.', ',')} RON`;

    // Bară progres livrare gratuită
    if (freeBarWrap && freeBar && freeLabel) {
        if (delivery === 0) {
            freeBarWrap.style.display = 'none';
        } else {
            freeBarWrap.style.display = 'block';
            const pct = Math.min(100, (subtotal / threshold) * 100);
            freeBar.style.width = `${pct}%`;
            freeLabel.textContent =
                `Mai adaugă ${remaining.toFixed(2).replace('.', ',')} RON pentru livrare gratuită în ${zone === 'ilfov' ? 'Ilfov' : 'București'}`;
        }
    }

    // Buton checkout — dezactivat dacă coșul e gol
    if (checkoutBtn) {
        const empty = getCartCount() === 0;
        checkoutBtn.disabled = empty;
        checkoutBtn.style.opacity = empty ? '0.45' : '1';
    }
}
