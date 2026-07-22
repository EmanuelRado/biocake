# 🏁 Ghid de Implementare: BioCake

> [!info] Scopul Ghidului
> Acest document reprezintă harta de parcurs tehnică pentru construirea, testarea și lansarea magazinului online BioCake. Procesul este împărțit în 6 etape clare pentru a obține rapid un MVP (Minimum Viable Product) complet funcțional, minimizând riscurile și complexitatea tehnică.

---

## 📅 Roadmap de Dezvoltare pe Etape

```mermaid
gantt
    title Plan de Execuție BioCake
    dateFormat  YYYY-MM-DD
    section Design & Setup
    Etapa 1: Configurare & Design System    :done, 2026-07-04, 3d
    section Frontend
    Etapa 2: Interfață & Catalog Static     :done, 2026-07-07, 5d
    section Backend
    Etapa 3: Integrare Supabase             :done, 2026-07-12, 4d
    section Core Logic
    Etapa 4: Coș de Cumpărături & Checkout  :done, 2026-07-16, 5d
    section Admin Panel
    Etapa 5: Panou Admin (Pentru Mama)      :done, 2026-07-08, 1d
    Etapa 5b: PWA Admin + Push              :done, 2026-07-12, 1d
    section Launch
    Etapa 6: Securitate, SEO & Lansare      :active, 2026-07-09, 5d
```

---

## Detalierea Etapelor

### Etapa 1: Configurare Repo și Definire Design System 🎨
* **Repository**: Crearea unui repo git curat.
* **Design System**: Stabilirea culorilor, tipografiei și claselor utilitare în `index.css`. Vom folosi variabile CSS pentru a gestiona culorile pastelate și fonturile premium (ex: Outfit pentru titluri, Plus Jakarta Sans pentru text).
* **Structură Inițială**:
  - `/index.html` (Pagina principală - magazinul)
  - `/admin.html` (Panoul de control pentru mamă)
  - `/css/styles.css` (CSS-ul custom premium)
  - `/js/app.js` (Logica clientului)
  - `/js/admin.js` (Logica panoului administrativ)

### Etapa 2: Interfață Utilizator & Catalog Produse Static 🍰
* **Layout**: Construirea structurii mobile-first, asigurându-ne că totul arată impecabil pe ecrane de telefon.
* **Secțiuni Pagină Client**:
  1. **Header**: Logo, meniu rapid de categorii și indicatorul coșului de cumpărături cu efect de micro-animație.
  2. **Hero Section**: Slogan primitor, o imagine reprezentativă apetisantă și CTA principal "Vezi meniul".
  3. **Categorii Rapide**: Tab-uri interactive pentru filtrarea rapidă (Torturi, Prăjituri, Office Boxes, Comenzi Custom).
  4. **Grid Produse**: Carduri de produse continând poze premium, ingrediente, alerte specifice (Ex: "Fără Gluten", "De post"), preț și buton de adăugare în coș.
  5. **Secțiune Comenzi Custom**: Formular intuitiv pentru Candy Bar și Torturi Personalizate.
  6. **Footer**: Programul de livrare, politica de transport în București și datele legale obligatorii.

### Etapa 3: Integrare Supabase (Database & Auth) ⚙️
* **Proiect Supabase**: Inițializarea unui proiect gratuit pe Supabase.
* **Execuție Scheme**: Crearea tabelelor `produse`, `comenzi`, `articole_comanda` și `setari_sistem` în PostgreSQL utilizând editorul SQL Supabase.
* **Securitate**: Configurarea Row Level Security (RLS) astfel încât:
  - Oricine să poată citi produsele și setările sistemului.
  - Clienții să poată doar introduce comenzi noi (fără drept de citire a altor comenzi).
  - Doar administratorul autentificat (mama) să poată citi toate comenzile, modifica produsele și schimba stocurile.
* **Populare Bază de Date**: Adăugarea primelor 6-8 produse standard în tabelă pentru testare.

### Etapa 4: Coșul de Cumpărături & Checkout-ul Dinamic 🛒
* **Coș Local**: Salvarea stării coșului în `localStorage` pentru a nu pierde produsele la refresh.
* **Logica Calendarului & Timp de Pregătire**:
  - Selector de dată și oră care restricționează selectarea oricărui interval mai mic de **48 de ore** de la momentul curent (timp de pregătire obligatoriu).
  - Posibilitatea de a exclude duminicile sau alte zile specifice pe baza setărilor din DB.
* **Logica Calcul Livrare (București vs. Ilfov)**:
  - Formular de checkout cu selector județ/localitate pentru calculul automat al livrării:
    - **București**: Taxă livrare **20 RON** (devine **0 RON** la coș >= **250 RON**).
    - **Ilfov**: Taxă livrare **40 RON** (devine **0 RON** la coș >= **600 RON**).
* **Integrare Plăți Netopia (Avans 50% / Integral 100%)**:
  - Selector la checkout care permite clientului să aleagă plata unui **avans de 50%** sau a sumei **integrale (100%)** online.
  - Integrarea unui text informativ discret privind calcularea avansului și a unui checkbox/notificare obligatorie în care clientul confirmă că ia la cunoștință că, fiind produse artizanale lucrate manual, greutatea finală poate înregistra o variație de sub 100 de grame (cu posibile regularizări ale sumei la livrare).
  - Redirecționarea utilizatorului către pagina securizată Netopia.
  - Webhook de confirmare a tranzacției în Supabase pentru a schimba statusul comenzii în "nouă" și a rezerva stocurile.
* **Procesare Comandă**:
  - Trimiterea datelor către Supabase și decrementarea cantităților din stoc prin proceduri stocate securizate (RPC) în baza de date pentru a preveni "race conditions".
  - Trimiterea unui e-mail automat de confirmare prin Supabase Edge Functions sau servicii externe simple (ex: EmailJS/SendGrid).

### ✅ Etapa 5: Panoul de Administrare "Admin-Friendly" 📱 — COMPLETAT (2026-07-08)
* **Autentificare Admin**: Login email/parolă via Supabase Auth. Logout în header.
* **Tab Comenzi**:
  - Listă realtime cu subscripție `postgres_changes`, sortare `created_at DESC`.
  - Filtrare pe status cu contoare live; filtrul „Toate" exclude comenzile livrate.
  - Carduri cu toate detaliile comenzii + buton avansare status cu un tap.
* **Tab Produse**:
  - Thumbnailuri din `images[0]` (nu emoji în listă).
  - Toggle activ/inactiv instant.
  - Modal editare complet: toate câmpurile produsului (preț, descriere, ingrediente, alergeni, declarație nutrițională, imagini cu preview, greutăți disponibile).
  - Creare produs nou cu slug auto-generat.
  - Ștergere produs cu confirmare.
* **Fișiere**: `admin.html`, `css/admin.css`, `js/admin.js`
* **⚠️ Migrare SQL `max_qty`:** ~~necesară~~ — **aplicată** (2026-07-18).

### ✅ Etapa 5b: PWA Admin + Notificări Push 🔔 — COMPLETAT (2026-07-12)
* **PWA instalabilă**: `manifest.webmanifest`, `sw.js`, iconițe 192/512/maskable, meta iOS.
* **Offline**: service worker cache-uiește shell-ul admin.
* **Banner instalare**: hint „Adaugă pe ecranul principal" (Android: buton Instalează; iOS: instrucțiuni Share).
* **Push la comandă nouă**:
  1. Admin activează clopoțelul → abonament salvat în `push_subscriptions`.
  2. Client plasează comandă → RPC `place_order` → INSERT în `orders` (trigger webhook).
  3. Database Webhook → Edge Function `notify-new-order` → push pe toate dispozitivele.
* **Setup Supabase** (manual în dashboard):
  - Rulează `supabase-push.sql`.
  - Deploy Edge Function + secrets VAPID.
  - Activează Database Webhooks (Overview) → creează hook pe `orders` INSERT.
* **Fișiere**: `manifest.webmanifest`, `sw.js`, `supabase-push.sql`, `supabase/functions/notify-new-order/index.ts`

### 🟡 Etapa 6: Securitate, Găzduire & Lansare 🚀 (ÎN PROGRES)
* **Găzduire (✅)**:
  - Repo GitHub privat `EmanuelRado/biocake`, branch `main`.
  - Netlify cu auto-deploy (`netlify.toml`).
  - Domeniu `https://biocake.ro` — Netlify DNS (nsone), live 2026-07-18.
* **Securitate pre-lansare (P0) ✅ 2026-07-18**:
  - `is_admin()` = email `admin@biocake.ro`.
  - RLS pe comenzi, produse (CRUD), push_subscriptions, storage imagini.
  - UPDATE orders doar pe `status`; products pe coloanele din admin.
  - CHECK constraint statusuri: pending | confirmed | paid | delivered.
  - Fișier: `supabase-p0-security.sql` (aplicat pe Supabase).
* **`max_qty` ✅**: coloană în DB + legată în `admin.js`.
* **Comenzi RPC `place_order` ✅ 2026-07-19**:
  - Prețuri din `products`, insert atomic, validare livrare pe server.
  - Fără INSERT anon direct pe `orders` / `order_items`.
  - Fișier: `supabase-place-order.sql`.
* **Catalog / UX post-audit ✅ 2026-07-19…22**:
  - Categorie **De Post** (`de-post`), `piece_grams`, escape XSS, pills greutate din produs, selector cutie, a11y drawer, `js/config.js`.
  - Mesaj brand **fără zahăr rafinat** (hero, #despre, footer) + SEO/OG/JSON-LD + fonts non-blocking.
* **Netopia Payments (cod) ✅ 2026-07-22**:
  - Selector checkout 50%/100%, EF `netopia-start` + `netopia-ipn`, `supabase-netopia.sql`.
  - Setup: `NETOPIA.md` (secrets + deploy + test sandbox).
* **Audit Tehnic & SEO** (rămâne):
  - Deploy Netopia pe Supabase + test.
  - Conversie imagini WebP + resize la upload.
  - Telefon/WhatsApp real în `js/config.js`.
  - Lighthouse mobil >90 (după WebP).

> [!note] Documentație
> Actualizează `CURSOR_HANDOVER.md` + `Arhitectura Sistemului.md` + `BioCake.md` la fiecare schimbare tehnică (regulă `.cursor/rules/biocake-docs.mdc`).
