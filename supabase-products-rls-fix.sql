-- ============================================================
--  BioCake — Fix RLS: INSERT + DELETE produse (admin)
--  Rulează în Supabase → SQL Editor dacă lipsește policy-ul
-- ============================================================

DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products
    FOR DELETE
    TO authenticated
    USING (true);
