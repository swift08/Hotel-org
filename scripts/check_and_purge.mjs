import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkAndPurge() {
  console.log("🔍 Inspecting row counts across all tables in Supabase...");

  const tables = [
    "businesses",
    "business_settings",
    "branches",
    "outlets",
    "memberships",
    "profiles",
    "restaurant_tables",
    "qr_slug_history",
    "menu_categories",
    "products",
    "product_variants",
    "addon_groups",
    "addons",
    "orders",
    "order_items",
    "order_events",
    "payments",
    "refunds",
    "invoices",
    "audit_logs"
  ];

  for (const t of tables) {
    const { count, error } = await adminSupabase.from(t).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`Table [${t}]: Error ${error.message}`);
    } else {
      console.log(`Table [${t}]: ${count} rows remaining`);
    }
  }
}

checkAndPurge();
