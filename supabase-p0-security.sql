-- =============================================================================
--  BioCake — P0 Security (adaptat 2026-07-18)
--  - Doar admin@biocake.ro poate gestiona comenzi / produse / push / storage
--  - Editarea completă a produselor rămâne funcțională (nu doar `active`)
--  - Comenzile: update doar pe coloana `status`
-- =============================================================================

-- ── 1. Helper is_admin() ─────────────────────────────────────────────────────
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


-- ── 2. Orders ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_admin_read" ON orders;
CREATE POLICY "orders_admin_read" ON orders
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_delete" ON orders;
CREATE POLICY "orders_admin_delete" ON orders
    FOR DELETE TO authenticated
    USING (public.is_admin());

GRANT DELETE ON TABLE orders TO authenticated;


-- ── 3. Order items ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_admin_read" ON order_items;
CREATE POLICY "order_items_admin_read" ON order_items
    FOR SELECT TO authenticated
    USING (public.is_admin());


-- ── 4. Products (CRUD admin) ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_admin_read" ON products;
CREATE POLICY "products_admin_read" ON products
    FOR SELECT TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- Public read rămâne: doar produse active (catalog clienți)
-- (products_public_read — neschimbat)


-- ── 5. Column-level grants ───────────────────────────────────────────────────
-- Orders: doar status (avansare în panoul admin)
REVOKE UPDATE ON TABLE orders FROM authenticated;
GRANT UPDATE (status) ON TABLE orders TO authenticated;

-- Products: toate câmpurile editate din admin (nu doar active)
REVOKE UPDATE ON TABLE products FROM authenticated;
GRANT UPDATE (
    name, category, price, unit, min_qty, step, max_qty,
    description, badge, weight_note, ingredients, allergens,
    images, nutritional, active, emoji, bg, slug, piece_grams
) ON TABLE products TO authenticated;

GRANT INSERT ON TABLE products TO authenticated;
GRANT DELETE ON TABLE products TO authenticated;


-- ── 6. Statusuri valide pe orders ────────────────────────────────────────────
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_valid;
ALTER TABLE orders ADD CONSTRAINT orders_status_valid
    CHECK (status IN ('pending', 'confirmed', 'paid', 'delivered'));


-- ── 7. Push subscriptions — doar admin ───────────────────────────────────────
DROP POLICY IF EXISTS "auth insert subscriptions" ON public.push_subscriptions;
CREATE POLICY "auth insert subscriptions"
    ON public.push_subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth update subscriptions" ON public.push_subscriptions;
CREATE POLICY "auth update subscriptions"
    ON public.push_subscriptions FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth select subscriptions" ON public.push_subscriptions;
CREATE POLICY "auth select subscriptions"
    ON public.push_subscriptions FOR SELECT
    TO authenticated
    USING (public.is_admin());


-- ── 8. Storage product-images — upload/update/delete doar admin ──────────────
DROP POLICY IF EXISTS "Auth upload product images" ON storage.objects;
CREATE POLICY "Auth upload product images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Auth update product images" ON storage.objects;
CREATE POLICY "Auth update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'product-images' AND public.is_admin())
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Auth delete product images" ON storage.objects;
CREATE POLICY "Auth delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'product-images' AND public.is_admin());

-- Public read pe storage rămâne (catalog)
