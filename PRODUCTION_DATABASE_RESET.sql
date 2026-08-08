-- ================================================================
-- SERVIO HORECA — PRODUCTION PURGE & DATABASE RESET
-- Copy and run in: Supabase Dashboard → SQL Editor
-- This purges all test data (including audit_logs & test businesses)
-- leaving the schema clean for live production onboarding.
-- ================================================================

-- 1. Disable the specific user trigger on audit_logs (not system triggers)
ALTER TABLE IF EXISTS public.audit_logs DISABLE TRIGGER audit_logs_no_update;

-- 2. Truncate all business and transactional data
TRUNCATE TABLE public.print_jobs CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.webhook_events CASCADE;
TRUNCATE TABLE public.refunds CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.discount_requests CASCADE;
TRUNCATE TABLE public.order_events CASCADE;
TRUNCATE TABLE public.order_items CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.dining_sessions CASCADE;
TRUNCATE TABLE public.carts CASCADE;
TRUNCATE TABLE public.price_history CASCADE;
TRUNCATE TABLE public.addons CASCADE;
TRUNCATE TABLE public.addon_groups CASCADE;
TRUNCATE TABLE public.product_variants CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.menu_categories CASCADE;
TRUNCATE TABLE public.qr_slug_history CASCADE;
TRUNCATE TABLE public.restaurant_tables CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.memberships CASCADE;
TRUNCATE TABLE public.outlets CASCADE;
TRUNCATE TABLE public.branches CASCADE;
TRUNCATE TABLE public.business_settings CASCADE;
TRUNCATE TABLE public.businesses CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 3. Re-enable audit log user trigger for production security
ALTER TABLE IF EXISTS public.audit_logs ENABLE TRIGGER audit_logs_no_update;

-- 4. Verify clean tables
SELECT 'businesses' as table_name, count(*) FROM public.businesses
UNION ALL
SELECT 'orders', count(*) FROM public.orders
UNION ALL
SELECT 'restaurant_tables', count(*) FROM public.restaurant_tables
UNION ALL
SELECT 'products', count(*) FROM public.products;

-- 5. Enable Realtime for restaurant_tables and dining_sessions safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'restaurant_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'dining_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dining_sessions;
  END IF;
END $$;
