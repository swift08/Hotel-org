# Database Reset & Bootstrap Guide — Rasoi SaaS

This guide explains how to safely wipe non-production application test data and bootstrap a clean zero-data production instance.

---

## 1. Zero-Data Production Architecture

Rasoi SaaS enforces strict zero-data production deployment:
- **No Automatic Seeding**: `npm run build` and Vercel build tasks do NOT run seed scripts or insert mock restaurants.
- **Onboarding Flow**: The first production user signs up via `/auth/signup`, creates their business, provisions branches, configures tables/QRs, and builds their menu cleanly.

---

## 2. Destructive Data Reset Script

To reset non-production database state back to an empty application baseline, run:

```sql
-- Execute inside Supabase Dashboard -> SQL Editor
\i supabase/scripts/reset-application-data.sql
```

### Table Truncation Dependency Order
The reset script truncates application tables in strict reverse foreign-key dependency order:
1. `print_jobs`, `invoices`, `webhook_events`, `refunds`, `payments`
2. `discount_requests`, `order_events`, `order_items`, `orders`
3. `dining_sessions`, `carts`, `price_history`
4. `addons`, `addon_groups`, `product_variants`, `products`, `menu_categories`
5. `qr_slug_history`, `restaurant_tables`, `audit_logs`
6. `discount_authorities`, `role_permissions`, `memberships`
7. `outlets`, `branches`, `business_settings`, `businesses`

---

## 3. Preserved Infrastructure

The reset script **PRESERVES**:
- Supabase System schemas (`auth.users`, `storage.objects`, migration logs).
- Platform RBAC definition tables (`permissions`, `role_default_permissions`).
- Database schema structure, triggers, RLS policies, indexes, and ENUM types.
