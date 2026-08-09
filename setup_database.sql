-- ============================================================================
-- RASOI RESTAURANT OPERATING SYSTEM — COMPLETE DATABASE INITIALIZATION
-- Copy and run inside: Supabase Dashboard → SQL Editor
--
-- This script completely drops all existing schemas, enums, triggers, 
-- functions, tables, RLS policies, seeds permission data, and sets up 
-- Supabase Realtime configurations.
-- ============================================================================

-- 1. DROP ALL EXISTING TRIGGERS & ATTACHMENTS (CASCADE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. DROP ALL EXISTING TABLES (CASCADE)
DROP TABLE IF EXISTS public.print_jobs CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.discount_requests CASCADE;
DROP TABLE IF EXISTS public.order_events CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.dining_sessions CASCADE;
DROP TABLE IF EXISTS public.carts CASCADE;
DROP TABLE IF EXISTS public.price_history CASCADE;
DROP TABLE IF EXISTS public.addons CASCADE;
DROP TABLE IF EXISTS public.addon_groups CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.menu_categories CASCADE;
DROP TABLE IF EXISTS public.qr_slug_history CASCADE;
DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.discount_authorities CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.role_default_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;
DROP TABLE IF EXISTS public.memberships CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.outlets CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.business_settings CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;

-- 3. DROP ALL EXISTING FUNCTIONS (CASCADE)
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin CASCADE;
DROP FUNCTION IF EXISTS public.is_member CASCADE;
DROP FUNCTION IF EXISTS public.my_role CASCADE;
DROP FUNCTION IF EXISTS public.my_branch CASCADE;
DROP FUNCTION IF EXISTS public.has_perm CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.block_audit_mutation CASCADE;
DROP FUNCTION IF EXISTS public.track_price_change CASCADE;
DROP FUNCTION IF EXISTS public.block_mutation CASCADE;
DROP FUNCTION IF EXISTS public.seed_business_defaults CASCADE;

-- 4. DROP ALL EXISTING TYPES/ENUMS (CASCADE)
DROP TYPE IF EXISTS public.business_type CASCADE;
DROP TYPE IF EXISTS public.staff_role CASCADE;
DROP TYPE IF EXISTS public.tax_mode CASCADE;
DROP TYPE IF EXISTS public.table_state CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.order_channel CASCADE;
DROP TYPE IF EXISTS public.payment_method CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.print_job_status CASCADE;
DROP TYPE IF EXISTS public.publish_state CASCADE;

-- ============ CREATE ENUMS ============
CREATE TYPE public.business_type AS ENUM ('restaurant','cafe','hotel','resort','bar_pub','cloud_kitchen','food_outlet');
CREATE TYPE public.staff_role AS ENUM ('owner','business_admin','general_manager','branch_manager','floor_manager','waiter','cashier','chef','kitchen_staff','bar_staff');
CREATE TYPE public.tax_mode AS ENUM ('inclusive','exclusive');
CREATE TYPE public.table_state AS ENUM ('available','occupied','payment_pending','reserved','disabled');
CREATE TYPE public.order_status AS ENUM ('pending','accepted','preparing','ready','served','completed','cancelled','refunded','payment_failed');
CREATE TYPE public.order_channel AS ENUM ('qr','counter','waiter');
CREATE TYPE public.payment_method AS ENUM ('upi','card','netbanking','wallet','cash','other');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded','partially_refunded');
CREATE TYPE public.print_job_status AS ENUM ('queued','printing','printed','failed','retrying');
CREATE TYPE public.publish_state AS ENUM ('draft','published');

-- ============ CORE TENANCY ============
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  business_type public.business_type NOT NULL DEFAULT 'restaurant',
  currency text NOT NULL DEFAULT 'INR',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_settings (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  legal_name text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  gstin text,
  tax_mode public.tax_mode NOT NULL DEFAULT 'exclusive',
  default_tax_rate numeric(5,2) NOT NULL DEFAULT 5.00,
  service_charge_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  online_payment_enabled boolean NOT NULL DEFAULT false,
  cash_payment_enabled boolean NOT NULL DEFAULT true,
  customer_cancel_window_seconds integer NOT NULL DEFAULT 120,
  discount_reason_required_above numeric(5,2) NOT NULL DEFAULT 10.00,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  locale text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  address text,
  city text,
  phone text,
  timezone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX branches_business_idx ON public.branches(business_id);

CREATE TABLE public.outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'dine_in',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outlets_branch_idx ON public.outlets(branch_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.staff_role NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);
CREATE INDEX memberships_user_idx ON public.memberships(user_id);

CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  level text NOT NULL DEFAULT 'support',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ PERMISSIONS ============
CREATE TABLE public.permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  description text
);

CREATE TABLE public.role_default_permissions (
  role public.staff_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.staff_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, role, permission_key)
);
CREATE INDEX role_permissions_lookup ON public.role_permissions(business_id, role, permission_key);

CREATE TABLE public.discount_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.staff_role NOT NULL,
  max_percent numeric(5,2),
  max_amount numeric(12,2),
  unlimited boolean NOT NULL DEFAULT false,
  approval_required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, role)
);

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role public.staff_role,
  actor_label text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_business_idx ON public.audit_logs(business_id, created_at DESC);

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

-- ============ MENU IMPORTS & VERSIONS ============
CREATE TABLE public.menu_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'extracted', 'review_required', 'ready_to_publish', 'published', 'failed')),
  source_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_imports_business_idx ON public.menu_imports(business_id, created_at DESC);

CREATE TABLE public.menu_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX menu_versions_business_idx ON public.menu_versions(business_id, version_number DESC);

-- ============ DINING SESSIONS ============
CREATE TABLE public.dining_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  session_token text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dining_sessions_table_idx ON public.dining_sessions(table_id, status);

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
  dining_session_id uuid REFERENCES public.dining_sessions(id) ON DELETE SET NULL,
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
CREATE INDEX orders_dining_session_idx ON public.orders(dining_session_id);

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

-- ============ HELPER FUNCTIONS (security definer) ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_member(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.business_id = _business_id AND m.user_id = auth.uid() AND m.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.my_role(_business_id uuid)
RETURNS public.staff_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.memberships m
  WHERE m.business_id = _business_id AND m.user_id = auth.uid() AND m.is_active
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_branch(_business_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.branch_id FROM public.memberships m
  WHERE m.business_id = _business_id AND m.user_id = auth.uid() AND m.is_active
  LIMIT 1;
$$;

-- resolves effective permission: business override wins, else role default
CREATE OR REPLACE FUNCTION public.has_perm(_business_id uuid, _permission text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.staff_role; override boolean;
BEGIN
  SELECT m.role INTO r FROM public.memberships m
    WHERE m.business_id = _business_id AND m.user_id = auth.uid() AND m.is_active LIMIT 1;
  IF r IS NULL THEN RETURN false; END IF;
  IF r = 'owner' THEN RETURN true; END IF;
  SELECT rp.allowed INTO override FROM public.role_permissions rp
    WHERE rp.business_id = _business_id AND rp.role = r AND rp.permission_key = _permission;
  IF override IS NOT NULL THEN RETURN override; END IF;
  RETURN EXISTS (SELECT 1 FROM public.role_default_permissions d WHERE d.role = r AND d.permission_key = _permission);
END; $$;

-- ============ TRIGGERS ============
CREATE TRIGGER businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER business_settings_updated BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER branches_updated BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER outlets_updated BEFORE UPDATE ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER memberships_updated BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tables_updated BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER menu_categories_updated BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER variants_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER carts_updated BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER dining_sessions_updated BEFORE UPDATE ON public.dining_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER print_jobs_updated BEFORE UPDATE ON public.print_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled')) OR
      (OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled')) OR
      (OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled')) OR
      (OLD.status = 'ready' AND NEW.status IN ('served', 'cancelled')) OR
      (OLD.status = 'served' AND NEW.status IN ('completed')) OR
      (OLD.status = 'completed' AND NEW.status IN ('refunded')) OR
      (OLD.status = 'payment_failed' AND NEW.status IN ('pending', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER enforce_order_transitions BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_order_status_transition();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- audit logs are append-only
CREATE OR REPLACE FUNCTION public.block_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.block_audit_mutation();

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
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.business_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outlets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_default_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.discount_authorities TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables, public.menu_categories, public.products, public.product_variants, public.addon_groups, public.addons, public.orders, public.order_items, public.discount_requests, public.payments, public.refunds, public.print_jobs, public.carts, public.dining_sessions TO authenticated;
GRANT SELECT, INSERT ON public.order_events, public.qr_slug_history, public.price_history, public.invoices TO authenticated;
GRANT ALL ON public.businesses, public.business_settings, public.branches, public.outlets, public.profiles, public.memberships, public.platform_admins, public.permissions, public.role_default_permissions, public.role_permissions, public.discount_authorities, public.audit_logs TO service_role;
GRANT ALL ON public.restaurant_tables, public.qr_slug_history, public.menu_categories, public.products, public.product_variants, public.addon_groups, public.addons, public.price_history, public.carts, public.orders, public.order_items, public.order_events, public.discount_requests, public.payments, public.refunds, public.webhook_events, public.invoices, public.print_jobs, public.dining_sessions TO service_role;

-- ============ RLS ============
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.dining_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read dining sessions" ON public.dining_sessions FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "staff manage dining sessions" ON public.dining_sessions FOR ALL TO authenticated USING (public.is_member(business_id)) WITH CHECK (public.is_member(business_id));

CREATE POLICY "members read own business" ON public.businesses FOR SELECT TO authenticated
  USING (public.is_member(id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "signed in users create business" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "settings managers update business" ON public.businesses FOR UPDATE TO authenticated
  USING (public.has_perm(id,'settings.manage')) WITH CHECK (public.has_perm(id,'settings.manage'));

CREATE POLICY "members read settings" ON public.business_settings FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "managers write settings" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'settings.manage'));
CREATE POLICY "managers update settings" ON public.business_settings FOR UPDATE TO authenticated USING (public.has_perm(business_id,'settings.manage')) WITH CHECK (public.has_perm(business_id,'settings.manage'));

CREATE POLICY "members read branches" ON public.branches FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "managers insert branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'branches.manage'));
CREATE POLICY "managers update branches" ON public.branches FOR UPDATE TO authenticated USING (public.has_perm(business_id,'branches.manage')) WITH CHECK (public.has_perm(business_id,'branches.manage'));
CREATE POLICY "managers delete branches" ON public.branches FOR DELETE TO authenticated USING (public.has_perm(business_id,'branches.manage'));

CREATE POLICY "members read outlets" ON public.outlets FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "managers write outlets" ON public.outlets FOR ALL TO authenticated USING (public.has_perm(business_id,'branches.manage')) WITH CHECK (public.has_perm(business_id,'branches.manage'));

CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "read colleague profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = profiles.id AND public.is_member(m.business_id)));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "read own memberships" ON public.memberships FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff viewers read memberships" ON public.memberships FOR SELECT TO authenticated USING (public.has_perm(business_id,'staff.view'));
CREATE POLICY "first owner self insert" ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid() AND role = 'owner'
      AND NOT EXISTS (SELECT 1 FROM public.memberships x WHERE x.business_id = memberships.business_id))
    OR (public.has_perm(business_id,'staff.create') AND role <> 'owner')
  );
CREATE POLICY "staff managers update memberships" ON public.memberships FOR UPDATE TO authenticated
  USING (public.has_perm(business_id,'staff.edit') AND (role <> 'owner' OR public.my_role(business_id) = 'owner') AND user_id <> auth.uid())
  WITH CHECK (public.has_perm(business_id,'staff.edit') AND (role <> 'owner' OR public.my_role(business_id) = 'owner'));
CREATE POLICY "staff managers remove memberships" ON public.memberships FOR DELETE TO authenticated
  USING (public.has_perm(business_id,'staff.delete') AND role <> 'owner' AND user_id <> auth.uid());

CREATE POLICY "platform admins read self" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "anyone signed in reads permission catalogue" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "anyone signed in reads role defaults" ON public.role_default_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "members read role permissions" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "owners manage role permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.my_role(business_id) = 'owner' OR public.has_perm(business_id,'permissions.manage'))
  WITH CHECK (public.my_role(business_id) = 'owner' OR public.has_perm(business_id,'permissions.manage'));

CREATE POLICY "members read discount authorities" ON public.discount_authorities FOR SELECT TO authenticated USING (public.is_member(business_id));
CREATE POLICY "owners manage discount authorities" ON public.discount_authorities FOR ALL TO authenticated
  USING (public.my_role(business_id) = 'owner') WITH CHECK (public.my_role(business_id) = 'owner');

CREATE POLICY "permitted staff read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_perm(business_id,'audit.view'));
CREATE POLICY "members append audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_member(business_id) AND actor_id = auth.uid());

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

CREATE POLICY "staff read orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_perm(business_id,'orders.view') OR public.has_perm(business_id,'kds.view') OR public.is_member(business_id));
CREATE POLICY "staff create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'orders.create') OR public.is_member(business_id));
CREATE POLICY "staff update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_perm(business_id,'orders.edit') OR public.has_perm(business_id,'kds.view') OR public.has_perm(business_id,'kds.manage') OR public.is_member(business_id))
  WITH CHECK (public.has_perm(business_id,'orders.edit') OR public.has_perm(business_id,'kds.view') OR public.has_perm(business_id,'kds.manage') OR public.is_member(business_id));

CREATE POLICY "staff read order items" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_perm(business_id,'orders.view') OR public.has_perm(business_id,'kds.view') OR public.is_member(business_id));
CREATE POLICY "staff create order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.has_perm(business_id,'orders.create') OR public.is_member(business_id));

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

-- ============ SEED: permission catalogue ============
INSERT INTO public.permissions (key,label,category) VALUES
('orders.view','View orders','Orders'),
('orders.view_all','View all orders (not just assigned tables)','Orders'),
('orders.create','Create orders','Orders'),
('orders.edit','Modify orders','Orders'),
('orders.cancel','Cancel orders','Orders'),
('orders.refund','Refund orders','Orders'),
('orders.discount','Apply discounts','Orders'),
('orders.discount_approve','Approve discount requests','Orders'),
('kds.view','Use kitchen display','Kitchen'),
('kds.manage','Prioritise kitchen tickets','Kitchen'),
('menu.view','View menu','Menu'),
('menu.edit','Create and edit menu items','Menu'),
('menu.price','Change prices','Menu'),
('menu.publish','Publish menu changes','Menu'),
('menu.delete','Archive menu items','Menu'),
('tables.view','View tables','Tables'),
('tables.manage','Create and edit tables','Tables'),
('qr.manage','Generate and manage QR codes','Tables'),
('payments.view','View payments','Payments'),
('payments.collect','Collect payments','Payments'),
('payments.refund','Issue refunds','Payments'),
('billing.print','Print bills and invoices','Payments'),
('staff.view','View staff','Staff'),
('staff.create','Add staff','Staff'),
('staff.edit','Edit staff','Staff'),
('staff.delete','Remove staff','Staff'),
('permissions.manage','Edit the permission matrix','Staff'),
('reports.view','View operational reports','Reports'),
('reports.financial','View financial reports','Reports'),
('reports.export','Export reports','Reports'),
('branches.manage','Manage branches and outlets','Settings'),
('settings.manage','Manage business settings','Settings'),
('subscription.manage','Manage subscription and plan','Settings'),
('audit.view','View audit log','Settings');

-- ============ SEED: role defaults ============
INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'owner'::public.staff_role, key FROM public.permissions;

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'business_admin'::public.staff_role, key FROM public.permissions WHERE key NOT IN ('subscription.manage');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'general_manager'::public.staff_role, key FROM public.permissions WHERE key NOT IN ('subscription.manage','permissions.manage');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'branch_manager'::public.staff_role, key FROM public.permissions WHERE key IN
('orders.view','orders.view_all','orders.create','orders.edit','orders.cancel','orders.discount','orders.discount_approve','kds.view','kds.manage','menu.view','menu.edit','menu.price','menu.publish','tables.view','tables.manage','qr.manage','payments.view','payments.collect','payments.refund','billing.print','staff.view','staff.create','staff.edit','reports.view','reports.financial','reports.export','audit.view');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'floor_manager'::public.staff_role, key FROM public.permissions WHERE key IN
('orders.view','orders.view_all','orders.create','orders.edit','orders.cancel','orders.discount','orders.discount_approve','kds.view','menu.view','tables.view','tables.manage','payments.view','payments.collect','billing.print','staff.view','reports.view');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'waiter'::public.staff_role, key FROM public.permissions WHERE key IN
('orders.view','orders.create','orders.edit','orders.discount','menu.view','tables.view','billing.print');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'cashier'::public.staff_role, key FROM public.permissions WHERE key IN
('orders.view','orders.view_all','orders.create','orders.discount','menu.view','tables.view','payments.view','payments.collect','billing.print');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'chef'::public.staff_role, key FROM public.permissions WHERE key IN
('orders.view','orders.view_all','kds.view','kds.manage','menu.view','reports.view');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'kitchen_staff'::public.staff_role, key FROM public.permissions WHERE key IN ('orders.view','orders.view_all','kds.view','kds.manage');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'bar_staff'::public.staff_role, key FROM public.permissions WHERE key IN ('orders.view','orders.view_all','kds.view','kds.manage');

-- ============ default discount authorities on new business ============
CREATE OR REPLACE FUNCTION public.seed_business_defaults()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.business_settings (business_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.discount_authorities (business_id, role, max_percent, unlimited, approval_required) VALUES
    (NEW.id,'owner',NULL,true,false),
    (NEW.id,'business_admin',25.00,false,true),
    (NEW.id,'general_manager',20.00,false,true),
    (NEW.id,'branch_manager',15.00,false,true),
    (NEW.id,'floor_manager',10.00,false,true),
    (NEW.id,'cashier',5.00,false,true),
    (NEW.id,'waiter',5.00,false,true),
    (NEW.id,'chef',0.00,false,true),
    (NEW.id,'kitchen_staff',0.00,false,true),
    (NEW.id,'bar_staff',0.00,false,true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER businesses_seed_defaults AFTER INSERT ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.seed_business_defaults();

-- ============ SUPABASE REALTIME CONFIGURATION ============
DO $$
BEGIN
  -- Add public.orders if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- Add public.order_items if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;

  -- Add public.restaurant_tables if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'restaurant_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
  END IF;

  -- Add public.dining_sessions if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'dining_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dining_sessions;
  END IF;
END $$;
