# BioCake — Magazin Online

Magazin online premium pentru prăjituri și torturi artizanale **fără zahăr rafinat**, cu livrare în București și Ilfov.

**Live:** https://biocake.ro  
**Repo:** https://github.com/EmanuelRado/biocake (`main` → Netlify)

## Ce conține proiectul

| Pagină | Fișier | Descriere |
|--------|--------|-----------|
| **Site clienți** | `index.html` | Catalog, coș, checkout, secțiune Despre |
| **Panou admin (PWA)** | `admin.html` | Comenzi realtime, produse CRUD, push |

## Cum se deschide local

```bash
python -m http.server 8080
```

- Site: http://localhost:8080/index.html
- Admin: http://localhost:8080/admin.html

## Flux comandă (important)

1. Client adaugă în coș (prețuri UI din catalog).
2. Checkout: alege **avans 50%** sau **integral 100%**.
3. Submit → RPC **`place_order`** (prețuri din DB).
4. Edge Function **`netopia-start`** → redirect Netopia.
5. IPN **`netopia-ipn`** → `status=paid`.

Setup plăți: vezi **`NETOPIA.md`**.

Nu insera direct în `orders` / `order_items` din client.

## Contact (config)

Editează **`js/config.js`**:

```js
phoneDisplay, phoneTel, whatsapp, email
```

Footer + checkout citesc de aici.

## Categorii produse

`torturi-clasice` · `prajituri` · `office-box` · `de-post` (UI: „De Post”)

## Panou Administrator (PWA)

- Login Supabase Auth (`admin@biocake.ro`)
- Comenzi: realtime, status, delete, WhatsApp
- Produse: CRUD, imagini Storage, `piece_grams` pentru buc, greutăți kg min/step/max
- Push: clopoțel → VAPID; webhook pe INSERT orders

## SQL de referință

| Fișier | Rol |
|--------|-----|
| `supabase-p0-security.sql` | `is_admin` + RLS |
| `supabase-place-order.sql` | RPC comandă |
| `supabase-piece-grams.sql` | Gramaj bucată |
| `supabase-delivery-time.sql` | Oră livrare |
| `supabase-push.sql` / `supabase-storage.sql` | Push / imagini |

## Stack

HTML + CSS + Vanilla JS · Supabase · PWA · Netlify

## Documentație

- `CURSOR_HANDOVER.md` — context tehnic (sursă de adevăr pentru agenți)
- `Arhitectura Sistemului.md` — schemă + fluxuri
- `BioCake.md` — overview + checklist
- `Ghid de Implementare.md` — roadmap
- `Plan de Afaceri.md` — business

> La modificări tehnice, actualizează docs în același timp (regulă `.cursor/rules/biocake-docs.mdc`).
