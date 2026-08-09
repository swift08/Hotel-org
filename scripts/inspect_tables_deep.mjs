import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function inspectColumns() {
  const tables = [
    "menu_categories",
    "products",
    "product_variants",
    "product_addon_groups",
    "product_addons",
    "orders",
    "order_items",
    "order_events",
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(0);
    if (error) {
      console.log(`Table ${t}: Error - ${error.message}`);
    } else {
      // Fetch column names from error or mock insert test
      console.log(`Table ${t} exists.`);
    }
  }
}

inspectColumns();
