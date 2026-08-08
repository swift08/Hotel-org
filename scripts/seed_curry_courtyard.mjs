import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function seedCurryCourtyard() {
  console.log("==================================================================");
  console.log("🍛 EXPANDED SEEDING: The Curry Courtyard (12 Categories, 80+ Dishes)");
  console.log("==================================================================");

  // 1. Owner User
  const ownerEmail = "info@kapilariverfront.com";
  let { data: usersData } = await supabase.auth.admin.listUsers();
  let ownerUser = usersData?.users?.find(u => u.email === ownerEmail);

  if (!ownerUser) {
    console.log("Creating owner user info@kapilariverfront.com...");
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: "Harshi0812_",
      email_confirm: true,
      user_metadata: { full_name: "Aarav Mehta" },
    });
    ownerUser = newUser.user;
  }
  const ownerId = ownerUser.id;

  await supabase.from("profiles").upsert({
    id: ownerId,
    display_name: "Aarav Mehta",
    phone: "+91 80 4567 8901",
  });

  // 2. Business
  let { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("name", "The Curry Courtyard")
    .maybeSingle();

  if (!biz) {
    const { data: newBiz } = await supabase
      .from("businesses")
      .insert({
        name: "The Curry Courtyard",
        slug: "the-curry-courtyard",
        business_type: "restaurant",
        currency: "INR",
        timezone: "Asia/Kolkata",
        created_by: ownerId,
        is_active: true,
      })
      .select("id")
      .single();
    biz = newBiz;
  }
  const businessId = biz.id;

  // Branch
  let { data: branch } = await supabase
    .from("branches")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (!branch) {
    const { data: newBranch } = await supabase
      .from("branches")
      .insert({
        business_id: businessId,
        name: "Indiranagar Flagship",
        code: "IND-01",
        address: "12th Main Road, Indiranagar",
        city: "Bengaluru",
        phone: "+91 80 4567 8901",
        timezone: "Asia/Kolkata",
        is_active: true,
      })
      .select("id")
      .single();
    branch = newBranch;
  }
  const branchId = branch.id;

  // Primary membership
  await supabase.from("memberships").update({ is_active: false }).eq("user_id", ownerId);
  const { data: existingMem } = await supabase.from("memberships").select("id").eq("business_id", businessId).eq("user_id", ownerId).maybeSingle();
  if (!existingMem) {
    await supabase.from("memberships").insert({
      business_id: businessId,
      user_id: ownerId,
      branch_id: branchId,
      role: "owner",
      is_active: true,
    });
  } else {
    await supabase.from("memberships").update({ is_active: true, role: "owner", branch_id: branchId }).eq("id", existingMem.id);
  }

  // Clean old records for fresh seed
  console.log("Cleaning previous menu & order records for fresh seed...");
  await supabase.from("order_items").delete().eq("business_id", businessId);
  await supabase.from("order_events").delete().eq("business_id", businessId);
  await supabase.from("payments").delete().eq("business_id", businessId);
  await supabase.from("orders").delete().eq("business_id", businessId);
  await supabase.from("restaurant_tables").delete().eq("business_id", businessId);
  await supabase.from("addons").delete().eq("business_id", businessId);
  await supabase.from("addon_groups").delete().eq("business_id", businessId);
  await supabase.from("products").delete().eq("business_id", businessId);
  await supabase.from("menu_categories").delete().eq("business_id", businessId);

  // 3. Tables (24 Tables: T01–T24)
  console.log("Seeding 24 tables...");
  const tablesConfig = [
    { label: "T01", seats: 2, state: "available", sort_order: 1 },
    { label: "T02", seats: 2, state: "occupied", sort_order: 2 },
    { label: "T03", seats: 2, state: "available", sort_order: 3 },
    { label: "T04", seats: 2, state: "available", sort_order: 4 },
    { label: "T05", seats: 2, state: "occupied", sort_order: 5 },
    { label: "T06", seats: 2, state: "available", sort_order: 6 },
    { label: "T07", seats: 4, state: "occupied", sort_order: 7 },
    { label: "T08", seats: 4, state: "occupied", sort_order: 8 },
    { label: "T09", seats: 4, state: "available", sort_order: 9 },
    { label: "T10", seats: 4, state: "occupied", sort_order: 10 },
    { label: "T11", seats: 4, state: "occupied", sort_order: 11 },
    { label: "T12", seats: 4, state: "available", sort_order: 12 },
    { label: "T13", seats: 4, state: "occupied", sort_order: 13 },
    { label: "T14", seats: 4, state: "available", sort_order: 14 },
    { label: "T15", seats: 4, state: "occupied", sort_order: 15 },
    { label: "T16", seats: 4, state: "available", sort_order: 16 },
    { label: "T17", seats: 4, state: "payment_pending", sort_order: 17 },
    { label: "T18", seats: 4, state: "occupied", sort_order: 18 },
    { label: "T19", seats: 6, state: "payment_pending", sort_order: 19 },
    { label: "T20", seats: 6, state: "available", sort_order: 20 },
    { label: "T21", seats: 6, state: "occupied", sort_order: 21 },
    { label: "T22", seats: 6, state: "disabled", sort_order: 22 },
    { label: "T23", seats: 8, state: "occupied", sort_order: 23 },
    { label: "T24", seats: 8, state: "available", sort_order: 24 },
  ];

  const tableIdMap = {};
  for (const t of tablesConfig) {
    const qrSlug = `the-curry-courtyard-${t.label.toLowerCase()}`;
    const { data: tbl } = await supabase
      .from("restaurant_tables")
      .insert({
        business_id: businessId,
        branch_id: branchId,
        label: t.label,
        seats: t.seats,
        state: t.state,
        qr_slug: qrSlug,
        qr_version: 1,
        scan_count: Math.floor(Math.random() * 50) + 10,
        is_active: true,
        sort_order: t.sort_order,
      })
      .select("id, label")
      .single();

    if (tbl) tableIdMap[t.label] = tbl.id;
  }

  // 4. Menu Categories (12 Categories)
  console.log("Seeding 12 rich menu categories...");
  const categoriesList = [
    { name: "Soups & Shorbas", sort_order: 1 },
    { name: "Vegetarian Starters", sort_order: 2 },
    { name: "Non-Vegetarian Starters", sort_order: 3 },
    { name: "Tandoori Grills & Kebabs", sort_order: 4 },
    { name: "Chef's Signature Specials", sort_order: 5 },
    { name: "North Indian Veg Gravies", sort_order: 6 },
    { name: "North Indian Non-Veg Gravies", sort_order: 7 },
    { name: "South Indian Specialties", sort_order: 8 },
    { name: "Indian Tandoori Breads", sort_order: 9 },
    { name: "Royal Biryanis & Rice", sort_order: 10 },
    { name: "Beverages & Lassi", sort_order: 11 },
    { name: "Desserts & Sweets", sort_order: 12 },
  ];

  const catMap = {};
  for (const c of categoriesList) {
    const { data: cat } = await supabase
      .from("menu_categories")
      .insert({
        business_id: businessId,
        name: c.name,
        sort_order: c.sort_order,
        is_active: true,
        state: "published",
      })
      .select("id, name")
      .single();

    if (cat) catMap[c.name] = cat.id;
  }

  // 5. 80+ Gourmet Indian Menu Items with normalized food_tags
  console.log("Seeding 80+ Indian dishes with tags...");
  const menuItems = [
    // 1. Soups & Shorbas
    { category: "Soups & Shorbas", name: "Tamatar Dhaniya Shorba", description: "Infused ripe tomato broth spiced with fresh coriander roots & cumin.", price: 189, tags: ["veg"], prep: 10, images: ["/images/dishes/tamatar_shorba.png"] },
    { category: "Soups & Shorbas", name: "Murgh Jahangiri Shorba", description: "Slow-simmered aromatic chicken bone broth with black pepper & ghee.", price: 229, tags: ["non_veg", "bestseller"], prep: 12 },
    { category: "Soups & Shorbas", name: "Sweet Corn Veg Soup", description: "Classic comforting soup with sweet corn kernels & finely diced veggies.", price: 179, tags: ["veg"], prep: 10 },
    { category: "Soups & Shorbas", name: "Hot & Sour Chicken Soup", description: "Tangy & spicy chicken soup spiked with green chilies, soy & dark vinegar.", price: 209, tags: ["non_veg", "spicy"], prep: 12 },
    { category: "Soups & Shorbas", name: "Cream of Mushroom Shorba", description: "Velvety button mushroom extract tempered with garlic & mild Indian spices.", price: 199, tags: ["veg"], prep: 12 },

    // 2. Vegetarian Starters
    { category: "Vegetarian Starters", name: "Paneer Tikka Classic", description: "Fresh cottage cheese marinated in spiced hung yogurt & charred in clay oven.", price: 329, tags: ["veg", "bestseller"], prep: 15 },
    { category: "Vegetarian Starters", name: "Dahi Ke Kebab", description: "Crispy fried hung curd patties spiced with green chilies & fresh coriander.", price: 299, tags: ["veg", "chef_special"], prep: 14 },
    { category: "Vegetarian Starters", name: "Crispy Corn Chaat", description: "Golden fried sweet corn tossed with chaat masala, onions & lime juice.", price: 269, tags: ["veg"], prep: 10 },
    { category: "Vegetarian Starters", name: "Hara Bhara Kebab", description: "Spiced spinach, pea & potato patties pan-seared to golden perfection.", price: 279, tags: ["veg"], prep: 12 },
    { category: "Vegetarian Starters", name: "Kurkuri Bhindi Chaat", description: "Crispy thin sliced okra tossed with tangy raw mango powder & pomegranate.", price: 249, tags: ["veg"], prep: 12 },
    { category: "Vegetarian Starters", name: "Tandoori Stuffed Mushroom", description: "Button mushrooms stuffed with spiced paneer, herbs & tandoori glaze.", price: 319, tags: ["veg"], prep: 15 },
    { category: "Vegetarian Starters", name: "Malai Broccoli Grill", description: "Fresh broccoli florets steeped in cashew, cream & cardamom marinade.", price: 349, tags: ["veg", "chef_special"], prep: 16 },
    { category: "Vegetarian Starters", name: "Veg Spring Rolls", description: "Crispy rolls packed with stir-fried cabbage, carrots & bell peppers.", price: 259, tags: ["veg"], prep: 12 },

    // 3. Non-Vegetarian Starters
    { category: "Non-Vegetarian Starters", name: "Chicken Seekh Kebab", description: "Minced chicken blended with royal spices & roasted on iron skewers.", price: 389, tags: ["non_veg", "bestseller"], prep: 18 },
    { category: "Non-Vegetarian Starters", name: "Amritsari Fish Fry", description: "Carom-seeded crispy batter fried fish fillets served with mint chutney.", price: 429, tags: ["non_veg", "spicy"], prep: 15 },
    { category: "Non-Vegetarian Starters", name: "Tandoori Bay Prawns", description: "Jumbo bay prawns steeped in spicy garlic chili marinade & charred.", price: 549, tags: ["non_veg", "chef_special"], prep: 15 },
    { category: "Non-Vegetarian Starters", name: "Chicken 65 Andhra Style", description: "Spicy fried chicken chunks tossed with curry leaves, mustard & green chilies.", price: 369, tags: ["non_veg", "spicy"], prep: 15 },
    { category: "Non-Vegetarian Starters", name: "Mutton Sukka Fry", description: "Tender lamb chunks pan-roasted with freshly crushed black pepper & ghee.", price: 489, tags: ["non_veg", "bestseller"], prep: 20 },
    { category: "Non-Vegetarian Starters", name: "Galouti Kebab Lucknowi", description: "Melt-in-mouth minced mutton patties infused with 24 aromatic spices.", price: 459, tags: ["non_veg", "chef_special"], prep: 18 },
    { category: "Non-Vegetarian Starters", name: "Dragon Chicken Indo-Chinese", description: "Crispy chicken strips tossed in spicy red dragon chili sauce & cashews.", price: 379, tags: ["non_veg"], prep: 15 },
    { category: "Non-Vegetarian Starters", name: "Prawns Pepper Fry", description: "Succulent prawns pan-fried with roasted Malabar peppercorns & onions.", price: 529, tags: ["non_veg", "spicy"], prep: 15 },

    // 4. Tandoori Grills & Kebabs
    { category: "Tandoori Grills & Kebabs", name: "Tandoori Chicken (Half)", description: "Bone-in chicken marinated overnight in Kashmiri chili, yogurt & mustard oil.", price: 449, tags: ["non_veg", "bestseller"], prep: 22 },
    { category: "Tandoori Grills & Kebabs", name: "Malai Chicken Tikka", description: "Boneless chicken chunks marinated in cream, mozzarella cheese & cardamom.", price: 429, tags: ["non_veg"], prep: 18 },
    { category: "Tandoori Grills & Kebabs", name: "Achari Murgh Tikka", description: "Tandoori chicken tikka flavored with pickled spices & mustard.", price: 419, tags: ["non_veg", "spicy"], prep: 18 },
    { category: "Tandoori Grills & Kebabs", name: "Pahadi Paneer Tikka", description: "Cottage cheese marinated in mint, coriander & green chili marinade.", price: 339, tags: ["veg"], prep: 16 },
    { category: "Tandoori Grills & Kebabs", name: "Fish Tikka Ajwaini", description: "Boneless fish chunks marinated in carom seeds, ginger & lemon juice.", price: 469, tags: ["non_veg", "chef_special"], prep: 16 },
    { category: "Tandoori Grills & Kebabs", name: "Kasturi Murgh Kebab", description: "Chicken kebab wrapped in egg foam & perfumed with sun-dried fenugreek.", price: 439, tags: ["non_veg"], prep: 18 },
    { category: "Tandoori Grills & Kebabs", name: "Tandoori Veg Grill Platter", description: "Assortment of Paneer Tikka, Hara Bhara, Stuffed Mushroom & Broccoli.", price: 599, tags: ["veg", "bestseller"], prep: 20 },
    { category: "Tandoori Grills & Kebabs", name: "Royal Non-Veg Grill Platter", description: "Sizzling platter of Tandoori Chicken, Malai Tikka, Seekh Kebab & Fish Tikka.", price: 899, tags: ["non_veg", "chef_special"], prep: 24 },

    // 5. Chef's Signature Specials
    { category: "Chef's Signature Specials", name: "Curry Courtyard Butter Chicken", description: "Slow-cooked tandoori chicken simmered in silky velvet tomato & butter gravy.", price: 469, tags: ["non_veg", "bestseller"], prep: 18, images: ["/images/dishes/butter_chicken.png"] },
    { category: "Chef's Signature Specials", name: "Royal Mutton Nalli Nihari", description: "Slow-cooked lamb shanks in rich spicy stew topped with fried ginger & mint.", price: 599, tags: ["non_veg", "chef_special"], prep: 25 },
    { category: "Chef's Signature Specials", name: "Paneer Lababdar Special", description: "Cottage cheese in rich onion tomato cashew gravy topped with grated paneer.", price: 389, tags: ["veg", "bestseller"], prep: 16 },
    { category: "Chef's Signature Specials", name: "Murgh Musallam Special", description: "Whole roasted chicken stuffed with minced meat & boiled eggs in rich gravy.", price: 549, tags: ["non_veg", "chef_special"], prep: 25 },
    { category: "Chef's Signature Specials", name: "Dal Curry Courtyard Signature", description: "Black lentils slow-simmered 24 hours over wood charcoal with ghee.", price: 329, tags: ["veg", "bestseller"], prep: 15 },
    { category: "Chef's Signature Specials", name: "Dum Pukht Mutton Curry", description: "Sealed dough pot mutton curry cooked in its own juices & aromatic khada masala.", price: 569, tags: ["non_veg"], prep: 25 },

    // 6. North Indian Veg Gravies
    { category: "North Indian Veg Gravies", name: "Dal Makhani", description: "Classic black lentils simmered overnight with tomato puree & fresh butter.", price: 299, tags: ["veg", "bestseller"], prep: 15 },
    { category: "North Indian Veg Gravies", name: "Kadai Paneer", description: "Paneer cubes tossed with diced bell peppers & crushed coriander pepper masala.", price: 349, tags: ["veg", "spicy"], prep: 15 },
    { category: "North Indian Veg Gravies", name: "Palak Paneer", description: "Creamy spinach puree tempered with roasted garlic & paneer cubes.", price: 339, tags: ["veg"], prep: 14 },
    { category: "North Indian Veg Gravies", name: "Malai Kofta", description: "Stuffed cottage cheese & potato dumplings in mild cashew gravy.", price: 359, tags: ["veg"], prep: 18 },
    { category: "North Indian Veg Gravies", name: "Paneer Butter Masala", description: "Paneer cubes in sweet & mildly spiced creamy tomato butter sauce.", price: 359, tags: ["veg", "bestseller"], prep: 15 },
    { category: "North Indian Veg Gravies", name: "Mix Veg Kolhapuri", description: "Garden vegetables simmered in spicy Kolhapuri red chili gravy.", price: 319, tags: ["veg", "spicy"], prep: 15 },
    { category: "North Indian Veg Gravies", name: "Mushroom Kadhai Masala", description: "Fresh button mushrooms tossed with pounded spices & bell peppers.", price: 339, tags: ["veg"], prep: 15 },
    { category: "North Indian Veg Gravies", name: "Aloo Gobi Adraki", description: "Crispy potato & cauliflower florets tossed with fresh ginger juliennes.", price: 289, tags: ["veg"], prep: 14 },
    { category: "North Indian Veg Gravies", name: "Chana Masala Amritsari", description: "Peshawari chickpea curry cooked with tea leaf extract & dried pomegranate.", price: 279, tags: ["veg"], prep: 14 },

    // 7. North Indian Non-Veg Gravies
    { category: "North Indian Non-Veg Gravies", name: "Chicken Tikka Masala", description: "Charcoal roasted chicken tikka cooked in chunky spiced onion tomato gravy.", price: 429, tags: ["non_veg", "spicy"], prep: 18 },
    { category: "North Indian Non-Veg Gravies", name: "Mutton Rogan Josh", description: "Authentic Kashmiri lamb curry scented with ratanjot & fennel seeds.", price: 529, tags: ["non_veg", "bestseller"], prep: 22 },
    { category: "North Indian Non-Veg Gravies", name: "Kadhai Chicken", description: "Chicken on the bone tossed with fresh coriander, green chilies & capsicum.", price: 419, tags: ["non_veg"], prep: 20 },
    { category: "North Indian Non-Veg Gravies", name: "Chicken Rara Masala", description: "Chicken chunks simmered along with spiced chicken minced meat gravy.", price: 449, tags: ["non_veg", "chef_special"], prep: 20 },
    { category: "North Indian Non-Veg Gravies", name: "Handi Mutton Mughlai", description: "Slow-cooked mutton curry prepared in traditional clay handi.", price: 549, tags: ["non_veg"], prep: 24 },
    { category: "North Indian Non-Veg Gravies", name: "Fish Curry Malabari", description: "Tender fish fillets simmered in coconut milk, tamarind & mustard seed gravy.", price: 479, tags: ["non_veg"], prep: 18 },
    { category: "North Indian Non-Veg Gravies", name: "Egg Curry Masala", description: "Boiled fried eggs simmered in onion tomato gravy with garud spices.", price: 269, tags: ["non_veg"], prep: 14 },
    { category: "North Indian Non-Veg Gravies", name: "Butter Chicken Boneless", description: "100% boneless chicken tikka cooked in creamy tomato butter gravy.", price: 459, tags: ["non_veg", "bestseller"], prep: 18 },

    // 8. South Indian Specialties
    { category: "South Indian Specialties", name: "Ghee Roast Dosa", description: "Crispy golden crepe roasted in pure Desi ghee served with chutney & sambar.", price: 169, tags: ["veg", "bestseller"], prep: 10 },
    { category: "South Indian Specialties", name: "Paneer Butter Dosa", description: "Crispy dosa stuffed with spiced grated paneer & butter.", price: 199, tags: ["veg"], prep: 12 },
    { category: "South Indian Specialties", name: "Chettinad Chicken Curry", description: "Fiery Karaikudi style chicken curry flavored with black pepper & poppy seeds.", price: 429, tags: ["non_veg", "spicy"], prep: 18 },
    { category: "South Indian Specialties", name: "Andhra Chilli Chicken", description: "Crispy fried chicken tossed with fiery Guntur green chilies & curry leaves.", price: 389, tags: ["non_veg", "spicy"], prep: 15 },
    { category: "South Indian Specialties", name: "Malabar Parotta & Veg Kurma", description: "2 layered flaky Malabar parottas served with coconut vegetable kurma.", price: 249, tags: ["veg"], prep: 12 },
    { category: "South Indian Specialties", name: "Kerala Mutton Stew", description: "Tender mutton chunks simmered in delicate coconut milk stew with peppercorns.", price: 519, tags: ["non_veg", "chef_special"], prep: 20 },

    // 9. Indian Tandoori Breads
    { category: "Indian Tandoori Breads", name: "Butter Naan", description: "Soft leavened tandoori bread brushed with salted cream butter.", price: 79, tags: ["veg", "bestseller"], prep: 8 },
    { category: "Indian Tandoori Breads", name: "Garlic Naan", description: "Fluffy tandoori naan topped with finely minced garlic & fresh coriander.", price: 99, tags: ["veg", "bestseller"], prep: 8, images: ["/images/dishes/garlic_naan.png"] },
    { category: "Indian Tandoori Breads", name: "Cheese Garlic Naan", description: "Stuffed with melted mozzarella & topped with roasted garlic flakes.", price: 129, tags: ["veg", "chef_special"], prep: 10 },
    { category: "Indian Tandoori Breads", name: "Tandoori Roti Plain", description: "Unleavened whole wheat flatbread baked in clay oven.", price: 49, tags: ["veg"], prep: 6 },
    { category: "Indian Tandoori Breads", name: "Butter Tandoori Roti", description: "Whole wheat tandoori roti brushed with Desi ghee.", price: 59, tags: ["veg"], prep: 6 },
    { category: "Indian Tandoori Breads", name: "Lachha Paratha", description: "Multi-layered flaky wheat bread brushed with butter.", price: 99, tags: ["veg"], prep: 10 },
    { category: "Indian Tandoori Breads", name: "Missi Roti", description: "Gram flour dough tempered with carom seeds, onions & green chili.", price: 59, tags: ["veg"], prep: 8 },
    { category: "Indian Tandoori Breads", name: "Amritsari Stuffed Paneer Kulcha", description: "Crispy kulcha stuffed with spiced cottage cheese & potatoes.", price: 139, tags: ["veg", "bestseller"], prep: 12 },
    { category: "Indian Tandoori Breads", name: "Pudina Paratha", description: "Multi-layered whole wheat bread sprinkled with dried mint powder.", price: 89, tags: ["veg"], prep: 8 },

    // 10. Royal Biryanis & Rice
    { category: "Royal Biryanis & Rice", name: "Hyderabadi Dum Chicken Biryani", description: "Long grain basmati rice layered with marinated chicken & fried onions.", price: 399, tags: ["non_veg", "bestseller"], prep: 20 },
    { category: "Royal Biryanis & Rice", name: "Awadhi Mutton Biryani", description: "Succulent mutton cooked dum style with saffron scented basmati rice.", price: 479, tags: ["non_veg", "chef_special"], prep: 22, images: ["/images/dishes/mutton_biryani.png"] },
    { category: "Royal Biryanis & Rice", name: "Royal Veg Dum Biryani", description: "Seasonal garden vegetables cooked with aromatic Biryani masala & rice.", price: 329, tags: ["veg"], prep: 18 },
    { category: "Royal Biryanis & Rice", name: "Paneer Tikka Dum Biryani", description: "Basmati rice layered with tandoori paneer tikka & fried onions.", price: 359, tags: ["veg"], prep: 18 },
    { category: "Royal Biryanis & Rice", name: "Egg Dum Biryani", description: "Basmati rice dum cooked with boiled spiced eggs & kewra water.", price: 299, tags: ["non_veg"], prep: 16 },
    { category: "Royal Biryanis & Rice", name: "Jeera Rice", description: "Fragrant basmati rice tempered with cumin seeds & Desi ghee.", price: 199, tags: ["veg"], prep: 10 },
    { category: "Royal Biryanis & Rice", name: "Steamed Basmati Rice", description: "Fluffy steamed long grain basmati rice.", price: 149, tags: ["veg"], prep: 8 },
    { category: "Royal Biryanis & Rice", name: "Kashmiri Peas Pulao", description: "Basmati rice cooked with green peas, saffron & fried cashews.", price: 229, tags: ["veg"], prep: 12 },

    // 11. Beverages & Lassi
    { category: "Beverages & Lassi", name: "Royal Mango Lassi", description: "Creamy yogurt drink blended with sweet Alphonso mango pulp.", price: 149, tags: ["veg", "bestseller"], prep: 5, images: ["/images/dishes/mango_lassi.png"] },
    { category: "Beverages & Lassi", name: "Sweet Punjabi Lassi", description: "Traditional thick curd drink sweetened & topped with malai.", price: 129, tags: ["veg"], prep: 5 },
    { category: "Beverages & Lassi", name: "Masala Chaas", description: "Chilled buttermilk spiced with roasted cumin, black salt & mint.", price: 99, tags: ["veg"], prep: 5 },
    { category: "Beverages & Lassi", name: "Fresh Lime Soda", description: "Refreshing fizzy soda with fresh lime juice & salt/sugar.", price: 119, tags: ["veg"], prep: 5 },
    { category: "Beverages & Lassi", name: "Masala Lemonade", description: "Tangy lemonade spiked with chat masala, cumin & mint leaves.", price: 129, tags: ["veg"], prep: 5 },
    { category: "Beverages & Lassi", name: "Mint Virgin Mojito", description: "Refreshing mocktail with crushed mint, lime wedges & sparkling soda.", price: 159, tags: ["veg"], prep: 5 },
    { category: "Beverages & Lassi", name: "Cold Coffee with Ice Cream", description: "Thick espresso blend topped with vanilla ice cream scoop.", price: 169, tags: ["veg"], prep: 5 },
    { category: "Beverages & Lassi", name: "Shahi Dry Fruit Lassi", description: "Thick sweet lassi topped with saffron strands & chopped almonds/pistachios.", price: 179, tags: ["veg", "chef_special"], prep: 5 },

    // 12. Desserts & Sweets
    { category: "Desserts & Sweets", name: "Gulab Jamun with Ice Cream", description: "Soft hot milk solids soaked in rose syrup served with vanilla ice cream.", price: 169, tags: ["veg", "bestseller"], prep: 5, images: ["/images/dishes/gulab_jamun.png"] },
    { category: "Desserts & Sweets", name: "Saffron Rasmalai (2 Pcs)", description: "Soft cottage cheese patties soaked in chilled saffron cardamom milk.", price: 179, tags: ["veg", "chef_special"], prep: 5 },
    { category: "Desserts & Sweets", name: "Warm Gajar Ka Halwa", description: "Rich carrot pudding cooked with milk, ghee, khoya & dry fruits.", price: 169, tags: ["veg"], prep: 8 },
    { category: "Desserts & Sweets", name: "Shahi Tukda Mughlai", description: "Crispy fried bread soaked in saffron rabri topped with pistachios.", price: 189, tags: ["veg"], prep: 8 },
    { category: "Desserts & Sweets", name: "Matka Kulfi Malai", description: "Traditional earthen pot Indian ice cream flavored with cardamom & saffron.", price: 149, tags: ["veg", "bestseller"], prep: 5 },
    { category: "Desserts & Sweets", name: "Sizzling Brownie with Ice Cream", description: "Warm chocolate brownie served on a hot iron plate with vanilla scoop & fudge.", price: 219, tags: ["veg"], prep: 8 },
  ];

  function getDishImage(item) {
    if (item.images && item.images.length > 0) {
      return item.images;
    }
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();
    
    if (category.includes("soup") || name.includes("shorba")) {
      return ["/images/dishes/tamatar_shorba.png"];
    }
    if (category.includes("veg starter") || name.includes("paneer tikka")) {
      return ["/images/dishes/paneer_tikka.png"];
    }
    if (category.includes("non-veg starter") || category.includes("grill") || name.includes("tikka")) {
      return ["/images/dishes/chicken_tikka.png"];
    }
    if (name.includes("butter chicken") || name.includes("murgh makhani")) {
      return ["/images/dishes/butter_chicken.png"];
    }
    if (category.includes("non-veg gravy") || name.includes("curry") || name.includes("rogan") || name.includes("mutton")) {
      return ["/images/dishes/mutton_curry.png"];
    }
    if (category.includes("veg gravy") || name.includes("dal") || name.includes("paneer")) {
      return ["/images/dishes/paneer_butter_masala.png"];
    }
    if (category.includes("south indian") || name.includes("dosa")) {
      return ["/images/dishes/masala_dosa.png"];
    }
    if (category.includes("bread") || name.includes("naan") || name.includes("roti") || name.includes("paratha")) {
      return ["/images/dishes/garlic_naan.png"];
    }
    if (category.includes("biryani") || name.includes("rice") || name.includes("pulao")) {
      if (name.includes("veg") || name.includes("peas")) {
        return ["/images/dishes/veg_biryani.png"];
      }
      return ["/images/dishes/mutton_biryani.png"];
    }
    if (category.includes("beverage") || name.includes("lassi") || name.includes("lime") || name.includes("mojito")) {
      return ["/images/dishes/mango_lassi.png"];
    }
    if (category.includes("dessert") || name.includes("jamun") || name.includes("halwa") || name.includes("kulfi")) {
      return ["/images/dishes/gulab_jamun.png"];
    }
    return ["/images/dishes/butter_chicken.png"];
  }

  const productIdMap = {};
  for (let idx = 0; idx < menuItems.length; idx++) {
    const item = menuItems[idx];
    const catId = catMap[item.category];
    if (catId) {
      const { data: prod, error: pErr } = await supabase
        .from("products")
        .insert({
          business_id: businessId,
          category_id: catId,
          name: item.name,
          description: item.description,
          base_price: item.price,
          food_tags: item.tags,
          prep_time_minutes: item.prep || 15,
          sort_order: idx + 1,
          state: "published",
          is_available: true,
          images: getDishImage(item),
        })
        .select("id, name, base_price")
        .single();

      if (pErr) console.error(`Error inserting product ${item.name}:`, pErr.message);
      else if (prod) productIdMap[item.name] = prod;
    }
  }

  // 6. Addon Groups & Addons
  console.log("Seeding add-on groups and options...");
  const butterChicken = productIdMap["Curry Courtyard Butter Chicken"];
  if (butterChicken) {
    const { data: grp } = await supabase.from("addon_groups").insert({
      business_id: businessId,
      product_id: butterChicken.id,
      name: "Extra Toppings & Portion",
      min_select: 0,
      max_select: 3,
      is_required: false,
      sort_order: 1,
    }).select("id").single();

    if (grp) {
      await supabase.from("addons").insert([
        { business_id: businessId, group_id: grp.id, name: "Extra Butter", price: 30, is_available: true, sort_order: 1 },
        { business_id: businessId, group_id: grp.id, name: "Extra Gravy", price: 50, is_available: true, sort_order: 2 },
        { business_id: businessId, group_id: grp.id, name: "Extra Chicken (100g)", price: 90, is_available: true, sort_order: 3 },
      ]);
    }
  }

  // 7. Customers
  console.log("Seeding realistic customers...");
  const customers = [
    { name: "Rahul Sharma", phone: "+91 98765 43210" },
    { name: "Ananya Rao", phone: "+91 98123 45678" },
    { name: "Karan Malhotra", phone: "+91 97654 32109" },
    { name: "Meera Iyer", phone: "+91 96543 21098" },
    { name: "Aditya Nair", phone: "+91 95432 10987" },
    { name: "Sneha Menon", phone: "+91 94321 09876" },
    { name: "Rohit Desai", phone: "+91 93210 98765" },
    { name: "Nikhil Joshi", phone: "+91 92109 87654" },
    { name: "Pooja Kulkarni", phone: "+91 91098 76543" },
    { name: "Arjun Kapoor", phone: "+91 90987 65432" },
  ];

  // 8. Orders Generation (Active Live Orders + Historical 14 days)
  console.log("Seeding 45 active & historical orders...");
  const now = new Date();

  const activeOrders = [
    {
      order_number: "ORD-1048",
      table: "T14",
      customer: "Rahul Sharma",
      status: "pending",
      payment_status: "pending",
      mins_ago: 4,
      channel: "qr",
      items: [
        { name: "Paneer Tikka Classic", qty: 2 },
        { name: "Garlic Naan", qty: 1 },
      ],
    },
    {
      order_number: "ORD-1047",
      table: "T03",
      customer: "Ananya Rao",
      status: "preparing",
      payment_status: "paid",
      mins_ago: 12,
      channel: "qr",
      items: [
        { name: "Hyderabadi Dum Chicken Biryani", qty: 2 },
        { name: "Garlic Naan", qty: 2 },
        { name: "Curry Courtyard Butter Chicken", qty: 1 },
        { name: "Royal Mango Lassi", qty: 2 },
      ],
    },
    {
      order_number: "ORD-1046",
      table: "T17",
      customer: "Karan Malhotra",
      status: "ready",
      payment_status: "paid",
      mins_ago: 24,
      channel: "qr",
      items: [
        { name: "Awadhi Mutton Biryani", qty: 1 },
        { name: "Butter Naan", qty: 2 },
        { name: "Dal Makhani", qty: 1 },
      ],
    },
    {
      order_number: "ORD-1045",
      table: "T19",
      customer: "Meera Iyer",
      status: "served",
      payment_status: "paid",
      mins_ago: 42,
      channel: "waiter",
      items: [
        { name: "Curry Courtyard Butter Chicken", qty: 2 },
        { name: "Garlic Naan", qty: 4 },
        { name: "Sweet Punjabi Lassi", qty: 2 },
      ],
    },
    {
      order_number: "ORD-1044",
      table: "T08",
      customer: "Aditya Nair",
      status: "preparing",
      payment_status: "paid",
      mins_ago: 15,
      channel: "waiter",
      items: [
        { name: "Tandoori Chicken (Half)", qty: 1 },
        { name: "Lachha Paratha", qty: 2 },
      ],
    },
    {
      order_number: "ORD-1043",
      table: "T05",
      customer: "Sneha Menon",
      status: "pending",
      payment_status: "pending",
      mins_ago: 6,
      channel: "qr",
      items: [
        { name: "Paneer Lababdar Special", qty: 1 },
        { name: "Butter Naan", qty: 3 },
      ],
    },
  ];

  for (const ord of activeOrders) {
    const tableId = tableIdMap[ord.table] || null;
    const createdAtTime = new Date(now.getTime() - ord.mins_ago * 60000).toISOString();

    let subtotal = 0;
    const itemsToInsert = [];

    for (const itm of ord.items) {
      const prod = productIdMap[itm.name];
      const price = prod ? prod.base_price : 350;
      const lineTotal = price * itm.qty;
      subtotal += lineTotal;

      itemsToInsert.push({
        product_id: prod ? prod.id : null,
        product_name: itm.name,
        unit_price: price,
        quantity: itm.qty,
        line_total: lineTotal,
        tax_rate: 18.0,
        tax_amount: Math.round(lineTotal * 0.18 * 100) / 100,
      });
    }

    const taxTotal = Math.round(subtotal * 0.18 * 100) / 100;
    const grandTotal = subtotal + taxTotal;

    const { data: savedOrd } = await supabase
      .from("orders")
      .upsert({
        business_id: businessId,
        branch_id: branchId,
        order_number: ord.order_number,
        table_id: tableId,
        table_label: ord.table,
        customer_name: ord.customer,
        customer_phone: "+91 98765 43210",
        status: ord.status,
        payment_status: ord.payment_status,
        channel: ord.channel,
        subtotal,
        tax_total: taxTotal,
        grand_total: grandTotal,
        created_at: createdAtTime,
        updated_at: createdAtTime,
      }, { onConflict: "business_id,order_number" })
      .select("id")
      .single();

    if (savedOrd) {
      for (const itemRow of itemsToInsert) {
        await supabase.from("order_items").insert({
          business_id: businessId,
          order_id: savedOrd.id,
          ...itemRow,
        });
      }

      if (ord.payment_status === "paid") {
        await supabase.from("payments").insert({
          business_id: businessId,
          order_id: savedOrd.id,
          amount: grandTotal,
          currency: "INR",
          method: "upi",
          status: "paid",
          provider: "razorpay",
          created_at: createdAtTime,
        });
      }
    }
  }

  // Generate 35 Historical Orders across 14 days
  console.log("Generating 35 historical orders...");
  for (let day = 1; day <= 14; day++) {
    const ordersPerDay = day % 7 === 5 || day % 7 === 6 ? 4 : 2;

    for (let i = 0; i < ordersPerDay; i++) {
      const orderNum = `ORD-H${1000 + day * 10 + i}`;
      const randomCust = customers[Math.floor(Math.random() * customers.length)];
      const randomTableLabel = `T0${(i % 6) + 1}`;
      const randomTableId = tableIdMap[randomTableLabel];

      const daysAgoMs = day * 86400000 + (i * 3600000 + 7200000);
      const orderDate = new Date(now.getTime() - daysAgoMs).toISOString();

      const subtotal = 1200 + (i * 400);
      const taxTotal = Math.round(subtotal * 0.18 * 100) / 100;
      const grandTotal = subtotal + taxTotal;

      const { data: histOrd } = await supabase
        .from("orders")
        .upsert({
          business_id: businessId,
          branch_id: branchId,
          order_number: orderNum,
          table_id: randomTableId,
          table_label: randomTableLabel,
          customer_name: randomCust.name,
          customer_phone: randomCust.phone,
          status: "completed",
          payment_status: "paid",
          channel: i % 2 === 0 ? "qr" : "waiter",
          subtotal,
          tax_total: taxTotal,
          grand_total: grandTotal,
          created_at: orderDate,
          updated_at: orderDate,
        }, { onConflict: "business_id,order_number" })
        .select("id")
        .single();

      if (histOrd) {
        await supabase.from("order_items").insert({
          business_id: businessId,
          order_id: histOrd.id,
          product_name: "Curry Courtyard Butter Chicken",
          unit_price: 469,
          quantity: 2,
          line_total: 938,
        });

        await supabase.from("payments").insert({
          business_id: businessId,
          order_id: histOrd.id,
          amount: grandTotal,
          currency: "INR",
          method: i % 2 === 0 ? "upi" : "card",
          status: "paid",
          provider: "razorpay",
          created_at: orderDate,
        });
      }
    }
  }

  console.log("\n✅ SUCCESS: 12 Categories & 80+ Gourmet Indian Dishes successfully seeded into Supabase!");
  console.log("==================================================================\n");
}

seedCurryCourtyard();
