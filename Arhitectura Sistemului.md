# 📐 Arhitectura Sistemului: BioCake

> [!abstract] Concept Tehnologic
> Frontend **static** (HTML + Vanilla JS + CSS premium) pe **Netlify**, backend **Supabase** (PostgreSQL, Auth, Realtime, Storage, Edge Functions). Fără VPS custom. Comenzile se plasează prin RPC **`place_order`** (preț server + tranzacție atomică).

---

## 1. Stiva Tehnologică (Stack)

| Strat | Tehnologie | Note |
| :--- | :--- | :--- |
| **Frontend** | HTML + Vanilla JS | Fără bundler în producție (deocamdată) |
| **Styling** | Vanilla CSS | Design tokens: vanilla / rose `#FC6D9F` / chocolate / gold; fonts non-blocking din `index.html` |
| **Backend / DB** | Supabase PostgreSQL | RLS + RPC |
| **Realtime** | Supabase Realtime | Comenzi noi în admin |
| **Găzduire** | Netlify | `https://biocake.ro` ← GitHub `main` |
| **PWA / Push** | SW + Web Push (VAPID) | Admin instalabil |
| **Plăți** | Netopia (planificat) | Momentan: avans 50% + WhatsApp manual |

---

## 2. Modelul Bazei de Date

```mermaid
erDiagram
    products {
        uuid id PK
        text slug UK
        text name
        text category "torturi-clasice|prajituri|office-box|de-post"
        numeric price
        text unit "kg|buc|cutie|portie"
        numeric min_qty
        numeric step
        numeric max_qty
        integer piece_grams "opțional, unit=buc"
        text description
        text badge
        boolean weight_note
        text ingredients
        text allergens
        text images
        jsonb nutritional
        text emoji
        text bg
        boolean active
        timestamptz created_at
    }

    orders {
        uuid id PK
        timestamptz created_at
        text status "pending|confirmed|paid|delivered"
        text customer_name
        text customer_phone
        text customer_email
        text delivery_zone
        date delivery_date
        time delivery_time
        text delivery_address
        text notes
        numeric subtotal
        numeric delivery_fee
        numeric total
        numeric advance_due
    }

    order_items {
        uuid id PK
        uuid order_id FK
        text product_slug
        text product_name
        numeric qty
        text unit
        numeric unit_price
        numeric line_total
    }

    push_subscriptions {
        uuid id PK
        text endpoint UK
        text p256dh
        text auth
        timestamptz created_at
    }

    orders ||--|{ order_items : contains
```

### Securitate date
*   Public: `SELECT` produse `active = true`
*   Public: **nu** INSERT direct pe orders — doar `place_order(…)` (SECURITY DEFINER)
*   Admin: `is_admin()` pe email JWT `admin@biocake.ro`
*   Orders UPDATE: grant doar pe coloana `status`

---

## 3. Disponibilitate produse (implementat vs planificat)

**Implementat:** flag `active` (toggle în admin) — produs inactiv dispare din catalog public.

**Planificat (neimplementat):** stoc numeric, limită zilnică producție, calendar blocare zile.

---

## 4. Fluxul unei Comenzi

```mermaid
sequenceDiagram
    actor Client
    participant FE as Website
    participant RPC as place_order RPC
    participant DB as Supabase
    actor Admin as Admin PWA

    Client->>FE: Coș + checkout (validare 48h / sloturi)
    FE->>RPC: rpc place_order (slug+qty, date client)
    RPC->>DB: Citește prețuri products active
    RPC->>DB: INSERT orders + order_items (atomic)
    RPC-->>FE: id, total, advance_due
    FE-->>Client: Succes + WhatsApp
    DB-->>Admin: Realtime + Push webhook
    Admin->>DB: UPDATE status
```

---

## 5. Panoul de Administrare

**Status: ✅ IMPLEMENTAT** (+ PWA, push, P0 security, CRUD imagini).

* Auth persist (`biocake-auth`)
* Comenzi: realtime, filtre, status, delete, WhatsApp
* Produse: CRUD, Storage upload, reorder, `piece_grams`, greutăți kg
* PWA: `sw.js`, manifest, iconițe

### Planificat
* Calendar / Netopia webhook / layout admin 2-col pe desktop

---

## 6. Fișiere JS publice (ordine load)

`config.js` → `supabase.js` → `data.js` → `cart.js` → `catalog.js` → `cart-ui.js` → `orders.js` → `checkout.js` → `app.js`

---

*Ultima actualizare: 2026-07-19*
