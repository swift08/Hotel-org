-- ============================================================================
-- RASOI HORECA SaaS — DESTRUCTIVE APPLICATION DATA RESET SCRIPT
-- Location: supabase/scripts/reset-application-data.sql
-- 
-- WARNING: DESTRUCTIVE ACTION.
-- This script truncates ALL Rasoi application tenant data (businesses, branches,
-- tables, menus, orders, payments, sessions, audit logs, memberships).
--
-- PRESERVES:
-- - Schema definitions, indexes, RLS policies, triggers, and enum types
-- - System tables (auth.users, storage.objects, migration metadata)
-- - System permission definitions (permissions, role_default_permissions)
-- ============================================================================

DO $$
BEGIN
  -- Explicit Environment Safety Guard
  -- Set session variable app.environment = 'development' before running, or execute in SQL Editor intentionally
  IF current_setting('app.environment', true) IS DISTINCT FROM 'development' 
     AND current_setting('app.environment', true) IS DISTINCT FROM 'test' THEN
    RAISE NOTICE 'Notice: Resetting application data. Ensure you intend to wipe non-production test data.';
  END IF;
END $$;

BEGIN;

-- Truncate application data tables in reverse foreign-key dependency order
TRUNCATE TABLE
  public.print_jobs,
  public.invoices,
  public.webhook_events,
  public.refunds,
  public.payments,
  public.discount_requests,
  public.order_events,
  public.order_items,
  public.orders,
  public.dining_sessions,
  public.carts,
  public.price_history,
  public.addons,
  public.addon_groups,
  public.product_variants,
  public.products,
  public.menu_categories,
  public.qr_slug_history,
  public.restaurant_tables,
  public.audit_logs,
  public.discount_authorities,
  public.role_permissions,
  public.memberships,
  public.outlets,
  public.branches,
  public.business_settings,
  public.businesses
CASCADE;

COMMIT;

-- Verify Clean Application Data Inventory
SELECT 'businesses' AS table_name, count(*) AS row_count FROM public.businesses
UNION ALL SELECT 'branches', count(*) FROM public.branches
UNION ALL SELECT 'restaurant_tables', count(*) FROM public.restaurant_tables
UNION ALL SELECT 'menu_categories', count(*) FROM public.menu_categories
UNION ALL SELECT 'products', count(*) FROM public.products
UNION ALL SELECT 'orders', count(*) FROM public.orders
UNION ALL SELECT 'payments', count(*) FROM public.payments
UNION ALL SELECT 'dining_sessions', count(*) FROM public.dining_sessions
UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs;
