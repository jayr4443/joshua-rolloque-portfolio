/*
# Extend commerce demo for storefront, payments, and channels

1. Modified Tables
- `products` — adds `shopify_id` (text, nullable) for Shopify product sync mapping, and `status` (text, default 'active') for publish/draft control.
- `orders` — adds `customer_email`, `shipping_address`, `channel` (default 'storefront'), `provider_session_id`, `provider_payment_id` for payment gateway tracking.

2. New Tables
- `customers` — stores customer profiles with email, name, total spent, and order count. Unique on email.
- `shopify_sync_log` — tracks Shopify product sync events with status, message, and item count.

3. New Functions
- `create_storefront_order(p_customer_name, p_customer_email, p_shipping_address, p_payment_method, p_items)` — SECURITY DEFINER function for storefront checkout. Creates order, decrements stock, upserts customer, returns order details.

4. Security
- RLS enabled on new tables with full anon+authenticated CRUD (public demo).
- create_storefront_order is SECURITY DEFINER, EXECUTE granted to anon+authenticated.

5. Important Notes
- No data is lost — only additive ALTER TABLE ADD COLUMN.
- All new columns are nullable or have safe defaults.
- The existing create_order function is untouched (still used by POS).
*/

-- Add columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shopify_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'storefront';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_payment_id text;

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  total_spent numeric(10,2) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create shopify sync log table
CREATE TABLE IF NOT EXISTS public.shopify_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL DEFAULT 'product',
  status text NOT NULL DEFAULT 'pending',
  message text NOT NULL DEFAULT '',
  items_synced integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_sync_log ENABLE ROW LEVEL SECURITY;

-- Customer policies
DROP POLICY IF EXISTS "anon_select_customers" ON public.customers;
CREATE POLICY "anon_select_customers" ON public.customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_customers" ON public.customers;
CREATE POLICY "anon_insert_customers" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON public.customers;
CREATE POLICY "anon_update_customers" ON public.customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON public.customers;
CREATE POLICY "anon_delete_customers" ON public.customers FOR DELETE TO anon, authenticated USING (true);

-- Shopify sync log policies
DROP POLICY IF EXISTS "anon_select_shopify_sync" ON public.shopify_sync_log;
CREATE POLICY "anon_select_shopify_sync" ON public.shopify_sync_log FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_shopify_sync" ON public.shopify_sync_log;
CREATE POLICY "anon_insert_shopify_sync" ON public.shopify_sync_log FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_shopify_sync" ON public.shopify_sync_log;
CREATE POLICY "anon_update_shopify_sync" ON public.shopify_sync_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_shopify_sync" ON public.shopify_sync_log;
CREATE POLICY "anon_delete_shopify_sync" ON public.shopify_sync_log FOR DELETE TO anon, authenticated USING (true);

-- Create storefront order function
CREATE OR REPLACE FUNCTION public.create_storefront_order(
  p_customer_name text DEFAULT 'Walk-in customer',
  p_customer_email text DEFAULT '',
  p_shipping_address text DEFAULT '',
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

  INSERT INTO public.orders (customer_name, customer_email, shipping_address, channel, payment_method, payment_status, status)
  VALUES (p_customer_name, p_customer_email, p_shipping_address, 'storefront', p_payment_method, 'paid', 'paid')
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

  -- Upsert customer
  IF p_customer_email <> '' THEN
    INSERT INTO public.customers (email, name, total_spent, order_count)
    VALUES (p_customer_email, p_customer_name, v_total, 1)
    ON CONFLICT (email) DO UPDATE
    SET total_spent = public.customers.total_spent + v_total,
        order_count = public.customers.order_count + 1,
        name = CASE WHEN public.customers.name = '' THEN p_customer_name ELSE public.customers.name END;
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_storefront_order TO anon, authenticated;
