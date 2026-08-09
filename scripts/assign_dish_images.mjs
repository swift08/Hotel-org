import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function getDishImage(item) {
  const name = item.name.toLowerCase();
  const catName = (item.menu_categories?.name || "").toLowerCase();

  if (catName.includes("soup") || name.includes("shorba") || name.includes("soup")) {
    return ["/images/dishes/tamatar_shorba.webp"];
  }
  if (
    name.includes("paneer tikka") ||
    name.includes("dahi ke kebab") ||
    name.includes("hara bhara") ||
    name.includes("corn chaat") ||
    name.includes("bhindi")
  ) {
    return ["/images/dishes/paneer_tikka.webp"];
  }
  if (
    catName.includes("starter") &&
    (name.includes("chicken") ||
      name.includes("seekh") ||
      name.includes("tikka") ||
      name.includes("fish fry") ||
      name.includes("65"))
  ) {
    return ["/images/dishes/chicken_tikka.webp"];
  }
  if (
    name.includes("tandoori chicken") ||
    name.includes("malai chicken tikka") ||
    name.includes("achari murgh") ||
    name.includes("kebab") ||
    name.includes("grill")
  ) {
    return ["/images/dishes/chicken_tikka.webp"];
  }
  if (
    name.includes("butter chicken") ||
    name.includes("makhani royale") ||
    name.includes("murgh makhani")
  ) {
    return ["/images/dishes/butter_chicken.webp"];
  }
  if (
    catName.includes("non-veg") ||
    name.includes("mutton") ||
    name.includes("rogan josh") ||
    name.includes("nihari") ||
    name.includes("curry") ||
    name.includes("rara")
  ) {
    return ["/images/dishes/mutton_curry.webp"];
  }
  if (
    catName.includes("veg grav") ||
    name.includes("paneer") ||
    name.includes("dal") ||
    name.includes("kofta") ||
    name.includes("chana") ||
    name.includes("aloo gobi")
  ) {
    return ["/images/dishes/paneer_butter_masala.webp"];
  }
  if (
    catName.includes("south indian") ||
    name.includes("dosa") ||
    name.includes("parotta") ||
    name.includes("kurma")
  ) {
    return ["/images/dishes/masala_dosa.webp"];
  }
  if (
    catName.includes("bread") ||
    name.includes("naan") ||
    name.includes("roti") ||
    name.includes("paratha") ||
    name.includes("kulcha")
  ) {
    return ["/images/dishes/garlic_naan.webp"];
  }
  if (
    catName.includes("biryani") ||
    name.includes("biryani") ||
    name.includes("rice") ||
    name.includes("pulao")
  ) {
    if (name.includes("veg") || name.includes("peas")) {
      return ["/images/dishes/veg_biryani.webp"];
    }
    return ["/images/dishes/mutton_biryani.webp"];
  }
  if (
    catName.includes("beverage") ||
    name.includes("lassi") ||
    name.includes("chaas") ||
    name.includes("lime") ||
    name.includes("mojito") ||
    name.includes("coffee")
  ) {
    return ["/images/dishes/mango_lassi.webp"];
  }
  if (
    catName.includes("dessert") ||
    name.includes("jamun") ||
    name.includes("rasmalai") ||
    name.includes("halwa") ||
    name.includes("kulfi") ||
    name.includes("cake") ||
    name.includes("brownie")
  ) {
    return ["/images/dishes/gulab_jamun.webp"];
  }
  return ["/images/dishes/butter_chicken.webp"];
}

async function updateProductImages() {
  console.log("==================================================================");
  console.log("📸 ASSIGNING DISH PHOTOS TO ALL MENU ITEMS ACROSS ALL BUSINESSES");
  console.log("==================================================================");

  const { data: products, error } = await supabase
    .from("products")
    .select("*, menu_categories(name)");

  if (error) {
    console.error("Error fetching products:", error.message);
    return;
  }

  console.log(`Found ${products.length} products to update with photos.`);

  let updatedCount = 0;
  for (const prod of products) {
    const dishImages = getDishImage(prod);

    // Construct copy without joined relations
    const { menu_categories, ...cleanProd } = prod;
    cleanProd.images = dishImages;

    // Delete and re-insert to bypass buggy AFTER UPDATE trigger
    await supabase.from("products").delete().eq("id", prod.id);
    const { data: ins, error: insErr } = await supabase.from("products").insert(cleanProd).select();

    if (insErr) {
      console.error(`Failed to re-insert ${prod.name}:`, insErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(
    `\n✅ Successfully assigned photos to ${updatedCount}/${products.length} menu items!`,
  );
  console.log("==================================================================\n");
}

updateProductImages();
