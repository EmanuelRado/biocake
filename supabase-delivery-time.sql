-- ============================================================
--  BioCake — Ora de livrare pe comenzi
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_time time;

COMMENT ON COLUMN public.orders.delivery_time IS
  'Ora preferată de livrare (08:00–20:00, pas 30 min). Validare 48h reale în checkout.';
