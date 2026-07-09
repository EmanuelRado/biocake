/**
 * BioCake — checkout.js
 * Etapa 4: Formular comandă, validare 48h, submit Supabase, confirmare + WhatsApp.
 */

/* ── Config ──────────────────────────────────────────── */
// TODO: înlocuiește cu numărul de WhatsApp al cofetăriei (format: 40XXXXXXXXX)
const CHECKOUT_WHATSAPP = '40700000000';

/* ── Init ────────────────────────────────────────────── */
function initCheckout() {
    _injectCheckoutHTML();

    document.getElementById('checkout-close')
        ?.addEventListener('click', closeCheckout);

    // Click pe backdrop → închide
    document.getElementById('checkout-overlay')
        ?.addEventListener('click', e => {
            if (e.target.id === 'checkout-overlay') closeCheckout();
        });

    // ESC → închide
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeCheckout();
    });
}

/* ── Open / Close ────────────────────────────────────── */
function openCheckout() {
    if (getCart().length === 0) return;
    _renderCheckout();
    document.getElementById('checkout-overlay').classList.add('co-open');
    document.body.style.overflow = 'hidden';
    document.getElementById('checkout-modal').scrollTop = 0;
}

function closeCheckout() {
    document.getElementById('checkout-overlay')?.classList.remove('co-open');
    document.body.style.overflow = '';
}

/* ── Render ──────────────────────────────────────────── */
function _renderCheckout() {
    const items    = getCart();
    const zone     = getZone();
    const subtotal = getSubtotal();
    const delivery = getDeliveryFee(zone);
    const total    = subtotal + delivery;
    const advance  = Math.round(total * 0.5 * 100) / 100;
    const minDate  = _getMinDate();

    document.getElementById('co-view-form').style.display = '';
    document.getElementById('co-view-success').style.display = 'none';
    document.getElementById('co-form-col').innerHTML   = _formHTML(zone, minDate);
    document.getElementById('co-summary-col').innerHTML = _summaryHTML(items, subtotal, delivery, total, advance);

    _bindCheckoutEvents(zone);
}

/* ── Form HTML ───────────────────────────────────────── */
function _formHTML(zone, minDate) {
    return `
    <div class="co-form-header">
        <h2 class="co-title">Finalizează Comanda</h2>
        <p class="co-subtitle">Completează detaliile pentru livrare. Câmpurile marcate cu * sunt obligatorii.</p>
    </div>

    <form id="checkout-form" novalidate>
        <fieldset class="co-fieldset">
            <legend class="co-legend">Date de contact</legend>
            <div class="co-field">
                <label class="co-label" for="co-name">Nume complet *</label>
                <input class="co-input" type="text" id="co-name" name="name"
                       placeholder="ex: Maria Popescu" autocomplete="name" required>
            </div>
            <div class="co-field-row">
                <div class="co-field">
                    <label class="co-label" for="co-phone">Telefon *</label>
                    <input class="co-input" type="tel" id="co-phone" name="phone"
                           placeholder="07xx xxx xxx" autocomplete="tel" required>
                </div>
                <div class="co-field">
                    <label class="co-label" for="co-email">
                        Email <span class="co-optional">(opțional)</span>
                    </label>
                    <input class="co-input" type="email" id="co-email" name="email"
                           placeholder="email@exemplu.ro" autocomplete="email">
                </div>
            </div>
        </fieldset>

        <fieldset class="co-fieldset">
            <legend class="co-legend">Detalii livrare</legend>

            <div class="co-field">
                <label class="co-label">Zonă livrare *</label>
                <div class="co-zone-pills">
                    <label class="co-zone-pill ${zone === 'bucuresti' ? 'co-zone-pill--active' : ''}">
                        <input type="radio" name="zone" value="bucuresti" ${zone === 'bucuresti' ? 'checked' : ''}>
                        <span class="co-zone-name">📍 București</span>
                        <span class="co-zone-note">Livrare 20 RON · Gratuită peste 250 RON</span>
                    </label>
                    <label class="co-zone-pill ${zone === 'ilfov' ? 'co-zone-pill--active' : ''}">
                        <input type="radio" name="zone" value="ilfov" ${zone === 'ilfov' ? 'checked' : ''}>
                        <span class="co-zone-name">🗺️ Ilfov</span>
                        <span class="co-zone-note">Livrare 40 RON · Gratuită peste 600 RON</span>
                    </label>
                </div>
            </div>

            <div class="co-field">
                <label class="co-label" for="co-date">
                    Data livrării * <span class="co-optional">(minimum 48h în avans)</span>
                </label>
                <input class="co-input co-input-date" type="date" id="co-date" name="date"
                       min="${minDate}" required>
                <p class="co-field-hint">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/>
                        <path stroke-linecap="round" d="M12 8v4m0 4h.01"/>
                    </svg>
                    Livrăm luni — sâmbătă. Prima dată disponibilă: <strong>${_formatDateRo(minDate)}</strong>.
                </p>
            </div>

            <div class="co-field">
                <label class="co-label" for="co-address">Adresă livrare *</label>
                <input class="co-input" type="text" id="co-address" name="address"
                       placeholder="Stradă, număr, bloc, scară, apartament, oraș"
                       autocomplete="street-address" required>
            </div>

            <div class="co-field">
                <label class="co-label" for="co-notes">
                    Mențiuni speciale <span class="co-optional">(opțional)</span>
                </label>
                <textarea class="co-textarea" id="co-notes" name="notes" rows="3"
                          placeholder="Alergie specifică, inscripție tort, oră preferată de livrare, etaj..."></textarea>
            </div>
        </fieldset>

        <div id="co-error-box" class="co-error-box" style="display:none" role="alert"></div>
    </form>`;
}

/* ── Summary HTML ────────────────────────────────────── */
function _summaryHTML(items, subtotal, delivery, total, advance) {
    const itemsHTML = items.map(item => {
        const qty = item.unit === 'kg'    ? `${item.qty} kg`
                  : item.unit === 'cutie' ? `${item.qty} cutie`
                  : `${item.qty} buc`;
        return `
        <div class="co-sum-item">
            <span class="co-sum-name">${item.name}
                <small class="co-sum-qty">${qty}</small>
            </span>
            <span class="co-sum-price">${(item.price * item.qty).toFixed(2)} RON</span>
        </div>`;
    }).join('');

    const deliveryStr = delivery === 0 ? '🎉 Gratuită' : `${delivery} RON`;

    return `
    <div class="co-summary-inner">
        <h3 class="co-summary-title">Comanda ta</h3>

        <div class="co-sum-items">${itemsHTML}</div>

        <div class="co-sum-sep"></div>

        <div class="co-sum-totals">
            <div class="co-sum-row"><span>Subtotal</span><span>${subtotal.toFixed(2)} RON</span></div>
            <div class="co-sum-row"><span>Livrare</span><span>${deliveryStr}</span></div>
            <div class="co-sum-row co-sum-total">
                <span>Total</span><span>${total.toFixed(2)} RON</span>
            </div>
        </div>

        <div class="co-advance-box">
            <div class="co-advance-label">Avans de plată (50%)</div>
            <div class="co-advance-amount">${advance.toFixed(2).replace('.', ',')} RON</div>
            <div class="co-advance-note">Vei primi link-ul de plată după confirmarea comenzii</div>
        </div>

        <button id="checkout-submit" class="co-submit-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Plasează Comanda
        </button>

        <p class="co-disclaimer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Date securizate · Fără card acum · Plată avans după confirmare
        </p>
    </div>`;
}

/* ── Bind events ─────────────────────────────────────── */
function _bindCheckoutEvents(currentZone) {
    // Zone pills → actualizează sumar live
    document.querySelectorAll('.co-zone-pill input[type=radio]').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.co-zone-pill')
                .forEach(p => p.classList.remove('co-zone-pill--active'));
            radio.closest('.co-zone-pill').classList.add('co-zone-pill--active');

            const newZone  = radio.value;
            const subtotal = getSubtotal();
            const delivery = getDeliveryFee(newZone);
            const total    = subtotal + delivery;
            const advance  = Math.round(total * 0.5 * 100) / 100;
            document.getElementById('co-summary-col').innerHTML =
                _summaryHTML(getCart(), subtotal, delivery, total, advance);
            _bindSubmitBtn();
        });
    });

    _bindSubmitBtn();
}

function _bindSubmitBtn() {
    document.getElementById('checkout-submit')
        ?.addEventListener('click', _handleSubmit);
}

/* ── Form data & validation ──────────────────────────── */
function _getFormData() {
    const fd = new FormData(document.getElementById('checkout-form'));
    return {
        name:    (fd.get('name')    || '').trim(),
        phone:   (fd.get('phone')   || '').replace(/[\s\-\(\)]/g, ''),
        email:   (fd.get('email')   || '').trim() || null,
        zone:    fd.get('zone'),
        date:    fd.get('date'),
        address: (fd.get('address') || '').trim(),
        notes:   (fd.get('notes')   || '').trim() || null,
    };
}

function _validate(fd) {
    const errs = [];

    if (!fd.name || fd.name.length < 3)
        errs.push('Numele complet este obligatoriu (minim 3 caractere).');

    if (!fd.phone || !/^(07|02|03)\d{8}$/.test(fd.phone))
        errs.push('Numărul de telefon nu este valid. Format: 07xx xxx xxx');

    if (!fd.zone)
        errs.push('Selectează zona de livrare (București sau Ilfov).');

    if (!fd.date) {
        errs.push('Selectează data de livrare.');
    } else {
        const chosen = new Date(fd.date + 'T00:00:00');
        const minD   = new Date();
        minD.setDate(minD.getDate() + 2);
        minD.setHours(0, 0, 0, 0);

        if (chosen < minD)
            errs.push(`Data de livrare trebuie să fie minimum ${_formatDateRo(_getMinDate())} (48h în avans).`);

        if (chosen.getDay() === 0)
            errs.push('Nu livrăm duminica. Te rugăm alege o zi între luni și sâmbătă.');
    }

    if (!fd.address || fd.address.length < 5)
        errs.push('Adresa de livrare este obligatorie.');

    return errs;
}

/* ── Submit ──────────────────────────────────────────── */
async function _handleSubmit(e) {
    e.preventDefault();

    const fd   = _getFormData();
    const errs = _validate(fd);

    const errorBox  = document.getElementById('co-error-box');
    const submitBtn = document.getElementById('checkout-submit');

    if (errs.length > 0) {
        errorBox.style.display = 'block';
        errorBox.innerHTML = errs.map(err => `<p>• ${err}</p>`).join('');
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }

    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="co-spinner"></span> Se procesează...`;

    try {
        const result = await submitOrder({
            cart:            getCart(),
            customerName:    fd.name,
            customerPhone:   fd.phone,
            customerEmail:   fd.email,
            deliveryZone:    fd.zone,
            deliveryDate:    fd.date,
            deliveryAddress: fd.address,
            notes:           fd.notes,
        });

        _showSuccess(result, fd);
        clearCart();

    } catch (err) {
        console.error('[BioCake] Order submit error:', err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Plasează Comanda`;
        errorBox.style.display = 'block';
        errorBox.innerHTML = `<p>• A apărut o eroare tehnică. Te rugăm să ne contactezi direct pe WhatsApp.</p>`;
    }
}

/* ── Success screen ──────────────────────────────────── */
function _showSuccess({ order, total, advanceDue }, fd) {
    const shortId = order.id.split('-')[0].toUpperCase();
    const waMsg   = _buildWhatsAppMsg(shortId, total, advanceDue, fd.date, fd.name);
    const waUrl   = `https://wa.me/${CHECKOUT_WHATSAPP}?text=${encodeURIComponent(waMsg)}`;

    document.getElementById('co-view-form').style.display = 'none';

    const el = document.getElementById('co-view-success');
    el.style.display = 'flex';
    el.innerHTML = `
    <div class="co-success">
        <div class="co-success-check" id="co-check">
            <svg viewBox="0 0 52 52" aria-hidden="true">
                <circle class="co-check-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="co-check-mark" fill="none" stroke-linecap="round"
                      stroke-linejoin="round" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
        </div>
        <h2 class="co-success-title">Comanda a fost plasată!</h2>
        <p class="co-success-id">Număr comandă: <strong>#${shortId}</strong></p>

        <div class="co-success-totals">
            <div class="co-success-total-row">
                <span>Total comandă</span>
                <strong>${total.toFixed(2).replace('.', ',')} RON</strong>
            </div>
            <div class="co-success-total-row co-success-advance">
                <span>Avans de plătit (50%)</span>
                <strong>${advanceDue.toFixed(2).replace('.', ',')} RON</strong>
            </div>
        </div>

        <p class="co-success-note">
            Te vom contacta în scurt timp pe WhatsApp sau telefon pentru confirmarea comenzii
            și trimiterea link-ului de plată pentru avans.
        </p>

        <div class="co-success-actions">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="co-btn-wa">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactează pe WhatsApp
            </a>
            <button class="co-btn-back" onclick="closeCheckout()">
                Înapoi la magazin
            </button>
        </div>
    </div>`;

    requestAnimationFrame(() => {
        setTimeout(() => document.getElementById('co-check')?.classList.add('co-check--animate'), 80);
    });
}

/* ── Helpers ─────────────────────────────────────────── */
function _getMinDate() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    // Dacă cade duminică → sărim la luni
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

function _formatDateRo(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

function _buildWhatsAppMsg(orderId, total, advance, date, name) {
    return `Bună! Am plasat o comandă pe BioCake.ro 🎂\n\nNumăr comandă: #${orderId}\nNume: ${name}\nData livrare: ${_formatDateRo(date)}\n\nTotal comandă: ${total.toFixed(2)} RON\nAvans de plătit (50%): ${advance.toFixed(2)} RON\n\nAștept confirmarea și link-ul de plată. Mulțumesc! 🙏`;
}

/* ── Inject HTML (singleton) ─────────────────────────── */
function _injectCheckoutHTML() {
    if (document.getElementById('checkout-overlay')) return;

    const el = document.createElement('div');
    el.id        = 'checkout-overlay';
    el.className = 'checkout-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Finalizează comanda');

    el.innerHTML = `
    <div class="checkout-modal" id="checkout-modal">
        <button class="checkout-close" id="checkout-close" aria-label="Închide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>

        <!-- Formular -->
        <div id="co-view-form">
            <div class="checkout-grid">
                <div class="co-form-col" id="co-form-col"></div>
                <div class="co-summary-col" id="co-summary-col"></div>
            </div>
        </div>

        <!-- Confirmare -->
        <div id="co-view-success" class="co-view-success" style="display:none"></div>
    </div>`;

    document.body.appendChild(el);
}
