/**
 * BioCake — admin.js
 * Etapa 5: Panou administrator — autentificare, comenzi realtime, toggle produse.
 */

/* ── State ───────────────────────────────────────────── */
let _orders          = [];
let _products        = [];
let _currentFilter   = 'all';
let _realtimeChannel = null;

const STATUS_LABEL = {
    pending:   'În Așteptare',
    confirmed: 'Confirmată',
    paid:      'Plătită',
    delivered: 'Livrată',
};
const NEXT_STATUS = {
    pending: 'confirmed', confirmed: 'paid', paid: 'delivered',
};
const NEXT_LABEL = {
    pending: '✓ Confirmă Comanda',
    confirmed: '💳 Marchează Plătit',
    paid: '🚚 Marchează Livrat',
};
const CATEGORY_LABELS = {
    'torturi-clasice': '🎂 Torturi Clasice',
    'prajituri':       '🥧 Prăjituri',
    'office-box':      '🎁 Office Box',
    'vegan-raw':       '🌱 Vegan & Raw',
};

/* ── Init ────────────────────────────────────────────── */
async function initAdmin() {
    const sb = window._biocakeSupabase;

    // Resolve initial auth state
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
        _showDashboard();
    } else {
        _showLogin();
    }

    // React to auth changes (login / logout)
    sb.auth.onAuthStateChange((_event, session) => {
        if (session) _showDashboard();
        else         _showLogin();
    });

    // Login form
    document.getElementById('login-form')
        .addEventListener('submit', _handleLogin);

    // Logout button
    document.getElementById('btn-logout')
        .addEventListener('click', _handleLogout);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => _switchTab(btn.dataset.tab));
    });

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => _setFilter(chip.dataset.filter));
    });

    // Edit modal: close + save + delete
    document.getElementById('edit-close').addEventListener('click', _closeEditModal);
    document.getElementById('edit-save').addEventListener('click', _saveProduct);
    document.getElementById('edit-delete').addEventListener('click', _deleteProduct);
    document.getElementById('btn-new-product').addEventListener('click', _openNewProductModal);

    // Close on backdrop click
    document.getElementById('edit-overlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) _closeEditModal();
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') _closeEditModal();
    });
}

/* ── Auth ────────────────────────────────────────────── */
async function _handleLogin(e) {
    e.preventDefault();
    const sb       = window._biocakeSupabase;
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('btn-login');
    const errorEl  = document.getElementById('login-error');

    btn.disabled     = true;
    btn.textContent  = 'Se autentifică…';
    errorEl.textContent = '';

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
        errorEl.textContent = 'Email sau parolă incorectă. Încearcă din nou.';
        btn.disabled    = false;
        btn.textContent = 'Intră în cont';
    }
}

async function _handleLogout() {
    await window._biocakeSupabase.auth.signOut();
}

/* ── Dashboard visibility ────────────────────────────── */
function _showDashboard() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    loadOrders();
    loadProducts();
    _setupRealtime();
}

function _showLogin() {
    document.getElementById('admin-app').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
    document.getElementById('btn-login').disabled = false;
    document.getElementById('btn-login').textContent = 'Intră în cont';
    _teardownRealtime();
    _orders   = [];
    _products = [];
}

/* ── Tab switching ───────────────────────────────────── */
function _switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === `tab-${tab}`);
    });
}

/* ── Realtime ────────────────────────────────────────── */
function _setupRealtime() {
    const sb = window._biocakeSupabase;

    _realtimeChannel = sb
        .channel('admin-orders-rt')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            () => {
                // New order — reload everything (need order_items join)
                loadOrders();
            }
        )
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            (payload) => {
                const updated = payload.new;
                const idx = _orders.findIndex(o => o.id === updated.id);
                if (idx !== -1) {
                    _orders[idx] = { ..._orders[idx], ...updated };
                    _renderOrders();
                }
            }
        )
        .subscribe();
}

function _teardownRealtime() {
    if (_realtimeChannel) {
        window._biocakeSupabase.removeChannel(_realtimeChannel);
        _realtimeChannel = null;
    }
}

/* ── Orders ──────────────────────────────────────────── */
async function loadOrders() {
    const listEl = document.getElementById('orders-list');
    listEl.innerHTML = '<div class="loading"></div>';

    const { data, error } = await window._biocakeSupabase
        .from('orders')
        .select('*, order_items(*)')
        .order('delivery_date', { ascending: true })
        .order('created_at',    { ascending: false });

    if (error) {
        listEl.innerHTML = '<div class="error">Nu s-au putut încărca comenzile.</div>';
        return;
    }

    _orders = data || [];
    _renderOrders();
}

function _renderOrders() {
    const listEl   = document.getElementById('orders-list');
    const filtered = _currentFilter === 'all'
        ? _orders
        : _orders.filter(o => o.status === _currentFilter);

    _updateFilterCounts();
    _updateTabBadge();

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty">Nicio comandă în această categorie.</div>';
        return;
    }

    listEl.innerHTML = filtered.map(_renderOrderCard).join('');

    // Attach advance-status button listeners
    listEl.querySelectorAll('.btn-advance').forEach(btn => {
        btn.addEventListener('click', () => {
            advanceOrderStatus(btn.dataset.orderId, btn.dataset.nextStatus);
        });
    });
}

function _renderOrderCard(order) {
    const deliveryDate = new Date(order.delivery_date + 'T00:00:00');
    const today        = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow     = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday    = deliveryDate.getTime() === today.getTime();
    const isTomorrow = deliveryDate.getTime() === tomorrow.getTime();

    const dateStr = deliveryDate.toLocaleDateString('ro-RO', {
        weekday: 'short', day: 'numeric', month: 'short',
    });

    const urgencyBadge = isToday
        ? '<span class="urgency-badge today">AZI</span>'
        : isTomorrow
            ? '<span class="urgency-badge soon">MÂINE</span>'
            : '';

    const items = (order.order_items || [])
        .map(i => `<span class="item-pill">${_formatQty(i.qty, i.unit)} × ${_esc(i.product_name)}</span>`)
        .join('');

    const zone    = order.delivery_zone === 'ilfov' ? 'Ilfov' : 'București';
    const total   = _formatCurrency(order.total);
    const advance = _formatCurrency(order.advance_due);
    const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : '';

    const waPhone = _formatWAPhone(order.customer_phone || '');
    const waText  = encodeURIComponent(
        `Bună ${order.customer_name}, comanda ta BioCake pentru ${dateStr} este ${STATUS_LABEL[order.status] ? STATUS_LABEL[order.status].toLowerCase() : order.status}. Mulțumim! 🎂`
    );

    const nextSt = NEXT_STATUS[order.status];

    return `
<div class="order-card status-${order.status}" data-id="${order.id}">
    <div class="order-header">
        <div class="order-name-row">
            ${urgencyBadge}
            <span class="order-customer">${_esc(order.customer_name)}</span>
            <span class="order-id">#${shortId}</span>
        </div>
        <span class="status-badge ${order.status}">
            <span class="status-dot ${order.status}" aria-hidden="true"></span>
            ${STATUS_LABEL[order.status] || order.status}
        </span>
    </div>

    <div class="order-meta">
        <div class="meta-row">📅 <strong>${dateStr}</strong> · ${zone}</div>
        <div class="meta-row">📍 ${_esc(order.delivery_address || '—')}</div>
        <div class="meta-row">📞 <a href="tel:${_esc(order.customer_phone)}" class="phone-link">${_esc(order.customer_phone)}</a></div>
        ${order.notes ? `<div class="meta-row notes">💬 ${_esc(order.notes)}</div>` : ''}
    </div>

    <div class="order-items">${items || '<span class="item-pill">—</span>'}</div>

    <div class="order-totals">
        <span>Total: <strong>${total}</strong></span>
        <span class="advance">Avans: <strong>${advance}</strong></span>
    </div>

    <div class="order-actions">
        ${nextSt
            ? `<button class="btn-advance" data-order-id="${order.id}" data-next-status="${nextSt}">${NEXT_LABEL[order.status]}</button>`
            : '<span class="delivered-final">✓ Finalizată</span>'
        }
        <a href="https://wa.me/${waPhone}?text=${waText}"
           target="_blank" rel="noopener" class="btn-wa" aria-label="Contactează pe WhatsApp">
            💬 WA
        </a>
    </div>
</div>`;
}

function _updateFilterCounts() {
    const counts = { all: _orders.length, pending: 0, confirmed: 0, paid: 0, delivered: 0 };
    _orders.forEach(o => {
        if (o.status in counts) counts[o.status]++;
    });

    document.querySelectorAll('.filter-chip').forEach(chip => {
        const f = chip.dataset.filter;
        const isActive = f === _currentFilter;
        chip.querySelector('.chip-count').textContent = counts[f] ?? 0;
        chip.classList.toggle('active', isActive);
        chip.setAttribute('aria-pressed', String(isActive));
    });
}

function _updateTabBadge() {
    const actionNeeded = _orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
    const badge = document.getElementById('tab-orders-badge');
    if (!badge) return;
    if (actionNeeded > 0) {
        badge.textContent = actionNeeded > 9 ? '9+' : actionNeeded;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function _setFilter(filter) {
    _currentFilter = filter;
    _renderOrders();
}

async function advanceOrderStatus(orderId, newStatus) {
    const card = document.querySelector(`.order-card[data-id="${orderId}"]`);
    if (card) card.classList.add('updating');

    const { error } = await window._biocakeSupabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert('Eroare la actualizarea statusului. Încearcă din nou.');
        if (card) card.classList.remove('updating');
        return;
    }

    // Update local state — re-render will handle the rest
    const order = _orders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    _renderOrders();
}

/* ── Products ────────────────────────────────────────── */
async function loadProducts() {
    const listEl = document.getElementById('products-list');
    listEl.innerHTML = '<div class="loading"></div>';

    const { data, error } = await window._biocakeSupabase
        .from('products')
        .select('id, slug, name, category, price, unit, min_qty, step, description, badge, weight_note, ingredients, allergens, images, nutritional, active, emoji, bg')
        .order('category')
        .order('name');

    if (error) {
        listEl.innerHTML = '<div class="error">Nu s-au putut încărca produsele.</div>';
        return;
    }

    _products = data || [];
    _renderProducts();
}

function _renderProducts() {
    const listEl = document.getElementById('products-list');

    // Group by category maintaining order
    const groups = {};
    const order  = [];
    _products.forEach(p => {
        if (!groups[p.category]) {
            groups[p.category] = [];
            order.push(p.category);
        }
        groups[p.category].push(p);
    });

    let html = '';
    order.forEach(cat => {
        const label = CATEGORY_LABELS[cat] || cat;
        html += `<div class="product-category-header">${label}</div>`;
        groups[cat].forEach(p => {
            const mainImg = p.images && p.images[0] ? p.images[0] : null;
            const thumb = mainImg
                ? `<img src="${_esc(mainImg)}" alt="${_esc(p.name)}" loading="lazy" class="product-thumb-img">`
                : `<span class="product-emoji-fallback" aria-hidden="true">${_esc(p.emoji) || '🍰'}</span>`;

            html += `
<div class="product-row ${p.active ? '' : 'inactive'}" data-id="${p.id}">
    <div class="product-thumb" style="background:${_esc(p.bg || '#FAF6F1')}">${thumb}</div>
    <div class="product-info">
        <strong>${_esc(p.name)}</strong>
        <span class="product-price">${Number(p.price).toFixed(0)} RON / ${p.unit}${p.badge ? ` · <em>${_esc(p.badge)}</em>` : ''}</span>
    </div>
    <button class="btn-edit-product" data-product-id="${p.id}" aria-label="Editează ${_esc(p.name)}">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        </svg>
    </button>
    <label class="toggle-switch" aria-label="${p.active ? 'Dezactivează' : 'Activează'} ${_esc(p.name)}">
        <input type="checkbox" class="toggle-input" data-product-id="${p.id}" ${p.active ? 'checked' : ''}>
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
</div>`;
        });
    });

    listEl.innerHTML = html;

    // Toggle listeners
    listEl.querySelectorAll('.toggle-input').forEach(input => {
        input.addEventListener('change', () => {
            toggleProduct(input.dataset.productId, input.checked);
        });
    });

    // Edit button listeners
    listEl.querySelectorAll('.btn-edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const product = _products.find(p => p.id === btn.dataset.productId);
            if (product) _openEditModal(product);
        });
    });
}

async function toggleProduct(productId, active) {
    const row = document.querySelector(`.product-row[data-id="${productId}"]`);
    if (row) row.classList.add('updating');

    const { error } = await window._biocakeSupabase
        .from('products')
        .update({ active })
        .eq('id', productId);

    if (row) row.classList.remove('updating');

    if (error) {
        alert('Eroare la actualizarea produsului.');
        // Revert toggle visually
        const input = document.querySelector(`.toggle-input[data-product-id="${productId}"]`);
        if (input) input.checked = !active;
        return;
    }

    // Update local state and row class
    const product = _products.find(p => p.id === productId);
    if (product) {
        product.active = active;
        if (row) {
            row.classList.toggle('inactive', !active);
        }
    }
}

/* ── Edit Product Modal ──────────────────────────────── */

let _editProductId = null;

function _openEditModal(product) {
    _editProductId = product.id;
    _renderEditForm(product);

    const overlay = document.getElementById('edit-overlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Focus first field
    setTimeout(() => {
        const first = document.getElementById('edit-name');
        if (first) first.focus();
    }, 60);
}

function _closeEditModal() {
    const overlay = document.getElementById('edit-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    _editProductId = null;
}

function _renderEditForm(p) {
    const isNew = p.id === '__new__';
    const body = document.getElementById('edit-modal-body');
    const titleEl = document.getElementById('edit-modal-title');
    titleEl.textContent = isNew ? 'Produs nou' : p.name;

    // Show / hide delete button
    const delBtn = document.getElementById('edit-delete');
    delBtn.classList.toggle('hidden', isNew);

    const imgs = (p.images || []);
    const imgRows = imgs.map((src, i) => _imageRowHTML(src, i)).join('');
    const n = p.nutritional || {};

    body.innerHTML = `
<div class="edit-form">
    <div class="edit-active-row">
        <span class="edit-active-label">Produs activ în catalog</span>
        <label class="toggle-switch" aria-label="Activ">
            <input type="checkbox" class="toggle-input" id="edit-active" ${p.active !== false ? 'checked' : ''}>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
    </div>

    <div class="edit-section-title">Informații de bază</div>

    <div class="edit-field">
        <label class="edit-label" for="edit-name">Nume produs</label>
        <input class="edit-input" type="text" id="edit-name" value="${_esc(p.name)}" autocomplete="off">
    </div>

    ${isNew ? `
    <div class="edit-field">
        <label class="edit-label" for="edit-slug">Slug URL <span class="edit-hint">(auto-generat)</span></label>
        <input class="edit-input edit-input-mono" type="text" id="edit-slug" value="${_esc(p.slug || '')}" placeholder="tort-de-ciocolata" autocomplete="off">
    </div>` : ''}

    <div class="edit-field">
        <label class="edit-label" for="edit-category">Categorie</label>
        <select class="edit-input" id="edit-category">
            <option value="torturi-clasice" ${p.category === 'torturi-clasice' ? 'selected' : ''}>🎂 Torturi Clasice</option>
            <option value="prajituri" ${p.category === 'prajituri' ? 'selected' : ''}>🥧 Prăjituri</option>
            <option value="office-box" ${p.category === 'office-box' ? 'selected' : ''}>🎁 Office Box</option>
            <option value="vegan-raw" ${p.category === 'vegan-raw' ? 'selected' : ''}>🌱 Vegan &amp; Raw</option>
        </select>
    </div>

    <div class="edit-row-2">
        <div class="edit-field">
            <label class="edit-label" for="edit-price">Preț (RON)</label>
            <input class="edit-input" type="number" id="edit-price" value="${p.price || 0}" min="0" step="1">
        </div>
        <div class="edit-field">
            <label class="edit-label" for="edit-unit">Unitate</label>
            <select class="edit-input" id="edit-unit">
                <option value="kg" ${p.unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="buc" ${p.unit === 'buc' ? 'selected' : ''}>buc</option>
                <option value="cutie" ${p.unit === 'cutie' ? 'selected' : ''}>cutie</option>
                <option value="portie" ${p.unit === 'portie' ? 'selected' : ''}>portie</option>
            </select>
        </div>
    </div>

    <div class="edit-field">
        <label class="edit-label" for="edit-badge">Badge <span class="edit-hint">(opțional)</span></label>
        <input class="edit-input" type="text" id="edit-badge" value="${_esc(p.badge || '')}" placeholder="Preferat, Nou, Vegan…">
    </div>

    <div class="edit-row-2" id="edit-qty-row">
        <div class="edit-field">
            <label class="edit-label" for="edit-min-qty" id="edit-min-qty-label">${p.unit === 'kg' ? 'Greutate minimă (kg)' : 'Minim comandă'}</label>
            <input class="edit-input" type="number" id="edit-min-qty" value="${p.min_qty || 1}" min="0.1" step="0.1">
        </div>
        <div class="edit-field">
            <label class="edit-label" for="edit-step" id="edit-step-label">${p.unit === 'kg' ? 'Pas (kg)' : 'Pas'}</label>
            <input class="edit-input" type="number" id="edit-step" value="${p.step || 0.6}" min="0.1" step="0.1">
        </div>
    </div>
    <div class="edit-field" id="edit-max-qty-wrap" style="${p.unit === 'kg' ? '' : 'display:none'}">
        <label class="edit-label" for="edit-max-qty">Greutate maximă (kg)</label>
        <input class="edit-input" type="number" id="edit-max-qty" value="${p.max_qty || 2.4}" min="0.1" step="0.1">
    </div>
    <div class="weight-options-preview" id="weight-options-preview"></div>

    <div class="edit-active-row edit-active-row--sub">
        <div>
            <span class="edit-active-label">Notă variație greutate (±100g)</span>
            <span class="edit-active-sublabel">Afișează avertisment la clienți</span>
        </div>
        <label class="toggle-switch" aria-label="Notă variație greutate">
            <input type="checkbox" class="toggle-input" id="edit-weight-note" ${p.weight_note ? 'checked' : ''}>
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
        </label>
    </div>

    <div class="edit-section-title">Descriere și ingrediente</div>

    <div class="edit-field">
        <label class="edit-label" for="edit-description">Descriere scurtă</label>
        <textarea class="edit-input edit-textarea" id="edit-description" rows="3" placeholder="O descriere apetisantă pentru clienți…">${_esc(p.description || '')}</textarea>
    </div>

    <div class="edit-field">
        <label class="edit-label" for="edit-ingredients">Ingrediente</label>
        <textarea class="edit-input edit-textarea" id="edit-ingredients" rows="4" placeholder="făină, zahăr, ouă…">${_esc(p.ingredients || '')}</textarea>
    </div>

    <div class="edit-field">
        <label class="edit-label" for="edit-allergens">Alergeni <span class="edit-hint">(separate prin virgulă)</span></label>
        <input class="edit-input" type="text" id="edit-allergens"
            value="${_esc((p.allergens || []).join(', '))}"
            placeholder="gluten, lapte, ouă…">
    </div>

    <div class="edit-section-title">Declarație nutrițională</div>
    <p class="edit-hint edit-hint-block">Valori la 100 g / 100 ml produs</p>

    <div class="edit-field">
        <label class="edit-label" for="edit-nutr-per">Per porție de</label>
        <input class="edit-input" type="text" id="edit-nutr-per" value="${_esc(n.per || '100g')}" placeholder="100g">
    </div>

    <div class="edit-row-2">
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-kcal">Energie (kcal)</label>
            <input class="edit-input" type="number" id="edit-nutr-kcal" value="${n.energy_kcal || ''}" min="0" step="1" placeholder="0">
        </div>
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-kj">Energie (kJ) <span class="edit-hint">auto</span></label>
            <input class="edit-input" type="number" id="edit-nutr-kj" value="${n.energy_kj || ''}" min="0" step="1" placeholder="0">
        </div>
    </div>

    <div class="edit-row-2">
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-fat">Grăsimi (g)</label>
            <input class="edit-input" type="number" id="edit-nutr-fat" value="${n.fat ?? ''}" min="0" step="0.1" placeholder="0">
        </div>
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-satfat">din care saturate (g)</label>
            <input class="edit-input" type="number" id="edit-nutr-satfat" value="${n.saturated_fat ?? ''}" min="0" step="0.1" placeholder="0">
        </div>
    </div>

    <div class="edit-row-2">
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-carbs">Carbohidrați (g)</label>
            <input class="edit-input" type="number" id="edit-nutr-carbs" value="${n.carbs ?? ''}" min="0" step="0.1" placeholder="0">
        </div>
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-sugars">din care zahăruri (g)</label>
            <input class="edit-input" type="number" id="edit-nutr-sugars" value="${n.sugars ?? ''}" min="0" step="0.1" placeholder="0">
        </div>
    </div>

    <div class="edit-row-2">
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-fiber">Fibre (g)</label>
            <input class="edit-input" type="number" id="edit-nutr-fiber" value="${n.fiber ?? ''}" min="0" step="0.1" placeholder="0">
        </div>
        <div class="edit-field">
            <label class="edit-label" for="edit-nutr-protein">Proteine (g)</label>
            <input class="edit-input" type="number" id="edit-nutr-protein" value="${n.protein ?? ''}" min="0" step="0.1" placeholder="0">
        </div>
    </div>

    <div class="edit-field" style="max-width:50%">
        <label class="edit-label" for="edit-nutr-salt">Sare (g)</label>
        <input class="edit-input" type="number" id="edit-nutr-salt" value="${n.salt ?? ''}" min="0" step="0.01" placeholder="0">
    </div>

    <div class="edit-section-title">Imagini produs</div>

    <div class="images-editor" id="edit-images-list">${imgRows}</div>
    <button type="button" class="btn-add-img" id="btn-add-img">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Adaugă imagine
    </button>
</div>`;

    // kcal → kJ auto-calc
    document.getElementById('edit-nutr-kcal').addEventListener('input', function () {
        const kj = Math.round(parseFloat(this.value || 0) * 4.184);
        document.getElementById('edit-nutr-kj').value = kj || '';
    });

    // slug auto-gen for new products
    if (isNew) {
        document.getElementById('edit-name').addEventListener('input', function () {
            document.getElementById('edit-slug').value = _slugify(this.value);
        });
    }

    // Unit change → update labels + show/hide max_qty + weight preview
    document.getElementById('edit-unit').addEventListener('change', function () {
        const isKg = this.value === 'kg';
        document.getElementById('edit-min-qty-label').textContent = isKg ? 'Greutate minimă (kg)' : 'Minim comandă';
        document.getElementById('edit-step-label').textContent    = isKg ? 'Pas (kg)' : 'Pas';
        document.getElementById('edit-max-qty-wrap').style.display = isKg ? '' : 'none';
        _updateWeightPreview();
    });

    // Weight preview on min/step/max change
    document.getElementById('edit-min-qty').addEventListener('input', _updateWeightPreview);
    document.getElementById('edit-step').addEventListener('input', _updateWeightPreview);
    document.getElementById('edit-max-qty').addEventListener('input', _updateWeightPreview);

    // Initial preview render
    _updateWeightPreview();

    // Image list events
    document.getElementById('btn-add-img').addEventListener('click', () => {
        const list = document.getElementById('edit-images-list');
        const idx = list.querySelectorAll('.image-row').length;
        list.insertAdjacentHTML('beforeend', _imageRowHTML('', idx));
        _bindImageRowEvents(list.lastElementChild);
        list.lastElementChild.querySelector('.image-path-input').focus();
    });

    document.getElementById('edit-images-list').querySelectorAll('.image-row').forEach(row => {
        _bindImageRowEvents(row);
    });

    // Save button label
    document.getElementById('edit-save').textContent = isNew ? 'Adaugă produs' : 'Salvează modificările';
}

function _imageRowHTML(src, i) {
    const preview = src ? `<img src="${_esc(src)}" alt="" class="img-preview-thumb" onerror="this.style.display='none'">` : '';
    return `
<div class="image-row">
    <div class="img-thumb-wrap">${preview}</div>
    <input class="edit-input image-path-input" type="text" value="${_esc(src)}" placeholder="images/products/tort.png" data-index="${i}">
    <button type="button" class="btn-remove-img" aria-label="Șterge imaginea">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
    </button>
</div>`;
}

function _bindImageRowEvents(row) {
    const input = row.querySelector('.image-path-input');
    const thumb = row.querySelector('.img-thumb-wrap');
    const removeBtn = row.querySelector('.btn-remove-img');

    input.addEventListener('input', () => {
        const val = input.value.trim();
        thumb.innerHTML = val
            ? `<img src="${_esc(val)}" alt="" class="img-preview-thumb" onerror="this.style.display='none'">`
            : '';
    });

    removeBtn.addEventListener('click', () => {
        row.remove();
    });
}

function _updateWeightPreview() {
    const preview = document.getElementById('weight-options-preview');
    if (!preview) return;
    const unit = document.getElementById('edit-unit')?.value;
    if (unit !== 'kg') { preview.innerHTML = ''; return; }

    const min  = parseFloat(document.getElementById('edit-min-qty')?.value) || 0;
    const step = parseFloat(document.getElementById('edit-step')?.value)    || 0;
    const max  = parseFloat(document.getElementById('edit-max-qty')?.value) || 0;
    if (!min || !step || !max) { preview.innerHTML = ''; return; }

    const options = [];
    for (let w = min; w <= max + 0.001; w = Math.round((w + step) * 100) / 100) {
        const portions = Math.round(w / 0.15);
        options.push({ kg: w, portions });
    }
    if (!options.length) { preview.innerHTML = ''; return; }

    preview.innerHTML = `
<div class="weight-preview-label">Greutăți disponibile pentru clienți:</div>
<div class="weight-preview-pills">
    ${options.map(o => `<span class="weight-pill">${o.kg.toFixed(1).replace('.', ',')} kg <em>~${o.portions} porții</em></span>`).join('')}
</div>`;
}

async function _saveProduct() {
    if (!_editProductId) return;
    const isNew = _editProductId === '__new__';

    const btn = document.getElementById('edit-save');
    btn.disabled = true;
    btn.textContent = 'Se salvează…';

    const name         = document.getElementById('edit-name').value.trim();
    const category     = document.getElementById('edit-category').value;
    const price        = parseFloat(document.getElementById('edit-price').value) || 0;
    const unit         = document.getElementById('edit-unit').value;
    const min_qty      = parseFloat(document.getElementById('edit-min-qty').value) || 1;
    const step         = parseFloat(document.getElementById('edit-step').value) || 1;
    const badge        = document.getElementById('edit-badge').value.trim() || null;
    const weight_note  = document.getElementById('edit-weight-note').checked;
    const description  = document.getElementById('edit-description').value.trim();
    const ingredients  = document.getElementById('edit-ingredients').value.trim();
    const allergens    = document.getElementById('edit-allergens').value
        .split(',').map(a => a.trim()).filter(Boolean);
    const active       = document.getElementById('edit-active').checked;

    const images = Array.from(
        document.querySelectorAll('#edit-images-list .image-path-input')
    ).map(inp => inp.value.trim()).filter(Boolean);

    const nutritional = {
        per:           document.getElementById('edit-nutr-per').value.trim() || '100g',
        energy_kcal:   parseFloat(document.getElementById('edit-nutr-kcal').value) || 0,
        energy_kj:     parseFloat(document.getElementById('edit-nutr-kj').value)  || 0,
        fat:           parseFloat(document.getElementById('edit-nutr-fat').value) || 0,
        saturated_fat: parseFloat(document.getElementById('edit-nutr-satfat').value) || 0,
        carbs:         parseFloat(document.getElementById('edit-nutr-carbs').value) || 0,
        sugars:        parseFloat(document.getElementById('edit-nutr-sugars').value) || 0,
        fiber:         parseFloat(document.getElementById('edit-nutr-fiber').value) || 0,
        protein:       parseFloat(document.getElementById('edit-nutr-protein').value) || 0,
        salt:          parseFloat(document.getElementById('edit-nutr-salt').value) || 0,
    };

    const patch = { name, category, price, unit, min_qty, step, badge, weight_note, description, ingredients, allergens, images, nutritional, active };

    const sb = window._biocakeSupabase;
    let savedId = _editProductId;

    if (isNew) {
        const slug = document.getElementById('edit-slug').value.trim() || _slugify(name);
        if (!slug) { alert('Slug-ul nu poate fi gol.'); btn.disabled = false; btn.textContent = 'Adaugă produs'; return; }
        const { data, error } = await sb.from('products').insert({ slug, ...patch }).select().single();
        if (error) { alert('Eroare la creare:\n' + error.message); btn.disabled = false; btn.textContent = 'Adaugă produs'; return; }
        _products.push(data);
    } else {
        const { error } = await sb.from('products').update(patch).eq('id', savedId);
        if (error) { alert('Eroare la salvare:\n' + error.message); btn.disabled = false; btn.textContent = 'Salvează modificările'; return; }
        const idx = _products.findIndex(p => p.id === savedId);
        if (idx !== -1) _products[idx] = { ..._products[idx], ...patch };
    }

    _closeEditModal();
    _renderProducts();
}

async function _deleteProduct() {
    const product = _products.find(p => p.id === _editProductId);
    if (!product) return;

    const confirmed = confirm(`Ești sigur că vrei să ștergi «${product.name}»?\n\nAceastă acțiune este permanentă și nu poate fi anulată.`);
    if (!confirmed) return;

    const btn = document.getElementById('edit-delete');
    btn.disabled = true;

    const { error } = await window._biocakeSupabase
        .from('products')
        .delete()
        .eq('id', _editProductId);

    btn.disabled = false;

    if (error) { alert('Eroare la ștergere:\n' + error.message); return; }

    _products = _products.filter(p => p.id !== _editProductId);
    _closeEditModal();
    _renderProducts();
}

function _openNewProductModal() {
    _editProductId = '__new__';
    _renderEditForm({
        id: '__new__', slug: '', name: '', category: 'torturi-clasice',
        price: 0, unit: 'buc', min_qty: 1, step: 0.6, max_qty: 2.4,
        description: '', badge: null, weight_note: null,
        ingredients: '', allergens: [], images: [],
        nutritional: { per: '100g', energy_kcal: 0, energy_kj: 0, fat: 0, saturated_fat: 0, carbs: 0, sugars: 0, fiber: 0, protein: 0, salt: 0 },
        active: true, emoji: '🎂', bg: '#FAF6F1',
    });

    const overlay = document.getElementById('edit-overlay');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => { const f = document.getElementById('edit-name'); if (f) f.focus(); }, 60);
}

function _slugify(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/* ── Helpers ─────────────────────────────────────────── */

const _currencyFmt = new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** Format a price value as "1.250,00 RON" */
function _formatCurrency(amount) {
    return _currencyFmt.format(Number(amount || 0)) + ' RON';
}

/** Sanitize user input for safe HTML insertion */
function _esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Format quantity with unit */
function _formatQty(qty, unit) {
    const n = Number(qty);
    return unit === 'kg' ? `${n} kg` : `${n} ${unit}`;
}

/** Normalize phone to WhatsApp-compatible format (40XXXXXXXXX) */
function _formatWAPhone(phone) {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0'))        digits = '40' + digits.slice(1);
    else if (!digits.startsWith('40')) digits = '40' + digits;
    return digits;
}

/* ── Start ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initAdmin);
