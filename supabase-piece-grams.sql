-- Gramaj per bucată (produse unit = buc)
-- Rulează pe proiectul Supabase BioCake

ALTER TABLE products ADD COLUMN IF NOT EXISTS piece_grams integer;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_piece_grams_positive;
ALTER TABLE products ADD CONSTRAINT products_piece_grams_positive
  CHECK (piece_grams IS NULL OR piece_grams > 0);

COMMENT ON COLUMN products.piece_grams IS 'Gramaj per bucată (g), pentru unit=buc';

-- Actualizează grant-urile column-level (P0 security)
REVOKE UPDATE ON TABLE products FROM authenticated;
GRANT UPDATE (
    name, category, price, unit, min_qty, step, max_qty,
    description, badge, weight_note, ingredients, allergens,
    images, nutritional, active, emoji, bg, slug, piece_grams
) ON TABLE products TO authenticated;
