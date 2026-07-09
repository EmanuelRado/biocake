# BioCake — Magazin Online

Magazin online premium pentru prăjituri și torturi artizanale, cu livrare în București și Ilfov.

## Ce conține proiectul

| Pagină | Fișier | Descriere |
|--------|--------|-----------|
| **Site clienți** | `index.html` | Catalog produse, coș, checkout |
| **Panou admin** | `admin.html` | Gestiune comenzi și produse (pentru mamă) |

## Cum se deschide local

```bash
# Din folderul proiectului:
python -m http.server 8080
```

Apoi deschide în browser:
- Site: http://localhost:8080/index.html
- Admin: http://localhost:8080/admin.html

## Panou Administrator

- Login cu contul Supabase Auth creat pentru admin
- **Comenzi**: listă realtime, schimbare status (`pending → confirmed → paid → delivered`)
- **Produse**: activare/dezactivare, editare completă, adăugare/ștergere

## Stack

- HTML + CSS + Vanilla JS (fără framework)
- Supabase (PostgreSQL, Auth, Realtime)
- Deploy recomandat: Netlify sau Vercel (static)

## Documentație proiect

- `CURSOR_HANDOVER.md` — context tehnic complet
- `Ghid de Implementare.md` — roadmap etape
- `Arhitectura Sistemului.md` — schema DB și fluxuri
