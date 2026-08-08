-- ============ ENUMS ============
CREATE TYPE public.business_type AS ENUM ('restaurant','cafe','hotel','resort','bar_pub','cloud_kitchen','food_outlet');
CREATE TYPE public.staff_role AS ENUM ('owner','business_admin','general_manager','branch_manager','floor_manager','waiter','cashier','chef','kitchen_staff','bar_staff');
CREATE TYPE public.tax_mode AS ENUM ('inclusive','exclusive');

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
GRANT ALL ON public.businesses, public.business_settings, public.branches, public.outlets, public.profiles, public.memberships, public.platform_admins, public.permissions, public.role_default_permissions, public.role_permissions, public.discount_authorities, public.audit_logs TO service_role;

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
SELECT 'kitchen_staff'::public.staff_role, key FROM public.permissions WHERE key IN ('kds.view');

INSERT INTO public.role_default_permissions (role, permission_key)
SELECT 'bar_staff'::public.staff_role, key FROM public.permissions WHERE key IN ('kds.view');

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