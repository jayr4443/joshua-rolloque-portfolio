/*
# Create commerce demo tables and atomic checkout function

1. New Tables
- `products` — demo product catalog with name, description, price, stock, category, image, and SKU.
- `orders` — customer orders with auto-generated order number, status, total, and payment info.
- `order_items` — line items for each order, referencing products and storing a price/name snapshot.

2. New Sequences
- `order_number_seq` — generates sequential order numbers starting at 1001, used as default for orders.order_number.

3. New Functions
- `create_order(p_customer_name, p_payment_method, p_items)` — SECURITY DEFINER function that atomically creates an order, inserts all order items, decrements product stock, and returns the order id/number/total. Prevents negative stock.

4. Security
- Row level security enabled on products, orders, and order_items.
- This is a public demo with no sign-in, so anon and authenticated roles have full CRUD access (data is intentionally shared).
- The create_order function is SECURITY DEFINER so it can run atomically across tables; EXECUTE granted to anon and authenticated.

5. Important Notes
- No existing tables are modified.
- Seed data includes 6 demo products with real product photography.
- Order numbers are auto-generated as ORD-XXXXX format via sequence default.
- Products have a unique constraint on sku so seed inserts are idempotent (ON CONFLICT DO NOTHING).
*/

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1001;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'General',
  image_url text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_unique') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_sku_unique UNIQUE (sku);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL DEFAULT ('ORD-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  status text NOT NULL DEFAULT 'pending',
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'card',
  payment_status text NOT NULL DEFAULT 'pending',
  customer_name text NOT NULL DEFAULT 'Walk-in customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  price numeric(10,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON public.products;
CREATE POLICY "anon_select_products" ON public.products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_products" ON public.products;
CREATE POLICY "anon_insert_products" ON public.products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_products" ON public.products;
CREATE POLICY "anon_update_products" ON public.products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_products" ON public.products;
CREATE POLICY "anon_delete_products" ON public.products FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_orders" ON public.orders;
CREATE POLICY "anon_select_orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON public.orders;
CREATE POLICY "anon_update_orders" ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON public.orders;
CREATE POLICY "anon_delete_orders" ON public.orders FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_order_items" ON public.order_items;
CREATE POLICY "anon_select_order_items" ON public.order_items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_order_items" ON public.order_items;
CREATE POLICY "anon_insert_order_items" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_order_items" ON public.order_items;
CREATE POLICY "anon_update_order_items" ON public.order_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_order_items" ON public.order_items;
CREATE POLICY "anon_delete_order_items" ON public.order_items FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text DEFAULT 'Walk-in customer',
  p_payment_method text DEFAULT 'card',
  p_items jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_total numeric(10,2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_price numeric(10,2);
  v_quantity integer;
  v_subtotal numeric(10,2);
  v_current_stock integer;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an order with no items';
  END IF;

  INSERT INTO public.orders (customer_name, payment_method, payment_status, status)
  VALUES (p_customer_name, p_payment_method, 'paid', 'paid')
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_price := (v_item->>'price')::numeric;
    v_quantity := (v_item->>'quantity')::int;
    v_subtotal := v_price * v_quantity;

    SELECT stock INTO v_current_stock FROM public.products WHERE id = v_product_id FOR UPDATE;
  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', v_item->>'name';
  END IF;
  IF v_current_stock < v_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for % (available: %, requested: %)', v_item->>'name', v_current_stock, v_quantity;
  END IF;

    INSERT INTO public.order_items (order_id, product_id, name, price, quantity, subtotal)
    VALUES (v_order_id, v_product_id, v_item->>'name', v_price, v_quantity, v_subtotal);

    UPDATE public.products SET stock = stock - v_quantity WHERE id = v_product_id;
    v_total := v_total + v_subtotal;
  END LOOP;

  UPDATE public.orders SET total = v_total WHERE id = v_order_id;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_order TO anon, authenticated;

INSERT INTO public.products (name, description, price, stock, category, image_url, sku) VALUES
('Aurora Wireless Earbuds', 'Active noise cancellation, 30-hour battery, USB-C fast charge.', 89.00, 45, 'Electronics', 'https://images.pexels.com/photos/33298190/pexels-photo-33298190.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'ELEC-001'),
('Pulse Smart Watch', 'Heart rate, SpO2, sleep tracking, 7-day battery life.', 159.00, 28, 'Electronics', 'https://images.pexels.com/photos/12564670/pexels-photo-12564670.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'ELEC-002'),
('Studio Ceramic Mug', 'Hand-glazed 12oz mug, dishwasher and microwave safe.', 18.00, 120, 'Home', 'https://images.pexels.com/photos/12480291/pexels-photo-12480291.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'HOME-001'),
('Heritage Denim Jacket', 'Classic fit, organic cotton, reinforced stitching.', 79.00, 35, 'Apparel', 'https://images.pexels.com/photos/38561616/pexels-photo-38561616.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'APPL-001'),
('Arc Desk Lamp', 'Warm LED, touch dimmer, brushed aluminum finish.', 42.00, 60, 'Home', 'https://images.pexels.com/photos/31410610/pexels-photo-31410610.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'HOME-002'),
('Single Origin Coffee Beans', 'Medium roast, 340g bag, roasted within 48 hours of shipping.', 24.00, 80, 'Pantry', 'https://images.pexels.com/photos/5926957/pexels-photo-5926957.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', 'PANR-001')
ON CONFLICT (sku) DO NOTHING;
