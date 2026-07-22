# 🚀 BioCake Project Handover Context

Acest document este creat pentru a fi importat într-o nouă sesiune de lucru în **Cursor** (prin adăugarea lui în context sau selectarea cu `@`). El oferă noului asistent AI toate detaliile tehnice, arhitecturale și regulile de business necesare pentru a continua dezvoltarea BioCake fără pierderi de context.

> [!important] Documentație
> La **orice** modificare tehnică/structurală (fișiere noi, SQL, fluxuri, UI relevant), actualizează acest fișier + [[Arhitectura Sistemului]] + [[BioCake]] (checklist/status) în același PR/commit. Vezi regula agent: `.cursor/rules/biocake-docs.mdc`.

---

## 1. Despre Proiect & Reguli de Business

**BioCake** este un magazin online premium dedicat vânzării de **prăjituri clasice, tradiționale și moderne** (exclusiv cu livrare în București/Ilfov, fără ridicare fizică).

*   **Regula de 48h:** Comenzile se plasează cu minimum **48 de ore reale** înainte (nu zile calendaristice). Enforce pe client (`checkout.js`) **și** pe server (`place_order` RPC).
*   **Livrări:** **Luni – sâmbătă**, sloturi **08:00–20:00 din 30 în 30 min**. Duminica blocată.
*   **Politica de Livrare:**
    *   **București:** Taxă **20 RON** (Gratuită >= **250 RON**).
    *   **Ilfov:** Taxă **40 RON** (Gratuită >= **600 RON**).
*   **Regula de Plată:** Avans **50%**. Netopia încă neintegrat — după submit: ecran succes + buton **WhatsApp** (număr din `js/config.js`). Link plată trimis manual de admin.
*   **Mesaj brand (client):** **Fără zahăr rafinat.** Indulcitori după rețetă: zahăr brut, zahăr de mesteacăn (xilitol), zahăr de cocos, sirop de agave, sirop de curmale, miere etc. Accent pe site (hero, #despre, SEO).
*   **Regula Greutate Torturi:** `min_qty` / `step` / `max_qty` → opțiuni generate dinamic (`weightOptionsForProduct` în `data.js`). Aceleași opțiuni în modal **și** în coș (pills).
*   **Gramaj pe bucată:** `piece_grams` (integer, opțional) pentru `unit = buc` — afișat pe card / modal / coș.
*   **Minim comandă:** Coșul respectă `minQty` la +/− (buton − dezactivat la minim).
*   **Layout Mobil:** Catalog **2 produse pe rând**.

---

## 2. Supabase - Conexiune & Schemă Live

*   **Project URL:** `https://trwnnbszsgmxezkrpued.supabase.co`
*   **Anon Public Key:** în `js/supabase.js` (publishable — securitatea e pe RLS + RPC)
*   **Auth admin:** `admin@biocake.ro` via `is_admin()` (JWT email)

### Coloane cheie `products` (extra față de seed initial)
*   `max_qty` numeric
*   `piece_grams` integer (nullable, CHECK > 0)
*   `category` include `de-post`

### Coloane cheie `orders`
*   `delivery_time` time (nullable) — slot orar livrare

### RPC `place_order` (canonic: `supabase-place-order.sql`) — ✅ aplicat
*   Insert **atomic** orders + order_items
*   Prețuri / nume / unit din `products` (active) — **nu** din localStorage
*   Validare: zonă, adresă, 48h, Lun–Sâm, 08:00–20:00 / 30 min, min/max qty
*   Taxă livrare recalculată server-side
*   **INSERT anon pe tabele eliminat** — doar prin RPC (SECURITY DEFINER)
*   Index `order_items_order_id_idx`

### RLS / Securitate P0 (`supabase-p0-security.sql`) — ✅ aplicat
*   `is_admin()` = email JWT `admin@biocake.ro`
*   Orders: SELECT/UPDATE/DELETE admin; UPDATE grant doar coloana `status`
*   Products: CRUD admin; public SELECT doar `active = true`
*   Storage `product-images`: upload/update/delete admin; read public
*   Push subscriptions: doar admin
*   CHECK `orders_status_valid`

### Alte SQL
| Fișier | Scop |
|--------|------|
| `supabase-migration.sql` | Schema + seed (referință) |
| `supabase-delivery-time.sql` | Coloana `delivery_time` |
| `supabase-piece-grams.sql` | Coloana `piece_grams` + grant |
| `supabase-storage.sql` | Bucket imagini |
| `supabase-push.sql` | Push subscriptions |

---

## 3. Structura Fișierelor & Funcționalitate

SPA static: HTML + CSS + Vanilla JS. Repo: `https://github.com/EmanuelRado/biocake` → Netlify → `https://biocake.ro`.

### Site Public
| Fișier | Rol |
|--------|-----|
| `index.html` | Shell + secțiuni (#catalog, #office-box, #comenzi-custom, **#despre**, #contact) |
| `css/styles.css` | Design system; CTA = brand pink `#FC6D9F`; `:focus-visible`; drawer a11y |
| `js/config.js` | **Contact central:** `phoneDisplay`, `phoneTel`, `whatsapp`, `email` |
| `js/supabase.js` | Client + auth persist `localStorage` key `biocake-auth` |
| `js/data.js` | Fetch produse, `_escHtml` / `_safeImgSrc`, `weightOptionsForProduct` |
| `js/catalog.js` | Catalog, filtre, modal; escape HTML; qty pentru `buc` **și** `cutie` |
| `js/cart.js` | Coș localStorage; `minQty`/`maxQty`/`image`; sync preț la re-add |
| `js/cart-ui.js` | Drawer: copertă produs, pills din produs, Escape + focus restore |
| `js/orders.js` | `submitOrder` → `rpc('place_order')` |
| `js/checkout.js` | Validare client + succes WhatsApp (din config) |
| `js/app.js` | Init + aplică telefon din config pe footer |

### Admin PWA
*   `admin.html` / `css/admin.css` / `js/admin.js` / `sw.js` (cache `biocake-admin-v7`) / `manifest.webmanifest`
*   Auth persist; produse CRUD + upload Storage + reorder imagini; `piece_grams` pe unitate buc
*   Comenzi: realtime, filtre, status, delete, WhatsApp client
*   SW scope `/` (necesar WebAPK/push); navigări non-admin nu forțează fallback admin

---

## 4. Gotchas / Rezolvări Critice

1. **Submit comenzi:** Nu mai folosi INSERT direct + UUID client. Doar **`place_order` RPC** (preț server + atomic).
2. **`WEIGHT_OPTIONS` duplicat în `data.js`:** a rupt catalogul (SyntaxError). O singură declarație + `weightOptionsForProduct`.
3. **XSS storefront:** Escape obligatoriu pe catalog/cart (`_escHtml`); admin are `_esc`.
4. **Coș greutăți:** Nu hardcoda 1.2/1.8/2.4 — folosește `weightOptionsForProduct` / `_cartWeightOptions`.
5. **Contact:** Un singur loc — `js/config.js` (placeholder până la număr real).
6. **Auth refresh:** Nu trata orice `session=null` ca logout (`INITIAL_SESSION` / token refresh).
7. **`weight_note`:** boolean toggle, nu text.
8. **PWA / Samsung Internet:** Preferă Chrome pentru instalare; banner avertizează Samsung.
9. **Webhook push:** Activează Database Webhooks înainte de a crea hook-ul.

---

## 5. Etape & Audit (2026-07-19)

### ✅ Etape 1–5b + P0 + domeniu
Vezi istoric mai jos / commits pe `main`.

### ✅ Audit pre-lansare + Ziua 1–3 (2026-07-19 … 2026-07-22)
**Ziua 1:** escape XSS, `#despre`, tokeni CSS, hamburger `<button>`, `js/config.js`  
**Ziua 2:** `place_order` RPC, pills greutate din produs, selector cutie, focus-visible + Escape drawer (CTA = `#FC6D9F`)  
**Ziua 3 (parțial):** mesaj **fără zahăr rafinat** (hero + Despre + meta), OG/canonical/JSON-LD, fonts non-blocking, Cache-Control Netlify  

### 🟡 Rămâne (backlog)
*   Telefon / WhatsApp **real** în `js/config.js`
*   Pipeline imagini (resize/WebP la upload)
*   Netopia Payments
*   Rate-limit / captcha pe comenzi (RPC încă public EXEC)
*   Focus trap complet pe drawer; paginare comenzi admin

---

## 6. Istoric etape (rezumat)

*   **Etapa 5:** Admin CRUD + realtime  
*   **Etapa 5b:** PWA + push  
*   **Etapa 6 (parțial):** GitHub + Netlify + `biocake.ro` + P0 security + delivery slots + delete orders + De Post + piece_grams + place_order + brand/SEO Ziua 3  

---

*Ultima actualizare documentație: 2026-07-22*
