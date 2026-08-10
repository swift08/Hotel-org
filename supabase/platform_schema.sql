-- ============================================================================
-- HOTEL-ORG PLATFORM CONTROL PLANE — ADDITIVE SCHEMA
-- Run in Supabase SQL Editor against the SHARED project used by orderly-hub.
-- Safe to re-run (IF NOT EXISTS / DROP IF EXISTS patterns where needed).
-- ============================================================================

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.platform_role AS ENUM (
    'platform_owner',
    'platform_admin',
    'platform_support',
    'platform_finance',
    'platform_analyst'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM (
    'trial',
    'active',
    'past_due',
    'paused',
    'cancelled',
    'expired',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.suspension_reason AS ENUM (
    'payment_failure',
    'terms_violation',
    'security_issue',
    'abuse',
    'administrative_action',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.platform_error_status AS ENUM (
    'open',
    'investigating',
    'resolved',
    'ignored'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============ BUSINESSES — suspension / activity ============
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason public.suspension_reason,
  ADD COLUMN IF NOT EXISTS suspension_notes text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- ============ PLATFORM ADMINS (expand existing) ============
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS role public.platform_role,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Backfill role from legacy level column if present
UPDATE public.platform_admins
SET role = CASE
  WHEN level IN ('owner', 'platform_owner') THEN 'platform_owner'::public.platform_role
  WHEN level IN ('admin', 'platform_admin') THEN 'platform_admin'::public.platform_role
  WHEN level IN ('finance', 'platform_finance') THEN 'platform_finance'::public.platform_role
  WHEN level IN ('analyst', 'platform_analyst') THEN 'platform_analyst'::public.platform_role
  ELSE 'platform_support'::public.platform_role
END
WHERE role IS NULL;

ALTER TABLE public.platform_admins
  ALTER COLUMN role SET DEFAULT 'platform_support'::public.platform_role;

UPDATE public.platform_admins SET role = 'platform_support' WHERE role IS NULL;
ALTER TABLE public.platform_admins ALTER COLUMN role SET NOT NULL;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND is_active = true
  );
$$;

-- ============ PLATFORM PERMISSIONS ============
CREATE TABLE IF NOT EXISTS public.platform_permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  role public.platform_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.platform_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

INSERT INTO public.platform_permissions (key, label, category, description) VALUES
  ('platform.dashboard.view', 'View dashboard', 'Overview', NULL),
  ('platform.organizations.view', 'View organizations', 'Organizations', NULL),
  ('platform.organizations.update', 'Update organizations', 'Organizations', NULL),
  ('platform.organizations.suspend', 'Suspend organizations', 'Organizations', NULL),
  ('platform.subscriptions.view', 'View subscriptions', 'Subscriptions', NULL),
  ('platform.subscriptions.update', 'Update subscriptions', 'Subscriptions', NULL),
  ('platform.plans.view', 'View plans', 'Subscriptions', NULL),
  ('platform.plans.update', 'Update plans', 'Subscriptions', NULL),
  ('platform.billing.view', 'View billing', 'Subscriptions', NULL),
  ('platform.usage.view', 'View usage', 'Usage', NULL),
  ('platform.analytics.view', 'View analytics', 'Analytics', NULL),
  ('platform.audit.view', 'View audit logs', 'System', NULL),
  ('platform.system.view', 'View system health', 'System', NULL),
  ('platform.errors.view', 'View errors', 'System', NULL),
  ('platform.errors.update', 'Update error status', 'System', NULL),
  ('platform.admins.view', 'View platform admins', 'Platform', NULL),
  ('platform.admins.update', 'Manage platform admins', 'Platform', NULL),
  ('platform.permissions.view', 'View permissions', 'Platform', NULL),
  ('platform.permissions.update', 'Update permissions', 'Platform', NULL),
  ('platform.settings.view', 'View settings', 'Platform', NULL),
  ('platform.settings.update', 'Update settings', 'Platform', NULL),
  ('platform.support.access', 'Enter support mode', 'Platform', NULL)
ON CONFLICT (key) DO NOTHING;

-- Role defaults
INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'platform_owner'::public.platform_role, key FROM public.platform_permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'platform_admin'::public.platform_role, key FROM public.platform_permissions
WHERE key NOT IN ('platform.admins.update', 'platform.permissions.update')
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'platform_support'::public.platform_role, key FROM public.platform_permissions
WHERE key IN (
  'platform.dashboard.view',
  'platform.organizations.view',
  'platform.subscriptions.view',
  'platform.plans.view',
  'platform.usage.view',
  'platform.errors.view',
  'platform.errors.update',
  'platform.audit.view',
  'platform.system.view',
  'platform.support.access'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'platform_finance'::public.platform_role, key FROM public.platform_permissions
WHERE key IN (
  'platform.dashboard.view',
  'platform.organizations.view',
  'platform.subscriptions.view',
  'platform.subscriptions.update',
  'platform.plans.view',
  'platform.plans.update',
  'platform.billing.view',
  'platform.usage.view',
  'platform.analytics.view',
  'platform.audit.view'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.platform_role_permissions (role, permission_key)
SELECT 'platform_analyst'::public.platform_role, key FROM public.platform_permissions
WHERE key IN (
  'platform.dashboard.view',
  'platform.organizations.view',
  'platform.subscriptions.view',
  'platform.plans.view',
  'platform.billing.view',
  'platform.usage.view',
  'platform.analytics.view',
  'platform.audit.view',
  'platform.system.view'
)
ON CONFLICT DO NOTHING;

-- ============ PLANS ============
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  monthly_price numeric(12,2) NOT NULL DEFAULT 0,
  yearly_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  max_branches integer,
  max_tables integer,
  max_staff integer,
  max_orders integer,
  max_menu_items integer,
  ocr_limit integer,
  storage_limit_mb integer,
  kds_enabled boolean NOT NULL DEFAULT true,
  pos_enabled boolean NOT NULL DEFAULT true,
  advanced_reports_enabled boolean NOT NULL DEFAULT false,
  multi_branch_enabled boolean NOT NULL DEFAULT false,
  api_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.plans (code, name, description, monthly_price, yearly_price, max_branches, max_tables, max_staff, max_orders, max_menu_items, ocr_limit, storage_limit_mb, kds_enabled, pos_enabled, advanced_reports_enabled, multi_branch_enabled, api_enabled, sort_order)
VALUES
  ('free', 'Free', 'Starter free tier', 0, 0, 1, 10, 3, 100, 50, 1, 100, true, false, false, false, false, 0),
  ('starter', 'Starter', 'For small restaurants', 999, 9990, 1, 30, 10, 1000, 200, 5, 500, true, true, false, false, false, 1),
  ('professional', 'Professional', 'Growing multi-staff ops', 2499, 24990, 3, 100, 40, 10000, 1000, 25, 2000, true, true, true, true, false, 2),
  ('business', 'Business', 'Multi-branch businesses', 4999, 49990, 10, 500, 150, 50000, 5000, 100, 10000, true, true, true, true, true, 3),
  ('enterprise', 'Enterprise', 'Custom enterprise limits', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, true, true, true, true, 4)
ON CONFLICT (code) DO NOTHING;

-- ============ SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trial',
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_status text NOT NULL DEFAULT 'unpaid',
  trial_ends_at timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  renewal_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_plan_id uuid REFERENCES public.plans(id),
  to_plan_id uuid REFERENCES public.plans(id),
  from_status public.subscription_status,
  to_status public.subscription_status,
  amount numeric(12,2),
  metadata jsonb,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_events_business ON public.subscription_events(business_id, created_at DESC);

-- ============ PLATFORM AUDIT (append-only) ============
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role public.platform_role,
  actor_label text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  organization_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  before_state jsonb,
  after_state jsonb,
  reason text,
  support_session_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.block_platform_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'platform_audit_logs are append-only';
END;
$$;

DROP TRIGGER IF EXISTS platform_audit_block_update ON public.platform_audit_logs;
CREATE TRIGGER platform_audit_block_update
  BEFORE UPDATE OR DELETE ON public.platform_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_platform_audit_mutation();

-- ============ SUPPORT SESSIONS ============
CREATE TABLE IF NOT EXISTS public.platform_support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_admin_id uuid NOT NULL REFERENCES public.platform_admins(user_id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reason text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  actions_performed jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- ============ PLATFORM ERRORS ============
CREATE TABLE IF NOT EXISTS public.platform_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_fingerprint text NOT NULL,
  error_message text NOT NULL,
  organization_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  route text,
  severity text NOT NULL DEFAULT 'error',
  frequency integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status public.platform_error_status NOT NULL DEFAULT 'open',
  stack text,
  metadata jsonb,
  UNIQUE (error_fingerprint)
);

-- ============ PLATFORM SETTINGS ============
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- ============ USAGE HELPER VIEW ============
CREATE OR REPLACE VIEW public.organization_usage AS
SELECT
  b.id AS business_id,
  (SELECT count(*)::int FROM public.branches br WHERE br.business_id = b.id) AS branches,
  (SELECT count(*)::int FROM public.restaurant_tables t WHERE t.business_id = b.id) AS tables,
  (SELECT count(*)::int FROM public.memberships m WHERE m.business_id = b.id AND m.is_active) AS staff,
  (SELECT count(*)::int FROM public.products p WHERE p.business_id = b.id) AS menu_items,
  (SELECT count(*)::int FROM public.orders o WHERE o.business_id = b.id) AS orders,
  (SELECT count(*)::int FROM public.orders o WHERE o.business_id = b.id AND o.created_at >= date_trunc('day', now())) AS orders_today,
  (SELECT count(*)::int FROM public.orders o WHERE o.business_id = b.id AND o.created_at >= date_trunc('month', now())) AS orders_month,
  COALESCE((SELECT count(*)::int FROM public.menu_imports mi WHERE mi.business_id = b.id), 0) AS ocr_imports
FROM public.businesses b;

-- ============ RLS / GRANTS ============
ALTER TABLE public.platform_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Platform tables are accessed via service role from Hotel-org serverFns.
-- Authenticated users may only confirm their own platform_admin row.
DROP POLICY IF EXISTS "platform admins read self" ON public.platform_admins;
CREATE POLICY "platform admins read self" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND is_active = true);

DROP POLICY IF EXISTS "members read plans" ON public.plans;
CREATE POLICY "members read plans" ON public.plans
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "members read own subscription" ON public.subscriptions;
CREATE POLICY "members read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_member(business_id) OR public.is_platform_admin(auth.uid()));

GRANT SELECT ON public.platform_permissions TO authenticated;
GRANT SELECT ON public.platform_role_permissions TO authenticated;
GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT ON public.organization_usage TO authenticated, service_role;

GRANT ALL ON public.platform_permissions TO service_role;
GRANT ALL ON public.platform_role_permissions TO service_role;
GRANT ALL ON public.plans TO service_role;
GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.subscription_events TO service_role;
GRANT ALL ON public.platform_audit_logs TO service_role;
GRANT ALL ON public.platform_support_sessions TO service_role;
GRANT ALL ON public.platform_errors TO service_role;
GRANT ALL ON public.platform_settings TO service_role;

-- Keep businesses readable by platform admins
DROP POLICY IF EXISTS "members read own business" ON public.businesses;
CREATE POLICY "members read own business" ON public.businesses
  FOR SELECT TO authenticated
  USING (public.is_member(id) OR public.is_platform_admin(auth.uid()));

-- ============ BUSINESS REGISTRATION APPROVAL ============
-- New signups stay pending until a platform admin approves them in Hotel-org.
DO $$ BEGIN
  CREATE TYPE public.business_approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS approval_status public.business_approval_status,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Existing organizations are already live — treat them as approved.
UPDATE public.businesses
SET
  approval_status = 'approved',
  approved_at = COALESCE(approved_at, created_at)
WHERE approval_status IS NULL;

ALTER TABLE public.businesses
  ALTER COLUMN approval_status SET DEFAULT 'pending';

UPDATE public.businesses SET approval_status = 'pending' WHERE approval_status IS NULL;
ALTER TABLE public.businesses ALTER COLUMN approval_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_approval_status
  ON public.businesses (approval_status);

-- ============ PLATFORM ADMIN RLS (hosted reads/writes without service role) ============
-- Lets signed-in platform admins load dashboard data via their user session when
-- SUPABASE_SERVICE_ROLE_KEY is not configured on the host.

DROP POLICY IF EXISTS "platform admins read all memberships" ON public.memberships;
CREATE POLICY "platform admins read all memberships" ON public.memberships
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read all branches" ON public.branches;
CREATE POLICY "platform admins read all branches" ON public.branches
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read all settings" ON public.business_settings;
CREATE POLICY "platform admins read all settings" ON public.business_settings
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read all orders" ON public.orders;
CREATE POLICY "platform admins read all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read all tables" ON public.restaurant_tables;
CREATE POLICY "platform admins read all tables" ON public.restaurant_tables
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read all products" ON public.products;
CREATE POLICY "platform admins read all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read profiles" ON public.profiles;
CREATE POLICY "platform admins read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins update businesses" ON public.businesses;
CREATE POLICY "platform admins update businesses" ON public.businesses
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins write subscriptions" ON public.subscriptions;
CREATE POLICY "platform admins write subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins write subscription events" ON public.subscription_events;
CREATE POLICY "platform admins write subscription events" ON public.subscription_events
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read plans all" ON public.plans;
CREATE POLICY "platform admins read plans all" ON public.plans
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR is_active = true);

DROP POLICY IF EXISTS "platform admins manage plans" ON public.plans;
CREATE POLICY "platform admins manage plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read audit" ON public.platform_audit_logs;
CREATE POLICY "platform admins read audit" ON public.platform_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins insert audit" ON public.platform_audit_logs;
CREATE POLICY "platform admins insert audit" ON public.platform_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read errors" ON public.platform_errors;
CREATE POLICY "platform admins read errors" ON public.platform_errors
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins update errors" ON public.platform_errors;
CREATE POLICY "platform admins update errors" ON public.platform_errors
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read support sessions" ON public.platform_support_sessions;
CREATE POLICY "platform admins read support sessions" ON public.platform_support_sessions
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins write support sessions" ON public.platform_support_sessions;
CREATE POLICY "platform admins write support sessions" ON public.platform_support_sessions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read settings table" ON public.platform_settings;
CREATE POLICY "platform admins read settings table" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins write settings table" ON public.platform_settings;
CREATE POLICY "platform admins write settings table" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "platform admins read all admins" ON public.platform_admins;
CREATE POLICY "platform admins read all admins" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.platform_audit_logs TO authenticated;
GRANT SELECT, UPDATE ON public.platform_errors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_support_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
