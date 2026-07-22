# Netopia Payments — Setup BioCake

Integrare **API v2** (hosted page, `instrument: null`) via Supabase Edge Functions.

## Fișiere

| Fișier | Rol |
|--------|-----|
| `supabase-netopia.sql` | Coloane plată pe `orders` |
| `supabase/functions/netopia-start/` | Pornește plata, returnează `paymentUrl` |
| `supabase/functions/netopia-ipn/` | IPN + update `status=paid` |
| `js/orders.js` | `startNetopiaPayment()` |
| `js/checkout.js` | Selector 50%/100% + redirect |

## 1. Migrare SQL

În Supabase → SQL Editor, rulează conținutul din `supabase-netopia.sql`.

## 2. Secrets (Project Settings → Edge Functions → Secrets)

| Secret | Valoare |
|--------|---------|
| `NETOPIA_API_KEY` | API key din panoul Netopia (sandbox sau live) |
| `NETOPIA_POS_SIGNATURE` | POS Signature |
| `NETOPIA_PUBLIC_KEY` | Cheia publică RSA PEM (pentru verificarea IPN) — poți folosi `\n` pentru newline în secret |
| `NETOPIA_IS_LIVE` | `false` = sandbox, `true` = producție |
| `SITE_URL` | `https://biocake.ro` |

`SUPABASE_URL` și `SUPABASE_SERVICE_ROLE_KEY` sunt injectate automat.

## 3. Deploy Edge Functions

Din folderul `AI Projects/output/biocake` (cu [Supabase CLI](https://supabase.com/docs/guides/cli) logat pe proiectul `trwnnbszsgmxezkrpued`):

```bash
supabase functions deploy netopia-start --no-verify-jwt
supabase functions deploy netopia-ipn --no-verify-jwt
```

- `netopia-start`: `--no-verify-jwt` ca storefront-ul (anon) să poată apela cu apikey.
- `netopia-ipn`: `--no-verify-jwt` obligatoriu — Netopia nu trimite JWT Supabase; autentificarea e prin `Verification-token`.

URL-uri rezultate:
- Start: `https://trwnnbszsgmxezkrpued.supabase.co/functions/v1/netopia-start`
- IPN: `https://trwnnbszsgmxezkrpued.supabase.co/functions/v1/netopia-ipn`

În panoul Netopia, `notifyUrl` este setat automat de `netopia-start` la IPN-ul de mai sus.

## 4. Test sandbox

1. Carduri de test din documentația Netopia sandbox.
2. Plasează o comandă pe site → alege 50% sau 100% → redirect Netopia.
3. După plată → revenire `/?paid=1&order=…` + IPN marchează comanda `paid` în admin.
4. Verifică în admin: rândul „Plată: Plătită · Avans 50% / Integral 100%”.

## 5. Live

1. Înlocuiește secrets cu cheile **live**.
2. Setează `NETOPIA_IS_LIVE=true`.
3. Redeploy functions (sau doar update secrets + restart).
4. Test cu sumă mică reală.

## Flux status comenzi

- `pending` → client a plasat, plata poate fi `started`
- IPN success → `status=paid` + `payment_status=paid` (sare peste `confirmed`)
- Admin: `paid` → `delivered`

## Troubleshooting

- **„Netopia nu este configurat”** → lipsesc secrets.
- **„Nu am primit URL de plată”** → verifică API key / POS / răspuns în logs Edge Function.
- **IPN fail / comanda rămâne started** → verifică `NETOPIA_PUBLIC_KEY` (PEM complet) și header `Verification-token`.
- **CORS** → `netopia-start` trimite `Access-Control-Allow-Origin: *`.
