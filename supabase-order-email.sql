-- =============================================================================
--  BioCake — Email confirmare după plată
--  Rulează în: Supabase Dashboard → SQL Editor → Run
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

COMMENT ON COLUMN orders.confirmation_email_sent_at IS
  'Setat când emailul Resend de confirmare plată a fost trimis (idempotență).';
