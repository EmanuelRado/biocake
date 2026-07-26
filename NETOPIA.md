# Netopia Payments — Setup BioCake

Integrare **API v2** (hosted page, `instrument: null`) via Supabase Edge Functions.

## Fișiere

| Fișier | Rol |
|--------|-----|
| `supabase-netopia.sql` | Coloane plată pe `orders` |
| `supabase-order-email.sql` | Coloană `confirmation_email_sent_at` (idempotență email) |
| `supabase/functions/netopia-start/` | Pornește plata, returnează `paymentUrl` |
| `supabase/functions/netopia-ipn/` | IPN + update `status=paid` + hook email |
| `supabase/functions/netopia-confirm/` | Poll `/operation/status` + update (fallback IPN) + hook email |
| `supabase/functions/send-order-paid-email/` | Email Resend după plată (o singură dată) |
| `js/orders.js` | `startNetopiaPayment()`, `confirmNetopiaPayment()` |
| `js/checkout.js` | Selector 50%/100% + email obligatoriu + redirect + confirm |

## 1. Migrare SQL

În Supabase → SQL Editor, rulează conținutul din `supabase-netopia.sql`.

## 2. Secrets (Project Settings → Edge Functions → Secrets)

| Secret | Valoare |
|--------|---------|
| `NETOPIA_API_KEY` | API key din panoul Netopia — **text scurt** tip `ApiKey_…` (NU fișier PEM / PRIVATE KEY) |
| `NETOPIA_POS_SIGNATURE` | POS Signature — format tip `XXXX-XXXX-XXXX-XXXX` |
| `NETOPIA_PUBLIC_KEY` | Cheia **publică** RSA PEM (`-----BEGIN PUBLIC KEY-----` …) pentru IPN |
| `NETOPIA_IS_LIVE` | `false` = sandbox, `true` = producție |
| `SITE_URL` | `https://biocake.ro` |

> [!warning]
> Nu pune **PRIVATE KEY** în `NETOPIA_API_KEY`. Asta rupe header-ul Authorization și plata nu pornește.

`SUPABASE_URL` și `SUPABASE_SERVICE_ROLE_KEY` sunt injectate automat.

## 3. Deploy Edge Functions

Din folderul `AI Projects/output/biocake` (cu [Supabase CLI](https://supabase.com/docs/guides/cli) logat pe proiectul `trwnnbszsgmxezkrpued`):

```bash
supabase functions deploy netopia-start --no-verify-jwt
supabase functions deploy netopia-ipn --no-verify-jwt
supabase functions deploy netopia-confirm --no-verify-jwt
supabase functions deploy send-order-paid-email --no-verify-jwt
```

- `netopia-start` / `netopia-confirm`: `--no-verify-jwt` ca storefront/admin (anon) să poată apela cu apikey.
- `netopia-ipn`: `--no-verify-jwt` obligatoriu — Netopia nu trimite JWT Supabase; autentificarea e prin `Verification-token`.
- `send-order-paid-email`: `--no-verify-jwt` — apelată doar din IPN/confirm cu `EMAIL_HOOK_SECRET` + service role (nu e webhook Resend).

URL-uri rezultate:
- Start: `https://trwnnbszsgmxezkrpued.supabase.co/functions/v1/netopia-start`
- IPN: `https://trwnnbszsgmxezkrpued.supabase.co/functions/v1/netopia-ipn`
- Confirm: `https://trwnnbszsgmxezkrpued.supabase.co/functions/v1/netopia-confirm`
- Email: `https://trwnnbszsgmxezkrpued.supabase.co/functions/v1/send-order-paid-email`

În panoul Netopia, `notifyUrl` este setat automat de `netopia-start` la IPN-ul de mai sus.

## 4. Test sandbox

1. Carduri de test din documentația Netopia sandbox.
2. Plasează o comandă pe site → alege 50% sau 100% → redirect Netopia.
3. După plată → revenire `/?paid=1&order=…` + `netopia-confirm` (și IPN) marchează comanda `paid`.
4. Verifică în admin: „Plată: Plătită”. Dacă rămâne „În curs” → buton **Verifică plata**.

## 5. Live

1. Înlocuiește secrets cu cheile **live**.
2. Setează `NETOPIA_IS_LIVE=true`.
3. Redeploy functions (sau doar update secrets + restart).
4. Test cu sumă mică reală.

## Flux status comenzi

- `pending` → client a plasat, plata poate fi `started`
- IPN success → `status=paid` + `payment_status=paid` (sare peste `confirmed`)
- Admin: `paid` → `delivered`

## 6. Email confirmare după plată (Resend)

Trimis **o singură dată** după `payment_status = paid` (din `netopia-ipn` sau `netopia-confirm`). Nu e nevoie de webhook Resend.

### Setup Resend (manual)

1. Resend → **Domains** → adaugă `biocake.ro` → DNS SPF/DKIM la registrar → status **Verified**.
2. **API Keys** → creează cheie.
3. Până domeniul e verificat, Resend acceptă doar destinatar = emailul contului Resend (util pentru test).

### SQL

Rulează `supabase-order-email.sql` (coloana `confirmation_email_sent_at`).

### Secrets suplimentare

| Secret | Valoare |
|--------|---------|
| `RESEND_API_KEY` | cheia din Resend |
| `RESEND_FROM` | `BioCake <comenzi@biocake.ro>` (domeniu verificat) |
| `RESEND_REPLY_TO` | opțional — default `contact@biocake.ro` |
| `EMAIL_HOOK_SECRET` | string lung aleator (header `x-email-hook-secret` între EF-uri) |

Exemplu set secrets (CLI, din folderul proiectului):

```bash
supabase secrets set RESEND_API_KEY="re_..." RESEND_FROM="BioCake <comenzi@biocake.ro>" EMAIL_HOOK_SECRET="..."
```

### Test

1. Comandă sandbox cu email real → plată card test → `paid` în admin.
2. Client primește email o singură dată.
3. „Verifică plata” din nou → fără al doilea email (`confirmation_email_sent_at`).
4. Fără `customer_email` → skip (200), IPN rămâne OK.

## Troubleshooting

- **„Netopia nu este configurat”** → lipsesc secrets.
- **„Nu am primit URL de plată”** → verifică API key / POS / răspuns în logs Edge Function.
- **IPN fail / comanda rămâne started** → verifică `NETOPIA_PUBLIC_KEY` (PEM/cert complet). Folosește **Verifică plata** în admin sau apelează `netopia-confirm`.
- **CORS** → `netopia-start` / `netopia-confirm` trimit `Access-Control-Allow-Origin: *`.
- **Email nu vine** → `RESEND_API_KEY` / domeniu neverificat / logs `send-order-paid-email`. Idempotență: coloana `confirmation_email_sent_at`.
