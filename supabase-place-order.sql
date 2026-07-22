-- =============================================================================
-- BioCake — place_order RPC
-- Insert atomic + prețuri din products (nu din client)
-- Elimină INSERT anon direct pe orders / order_items
-- =============================================================================

CREATE OR REPLACE FUNCTION public.place_order(
    p_customer_name    text,
    p_customer_phone   text,
    p_delivery_zone    text,
    p_delivery_date    date,
    p_delivery_time    time,
    p_delivery_address text,
    p_items            jsonb,
    p_customer_email   text DEFAULT NULL,
    p_notes            text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_id      uuid := gen_random_uuid();
    v_subtotal      numeric(10,2) := 0;
    v_delivery_fee  numeric(10,2) := 0;
    v_total         numeric(10,2);
    v_advance       numeric(10,2);
    v_item          jsonb;
    v_slug          text;
    v_qty           numeric(10,2);
    v_prod          products%ROWTYPE;
    v_line_total    numeric(10,2);
    v_delivery_at   timestamptz;
    v_min_minute    int;
    v_lines         jsonb := '[]'::jsonb;
BEGIN
    -- ── Validări de bază ───────────────────────────────────────────────────
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 3 THEN
        RAISE EXCEPTION 'Nume invalid';
    END IF;

    IF p_customer_phone IS NULL OR length(regexp_replace(p_customer_phone, '\D', '', 'g')) < 10 THEN
        RAISE EXCEPTION 'Telefon invalid';
    END IF;

    IF p_delivery_zone NOT IN ('bucuresti', 'ilfov') THEN
        RAISE EXCEPTION 'Zonă de livrare invalidă';
    END IF;

    IF p_delivery_address IS NULL OR length(trim(p_delivery_address)) < 5 THEN
        RAISE EXCEPTION 'Adresă invalidă';
    END IF;

    IF p_delivery_date IS NULL OR p_delivery_time IS NULL THEN
        RAISE EXCEPTION 'Data și ora de livrare sunt obligatorii';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Coșul este gol';
    END IF;

    -- ── Reguli livrare (48h, Lun–Sâm, 08:00–20:00 / 30 min) ───────────────
    IF EXTRACT(DOW FROM p_delivery_date) = 0 THEN
        RAISE EXCEPTION 'Nu livrăm duminica';
    END IF;

    v_min_minute := EXTRACT(MINUTE FROM p_delivery_time)::int;
    IF p_delivery_time < TIME '08:00' OR p_delivery_time > TIME '20:00' THEN
        RAISE EXCEPTION 'Ora de livrare trebuie să fie între 08:00 și 20:00';
    END IF;
    IF v_min_minute % 30 <> 0 THEN
        RAISE EXCEPTION 'Ora de livrare trebuie să fie din 30 în 30 de minute';
    END IF;

    v_delivery_at := (p_delivery_date + p_delivery_time) AT TIME ZONE 'Europe/Bucharest';
    IF v_delivery_at < (now() + interval '48 hours') THEN
        RAISE EXCEPTION 'Livrarea trebuie să fie la minimum 48 de ore';
    END IF;

    -- ── Pass 1: rezolvă produse + prețuri (fără insert) ───────────────────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_slug := nullif(trim(v_item->>'slug'), '');
        v_qty  := NULLIF(v_item->>'qty', '')::numeric;

        IF v_slug IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Linie de comandă invalidă';
        END IF;

        SELECT * INTO v_prod
        FROM products
        WHERE slug = v_slug AND active = true;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produs indisponibil: %', v_slug;
        END IF;

        IF v_qty < COALESCE(v_prod.min_qty, 1) THEN
            RAISE EXCEPTION 'Cantitate sub minim pentru %', v_prod.name;
        END IF;

        IF v_prod.unit = 'kg' AND v_prod.max_qty IS NOT NULL AND v_qty > v_prod.max_qty THEN
            RAISE EXCEPTION 'Cantitate peste maxim pentru %', v_prod.name;
        END IF;

        v_line_total := round(v_prod.price * v_qty, 2);
        v_subtotal   := v_subtotal + v_line_total;

        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
            'slug',       v_prod.slug,
            'name',       v_prod.name,
            'qty',        v_qty,
            'unit',       v_prod.unit,
            'unit_price', v_prod.price,
            'line_total', v_line_total
        ));
    END LOOP;

    -- ── Taxă livrare ───────────────────────────────────────────────────────
    IF p_delivery_zone = 'ilfov' THEN
        v_delivery_fee := CASE WHEN v_subtotal >= 600 THEN 0 ELSE 40 END;
    ELSE
        v_delivery_fee := CASE WHEN v_subtotal >= 250 THEN 0 ELSE 20 END;
    END IF;

    v_total   := v_subtotal + v_delivery_fee;
    v_advance := round(v_total * 0.5, 2);

    -- ── Pass 2: insert atomic (rollback automat la eroare) ────────────────
    INSERT INTO orders (
        id, customer_name, customer_phone, customer_email,
        delivery_zone, delivery_date, delivery_time, delivery_address, notes,
        subtotal, delivery_fee, total, advance_due, status
    ) VALUES (
        v_order_id,
        trim(p_customer_name),
        trim(p_customer_phone),
        NULLIF(trim(COALESCE(p_customer_email, '')), ''),
        p_delivery_zone,
        p_delivery_date,
        p_delivery_time,
        trim(p_delivery_address),
        NULLIF(trim(COALESCE(p_notes, '')), ''),
        v_subtotal,
        v_delivery_fee,
        v_total,
        v_advance,
        'pending'
    );

    INSERT INTO order_items (
        order_id, product_slug, product_name, qty, unit, unit_price, line_total
    )
    SELECT
        v_order_id,
        (line->>'slug'),
        (line->>'name'),
        (line->>'qty')::numeric,
        (line->>'unit'),
        (line->>'unit_price')::numeric,
        (line->>'line_total')::numeric
    FROM jsonb_array_elements(v_lines) AS line;

    RETURN jsonb_build_object(
        'id',            v_order_id,
        'subtotal',      v_subtotal,
        'delivery_fee',  v_delivery_fee,
        'total',         v_total,
        'advance_due',   v_advance
    );
END;
$$;

COMMENT ON FUNCTION public.place_order IS
  'Plasează comandă atomic: prețuri din products, validare livrare, fără INSERT anon pe tabele.';

-- Semnătură exactă pentru GRANT (ordine parametri cu default la final)
REVOKE ALL ON FUNCTION public.place_order(text, text, text, date, time, text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(text, text, text, date, time, text, jsonb, text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "orders_insert_anon" ON orders;
DROP POLICY IF EXISTS "items_insert_anon" ON order_items;

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);
