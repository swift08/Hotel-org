import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanupDuplicates() {
  console.log("Checking for duplicate products in Supabase...");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, business_id, category_id, name, base_price, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  console.log(`Total products in database: ${products.length}`);

  // Group products by business_id + lowercase trimmed name
  const grouped = new Map();

  for (const p of products) {
    const key = `${p.business_id}::${p.name.toLowerCase().trim()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(p);
  }

  const idsToDelete = [];

  for (const [key, list] of grouped.entries()) {
    if (list.length > 1) {
      console.log(`Found ${list.length} duplicates for "${list[0].name}" (Business: ${list[0].business_id})`);
      // Keep the first one (latest), delete the rest
      const [toKeep, ...duplicates] = list;
      for (const dup of duplicates) {
        idsToDelete.push(dup.id);
      }
    }
  }

  if (idsToDelete.length === 0) {
    console.log("No duplicate products found.");
    return;
  }

  console.log(`Deleting ${idsToDelete.length} duplicate product rows...`);

  const { error: delErr } = await supabase
    .from("products")
    .delete()
    .in("id", idsToDelete);

  if (delErr) {
    console.error("Error deleting duplicates:", delErr);
  } else {
    console.log(`Successfully removed ${idsToDelete.length} duplicate products from database!`);
  }
}

cleanupDuplicates();
