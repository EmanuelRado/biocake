-- =============================================================================
-- BioCake — Netopia Payments (coloane pe orders)
-- Rulează în Supabase SQL Editor înainte de deploy Edge Functions.
-- IPN / start folosesc service role (bypass RLS) — fără GRANT anon pe aceste coloane.
-- =============================================================================

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS pay_mode text,
    ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
    ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'netopia',
    ADD COLUMN IF NOT EXISTS netopia_order_id text,
    ADD COLUMN IF NOT EXISTS netopia_ntp_id text,
    ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pay_mode_valid;
ALTER TABLE orders ADD CONSTRAINT orders_pay_mode_valid
    CHECK (pay_mode IS NULL OR pay_mode IN ('advance', 'full'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_valid;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_valid
    CHECK (payment_status IN ('none', 'started', 'paid', 'failed', 'canceled'));

CREATE INDEX IF NOT EXISTS orders_netopia_order_id_idx
    ON orders (netopia_order_id)
    WHERE netopia_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_payment_status_idx
    ON orders (payment_status);

COMMENT ON COLUMN orders.pay_mode IS 'advance = 50% | full = 100%';
COMMENT ON COLUMN orders.payment_status IS 'none | started | paid | failed | canceled';
COMMENT ON COLUMN orders.netopia_order_id IS 'orderID trimis la Netopia (UUID comandă)';
COMMENT ON COLUMN orders.netopia_ntp_id IS 'ntpID returnat de Netopia';
