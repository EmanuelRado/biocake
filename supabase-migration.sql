-- =============================================================================
--  BioCake — Supabase Migration
--  Rulează INTEGRAL în: Dashboard → SQL Editor → New Query → Run
-- =============================================================================

-- ─────────────────────────────────────────────────────────
--  1. TABLES
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         text        UNIQUE NOT NULL,
    name         text        NOT NULL,
    category     text        NOT NULL,
    price        numeric(10,2) NOT NULL,
    unit         text        NOT NULL,   -- 'kg' | 'buc' | 'cutie'
    min_qty      numeric(5,2) DEFAULT 1,
    step         numeric(5,2) DEFAULT 1,
    description  text,
    badge        text,
    weight_note  boolean     DEFAULT false,
    ingredients  text,
    allergens    text[],
    images       text[],
    nutritional  jsonb,
    emoji        text,
    bg           text,
    active       boolean     DEFAULT true,
    created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at       timestamptz DEFAULT now(),
    status           text        DEFAULT 'pending',
    customer_name    text        NOT NULL,
    customer_phone   text        NOT NULL,
    customer_email   text,
    delivery_zone    text        NOT NULL,
    delivery_date    date        NOT NULL,
    delivery_address text,
    notes            text,
    subtotal         numeric(10,2),
    delivery_fee     numeric(10,2),
    total            numeric(10,2),
    advance_due      numeric(10,2)
);

CREATE TABLE IF NOT EXISTS order_items (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     uuid        REFERENCES orders(id) ON DELETE CASCADE,
    product_slug text,
    product_name text        NOT NULL,
    qty          numeric(5,2) NOT NULL,
    unit         text        NOT NULL,
    unit_price   numeric(10,2) NOT NULL,
    line_total   numeric(10,2) NOT NULL
);

-- ─────────────────────────────────────────────────────────
--  2. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────

ALTER TABLE products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Produse: oricine poate citi (doar cele active)
DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products
    FOR SELECT USING (active = true);

-- Comenzi: oricine poate insera, nimeni nu poate citi fără auth
DROP POLICY IF EXISTS "orders_insert_anon" ON orders;
CREATE POLICY "orders_insert_anon" ON orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "items_insert_anon" ON order_items;
CREATE POLICY "items_insert_anon" ON order_items
    FOR INSERT WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
--  3. SEED PRODUCTS
-- ─────────────────────────────────────────────────────────

INSERT INTO products (slug, name, category, price, unit, min_qty, step, description, badge, weight_note, ingredients, allergens, images, nutritional, emoji, bg) VALUES

-- Torturi Clasice
('tort-fraisier', 'Tort Fraisier', 'torturi-clasice', 180, 'kg', 1.2, 0.5,
 'Mousse delicat de vanilie cu căpșuni proaspete și pandișpan pufos — un clasic franțuzesc reinterpretat cu ingrediente naturale.',
 null, true,
 'Ouă* proaspete, zahăr, făină de grâu*, unt* (smântână*), lapte* integral, căpșuni proaspete, cremă de vanilie (lapte*, amidon, zahăr, păstăi de vanilie Bourbon), gelatină, zahăr pudră.',
 ARRAY['Ouă', 'Gluten (grâu)', 'Lapte'],
 ARRAY['images/products/tort-felie.png', 'images/products/cupcakes.png', 'images/products/cookies.png'],
 '{"per":"100g","energy_kcal":310,"energy_kj":1297,"fat":14,"saturated_fat":8.5,"carbs":40,"sugars":28,"fiber":0.8,"protein":5.2,"salt":0.1}'::jsonb,
 '🍰', '#FEE8F1'),

('tort-ciocolata-belgiana', 'Tort Ciocolată Belgiană', 'torturi-clasice', 160, 'kg', 1.2, 0.5,
 'Straturi de blat umed de ciocolată belgiană 70% cu ganache cremos și fructe de pădure proaspete.',
 null, true,
 'Ouă* proaspete, zahăr brun, făină de grâu*, ciocolată belgiană 70% (cacao*, zahăr, unt de cacao), unt* (smântână*), cacao 22%, smântână pentru frișcă*, frișcă*, zmeură, afine, amidon de porumb.',
 ARRAY['Ouă', 'Gluten (grâu)', 'Lapte', 'Soia (urmă)'],
 ARRAY['images/products/cupcakes.png', 'images/products/tort-felie.png', 'images/products/cookies.png'],
 '{"per":"100g","energy_kcal":390,"energy_kj":1632,"fat":22,"saturated_fat":13,"carbs":42,"sugars":30,"fiber":2.1,"protein":5.8,"salt":0.15}'::jsonb,
 '🎂', '#F5EDE8'),

('tort-caramel-nuca', 'Tort Caramel & Nucă', 'torturi-clasice', 170, 'kg', 1.2, 0.5,
 'Caramel sărat cu cremă de nuci prăjite și blat umed de cacao — combinație perfectă între dulce și ușor sărat.',
 'Preferat', true,
 'Nuci*, ouă* proaspete, zahăr, unt* (smântână*), smântână* pentru frișcă, cacao 22%, făină de grâu*, sare de mare, vanilie Bourbon naturală.',
 ARRAY['Nuci (nuci)', 'Ouă', 'Gluten (grâu)', 'Lapte'],
 ARRAY['images/products/cookies.png', 'images/products/tort-felie.png', 'images/products/cupcakes.png'],
 '{"per":"100g","energy_kcal":420,"energy_kj":1757,"fat":26,"saturated_fat":13,"carbs":41,"sugars":33,"fiber":1.5,"protein":6.1,"salt":0.25}'::jsonb,
 '🍫', '#FBF3DE'),

('tort-red-velvet', 'Tort Red Velvet', 'torturi-clasice', 175, 'kg', 1.2, 0.5,
 'Blat roșu catifeat cu cremă de mascarpone și vanilie bourbon — un tort iconic cu aspect spectaculos.',
 'Nou', true,
 'Ouă* proaspete, zahăr, unt* (smântână*), lapte* integral, făină de grâu*, cacao 22%, oțet de mere, bicarbonat de sodiu, mascarpone* (lapte*), zahăr pudră, extract natural de vanilie Bourbon, colorant natural din sfeclă.',
 ARRAY['Ouă', 'Gluten (grâu)', 'Lapte'],
 ARRAY['images/products/tort-felie.png', 'images/products/cookies.png', 'images/products/cupcakes.png'],
 '{"per":"100g","energy_kcal":360,"energy_kj":1506,"fat":18,"saturated_fat":11,"carbs":44,"sugars":31,"fiber":0.6,"protein":5.5,"salt":0.18}'::jsonb,
 '❤️', '#FDECEA'),

-- Prăjituri
('tarta-fructe', 'Tartă cu Fructe', 'prajituri', 18, 'buc', 4, 1,
 'Coajă crocantă de patiserie cu cremă de vanilie și fructe proaspete de sezon — simplă, elegantă și delicioasă.',
 null, false,
 'Făină de grâu*, unt* (smântână*), zahăr pudră, ouă* proaspete, lapte* integral, amidon, zahăr vanilat, fructe de sezon (căpșuni, kiwi, struguri, mure), gelatină alimentară.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte'],
 ARRAY['images/products/cupcakes.png', 'images/products/cookies.png'],
 '{"per":"100g","energy_kcal":280,"energy_kj":1172,"fat":13,"saturated_fat":7.5,"carbs":36,"sugars":20,"fiber":1.2,"protein":4.8,"salt":0.08}'::jsonb,
 '🥧', '#E8F7E8'),

('brownie-ciocolata', 'Brownie Ciocolată', 'prajituri', 14, 'buc', 4, 1,
 'Brownie dens și umed cu ciocolată belgiană 70% și nuci pecane — rețeta clasică americană, fără compromisuri.',
 null, false,
 'Ciocolată belgiană 70% (cacao*, zahăr, unt de cacao), unt* (smântână*), ouă* proaspete, zahăr brun, făină de grâu*, nuci pecane*, extract de vanilie Bourbon.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (nuci pecane)', 'Soia (urmă)'],
 ARRAY['images/products/cookies.png', 'images/products/tort-felie.png'],
 '{"per":"100g","energy_kcal":445,"energy_kj":1862,"fat":28,"saturated_fat":14,"carbs":44,"sugars":35,"fiber":3.2,"protein":6.5,"salt":0.12}'::jsonb,
 '🟫', '#F5EDE8'),

('ecler-vanilie', 'Mini Ecler Vanilie', 'prajituri', 12, 'buc', 6, 1,
 'Choux crocus cu cremă diplomat de vanilie și glazură fondant — micul dejun al regilor, la orice oră.',
 null, false,
 'Apă, unt* (smântână*), făină de grâu*, ouă* proaspete, lapte* integral, zahăr, amidon de porumb, păstăi de vanilie Bourbon, zahăr pudră, glucoză.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte'],
 ARRAY['images/products/cupcakes.png', 'images/products/tort-felie.png', 'images/products/cookies.png'],
 '{"per":"100g","energy_kcal":295,"energy_kj":1234,"fat":14,"saturated_fat":8,"carbs":37,"sugars":22,"fiber":0.5,"protein":5.8,"salt":0.2}'::jsonb,
 '🥐', '#FBF3DE'),

('cheesecake-fructe-padure', 'Cheesecake Fructe Pădure', 'prajituri', 20, 'buc', 4, 1,
 'Cremă bogată de cream cheese pe biscuit crocant, cu coulis de zmeură și mure — clasicul american în varianta premium.',
 'Preferat', false,
 'Cream cheese* (lapte*), smântână* pentru frișcă, zahăr, ouă* proaspete, biscuiți digestivi* (făină integrală de grâu*, zahăr, unt*), unt* (smântână*), zmeură, mure, zahăr, gelatină.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte'],
 ARRAY['images/products/tort-felie.png', 'images/products/cupcakes.png'],
 '{"per":"100g","energy_kcal":330,"energy_kj":1381,"fat":21,"saturated_fat":12.5,"carbs":30,"sugars":22,"fiber":1.0,"protein":6.2,"salt":0.3}'::jsonb,
 '🫐', '#F0E8F5'),

-- Office Boxes
('office-box-6', 'Office Box · 6 buc', 'office-box', 90, 'cutie', 1, 1,
 'Cutie cu 6 mini-prăjituri artizanale asortate — perfectă pentru o echipă mică sau ca micro-cadou de birou.',
 null, false,
 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
 ARRAY['images/products/cupcakes.png', 'images/products/cookies.png', 'images/products/tort-felie.png'],
 '{"per":"100g","energy_kcal":340,"energy_kj":1423,"fat":18,"saturated_fat":10,"carbs":40,"sugars":28,"fiber":1.0,"protein":5.5,"salt":0.15}'::jsonb,
 '🎁', '#FEE8F1'),

('office-box-12', 'Office Box · 12 buc', 'office-box', 165, 'cutie', 1, 1,
 'Cutie cu 12 mini-prăjituri artizanale — ideală pentru un departament întreg la zi de naștere.',
 'Cel mai ales', false,
 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
 ARRAY['images/products/tort-felie.png', 'images/products/cupcakes.png', 'images/products/cookies.png'],
 '{"per":"100g","energy_kcal":340,"energy_kj":1423,"fat":18,"saturated_fat":10,"carbs":40,"sugars":28,"fiber":1.0,"protein":5.5,"salt":0.15}'::jsonb,
 '🎀', '#FEE8F1'),

('office-box-18', 'Office Box · 18 buc', 'office-box', 240, 'cutie', 1, 1,
 'Cutie cu 18 mini-prăjituri — pentru un open-space întreg. Una pentru fiecare coleg.',
 null, false,
 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
 ARRAY['images/products/cookies.png', 'images/products/cupcakes.png', 'images/products/tort-felie.png'],
 '{"per":"100g","energy_kcal":340,"energy_kj":1423,"fat":18,"saturated_fat":10,"carbs":40,"sugars":28,"fiber":1.0,"protein":5.5,"salt":0.15}'::jsonb,
 '🎊', '#FEE8F1'),

('office-box-24', 'Office Box · 24 buc', 'office-box', 300, 'cutie', 1, 1,
 'Cutie cu 24 de mini-prăjituri artizanale — pentru firmele cu echipe mari care știu că oamenii fericiți muncesc mai bine.',
 null, false,
 'Mix de mini-prăjituri (compoziție variabilă în funcție de selecție): ouă*, făină de grâu*, zahăr, unt* (lapte*), ciocolată, fructe proaspete, cremă de vanilie (lapte*). Compoziția exactă depinde de selecția zilei.',
 ARRAY['Gluten (grâu)', 'Ouă', 'Lapte', 'Nuci (posibil)'],
 ARRAY['images/products/cupcakes.png', 'images/products/tort-felie.png', 'images/products/cookies.png'],
 '{"per":"100g","energy_kcal":340,"energy_kj":1423,"fat":18,"saturated_fat":10,"carbs":40,"sugars":28,"fiber":1.0,"protein":5.5,"salt":0.15}'::jsonb,
 '🎉', '#FEE8F1'),

-- De Post
('tort-ciocolata-raw', 'Tort Ciocolată Raw', 'de-post', 190, 'kg', 1.2, 0.5,
 'Bază de curmale și caju, umplutură raw de cacao și avocado. 100% plant-based, fără zahăr rafinat, fără coacere.',
 'De post', true,
 'Curmale Medjool, caju crud, cacao raw (pulbere), avocado copt, sirop de arțar pur, ulei de cocos presat la rece, extract de vanilie Bourbon, sare de Himalaya. Toate ingredientele sunt 100% naturale, fără aditivi sau conservanți.',
 ARRAY['Nuci (caju)'],
 ARRAY['images/products/tort-felie.png', 'images/products/cookies.png', 'images/products/cupcakes.png'],
 '{"per":"100g","energy_kcal":340,"energy_kj":1423,"fat":22,"saturated_fat":11,"carbs":32,"sugars":24,"fiber":4.5,"protein":5.8,"salt":0.05}'::jsonb,
 '🌱', '#E8F7E8'),

('tort-fructe-padure-raw', 'Tort Fructe Pădure Raw', 'de-post', 200, 'kg', 1.2, 0.5,
 'Cremă de caju cu coulis de zmeură și mure, pe bază de nuci și curmale. Fără gluten, fără lactate, fără coacere.',
 'De post', true,
 'Caju crud, curmale Medjool, nuci crude*, zmeură proaspătă, mure, sirop de agave, ulei de cocos presat la rece, suc de lămâie, extract de vanilie Bourbon, sare de Himalaya.',
 ARRAY['Nuci (caju, nuci)'],
 ARRAY['images/products/cookies.png', 'images/products/cupcakes.png', 'images/products/tort-felie.png'],
 '{"per":"100g","energy_kcal":310,"energy_kj":1297,"fat":19,"saturated_fat":9,"carbs":30,"sugars":22,"fiber":5.2,"protein":6.1,"salt":0.04}'::jsonb,
 '🫐', '#F0E8F5')

ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
--  ETAPA 5 — Policies pentru Panoul de Administrator
--  Rulează SEPARAT în: Dashboard → SQL Editor → New Query → Run
--
--  ÎNAINTE: Creează utilizatorul admin în Supabase →
--           Authentication → Users → Add user
--           (email: mama@biocake.ro, parolă sigură)
-- =============================================================================

-- ── Admin: citire comenzi ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "orders_admin_read" ON orders;
CREATE POLICY "orders_admin_read" ON orders
    FOR SELECT
    TO authenticated
    USING (true);

-- ── Admin: actualizare status comenzi ─────────────────────────────────────
DROP POLICY IF EXISTS "orders_admin_update" ON orders;
CREATE POLICY "orders_admin_update" ON orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ── Admin: citire produse (inclusiv inactive) ──────────────────────────────
DROP POLICY IF EXISTS "products_admin_read" ON products;
CREATE POLICY "products_admin_read" ON products
    FOR SELECT
    TO authenticated
    USING (true);

-- ── Admin: actualizare produse (toggle active) ─────────────────────────────
DROP POLICY IF EXISTS "products_admin_update" ON products;
CREATE POLICY "products_admin_update" ON products
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ── Admin: creare produse noi ───────────────────────────────────────────────
DROP POLICY IF EXISTS "products_admin_insert" ON products;
CREATE POLICY "products_admin_insert" ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ── Admin: ștergere produse ────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_admin_delete" ON products;
CREATE POLICY "products_admin_delete" ON products
    FOR DELETE
    TO authenticated
    USING (true);

-- ── Admin: citire order_items ──────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_admin_read" ON order_items;
CREATE POLICY "order_items_admin_read" ON order_items
    FOR SELECT
    TO authenticated
    USING (true);

-- ── Realtime: activare pentru tabelul orders ───────────────────────────────
-- Necesar pentru ca admin.js să primească notificări live la comenzi noi.
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
