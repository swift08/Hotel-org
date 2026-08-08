CREATE TYPE public.table_state AS ENUM ('available','occupied','payment_pending','reserved','disabled');
CREATE TYPE public.order_status AS ENUM ('pending','accepted','preparing','ready','served','completed','cancelled','refunded','payment_failed');
CREATE TYPE public.order_channel AS ENUM ('qr','counter','waiter');
CREATE TYPE public.payment_method AS ENUM ('upi','card','netbanking','wallet','cash','other');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded','partially_refunded');
CREATE TYPE public.print_job_status AS ENUM ('queued','printing','printed','failed','retrying');
CREATE TYPE public.publish_state AS ENUM ('draft','published');

-- ============ TABLES + QR ============
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  label text NOT NULL,
  seats integer NOT NULL DEFAULT 2,
  state public.table_state NOT NULL DEFAULT 'available',
  qr_slug text NOT NULL UNIQUE,
  qr_version integer NOT NULL DEFAULT 1,
  scan_count integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, label)
);
CREATE INDEX tables_business_idx ON public.restaurant_tables(business_id);

CREATE TABLE public.qr_slug_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  old_slug text NOT NULL,
  retired_at timestamptz NOT NULL DEFAULT now(),
  retired_by uuid
);

-- ============ MENU ============
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  state public.publish_state NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_categories_business_idx ON public.menu_categories(business_id);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  images text[] NOT NULL DEFAULT '{}',
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  sku text,
  tax_rate numeric(5,2),
  prep_time_minutes integer NOT NULL DEFAULT 10,
  food_tags text[] NOT NULL DEFAULT '{}',
  station text NOT NULL DEFAULT 'kitchen',
  is_available boolean NOT NULL DEFAULT true,
  available_from time,
  available_to time,
  state public.publish_state NOT NULL DEFAULT 'draft',
  is_archived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_business_idx ON public.products(business_id);
CREATE INDEX products_category_idx ON public.products(category_id);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  old_price numeric(12,2),
  new_price numeric(12,2) NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ CARTS ============
CREATE TABLE public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  table_label text,
  order_number text NOT NULL,
  channel public.order_channel NOT NULL DEFAULT 'qr',
  status public.order_status NOT NULL DEFAULT 'pending',
  session_token text,
  customer_name text,
  customer_phone text,
  notes text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount_total numeric(12,2) NOT NULL DEFAULT 0,
  tax_total numeric(12,2) NOT NULL DEFAULT 0,
  service_charge numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  idempotency_key text,
  version integer NOT NULL DEFAULT 1,
  placed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, order_number),
  UNIQUE (business_id, idempotency_key)
);
CREATE INDEX orders_branch_status_idx ON public.orders(branch_id, status, created_at DESC);
CREATE INDEX orders_session_idx ON public.orders(session_token);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid,
  variant_id uuid,
  product_name text NOT NULL,
  variant_name text,
  addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  unit_price numeric(12,2) NOT NULL,
  addons_price numeric(12,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  line_total numeric(12,2) NOT NULL,
  special_instructions text,
  station text NOT NULL DEFAULT 'kitchen',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event text NOT NULL,
  from_status public.order_status,
  to_status public.order_status,
  actor_id uuid,
  actor_label text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON public.order_events(order_id, created_at);

CREATE TABLE public.discount_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  requester_role public.staff_role,
  discount_type text NOT NULL DEFAULT 'percent',
  requested_value numeric(12,2) NOT NULL,
  original_total numeric(12,2) NOT NULL,
  discounted_total numeric(12,2) NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'manual',
  method public.payment_method NOT NULL DEFAULT 'cash',
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  provider_order_id text,
  provider_payment_id text UNIQUE,
  verified_at timestamptz,
  collected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_idx ON public.payments(order_id);

CREATE TABLE public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  reason text,
  provider_refund_id text,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL,
  UNIQUE (business_id, invoice_number)
);

CREATE TABLE public.print_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  job_type text NOT NULL DEFAULT 'receipt',
  target text NOT NULL DEFAULT 'browser',
  status public.print_job_status NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TRIGGERS ============
CREATE TRIGGER tables_updated BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER menu_categories_updated BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER variants_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER carts_updated BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER print_jobs_updated BEFORE UPDATE ON public.print_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'products' AND NEW.base_price IS DISTINCT FROM OLD.base_price THEN
    INSERT INTO public.price_history (business_id, product_id, old_price, new_price, changed_by)
    VALUES (NEW.business_id, NEW.id, OLD.base_price, NEW.base_price, auth.uid());
  ELSIF TG_TABLE_NAME = 'product_variants' AND NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.price_history (business_id, product_id, variant_id, old_price, new_price, changed_by)
    VALUES (NEW.business_id, NEW.product_id, NEW.id, OLD.price, NEW.price, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER products_price_history AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.track_price_change();
CREATE TRIGGER variants_price_history AFTER UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.track_price_change();

-- immutable financial history
CREATE OR REPLACE FUNCTION public.block_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'This record is immutable; use a refund or adjustment instead'; END; $$;
CREATE TRIGGER order_items_immutable BEFORE DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.block_mutation();
CREATE TRIGGER invoices_immutable BEFORE UPDATE OR DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.block_mutation();
CREATE TRIGGER order_events_immutable BEFORE UPDATE OR DELETE ON public.order_events FOR EACH ROW EXECUTE FUNCTION public.block_mutation();

-- ============ GRANTS ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables, public.menu_categories, public.products, public.product_variants, public.addon_groups, public.addons, public.orders, public.order_items, public.discount_requests, public.payments, public.refunds, public.print_jobs, public.carts TO authenticated;
GRANT SELECT, INSERT ON public.order_events, public.qr_slug_history, public.price_history, public.invoices TO authenticated;
GRANT ALL ON public.restaurant_tables, public.qr_slug_history, public.menu_categories, public.products, public.product_variants, public.addon_groups, public.addons, public.price_history, public.carts, public.orders, public.order_items, public.order_events, public.discount_requests, public.payments, public.refunds, public.webhook_events, public.invoices, public.print_jobs TO service_role;

-- ============ RLS ============
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_slug_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read tables" ON public.restaurant_tables FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage tables" ON public.restaurant_tables FOR ALL TO authenticated
  USING (public.has_perm(business_id,'tables.manage')) WITH CHECK (public.has_perm(business_id,'tables.manage'));
CREATE POLICY "staff read qr history" ON public.qr_slug_history FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff write qr history" ON public.qr_slug_history FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'qr.manage'));

CREATE POLICY "staff read categories" ON public.menu_categories FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage categories" ON public.menu_categories FOR ALL TO authenticated
  USING (public.has_perm(business_id,'menu.edit')) WITH CHECK (public.has_perm(business_id,'menu.edit'));

CREATE POLICY "staff read products" ON public.products FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_perm(business_id,'menu.edit')) WITH CHECK (public.has_perm(business_id,'menu.edit'));

CREATE POLICY "staff read variants" ON public.product_variants FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage variants" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_perm(business_id,'menu.edit')) WITH CHECK (public.has_perm(business_id,'menu.edit'));

CREATE POLICY "staff read addon groups" ON public.addon_groups FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage addon groups" ON public.addon_groups FOR ALL TO authenticated
  USING (public.has_perm(business_id,'menu.edit')) WITH CHECK (public.has_perm(business_id,'menu.edit'));

CREATE POLICY "staff read addons" ON public.addons FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage addons" ON public.addons FOR ALL TO authenticated
  USING (public.has_perm(business_id,'menu.edit')) WITH CHECK (public.has_perm(business_id,'menu.edit'));

CREATE POLICY "staff read price history" ON public.price_history FOR SELECT TO authenticated USING (public.has_perm(business_id,'menu.view'));

CREATE POLICY "staff read carts" ON public.carts FOR SELECT TO authenticated USING (public.is_member(business_id));

CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_perm(business_id,'orders.view'));
CREATE POLICY "staff create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'orders.create'));
CREATE POLICY "staff update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_perm(business_id,'orders.edit') OR public.has_perm(business_id,'kds.view'))
  WITH CHECK (public.has_perm(business_id,'orders.edit') OR public.has_perm(business_id,'kds.view'));

CREATE POLICY "staff read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_perm(business_id,'orders.view'));
CREATE POLICY "staff create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'orders.create'));

CREATE POLICY "staff read order events" ON public.order_events FOR SELECT TO authenticated USING (public.has_perm(business_id,'orders.view'));
CREATE POLICY "staff append order events" ON public.order_events FOR INSERT TO authenticated WITH CHECK (public.is_member(business_id));

CREATE POLICY "staff read discount requests" ON public.discount_requests FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff create discount requests" ON public.discount_requests FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'orders.discount') AND requested_by = auth.uid());
CREATE POLICY "approvers decide discount requests" ON public.discount_requests FOR UPDATE TO authenticated
  USING (public.has_perm(business_id,'orders.discount_approve')) WITH CHECK (public.has_perm(business_id,'orders.discount_approve'));

CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated USING (public.has_perm(business_id,'payments.view'));
CREATE POLICY "staff collect payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'payments.collect'));
CREATE POLICY "staff update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.has_perm(business_id,'payments.collect')) WITH CHECK (public.has_perm(business_id,'payments.collect'));

CREATE POLICY "staff read refunds" ON public.refunds FOR SELECT TO authenticated USING (public.has_perm(business_id,'payments.view'));
CREATE POLICY "staff issue refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'payments.refund'));

CREATE POLICY "staff read invoices" ON public.invoices FOR SELECT TO authenticated USING (public.has_perm(business_id,'payments.view'));
CREATE POLICY "staff create invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'billing.print'));

CREATE POLICY "staff read print jobs" ON public.print_jobs FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage print jobs" ON public.print_jobs FOR ALL TO authenticated
  USING (public.has_perm(business_id,'billing.print')) WITH CHECK (public.has_perm(business_id,'billing.print'));

-- realtime for KDS / order boards
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;