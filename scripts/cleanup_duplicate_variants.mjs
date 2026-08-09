import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanupDuplicateVariants() {
  console.log("Checking for duplicate product variants in Supabase database...");

  const { data: variants, error } = await supabase
    .from("product_variants")
    .select("id, product_id, name, price, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching variants:", error);
    return;
  }

  console.log(`Total product variant rows in DB: ${variants.length}`);

  // Group by product_id + lowercase variant name
  const grouped = new Map();

  for (const v of variants) {
    const key = `${v.product_id}::${v.name.toLowerCase().trim()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(v);
  }

  const idsToDelete = [];

  for (const [key, list] of grouped.entries()) {
    if (list.length > 1) {
      console.log(`Found ${list.length} duplicates for variant "${list[0].name}" (Product ID: ${list[0].product_id})`);
      const [toKeep, ...duplicates] = list;
      for (const dup of duplicates) {
        idsToDelete.push(dup.id);
      }
    }
  }

  if (idsToDelete.length === 0) {
    console.log("No duplicate variants found.");
    return;
  }

  console.log(`Deleting ${idsToDelete.length} duplicate product variant rows...`);

  const { error: delErr } = await supabase
    .from("product_variants")
    .delete()
    .in("id", idsToDelete);

  if (delErr) {
    console.error("Error deleting duplicate variants:", delErr);
  } else {
    console.log("Successfully cleaned up duplicate variants!");
  }
}

cleanupDuplicateVariants();
