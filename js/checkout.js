/**
 * BioCake — checkout.js
 * Formular comandă: validare 48h reale, interval livrare 08:00–20:00 (pas 30 min).
 */

/* ── Config ──────────────────────────────────────────── */
const CHECKOUT_WHATSAPP = (window.BIOCAKE_CONTACT && window.BIOCAKE_CONTACT.whatsapp) || '40700000000';

const DELIVERY_WINDOW = {
    startHour: 8,   // 08:00
    endHour:   20,  // 20:00 inclusiv
    stepMin:   30,
    leadMs:    48 * 60 * 60 * 1000,
};

/* ── Init ────────────────────────────────────────────── */
function initCheckout() {
    _injectCheckoutHTML();

    document.getElementById('checkout-close')
        ?.addEventListener('click', closeCheckout);

    document.getElementById('checkout-overlay')
        ?.addEventListener('click', e => {
            if (e.target.id === 'checkout-overlay') closeCheckout();
        });

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
    const earliest = _getEarliestDeliverySlot();
    const minDate  = _toDateInput(earliest);

    document.getElementById('co-view-form').style.display = '';
    document.getElementById('co-view-success').style.display = 'none';
    document.getElementById('co-form-col').innerHTML   = _formHTML(zone, minDate);
    document.getElementById('co-summary-col').innerHTML = _summaryHTML(items, subtotal, delivery, total, advance);

    _bindCheckoutEvents(zone);
    _refreshTimeOptions(minDate, true);
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

            <div class="co-field-row">
                <div class="co-field">
                    <label class="co-label" for="co-date">
                        Data livrării *
                    </label>
                    <input class="co-input co-input-date" type="date" id="co-date" name="date"
                           min="${minDate}" value="${minDate}" required>
                </div>
                <div class="co-field">
                    <label class="co-label" for="co-time">
                        Ora livrării *
                    </label>
                    <select class="co-input co-input-time" id="co-time" name="time" required>
                        <option value="">Se încarcă…</option>
                    </select>
                </div>
            </div>
            <p class="co-field-hint">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/>
                    <path stroke-linecap="round" d="M12 8v4m0 4h.01"/>
                </svg>
                <span class="co-field-hint-text">
                    <span class="co-hint-line">Minim <strong>48 de ore</strong> în avans.</span>
                    <span class="co-hint-sep" aria-hidden="true"> · </span>
                    <span class="co-hint-line">Interval livrare Luni–Sâmbătă <strong>08:00–20:00</strong>.</span>
                </span>
            </p>

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
                          placeholder="Alergie specifică, inscripție tort, etaj, interfon..."></textarea>
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
            <div class="co-advance-label">Alege suma de plată online</div>
            <div class="co-pay-modes" role="radiogroup" aria-label="Mod de plată">
                <label class="co-pay-mode co-pay-mode--active">
                    <input type="radio" name="payMode" value="advance" checked>
                    <span class="co-pay-mode-title">Avans 50%</span>
                    <span class="co-pay-mode-amount" data-pay="advance">${advance.toFixed(2).replace('.', ',')} RON</span>
                    <span class="co-pay-mode-note">Restul la livrare</span>
                </label>
                <label class="co-pay-mode">
                    <input type="radio" name="payMode" value="full">
                    <span class="co-pay-mode-title">Integral 100%</span>
                    <span class="co-pay-mode-amount" data-pay="full">${total.toFixed(2).replace('.', ',')} RON</span>
                    <span class="co-pay-mode-note">Plătești tot acum</span>
                </label>
            </div>
            <p class="co-advance-note">
                Produsele sunt artizanale: greutatea finală poate varia cu &lt;100&nbsp;g
                (regularizare la livrare dacă e cazul).
            </p>
        </div>

        <button id="checkout-submit" class="co-submit-btn" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Plasează și plătește
        </button>

        <p class="co-disclaimer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Plată securizată Netopia · Card cu 3D Secure
        </p>
    </div>`;
}

/* ── Bind events ─────────────────────────────────────── */
function _bindCheckoutEvents(currentZone) {
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
            const prevPay  = document.querySelector('input[name=payMode]:checked')?.value || 'advance';
            document.getElementById('co-summary-col').innerHTML =
                _summaryHTML(getCart(), subtotal, delivery, total, advance);
            const payRadio = document.querySelector(`input[name=payMode][value="${prevPay}"]`);
            if (payRadio) {
                payRadio.checked = true;
                _syncPayModeUI();
            }
            _bindPayModeEvents();
            _bindSubmitBtn();
        });
    });

    document.getElementById('co-date')?.addEventListener('change', () => {
        const dateVal = document.getElementById('co-date').value;
        _refreshTimeOptions(dateVal, true);
    });

    _bindPayModeEvents();
    _bindSubmitBtn();
}

function _bindPayModeEvents() {
    document.querySelectorAll('input[name=payMode]').forEach(radio => {
        radio.addEventListener('change', _syncPayModeUI);
    });
    _syncPayModeUI();
}

function _syncPayModeUI() {
    document.querySelectorAll('.co-pay-mode').forEach(label => {
        const input = label.querySelector('input[name=payMode]');
        label.classList.toggle('co-pay-mode--active', !!(input && input.checked));
    });
}

function _bindSubmitBtn() {
    document.getElementById('checkout-submit')
        ?.addEventListener('click', _handleSubmit);
}

/* ── Form data & validation ──────────────────────────── */
function _getFormData() {
    const fd = new FormData(document.getElementById('checkout-form'));
    const payMode = document.querySelector('input[name=payMode]:checked')?.value || 'advance';
    return {
        name:    (fd.get('name')    || '').trim(),
        phone:   (fd.get('phone')   || '').replace(/[\s\-\(\)]/g, ''),
        email:   (fd.get('email')   || '').trim() || null,
        zone:    fd.get('zone'),
        date:    fd.get('date'),
        time:    fd.get('time'),
        address: (fd.get('address') || '').trim(),
        notes:   (fd.get('notes')   || '').trim() || null,
        payMode: payMode === 'full' ? 'full' : 'advance',
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

    if (!fd.date)
        errs.push('Selectează data de livrare.');

    if (!fd.time)
        errs.push('Selectează ora de livrare.');

    if (fd.date && fd.time) {
        const slot = _combineDateTime(fd.date, fd.time);
        const now  = new Date();
        const minAt = new Date(now.getTime() + DELIVERY_WINDOW.leadMs);

        if (Number.isNaN(slot.getTime())) {
            errs.push('Data sau ora de livrare nu este validă.');
        } else if (slot.getDay() === 0) {
            errs.push('Nu livrăm duminica. Alege o zi între luni și sâmbătă.');
        } else if (!_isInDeliveryWindow(slot)) {
            errs.push('Ora de livrare trebuie să fie între 08:00 și 20:00 (din 30 în 30 de minute).');
        } else if (slot.getTime() < minAt.getTime()) {
            const earliest = _getEarliestDeliverySlot(now);
            errs.push(`Livrarea trebuie să fie la minimum 48 de ore. Primul slot disponibil: ${_formatDateTimeRo(earliest)}.`);
        }
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

    let result = null;
    try {
        result = await submitOrder({
            cart:            getCart(),
            customerName:    fd.name,
            customerPhone:   fd.phone,
            customerEmail:   fd.email,
            deliveryZone:    fd.zone,
            deliveryDate:    fd.date,
            deliveryTime:    fd.time,
            deliveryAddress: fd.address,
            notes:           fd.notes,
        });

        submitBtn.innerHTML = `<span class="co-spinner"></span> Redirect către plată...`;

        const pay = await startNetopiaPayment(result.order.id, fd.payMode);
        try {
            sessionStorage.setItem('biocake_last_order', JSON.stringify({
                id: result.order.id,
                total: result.total,
                advanceDue: result.advanceDue,
                payMode: fd.payMode,
                date: fd.date,
                time: fd.time,
                name: fd.name,
            }));
        } catch (_) { /* ignore */ }
        clearCart();
        updateCartBadge(0);
        window.location.href = pay.paymentUrl;

    } catch (err) {
        console.error('[BioCake] Order/payment error:', err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Plasează și plătește`;

        // Comanda există dar plata a eșuat → ecran cu retry
        if (result && result.order && result.order.id) {
            clearCart();
            updateCartBadge(0);
            _showPaymentPending(result, fd, err);
            return;
        }

        errorBox.style.display = 'block';
        const raw = (err && (err.message || err.details || err.hint)) || '';
        const friendly = _friendlyOrderError(raw);
        const esc = typeof _escHtml === 'function' ? _escHtml : (s => String(s));
        errorBox.innerHTML = `<p>• ${esc(friendly)}</p>`;
    }
}

function _friendlyOrderError(raw) {
    const msg = String(raw || '');
    const known = [
        'Nume invalid',
        'Telefon invalid',
        'Zona de livrare invalida',
        'Adresa invalida',
        'Data si ora',
        'Cosul este gol',
        'Nu livram duminica',
        'Ora de livrare',
        'Livrarea trebuie',
        'Produs indisponibil',
        'Cantitate sub minim',
        'Cantitate peste maxim',
        'Linie de comanda',
    ];
    if (known.some(k => msg.includes(k))) {
        // Mesaje RPC (fără diacritice) → variantă RO pe UI
        if (msg.includes('Nu livram duminica')) return 'Nu livrăm duminica. Alege o zi între luni și sâmbătă.';
        if (msg.includes('Livrarea trebuie')) return 'Livrarea trebuie să fie la minimum 48 de ore.';
        if (msg.includes('Ora de livrare')) return 'Ora de livrare trebuie să fie între 08:00 și 20:00 (din 30 în 30 de minute).';
        if (msg.includes('Cosul este gol')) return 'Coșul este gol.';
        if (msg.includes('Produs indisponibil')) return 'Un produs din coș nu mai este disponibil. Reîncarcă pagina.';
        if (msg.includes('Cantitate sub minim')) return 'Cantitatea este sub minimul de comandă pentru un produs.';
        return msg;
    }
    return 'A apărut o eroare tehnică. Te rugăm să ne contactezi direct pe WhatsApp.';
}

/* ── Success / return from Netopia ───────────────────── */
function _showSuccess({ order, total, advanceDue, payMode, paidConfirmed }, fd) {
    const shortId = order.id.split('-')[0].toUpperCase();
    const mode = payMode || fd.payMode || 'advance';
    const payAmount = mode === 'full' ? total : advanceDue;
    const payLabel = mode === 'full' ? 'Plată integrală' : 'Avans plătit (50%)';

    const waMsg = _buildWhatsAppMsg(shortId, total, payAmount, mode, fd.date, fd.time, fd.name, paidConfirmed);
    const waUrl = `https://wa.me/${CHECKOUT_WHATSAPP}?text=${encodeURIComponent(waMsg)}`;

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
        <h2 class="co-success-title">${paidConfirmed ? 'Plata a fost înregistrată!' : 'Comanda a fost plasată!'}</h2>
        <p class="co-success-id">Număr comandă: <strong>#${shortId}</strong></p>

        <div class="co-success-totals">
            <div class="co-success-total-row">
                <span>Total comandă</span>
                <strong>${total.toFixed(2).replace('.', ',')} RON</strong>
            </div>
            <div class="co-success-total-row co-success-advance">
                <span>${payLabel}</span>
                <strong>${payAmount.toFixed(2).replace('.', ',')} RON</strong>
            </div>
        </div>

        <p class="co-success-note">
            Livrare programată: <strong>${_formatDateRo(fd.date)} · ${fd.time}</strong><br>
            ${paidConfirmed
                ? 'Mulțumim! Confirmăm comanda și te contactăm dacă e nevoie de detalii.'
                : 'Dacă ai finalizat plata pe Netopia, confirmarea poate dura câteva momente.'}
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

/** Comandă creată, dar redirect Netopia a eșuat — retry plată */
function _showPaymentPending(result, fd, err) {
    const shortId = result.order.id.split('-')[0].toUpperCase();
    const mode = fd.payMode || 'advance';
    const payAmount = mode === 'full' ? result.total : result.advanceDue;
    const esc = typeof _escHtml === 'function' ? _escHtml : (s => String(s));
    const errMsg = esc(_friendlyOrderError(err?.message || String(err)));

    document.getElementById('co-view-form').style.display = 'none';
    const el = document.getElementById('co-view-success');
    el.style.display = 'flex';
    el.innerHTML = `
    <div class="co-success">
        <h2 class="co-success-title">Comanda există — plata nu a pornit</h2>
        <p class="co-success-id">Număr comandă: <strong>#${shortId}</strong></p>
        <p class="co-success-note">
            ${errMsg}<br>
            Poți reîncerca plata acum sau ne contactezi pe WhatsApp.
        </p>
        <div class="co-success-actions">
            <button type="button" class="co-submit-btn" id="co-retry-pay">
                Reîncearcă plata (${payAmount.toFixed(2).replace('.', ',')} RON)
            </button>
            <button class="co-btn-back" onclick="closeCheckout()">Închide</button>
        </div>
    </div>`;

    document.getElementById('co-retry-pay')?.addEventListener('click', async () => {
        const btn = document.getElementById('co-retry-pay');
        btn.disabled = true;
        btn.textContent = 'Se conectează la Netopia...';
        try {
            const pay = await startNetopiaPayment(result.order.id, mode);
            window.location.href = pay.paymentUrl;
        } catch (e) {
            btn.disabled = false;
            btn.textContent = `Reîncearcă plata (${payAmount.toFixed(2).replace('.', ',')} RON)`;
            alert(_friendlyOrderError(e?.message || String(e)));
        }
    });
}

/* ── Delivery slot helpers (48h + 08:00–20:00 / 30 min) ─ */
function _ceilToHalfHour(d) {
    const out = new Date(d.getTime());
    out.setSeconds(0, 0);
    const m = out.getMinutes();
    if (m === 0 || m === 30) return out;
    if (m < 30) {
        out.setMinutes(30);
    } else {
        out.setHours(out.getHours() + 1, 0, 0, 0);
    }
    return out;
}

function _isInDeliveryWindow(d) {
    if (d.getDay() === 0) return false;
    const mins = d.getHours() * 60 + d.getMinutes();
    const start = DELIVERY_WINDOW.startHour * 60;
    const end   = DELIVERY_WINDOW.endHour * 60;
    if (mins < start || mins > end) return false;
    return mins % DELIVERY_WINDOW.stepMin === 0;
}

function _getEarliestDeliverySlot(from = new Date()) {
    let t = _ceilToHalfHour(new Date(from.getTime() + DELIVERY_WINDOW.leadMs));
    // max ~3 weeks of half-hour steps
    for (let i = 0; i < 21 * 48; i++) {
        if (_isInDeliveryWindow(t)) return t;
        t = new Date(t.getTime() + DELIVERY_WINDOW.stepMin * 60 * 1000);
    }
    // fallback: next Monday 08:00
    const fallback = new Date(from);
    fallback.setDate(fallback.getDate() + 3);
    while (fallback.getDay() === 0) fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(DELIVERY_WINDOW.startHour, 0, 0, 0);
    return fallback;
}

function _slotsForDate(dateStr) {
    const earliest = _getEarliestDeliverySlot();
    const slots = [];
    const [y, m, day] = dateStr.split('-').map(Number);
    if (!y || !m || !day) return slots;

    const probe = new Date(y, m - 1, day, 0, 0, 0, 0);
    if (probe.getDay() === 0) return slots;

    for (let mins = DELIVERY_WINDOW.startHour * 60; mins <= DELIVERY_WINDOW.endHour * 60; mins += DELIVERY_WINDOW.stepMin) {
        const h = Math.floor(mins / 60);
        const mi = mins % 60;
        const slot = new Date(y, m - 1, day, h, mi, 0, 0);
        if (slot.getTime() >= earliest.getTime()) {
            slots.push(_toTimeInput(slot));
        }
    }
    return slots;
}

function _refreshTimeOptions(dateStr, preferEarliest) {
    const select = document.getElementById('co-time');
    if (!select) return;

    const prev = select.value;
    const slots = dateStr ? _slotsForDate(dateStr) : [];

    if (slots.length === 0) {
        select.innerHTML = '<option value="">Nicio oră disponibilă în această zi</option>';
        select.disabled = true;
        // Dacă e duminică / fără sloturi, sare la următoarea zi validă
        if (dateStr) {
            const next = _nextAvailableDate(dateStr);
            const dateInput = document.getElementById('co-date');
            if (next && dateInput && next !== dateStr) {
                dateInput.value = next;
                _refreshTimeOptions(next, true);
            }
        }
        return;
    }

    select.disabled = false;
    const pick = preferEarliest
        ? slots[0]
        : (slots.includes(prev) ? prev : slots[0]);

    select.innerHTML = slots.map(t =>
        `<option value="${t}" ${t === pick ? 'selected' : ''}>${t}</option>`
    ).join('');
}

function _nextAvailableDate(fromDateStr) {
    const [y, m, d] = fromDateStr.split('-').map(Number);
    let cursor = new Date(y, m - 1, d);
    for (let i = 0; i < 14; i++) {
        cursor.setDate(cursor.getDate() + 1);
        const key = _toDateInput(cursor);
        if (_slotsForDate(key).length) return key;
    }
    return null;
}

function _combineDateTime(dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

function _toDateInput(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function _toTimeInput(d) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function _formatDateRo(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    const d = new Date(dateStr + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function _formatDateTimeRo(d) {
    return d.toLocaleString('ro-RO', {
        weekday: 'short', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit',
    });
}

function _buildWhatsAppMsg(orderId, total, payAmount, payMode, date, time, name, paidConfirmed) {
    const payLine = payMode === 'full'
        ? `Plată integrală: ${payAmount.toFixed(2)} RON`
        : `Avans (50%): ${payAmount.toFixed(2)} RON`;
    const statusLine = paidConfirmed
        ? 'Am finalizat plata pe Netopia.'
        : 'Am plasat comanda / revin după plată.';
    const when = date && date !== '—' && time
        ? `Livrare: ${_formatDateRo(date)} la ${time}\n`
        : '';
    return `Bună! Comandă BioCake.ro 🎂\n\nNumăr: #${orderId}\nNume: ${name || '—'}\n${when}Total: ${total.toFixed(2)} RON\n${payLine}\n\n${statusLine} Mulțumesc! 🙏`;
}

/**
 * După redirect Netopia (?paid=1&order=uuid).
 */
function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('paid');
    const orderId = params.get('order');
    if (paid === null || !orderId) return false;

    const clean = window.location.pathname + (window.location.hash || '');
    window.history.replaceState({}, '', clean || '/');

    const paidOk = paid === '1' || paid === 'true';
    _injectCheckoutHTML();

    let snap = null;
    try {
        snap = JSON.parse(sessionStorage.getItem('biocake_last_order') || 'null');
    } catch (_) { snap = null; }

    const total = (snap && snap.id === orderId) ? Number(snap.total) || 0 : 0;
    const advanceDue = (snap && snap.id === orderId)
        ? Number(snap.advanceDue) || 0
        : Math.round(total * 0.5 * 100) / 100;
    const payMode = (snap && snap.id === orderId && snap.payMode) || 'advance';
    const fd = {
        name: (snap && snap.name) || '',
        date: (snap && snap.date) || '—',
        time: (snap && snap.time) || '—',
        payMode,
    };

    const overlay = document.getElementById('checkout-overlay');
    if (overlay) {
        overlay.classList.add('co-open');
        document.body.style.overflow = 'hidden';
    }

    _showSuccess(
        {
            order: { id: orderId },
            total,
            advanceDue,
            payMode,
            paidConfirmed: paidOk,
        },
        fd,
    );

    try { sessionStorage.removeItem('biocake_last_order'); } catch (_) { /* ignore */ }
    return true;
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
