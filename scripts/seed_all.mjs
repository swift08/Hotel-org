import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seedAll() {
  console.log("==================================================================");
  console.log("🍛 COMPREHENSIVE DUMMY DATA SEEDING FOR ALL BUSINESSES");
  console.log("==================================================================");

  // 1. Get all Auth Users
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const allUsers = usersData?.users || [];
  console.log(`Found ${allUsers.length} total Auth users.`);

  for (const user of allUsers) {
    await supabase.from("profiles").upsert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      phone: "+91 80 4567 8901",
    });
  }

  // 2. Get all Businesses
  let { data: businesses } = await supabase.from("businesses").select("*");
  if (!businesses || businesses.length === 0) {
    console.log("No businesses found, creating default 'The Curry Courtyard'...");
    const { data: newBiz } = await supabase
      .from("businesses")
      .insert({
        name: "The Curry Courtyard",
        slug: "the-curry-courtyard",
        business_type: "restaurant",
        currency: "INR",
        timezone: "Asia/Kolkata",
        is_active: true,
      })
      .select("*")
      .single();
    businesses = [newBiz];
  }

  for (const biz of businesses) {
    const businessId = biz.id;
    console.log(`\n--------------------------------------------------`);
    console.log(`Seeding business: "${biz.name}" (${businessId})`);
    console.log(`--------------------------------------------------`);

    // Ensure Branch
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
          name: "Main Flagship Branch",
          code: "MAIN-01",
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

    // Ensure Memberships for all users
    for (const user of allUsers) {
      const { data: existingMem } = await supabase
        .from("memberships")
        .select("id")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingMem) {
        await supabase.from("memberships").insert({
          business_id: businessId,
          user_id: user.id,
          branch_id: branchId,
          role: "owner",
          is_active: true,
        });
      } else {
        await supabase.from("memberships").update({ is_active: true, branch_id: branchId }).eq("id", existingMem.id);
      }
    }

    // Business Settings
    await supabase.from("business_settings").upsert({
      business_id: businessId,
      legal_name: biz.name + " Pvt Ltd",
      tax_mode: "exclusive",
      default_tax_rate: 5.00,
      cash_payment_enabled: true,
      online_payment_enabled: true,
    });

    // Clean old records for clean seed
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
      const qrSlug = `${biz.slug || 'tbl'}-${t.label.toLowerCase()}`;
      const { data: tbl, error: tErr } = await supabase
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

      if (tErr) console.error("Table insert error:", tErr.message);
      if (tbl) tableIdMap[t.label] = tbl.id;
    }

    // 4. Menu Categories
    console.log("Seeding menu categories...");
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
      const { data: cat, error: cErr } = await supabase
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

      if (cErr) console.error("Category insert error:", cErr.message);
      if (cat) catMap[c.name] = cat.id;
    }

    // 5. Gourmet Menu Items
    console.log("Seeding gourmet menu items...");
    const menuItems = [
      { category: "Soups & Shorbas", name: "Tamatar Dhaniya Shorba", description: "Infused ripe tomato broth spiced with fresh coriander roots & cumin.", price: 189, tags: ["veg"], prep: 10 },
      { category: "Soups & Shorbas", name: "Murgh Jahangiri Shorba", description: "Slow-simmered aromatic chicken bone broth with black pepper & ghee.", price: 229, tags: ["non_veg", "bestseller"], prep: 12 },
      { category: "Vegetarian Starters", name: "Paneer Tikka Classic", description: "Fresh cottage cheese marinated in spiced hung yogurt & charred in clay oven.", price: 329, tags: ["veg", "bestseller"], prep: 15 },
      { category: "Vegetarian Starters", name: "Dahi Ke Kebab", description: "Crispy fried hung curd patties spiced with green chilies & fresh coriander.", price: 299, tags: ["veg", "chef_special"], prep: 14 },
      { category: "Non-Vegetarian Starters", name: "Chicken Seekh Kebab", description: "Minced chicken blended with royal spices & roasted on iron skewers.", price: 389, tags: ["non_veg", "bestseller"], prep: 18 },
      { category: "Non-Vegetarian Starters", name: "Amritsari Fish Fry", description: "Carom-seeded crispy batter fried fish fillets served with mint chutney.", price: 429, tags: ["non_veg", "spicy"], prep: 15 },
      { category: "Tandoori Grills & Kebabs", name: "Tandoori Chicken (Half)", description: "Bone-in chicken marinated overnight in Kashmiri chili, yogurt & mustard oil.", price: 449, tags: ["non_veg", "bestseller"], prep: 22 },
      { category: "Tandoori Grills & Kebabs", name: "Malai Chicken Tikka", description: "Boneless chicken chunks marinated in cream, mozzarella cheese & cardamom.", price: 429, tags: ["non_veg"], prep: 18 },
      { category: "Chef's Signature Specials", name: "Butter Chicken Royale", description: "Slow-cooked tandoori chicken simmered in silky velvet tomato & butter gravy.", price: 469, tags: ["non_veg", "bestseller"], prep: 18 },
      { category: "Chef's Signature Specials", name: "Royal Mutton Nalli Nihari", description: "Slow-cooked lamb shanks in rich spicy stew topped with fried ginger & mint.", price: 599, tags: ["non_veg", "chef_special"], prep: 25 },
      { category: "Chef's Signature Specials", name: "Paneer Lababdar Special", description: "Cottage cheese in rich onion tomato cashew gravy topped with grated paneer.", price: 389, tags: ["veg", "bestseller"], prep: 16 },
      { category: "Chef's Signature Specials", name: "Dal Makhani Special", description: "Black lentils slow-simmered 24 hours over wood charcoal with ghee.", price: 329, tags: ["veg", "bestseller"], prep: 15 },
      { category: "North Indian Veg Gravies", name: "Kadai Paneer", description: "Paneer cubes tossed with diced bell peppers & crushed coriander pepper masala.", price: 349, tags: ["veg", "spicy"], prep: 15 },
      { category: "North Indian Veg Gravies", name: "Palak Paneer", description: "Creamy spinach puree tempered with roasted garlic & paneer cubes.", price: 339, tags: ["veg"], prep: 14 },
      { category: "North Indian Non-Veg Gravies", name: "Chicken Tikka Masala", description: "Charcoal roasted chicken tikka cooked in chunky spiced onion tomato gravy.", price: 429, tags: ["non_veg", "spicy"], prep: 18 },
      { category: "North Indian Non-Veg Gravies", name: "Mutton Rogan Josh", description: "Authentic Kashmiri lamb curry scented with ratanjot & fennel seeds.", price: 529, tags: ["non_veg", "bestseller"], prep: 22 },
      { category: "South Indian Specialties", name: "Ghee Roast Dosa", description: "Crispy golden crepe roasted in pure Desi ghee served with chutney & sambar.", price: 169, tags: ["veg", "bestseller"], prep: 10 },
      { category: "Indian Tandoori Breads", name: "Butter Naan", description: "Soft leavened tandoori bread brushed with salted cream butter.", price: 79, tags: ["veg", "bestseller"], prep: 8 },
      { category: "Indian Tandoori Breads", name: "Truffle Garlic Naan", description: "Fluffy tandoori naan topped with finely minced garlic & fresh coriander.", price: 99, tags: ["veg", "bestseller"], prep: 8 },
      { category: "Royal Biryanis & Rice", name: "Hyderabadi Dum Chicken Biryani", description: "Long grain basmati rice layered with marinated chicken & fried onions.", price: 399, tags: ["non_veg", "bestseller"], prep: 20 },
      { category: "Royal Biryanis & Rice", name: "Awadhi Mutton Biryani", description: "Succulent mutton cooked dum style with saffron scented basmati rice.", price: 479, tags: ["non_veg", "chef_special"], prep: 22 },
      { category: "Beverages & Lassi", name: "Royal Mango Lassi", description: "Creamy yogurt drink blended with sweet Alphonso mango pulp.", price: 149, tags: ["veg", "bestseller"], prep: 5 },
      { category: "Desserts & Sweets", name: "Gulab Jamun with Ice Cream", description: "Soft hot milk solids soaked in rose syrup served with vanilla ice cream.", price: 169, tags: ["veg", "bestseller"], prep: 5 },
      { category: "Desserts & Sweets", name: "Chocolate Lava Cake", description: "Molten chocolate cake served with vanilla gelato.", price: 240, tags: ["veg", "bestseller"], prep: 8 },
    ];

    const productIdMap = {};
    for (let idx = 0; idx < menuItems.length; idx++) {
      const item = menuItems[idx];
      const catId = catMap[item.category];
      if (catId) {
        const { data: prod } = await supabase
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
          })
          .select("id, name, base_price")
          .single();

        if (prod) productIdMap[item.name] = prod;
      }
    }

    // 6. Addon Groups
    const bChicken = productIdMap["Butter Chicken Royale"];
    if (bChicken) {
      const { data: grp } = await supabase.from("addon_groups").insert({
        business_id: businessId,
        product_id: bChicken.id,
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
    const customers = [
      { name: "Rahul Sharma", phone: "+91 98765 43210" },
      { name: "Ananya Rao", phone: "+91 98123 45678" },
      { name: "Karan Malhotra", phone: "+91 97654 32109" },
      { name: "Meera Iyer", phone: "+91 96543 21098" },
      { name: "Aditya Nair", phone: "+91 95432 10987" },
    ];

    // 8. Orders (Active & Historical)
    console.log("Seeding live active and past orders...");
    const now = new Date();

    const activeOrders = [
      { order_number: "ORD-101", table: "T04", customer: "Rahul Sharma", status: "preparing", payment: "unpaid", channel: "dine_in" },
      { order_number: "ORD-102", table: "T02", customer: "Ananya Rao", status: "pending", payment: "unpaid", channel: "dine_in" },
      { order_number: "ORD-103", table: "T07", customer: "Karan Malhotra", status: "ready", payment: "unpaid", channel: "dine_in" },
      { order_number: "ORD-104", table: "T10", customer: "Meera Iyer", status: "served", payment: "paid", channel: "dine_in" },
      { order_number: "ORD-105", table: "T01", customer: "Aditya Nair", status: "completed", payment: "paid", channel: "dine_in" },
    ];

    for (const ao of activeOrders) {
      const tableId = tableIdMap[ao.table];
      const { data: ord } = await supabase.from("orders").insert({
        business_id: businessId,
        branch_id: branchId,
        order_number: `${ao.order_number}-${biz.name.slice(0,3).toUpperCase()}`,
        table_id: tableId,
        table_label: ao.table,
        customer_name: ao.customer,
        status: ao.status,
        payment_status: ao.payment,
        channel: ao.channel,
        subtotal: 850,
        tax_total: 42.5,
        grand_total: 892.5,
      }).select("id").single();

      if (ord) {
        await supabase.from("order_items").insert({
          business_id: businessId,
          order_id: ord.id,
          product_name: "Butter Chicken Royale",
          unit_price: 469,
          quantity: 2,
          line_total: 938,
        });

        if (ao.payment === "paid") {
          await supabase.from("payments").insert({
            business_id: businessId,
            order_id: ord.id,
            amount: 892.5,
            currency: "INR",
            method: "upi",
            status: "paid",
            provider: "razorpay",
          });
        }
      }
    }

    // Historical orders (past 5 days)
    for (let day = 1; day <= 5; day++) {
      for (let i = 1; i <= 4; i++) {
        const orderNum = `HIST-${day}${i}-${biz.name.slice(0,3).toUpperCase()}`;
        const randomCust = customers[(day + i) % customers.length];
        const tableLabel = `T0${(i % 8) + 1}`;
        const tableId = tableIdMap[tableLabel];
        const orderDate = new Date(now.getTime() - (day * 86400000 + i * 3600000)).toISOString();

        const subtotal = 950 + i * 150;
        const taxTotal = Math.round(subtotal * 0.05 * 100) / 100;
        const grandTotal = subtotal + taxTotal;

        const { data: histOrd } = await supabase.from("orders").insert({
          business_id: businessId,
          branch_id: branchId,
          order_number: orderNum,
          table_id: tableId,
          table_label: tableLabel,
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
        }).select("id").single();

        if (histOrd) {
          await supabase.from("order_items").insert({
            business_id: businessId,
            order_id: histOrd.id,
            product_name: "Hyderabadi Dum Chicken Biryani",
            unit_price: 399,
            quantity: 2,
            line_total: 798,
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
    console.log(`✅ Business "${biz.name}" seeded successfully!`);
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL BUSINESSES SEEDED WITH FULL TEST DATA SUCCESSFULLY!");
  console.log("==================================================================");
}

seedAll();
