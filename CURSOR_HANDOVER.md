# 🚀 BioCake Project Handover Context

Acest document este creat pentru a fi importat într-o nouă sesiune de lucru în **Cursor** (prin adăugarea lui în context sau selectarea cu `@`). El oferă noului asistent AI toate detaliile tehnice, arhitecturale și regulile de business necesare pentru a continua dezvoltarea BioCake fără pierderi de context.

---

## 1. Despre Proiect & Reguli de Business

**BioCake** este un magazin online premium dedicat vânzării de **prăjituri clasice, tradiționale și moderne** (exclusiv cu livrare în București/Ilfov, fără ridicare fizică).

*   **Regula de 48h:** Comenzile se plasează cu minimum 48 de ore înainte pentru preparare.
*   **Livrări:** Zilele de livrare sunt **luni – sâmbătă** (duminica este închisă/blocată în calendar).
*   **Politica de Livrare:**
    *   **București:** Taxă livrare **20 RON** (Gratuită la comenzi >= **250 RON**).
    *   **Ilfov:** Taxă livrare **40 RON** (Gratuită la comenzi >= **600 RON**).
*   **Regula de Plată:**
    *   Plata se face prin avans **50%** (cu notificare discretă la checkout). 
    *   Momentan, din lipsă de credentiale de merchant Netopia active, comanda se trimite în DB, se arată ecran de succes și clientul trimite pre-completat detaliile pe **WhatsApp** printr-un buton dedicat, urmând ca link-ul de plată Netopia să fie trimis manual de administrator (mama).
*   **Regula Greutate Torturi:** Torturile vândute per kg au greutăți configurabile per-produs via câmpurile `min_qty`, `step` și `max_qty` (ex: 1.2 → 2.4 kg, pas 0.6). Opțiunile se generează dinamic. Se afișează nota privind variația manuală de sub 100g (controlată de câmpul boolean `weight_note`).
*   **Layout Mobil:** Catalogul de produse afișează **câte 2 produse pe rând** pe telefon mobil pentru o navigare rapidă.

---

## 2. Supabase - Conexiune & Schemă Live

Baza de date este activă și complet configurată pe Supabase.

*   **Project URL:** `https://trwnnbszsgmxezkrpued.supabase.co`
*   **Anon Public Key:** `sb_publishable_BKtT3xvutqKDc5eZicj2cg_mLogkvTU`
*   *(Acestea sunt configurate direct în `js/supabase.js`)*

### Schemă SQL (Rulată în Supabase)

#### Tabela `products`
```sql
CREATE TABLE products (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         text        UNIQUE NOT NULL,
    name         text        NOT NULL,
    category     text        NOT NULL,
    price        numeric(10,2) NOT NULL,
    unit         text        NOT NULL,   -- 'kg' | 'buc' | 'cutie' | 'portie'
    min_qty      numeric(5,2) DEFAULT 1,
    step         numeric(5,2) DEFAULT 1,
    max_qty      numeric(5,2) DEFAULT 2.4, -- ✅ prezent în DB + legat în admin.js
    description  text,
    badge        text,
    weight_note  boolean     DEFAULT false, -- afișează nota ±100g la clienți
    ingredients  text,
    allergens    text[],
    images       text[],
    nutritional  jsonb,       -- {per, energy_kcal, energy_kj, fat, saturated_fat, carbs, sugars, fiber, protein, salt}
    emoji        text,
    bg           text,
    active       boolean     DEFAULT true,
    created_at   timestamptz DEFAULT now()
);
```

#### Tabela `orders`
```sql
CREATE TABLE orders (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       timestamptz DEFAULT now(),
    status           text        DEFAULT 'pending', -- pending | confirmed | paid | delivered
    customer_name    text        NOT NULL,
    customer_phone   text        NOT NULL,
    customer_email   text,
    delivery_zone    text        NOT NULL,
    delivery_date    date        NOT NULL,
    delivery_address text,
    notes            text,
    subtotal         numeric(10,2),
    delivery_fee     numeric(10,2),
    total            numeric(10,2),
    advance_due      numeric(10,2)
);
```

#### Tabela `order_items`
```sql
CREATE TABLE order_items (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid        REFERENCES orders(id) ON DELETE CASCADE,
    product_slug text,
    product_name text        NOT NULL,
    qty          numeric(5,2) NOT NULL,
    unit         text        NOT NULL,
    unit_price   numeric(10,2) NOT NULL,
    line_total   numeric(10,2) NOT NULL
);
```

#### Tabela `push_subscriptions` (PWA notificări)
```sql
CREATE TABLE push_subscriptions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint   text        NOT NULL UNIQUE,
    p256dh     text        NOT NULL,
    auth       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: authenticated poate INSERT/UPDATE/SELECT propriile abonamente.
-- Edge Function `notify-new-order` citește cu service_role.
```

#### Row Level Security (RLS) active:
*   `products` - Oricine poate citi (`SELECT`) produsele active.
*   `orders` și `order_items` - Oricine poate introduce (`INSERT`) date, dar citirea (`SELECT`) este interzisă utilizatorilor anonimi din considerente de GDPR/Securitate.

---

## 3. Structura Fișierelor & Funcționalitate

Proiectul este o aplicație SPA bazată pe HTML, CSS și Vanilla JS. Fișierele sunt localizate în folderul `output/biocake/`:

### Site Public (clienți)
*   `index.html` - Pagina principală. Conține structura schelet, layout-urile modalului și script-urile JS importate.
*   `css/styles.css` - Design system premium: culorile brandului (Roz `#FC6D9F`, Ciocolată `#3D2014`), layout 2 carduri/rând mobil, modal produs (imagine 16:9, 84vh mobil / 72vh desktop), carusel swipe orizontal, skeleton shimmer loading, ecran succes.
*   `js/supabase.js` - Inițializează instanța globală `window._biocakeSupabase`.
*   `js/data.js` - Interfața asincronă de date. `fetchProducts` din Supabase cu fallback local. Mapare `_mapRow` include `maxQty` din coloana `max_qty`. `_weightOptions(product)` generează dinamic opțiunile de greutate per-produs (min → max, pas `step`, cu calcul porții automat ~6.67/kg).
*   `js/catalog.js` - Randare catalog cu skeleton loading, carusel imagini (swipe orizontal), modal fără dismiss la swipe vertical (scroll nativ). Link-uri `data-catalog-filter` (ex. CTA „Comandă Office Box") sar în catalog cu filtru aplicat. Opțiunile de greutate torturi sunt generate per-produs via `_weightOptions()` — **nu mai sunt hardcodate global**.
*   `js/cart.js` - Logica coșului în `localStorage`.
*   `js/cart-ui.js` - UI-ul drawer-ului lateral coș.
*   `js/orders.js` - Trimite comenzile în Supabase.
*   `js/checkout.js` - Modal fullscreen: colectare date, validare (tel românesc, 48h, no duminică), INSERT în DB, ecran succes + WhatsApp.
*   `js/app.js` - Punct de intrare (`DOMContentLoaded`).

### Panou Admin (`admin.html`) — PWA instalabilă
*   `admin.html` - Panou administrator mobil-first. Include shell-ul modalului de editare produs, meta PWA/iOS, banner instalare, înregistrare service worker.
*   `manifest.webmanifest` - PWA manifest (`scope: /admin.html`, `display: standalone`, culori brand).
*   `sw.js` - Service worker: cache offline shell admin + handler notificări push.
*   `images/icon-192.png`, `images/icon-512.png`, `images/icon-maskable.png` - Iconițe PWA + `apple-touch-icon`.
*   `css/admin.css` - Stiluri dedicate: design sistem consistent cu site-ul public, layout lățime telefon și pe desktop, status dots, toggle switches, modal editare slide-up, grid nutrițional, weight preview pills, filter chips scroll orizontal, banner PWA.
*   `js/admin.js` - Logică completă admin:
    - **Auth**: login/logout Supabase Auth.
    - **Comenzi**: încărcare sortată `created_at DESC` (cele mai noi primele) + subscripție realtime (`postgres_changes`), filtrare pe status, filtrul **„Toate"** exclude comenzile livrate, avansare status (`pending → confirmed → paid → delivered`), buton „Marchează Livrat" cu stil outline, icon WhatsApp pe carduri, format currency `Intl.NumberFormat`.
    - **Produse**: încărcare cu thumbnailuri din câmpul `images[]` (nu emoji), toggle activ/inactiv, buton editare per-produs.
    - **Modal editare**: toate câmpurile produsului (nume, categorie, preț, unitate, min/step/max greutate, badge, weight_note toggle, descriere, ingrediente, alergeni, declarație nutrițională completă, imagini cu preview live). kJ se calculează automat din kcal. Preview live al greutăților disponibile.
    - **Produs nou**: buton „+ Produs Nou", modal cu slug auto-generat din nume (cu eliminare diacritice).
    - **Ștergere produs**: buton roșu cu confirmare în modal de editare.
    - **Push notifications**: abonare Web Push (VAPID), salvare în `push_subscriptions`, buton clopoțel în header.

### Supabase Push (notificări la comandă nouă)
*   `supabase-push.sql` - Tabel `push_subscriptions` + policies RLS (rulat în dashboard).
*   `supabase/functions/notify-new-order/index.ts` - Edge Function: citește abonamente, trimite push via `web-push`, JWT verification **OFF** (acces webhook).
*   **Webhook** `notify-new-order-hook`: `public.orders` INSERT → Edge Function `notify-new-order`.
*   **Prerequisite**: Database Webhooks activate din Supabase → Integrations → Overview (altfel eroare `schema "supabase_functions" does not exist`).
*   **Secrets Supabase**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

### Deployment
*   `netlify.toml` - Publish static `.`, headere securitate, blocare acces public la `*.md` și `*.sql`.
*   **GitHub**: `https://github.com/EmanuelRado/biocake` (repo privat, branch `main`).
*   **Netlify**: auto-deploy la push pe `main`. Domeniu live: `https://biocake.ro` (Netlify DNS).

---

## 4. Gotchas / Rezolvări Critice Efectuate

1.  **Coliziune `getDeliveryFee`:** 
    Inițial, exista o funcție `getDeliveryFee(zone, subtotal)` în `orders.js` (generând bug-uri de calcul în UI-ul coșului). A fost redenumită în `calculateOrderDeliveryFee`.
2.  **RLS SELECT Insert Block:** 
    Insertul inițial folosea `.select().single()` pentru a prelua ID-ul generat de baza de date. Sub politicile RLS stricte de securitate (anon can insert, but cannot select), acest apel returna eroare tehnică (406). 
    *Soluție implementată:* Generăm ID-ul comenzii (UUID) direct în client-side (`_generateUUID()` cu fallback pentru context nesecurizat de tip `file://`), efectuăm insert-ul simplu (fără `.select()`) și refolosim ID-ul pentru `order_items`. Aceasta este o abordare 100% sigură și compatibilă GDPR.
3.  **Toggle switch în modal admin nu apărea (Etapa 5):**
    Input-ul `<input type="checkbox">` din modal nu avea `class="toggle-input"`, deci CSS-ul `.toggle-input { display: none }` nu se aplica și apărea checkbox clasic de browser. *Fix:* adăugat `class="toggle-input"` la toate checkbox-urile din `_renderEditForm`.
4.  **`weight_note` este `boolean`, nu text:**
    Coloana `weight_note` din tabela `products` este de tip `boolean` (DEFAULT false). La prima implementare a formularului de editare a fost tratat greșit ca text, afișând `"true"` în câmp. *Fix:* câmp schimbat în toggle switch, colectat cu `.checked` în `_saveProduct`.
5.  **`max_qty` — rezolvat:**
    Coloana există în DB. `admin.js` include `max_qty` în SELECT (`loadProducts`) și în UPDATE/INSERT (`_saveProduct`).
6.  **PWA banner nu se închide / nu reapare:**
    `.pwa-banner` avea `display: flex` care suprascria atributul `[hidden]`. *Fix:* `.pwa-banner[hidden] { display: none !important; }` în `admin.css`. Dismiss-ul folosește **`sessionStorage`** (nu `localStorage`); la load se șterge cheia veche `localStorage` pentru a recupera bannerul după bug-ul anterior.
7.  **iOS Safari — PWA & push:**
    Bannerul de instalare pe iOS nu are buton „Instalează" (comportament normal) — afișează instrucțiuni Share → Adaugă pe ecranul principal. Notificările push funcționează **doar în PWA instalată** (iOS 16.4+), nu în Safari tab normal.
8.  **Webhook Supabase — `supabase_functions` schema:**
    La crearea webhook-ului înainte de activarea feature-ului, apare eroarea `schema "supabase_functions" does not exist`. *Fix:* activează Database Webhooks din tab-ul Overview (Integrations) înainte de a crea hook-ul.

---

## 5. Etape de Dezvoltare

### ✅ Etapa 5: Panoul de Administrare (COMPLETAT — 2026-07-08)
*   **Fișiere create:** `admin.html`, `css/admin.css`, `js/admin.js`
*   **Implementat:**
    *   Autentificare email/parolă via Supabase Auth (login/logout).
    *   Comenzi: listă realtime cu `postgres_changes`, sortare `created_at DESC`, filtrare pe status (filtrul „Toate" exclude livrate), avansare status cu un tap.
    *   Produse: thumbnailuri din `images[0]`, toggle activ/inactiv, buton editare per rând.
    *   Modal editare complet: toate câmpurile produsului, declarație nutrițională, imagini cu preview live.
    *   Creare produs nou (INSERT) cu slug auto-generat.
    *   Ștergere produs cu confirmare.
    *   Weight preview live: generare opțiuni greutate din min/step/max.
    *   Design mobil-first consistent cu site-ul public; lățime fixă telefon și pe desktop.

### ✅ Etapa 5b: PWA Admin + Notificări Push (COMPLETAT — 2026-07-12)
*   **Fișiere create:** `manifest.webmanifest`, `sw.js`, `supabase-push.sql`, `supabase/functions/notify-new-order/index.ts`, iconițe în `images/`
*   **Implementat:**
    *   PWA instalabilă (Android + iOS Add to Home Screen).
    *   Service worker: cache offline shell + handler push.
    *   Banner instalare cu dismiss pe sesiune (`sessionStorage`).
    *   Abonare push din admin (clopoțel) → salvare în `push_subscriptions`.
    *   Webhook DB: INSERT pe `orders` → Edge Function → push la toate dispozitivele abonate.
    *   UX iOS documentat (instrucțiuni instalare, push doar în PWA instalată).

*   **✅ `max_qty`:** coloană în DB + SELECT/UPDATE în `admin.js` (2026-07-18).

*   **Probleme de securitate — rezolvate în Etapa 6 (P0):**
    *   RLS: policies admin bazate pe `is_admin()` (email `admin@biocake.ro`).
    *   Column-level grants pe orders/products.
    *   Fișierul `supabase-p0-security.sql` — **aplicat**.

---

### 🟡 Etapa 6: Securitate, Găzduire & Lansare (ÎN PROGRES)
*   **Găzduire (✅):**
    *   Repo GitHub privat `EmanuelRado/biocake`, branch `main`.
    *   Netlify cu auto-deploy la push (`netlify.toml` configurat).
    *   Domeniu `https://biocake.ro` — Netlify DNS (nsone), live 2026-07-18.
*   **Securitate P0 (✅ 2026-07-18):**
    *   `is_admin()` pe JWT email `admin@biocake.ro`.
    *   RLS: orders / order_items / products (CRUD) / push_subscriptions / storage `product-images`.
    *   Column grants: orders→`status`; products→câmpurile din formularul admin.
    *   CHECK `orders_status_valid`.
    *   Fișier canonic: `supabase-p0-security.sql`.
*   **SEO & Performanță (rămâne):**
    *   Meta tags pentru zona București/Ilfov.
    *   Conversie imagini în format WebP.
    *   Audit Lighthouse (target: >90 pe mobil).
