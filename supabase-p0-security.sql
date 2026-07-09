-- =============================================================================
--  BioCake — P0 Security Fixes (versiune fără acces la schema auth)
--  Rulează în: Supabase Dashboard → SQL Editor → New Query → Run
-- =============================================================================


-- ── 1. Funcție helper — verifică emailul din JWT (nu atinge auth schema) ──────
--  auth.jwt() este accesibil și returnează payload-ul token-ului curent.
--  Emailul adminului este hardcodat — singura abordare sigură fără auth.users.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (auth.jwt() ->> 'email') = 'admin@biocake.ro',
        false
    );
$$;


-- ── 2. Politici RLS — înlocuiește "oricine authenticated" cu "doar admin" ─────

DROP POLICY IF EXISTS "orders_admin_read" ON orders;
CREATE POLICY "orders_admin_read" ON orders
    FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders
    FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_admin_read" ON products;
CREATE POLICY "products_admin_read" ON products
    FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products
    FOR UPDATE TO authenticated
    USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "order_items_admin_read" ON order_items;
CREATE POLICY "order_items_admin_read" ON order_items
    FOR SELECT TO authenticated USING (public.is_admin());


-- ── 3. Restricție coloane — admin poate modifica DOAR status / active ─────────

REVOKE UPDATE ON TABLE orders   FROM authenticated;
GRANT  UPDATE (status) ON TABLE orders   TO authenticated;

REVOKE UPDATE ON TABLE products FROM authenticated;
GRANT  UPDATE (active) ON TABLE products TO authenticated;


-- ── 4. Constrângere DB — status acceptă doar valori valide ───────────────────

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_valid;
ALTER TABLE orders ADD  CONSTRAINT orders_status_valid
    CHECK (status IN ('pending', 'confirmed', 'paid', 'delivered'));


-- ── 5. Verificare finală ───────────────────────────────────────────────────────

SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'products')
ORDER BY tablename, policyname;
