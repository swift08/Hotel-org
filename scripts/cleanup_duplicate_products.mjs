import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanupProducts() {
  console.log("Checking for malformed product names and duplicates in Supabase...");

  const { data: products, error } = await supabase
    .from("products")
    .select("id, business_id, category_id, name, base_price, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    return;
  }

  console.log(`Total products in database: ${products.length}`);

  // 1. Fix products with price number in name (e.g. "Paneer tikka 100", "Tandoori Aloo 60", "Mutton Seekh 120")
  for (const p of products) {
    const match = p.name.match(/^(.*?)\s+(\d{2,4})$/);
    if (match && !p.name.toLowerCase().includes("65") && !p.name.toLowerCase().match(/\b\d+g\b/)) {
      const cleanName = match[1].trim();
      const halfPrice = parseInt(match[2], 10);
      const fullPrice = p.base_price > halfPrice ? p.base_price : halfPrice * 2;

      console.log(`Fixing malformed product name "${p.name}" -> "${cleanName}" (Half: ₹${halfPrice}, Full: ₹${fullPrice})`);

      await supabase
        .from("products")
        .update({
          name: cleanName,
          base_price: fullPrice,
        })
        .eq("id", p.id);

      // Upsert Half and Full variants
      await supabase.from("product_variants").insert([
        {
          business_id: p.business_id,
          product_id: p.id,
          name: "Half",
          price: halfPrice,
          is_default: false,
          is_available: true,
          sort_order: 1,
        },
        {
          business_id: p.business_id,
          product_id: p.id,
          name: "Full",
          price: fullPrice,
          is_default: true,
          is_available: true,
          sort_order: 2,
        },
      ]);
    }
  }

  // 2. Remove any remaining duplicate product rows
  const { data: updatedProducts } = await supabase
    .from("products")
    .select("id, business_id, category_id, name, base_price, created_at")
    .order("created_at", { ascending: false });

  const grouped = new Map();

  for (const p of updatedProducts || []) {
    const key = `${p.business_id}::${p.name.toLowerCase().trim()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(p);
  }

  const idsToDelete = [];

  for (const [key, list] of grouped.entries()) {
    if (list.length > 1) {
      console.log(`Found ${list.length} duplicates for "${list[0].name}"`);
      const [toKeep, ...duplicates] = list;
      for (const dup of duplicates) {
        idsToDelete.push(dup.id);
      }
    }
  }

  if (idsToDelete.length > 0) {
    console.log(`Deleting ${idsToDelete.length} duplicate product rows...`);
    await supabase.from("products").delete().in("id", idsToDelete);
  }

  console.log("Cleanup complete!");
}

cleanupProducts();
