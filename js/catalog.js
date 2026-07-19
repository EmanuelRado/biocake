/**
 * BioCake — Catalog Renderer + Product Modal with Image Carousel
 * Etapa 2: Randare dinamică, filtrare, popup cu galerie de imagini.
 */

/* ── Mapare chips ────────────────────────────────────── */
const CHIP_MAP = {
    'Toate':           'toate',
    'Torturi Clasice': 'torturi-clasice',
    'Prăjituri':       'prajituri',
    'Office Boxes':    'office-box',
    'De Post':         'de-post',
};

/* ── Taguri per categorie ────────────────────────────── */
const CATEGORY_TAGS = {
    'torturi-clasice': [{ label: '🎂 Tort la comandă', style: 'choco' }],
    'prajituri':       [{ label: '🍰 Prăjitură', style: '' }],
    'office-box':      [{ label: '🎁 Office Box', style: 'pink' }, { label: '🎉 Aniversare birou', style: '' }],
    'de-post':         [{ label: '🌱 De post', style: 'green' }, { label: '✨ Fără animale', style: 'green' }],
};

const SHARED_TAGS = [
    { label: '🧑‍🍳 Artizanal', style: 'choco' },
    { label: '🌿 100% Natural', style: 'green' },
    { label: '🚫 Fără conservanți', style: '' },
];

/* ── Per-product weight options generator ────────────── */
function _weightOptions(product) {
    const min  = product.minQty || 1.2;
    const step = product.step   || 0.6;
    const max  = product.maxQty || 2.4;
    const opts = [];
    for (let w = min; w <= max + 0.001; w = Math.round((w + step) * 100) / 100) {
        const portions = Math.round(w / 0.15);
        opts.push({
            kg:    w,
            label: w.toFixed(1).replace('.', ',') + ' kg',
            note:  `~${portions} porții`,
        });
    }
    return opts.length ? opts : [{ kg: min, label: min.toFixed(1).replace('.', ',') + ' kg', note: '' }];
}

/* ── State modal & carousel ──────────────────────────── */
let _modalProduct   = null;
let _selectedWeight = 1.2;
let _selectedQty    = 1;
let _currentSlide   = 0;
let _totalSlides    = 0;

/* ─────────────────────────────────────────────────────
   CATALOG
   ───────────────────────────────────────────────────── */

function initCatalog() {
    _injectModalHTML();
    renderCatalog('toate');
    bindChips();
    _bindFilterLinks();
    _bindModalClose();
}

/** Activează un chip de categorie și randează catalogul pentru acea categorie */
function applyCatalogFilter(category) {
    const chips = document.querySelectorAll('#category-chips .chip');
    let matched = false;
    chips.forEach(chip => {
        const chipCat = CHIP_MAP[chip.textContent.trim()] || 'toate';
        const isMatch = chipCat === category;
        chip.classList.toggle('chip-active', isMatch);
        if (isMatch) matched = true;
    });
    renderCatalog(matched ? category : 'toate');
}

/** Link-uri (ex. „Comandă Office Box") care sar în catalog cu un filtru aplicat */
function _bindFilterLinks() {
    document.querySelectorAll('[data-catalog-filter]').forEach(link => {
        link.addEventListener('click', () => {
            // href="#catalog" se ocupă de scroll; aplicăm filtrul imediat
            applyCatalogFilter(link.dataset.catalogFilter);
        });
    });
}

function bindChips() {
    const chips = document.querySelectorAll('#category-chips .chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('chip-active'));
            chip.classList.add('chip-active');
            renderCatalog(CHIP_MAP[chip.textContent.trim()] || 'toate');
        });
    });
}

async function renderCatalog(category) {
    const container = document.getElementById('catalog-container');
    if (!container) return;

    // Afișează skeleton imediat
    container.className = 'catalog-grid';
    container.style.opacity = '1';
    container.style.transform = '';
    container.innerHTML = _skeletonGrid(8);

    // Fetch din Supabase (sau fallback local)
    const products = await fetchProducts(category);

    // Fade out skeleton
    container.style.opacity = '0';
    container.style.transform = 'translateY(6px)';

    setTimeout(() => {
        container.innerHTML = products.length === 0
            ? _emptyState()
            : products.map(p => _productCard(p)).join('');
        container.className = 'catalog-grid';

        requestAnimationFrame(() => {
            container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });

        _bindCardInteractions(container);
    }, 200);
}

function _skeletonGrid(count) {
    return Array.from({ length: count }, () => `
    <div class="product-card skeleton-card" aria-hidden="true">
        <div class="skeleton-img"></div>
        <div class="product-card-body">
            <div class="skeleton-line" style="width:65%;height:18px;"></div>
            <div class="skeleton-line" style="width:90%;height:12px;margin-top:6px;"></div>
            <div class="skeleton-line" style="width:75%;height:12px;"></div>
            <div class="skeleton-footer">
                <div class="skeleton-line" style="width:40%;height:16px;"></div>
                <div class="skeleton-btn"></div>
            </div>
        </div>
    </div>`).join('');
}

/* ── Card HTML ───────────────────────────────────────── */
function _productCard(p) {
    const badgeHTML  = p.badge ? `<span class="product-badge">${p.badge}</span>` : '';
    const priceLabel = _formatPrice(p);
    const gramsNote  = p.unit === 'buc' && p.pieceGrams
        ? `${p.pieceGrams} g / buc`
        : null;
    const minNote    = p.unit === 'buc' && p.minQty > 1
        ? `<span class="product-min-note">${gramsNote ? gramsNote + ' · ' : ''}min. ${p.minQty} buc</span>`
        : p.unit === 'buc' && gramsNote
        ? `<span class="product-min-note">${gramsNote}</span>`
        : p.unit === 'kg' ? `<span class="product-min-note">per kg</span>` : '';

    // Imagine reală sau emoji placeholder
    const hasImages = p.images && p.images.length > 0;
    const photoHint = hasImages && p.images.length > 1
        ? `<span class="product-photo-count">📷 ${p.images.length}</span>` : '';

    const cardImgContent = hasImages
        ? `<img src="${p.images[0]}" alt="${p.name}" class="product-card-photo" loading="lazy">`
        : `<span class="product-emoji" aria-hidden="true">${p.emoji}</span>`;

    return `
    <article class="product-card" data-id="${p.id}" role="button"
             tabindex="0" aria-label="Vezi detalii ${p.name}">
        <div class="product-card-img ${hasImages ? 'product-card-img--photo' : ''}" style="${hasImages ? '' : 'background:' + p.bg + ';'}">
            ${cardImgContent}
            ${badgeHTML}
            ${photoHint}
        </div>
        <div class="product-card-body">
            <h3 class="product-name">${p.name}</h3>
            <p class="product-desc">${p.description}</p>
            <div class="product-card-footer">
                <div class="product-price-wrap">
                    <span class="product-price">${priceLabel}</span>
                    ${minNote}
                </div>
                <button class="btn-add-cart" data-id="${p.id}"
                        aria-label="Adaugă ${p.name} în coș">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
                    </svg>
                    Adaugă
                </button>
            </div>
        </div>
    </article>`;
}

/* ── Binding card interactions ───────────────────────── */
function _bindCardInteractions(container) {
    container.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-add-cart')) return;
            openProductModal(card.dataset.id);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openProductModal(card.dataset.id);
            }
        });
    });

    container.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const product = getProductById(btn.dataset.id);
            if (!product) return;
            const qty = product.unit === 'kg' ? (product.minQty || 1.2) : product.minQty;
            addToCart(product, qty);
            _flashBtn(btn);
        });
    });
}

function _flashBtn(btn) {
    btn.classList.add('btn-add-cart--added');
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        Adăugat!`;
    setTimeout(() => {
        btn.classList.remove('btn-add-cart--added');
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>
            </svg>
            Adaugă`;
    }, 1800);
}

/* ─────────────────────────────────────────────────────
   MODAL
   ───────────────────────────────────────────────────── */

function _injectModalHTML() {
    if (document.getElementById('product-modal')) return;
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = 'product-modal';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Detalii produs');
    el.innerHTML = `
    <div class="modal-panel" id="modal-panel">
        <!-- Carousel area -->
        <div class="modal-carousel-wrap" id="modal-carousel-wrap">
            <div class="modal-carousel-track" id="modal-carousel-track"></div>

            <!-- Arrows (desktop) -->
            <button class="modal-nav modal-nav-prev" id="modal-nav-prev" aria-label="Imaginea anterioară" style="display:none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
            </button>
            <button class="modal-nav modal-nav-next" id="modal-nav-next" aria-label="Imaginea următoare" style="display:none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
            </button>

            <!-- Dots -->
            <div class="modal-dots" id="modal-dots" style="display:none"></div>

            <!-- Close button -->
            <button class="modal-close" id="modal-close" aria-label="Închide">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
    </div>`;
    document.body.appendChild(el);

    // Click outside panel → close
    el.addEventListener('click', (e) => {
        if (!e.target.closest('#modal-panel')) closeProductModal();
    });

    // ESC → close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProductModal();
        if (e.key === 'ArrowLeft')  _goToSlide(_currentSlide - 1);
        if (e.key === 'ArrowRight') _goToSlide(_currentSlide + 1);
    });

    // Arrow button clicks
    document.getElementById('modal-nav-prev')
        ?.addEventListener('click', () => _goToSlide(_currentSlide - 1));
    document.getElementById('modal-nav-next')
        ?.addEventListener('click', () => _goToSlide(_currentSlide + 1));

    // Touch gestures (carousel ↔ — glisarea verticală rămâne scroll nativ)
    _bindPanelGestures(document.getElementById('modal-panel'));
}

/* ── Carousel ────────────────────────────────────────── */
function _buildCarouselSlides(product) {
    if (product.images && product.images.length > 0) {
        return product.images.map(src => `
            <div class="modal-slide">
                <img src="${src}" alt="${product.name}" class="modal-slide-img" loading="lazy">
            </div>`);
    }
    // Emoji placeholder (un singur slide)
    return [`
        <div class="modal-slide" style="background:${product.bg};">
            <span class="modal-slide-emoji" aria-hidden="true">${product.emoji}</span>
            <p class="modal-slide-placeholder-hint">Fotografii în curând</p>
        </div>`];
}

function _renderCarousel(product) {
    const slides = _buildCarouselSlides(product);
    _currentSlide = 0;
    _totalSlides  = slides.length;

    const track = document.getElementById('modal-carousel-track');
    track.innerHTML = slides.join('');
    track.style.transition = 'none';
    track.style.transform  = 'translateX(0)';

    // Dots
    const dotsEl = document.getElementById('modal-dots');
    if (_totalSlides > 1) {
        dotsEl.innerHTML = slides
            .map((_, i) => `<button class="modal-dot ${i === 0 ? 'modal-dot--active' : ''}"
                                     data-idx="${i}" aria-label="Imagine ${i + 1}"></button>`)
            .join('');
        dotsEl.style.display = 'flex';

        dotsEl.querySelectorAll('.modal-dot').forEach(dot => {
            dot.addEventListener('click', () => _goToSlide(Number(dot.dataset.idx)));
        });
    } else {
        dotsEl.innerHTML = '';
        dotsEl.style.display = 'none';
    }

    // Arrows (desktop only — CSS hides on mobile)
    const prevBtn = document.getElementById('modal-nav-prev');
    const nextBtn = document.getElementById('modal-nav-next');
    if (_totalSlides > 1) {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }

    _updateCarouselState();
}

function _goToSlide(idx) {
    if (_totalSlides <= 1) return;
    _currentSlide = Math.max(0, Math.min(idx, _totalSlides - 1));
    const track = document.getElementById('modal-carousel-track');
    if (track) {
        track.style.transition = 'transform 0.38s cubic-bezier(0.4,0,0.2,1)';
        track.style.transform  = `translateX(-${_currentSlide * 100}%)`;
    }
    _updateCarouselState();
}

function _updateCarouselState() {
    document.querySelectorAll('.modal-dot').forEach((dot, i) => {
        dot.classList.toggle('modal-dot--active', i === _currentSlide);
    });

    const prevBtn = document.getElementById('modal-nav-prev');
    const nextBtn = document.getElementById('modal-nav-next');
    if (prevBtn) prevBtn.style.opacity = _currentSlide === 0 ? '0.3' : '1';
    if (nextBtn) nextBtn.style.opacity = _currentSlide === _totalSlides - 1 ? '0.3' : '1';
}

/* ── Touch gestures: ↔ carousel (fără dismiss vertical) ─ */
function _bindPanelGestures(panel) {
    let startX = 0, startY = 0, startTime = 0;
    let swipeDir = null; // 'h' | 'v' | null

    panel.addEventListener('touchstart', (e) => {
        startX    = e.touches[0].clientX;
        startY    = e.touches[0].clientY;
        startTime = Date.now();
        swipeDir  = null;
        panel.style.transition = 'none';
        const track = document.getElementById('modal-carousel-track');
        if (track) track.style.transition = 'none';
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        // Determină direcția la primul mișcări semnificative
        if (!swipeDir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            swipeDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }

        if (swipeDir === 'h' && _totalSlides > 1) {
            // Carousel stânga/dreapta
            const track = document.getElementById('modal-carousel-track');
            if (track) {
                const base = -_currentSlide * 100;
                const pct  = (dx / track.offsetWidth) * 100;
                track.style.transform = `translateX(${base + pct}%)`;
            }
        }
        // Glisarea verticală = scroll nativ în popup (fără dismiss)
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
        const dx       = e.changedTouches[0].clientX - startX;
        const duration = Date.now() - startTime;
        const velX     = dx / duration;

        panel.style.transition = '';
        const track = document.getElementById('modal-carousel-track');
        if (track) track.style.transition = '';

        if (swipeDir === 'h' && _totalSlides > 1) {
            if (dx < -50 || velX < -0.3)      _goToSlide(_currentSlide + 1);
            else if (dx > 50 || velX > 0.3)   _goToSlide(_currentSlide - 1);
            else                               _goToSlide(_currentSlide);
        }
        swipeDir = null;
    }, { passive: true });
}

/* ── Close button ────────────────────────────────────── */
function _bindModalClose() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('#modal-close')) closeProductModal();
    });
}

/* ── Open / Close ────────────────────────────────────── */
function openProductModal(id) {
    const product = getProductById(id);
    if (!product) return;

    _modalProduct   = product;
    _selectedWeight = product.minQty || 1.2;
    _selectedQty    = product.minQty || 1;

    _renderCarousel(product);
    _renderModalContent(product);

    document.getElementById('product-modal').classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    document.getElementById('product-modal')?.classList.remove('modal-open');
    document.body.style.overflow = '';
    _modalProduct = null;
}

/* ── Modal body ──────────────────────────────────────── */
function _renderModalContent(p) {
    const allTags = [
        ...(CATEGORY_TAGS[p.category] || []),
        ...SHARED_TAGS,
        ...(p.badge ? [{ label: p.badge, style: 'pink' }] : []),
    ];
    const tagsHTML = allTags
        .map(t => `<span class="modal-tag modal-tag-${t.style || ''}">${t.label}</span>`)
        .join('');

    // Selector greutate (torturi) sau cantitate (prăjituri)
    let selectorHTML = '';
    if (p.unit === 'kg') {
        selectorHTML = `
        <div class="modal-selector-section">
            <p class="modal-selector-label">Alege greutatea aproximativă:</p>
            <div class="modal-weight-options" id="modal-weight-options">
                ${_weightOptions(p).map((w, i) => `
                <button class="modal-weight-pill ${i === 0 ? 'selected' : ''}"
                        data-kg="${w.kg}" type="button">
                    ${w.label}
                    <small>${w.note}</small>
                </button>`).join('')}
            </div>
        </div>
        <div class="modal-weight-note">
            <svg class="modal-weight-note-icon" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <path stroke-linecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            Greutatea finală poate varia cu <strong>maximum 100g</strong> față de cea selectată,
            datorită naturii artizanale a preparatelor.
        </div>`;
    } else if (p.unit === 'buc') {
        const gramsHint = p.pieceGrams
            ? `<p class="modal-piece-grams">1 buc ≈ <strong>${p.pieceGrams} g</strong></p>`
            : '';
        selectorHTML = `
        <div class="modal-selector-section">
            <p class="modal-selector-label">Cantitate (min. ${p.minQty} buc):</p>
            <div class="modal-qty-control">
                <button class="modal-qty-btn" id="modal-qty-minus" type="button" aria-label="Scade">−</button>
                <span class="modal-qty-value" id="modal-qty-value">${p.minQty} buc</span>
                <button class="modal-qty-btn" id="modal-qty-plus" type="button" aria-label="Crește">+</button>
            </div>
            ${gramsHint}
        </div>`;
    }

    // Ingredients
    let ingredientsHTML = '';
    if (p.ingredients) {
        const text = p.ingredients.replace(/\*/g, '<sup style="color:var(--pink);font-size:0.65em;">●</sup>');
        ingredientsHTML = `
        <div class="modal-section">
            <p class="modal-section-title">🧾 Ingrediente</p>
            <p class="modal-ingredients">${text}</p>
            ${p.allergens?.length ? `
            <div class="modal-allergens">
                <span class="modal-allergen-label">Alergeni:</span>
                ${p.allergens.map(a => `<span class="modal-allergen-tag">${a}</span>`).join('')}
            </div>` : ''}
        </div>`;
    }

    // Nutritional
    let nutritionalHTML = '';
    if (p.nutritional) {
        const n = p.nutritional;
        nutritionalHTML = `
        <div class="modal-section">
            <p class="modal-section-title">📊 Declarație Nutrițională (per ${n.per})</p>
            <table class="modal-nutritional-table">
                <tbody>
                    <tr><td>Valoare energetică</td><td><strong>${n.energy_kcal} kcal</strong> / ${n.energy_kj} kJ</td></tr>
                    <tr><td>Grăsimi</td><td>${n.fat}g</td></tr>
                    <tr class="modal-nut-sub"><td>— din care acizi grași saturați</td><td>${n.saturated_fat}g</td></tr>
                    <tr><td>Glucide</td><td>${n.carbs}g</td></tr>
                    <tr class="modal-nut-sub"><td>— din care zaharuri</td><td>${n.sugars}g</td></tr>
                    <tr><td>Fibre</td><td>${n.fiber}g</td></tr>
                    <tr><td>Proteine</td><td>${n.protein}g</td></tr>
                    <tr><td>Sare</td><td>${n.salt}g</td></tr>
                </tbody>
            </table>
            <p class="modal-nutritional-note">● Ingrediente de origine animală · Valori orientative, pot varia ușor în funcție de sezon.</p>
        </div>`;
    }

    document.getElementById('modal-body').innerHTML = `
    <div class="modal-header-row">
        <h2 class="modal-title">${p.name}</h2>
        <span class="modal-price">${_formatPrice(p)}</span>
    </div>
    <p class="modal-desc">${p.description}</p>
    <div class="modal-tags">${tagsHTML}</div>
    ${selectorHTML}
    ${ingredientsHTML}
    ${nutritionalHTML}`;

    document.getElementById('modal-footer').innerHTML = `
    <button class="modal-add-btn" id="modal-add-btn" type="button">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
        </svg>
        Adaugă în coș
    </button>`;

    _bindModalSelectors(p);
}

/* ── Binding selectori modal ─────────────────────────── */
function _bindModalSelectors(p) {
    document.querySelectorAll('.modal-weight-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.modal-weight-pill').forEach(pp => pp.classList.remove('selected'));
            pill.classList.add('selected');
            _selectedWeight = parseFloat(pill.dataset.kg);
        });
    });

    const minusBtn = document.getElementById('modal-qty-minus');
    const plusBtn  = document.getElementById('modal-qty-plus');
    const qtyEl    = document.getElementById('modal-qty-value');
    if (minusBtn && plusBtn && qtyEl) {
        minusBtn.addEventListener('click', () => {
            if (_selectedQty > p.minQty) { _selectedQty -= p.step; qtyEl.textContent = `${_selectedQty} buc`; }
        });
        plusBtn.addEventListener('click', () => {
            _selectedQty += p.step; qtyEl.textContent = `${_selectedQty} buc`;
        });
    }

    document.getElementById('modal-add-btn')?.addEventListener('click', () => {
        if (!_modalProduct) return;
        const qty = _modalProduct.unit === 'kg'  ? _selectedWeight
                  : _modalProduct.unit === 'buc' ? _selectedQty
                  : 1;
        addToCart(_modalProduct, qty);
        const btn = document.getElementById('modal-add-btn');
        btn.classList.add('modal-add-btn--added');
        btn.textContent = '✓ Adăugat în coș!';
        setTimeout(() => closeProductModal(), 1000);
    });
}

/* ── Helpers ─────────────────────────────────────────── */
function _formatPrice(p) {
    if (p.unit === 'kg')    return `${p.price} RON / kg`;
    if (p.unit === 'cutie') return `${p.price} RON`;
    return `${p.price} RON / buc`;
}

function _emptyState() {
    return `<div class="catalog-empty"><span aria-hidden="true">🍰</span><p>Niciun produs în această categorie momentan.</p></div>`;
}
