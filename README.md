# BioCake — Magazin Online

Magazin online premium pentru prăjituri și torturi artizanale, cu livrare în București și Ilfov.

## Ce conține proiectul

| Pagină | Fișier | Descriere |
|--------|--------|-----------|
| **Site clienți** | `index.html` | Catalog produse, coș, checkout |
| **Panou admin (PWA)** | `admin.html` | Gestiune comenzi și produse + notificări push |

## Cum se deschide local

```bash
# Din folderul proiectului:
python -m http.server 8080
```

Apoi deschide în browser:
- Site: http://localhost:8080/index.html
- Admin: http://localhost:8080/admin.html

## Panou Administrator (PWA)

- Login cu contul Supabase Auth creat pentru admin
- **Instalare**: pe Android — banner „Instalează"; pe iOS — Share → Adaugă pe ecranul principal
- **Notificări push**: activează clopoțelul din header (funcționează în PWA instalată; pe iOS 16.4+)
- **Comenzi**: listă realtime (cele mai noi primele), schimbare status (`pending → confirmed → paid → delivered`)
- **Produse**: activare/dezactivare, editare completă, adăugare/ștergere

## Deploy

- **GitHub**: repo privat `EmanuelRado/biocake`, branch `main`
- **Netlify**: auto-deploy la push (`netlify.toml`)
- **Domeniu planificat**: `biocake.ro`

## Setup notificări push (Supabase)

1. Rulează `supabase-push.sql` în SQL Editor
2. Deploy Edge Function `notify-new-order` + setează secrets VAPID
3. Activează Database Webhooks (Integrations → Overview)
4. Creează webhook: `public.orders` INSERT → `notify-new-order`

## Stack

- HTML + CSS + Vanilla JS (fără framework)
- Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- PWA (Service Worker + Web Push)
- Netlify (static hosting)

## Documentație proiect

- `CURSOR_HANDOVER.md` — context tehnic complet
- `Ghid de Implementare.md` — roadmap etape
- `Arhitectura Sistemului.md` — schema DB și fluxuri
- `BioCake.md` — overview proiect și checklist
