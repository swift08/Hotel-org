import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seedDemoDataForAllBusinesses() {
  console.log("🌱 Seeding rich demo data into ALL businesses for info@kapilariverfront.com...");

  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const u = usersData?.users?.find(x => x.email === "info@kapilariverfront.com");

  if (!u) {
    console.error("User info@kapilariverfront.com not found!");
    return;
  }

  const { data: memberships } = await adminSupabase
    .from("memberships")
    .select("business_id, branch_id")
    .eq("user_id", u.id);

  console.log(`Found ${memberships.length} memberships for user.`);

  for (const m of memberships) {
    const businessId = m.business_id;
    console.log(`\n========================================`);
    console.log(`Seeding business ID: ${businessId}`);
    console.log(`========================================`);

    // Ensure branch
    let branchId = m.branch_id;
    if (!branchId) {
      const { data: bList } = await adminSupabase.from("branches").select("id").eq("business_id", businessId);
      if (bList && bList.length > 0) {
        branchId = bList[0].id;
      } else {
        const { data: newB } = await adminSupabase
          .from("branches")
          .insert({ business_id: businessId, name: "Main Riverfront Branch", city: "Bengaluru" })
          .select("id")
          .single();
        branchId = newB.id;
      }

      // Update membership branch_id
      await adminSupabase.from("memberships").update({ branch_id: branchId }).eq("business_id", businessId).eq("user_id", u.id);
    }

    // Business settings
    await adminSupabase.from("business_settings").upsert({
      business_id: businessId,
      legal_name: "Kapila Riverfront Bistro & Resort Pvt Ltd",
      tax_mode: "exclusive",
      default_tax_rate: 5.00,
      cash_payment_enabled: true,
      online_payment_enabled: true,
    });

    // 10 Restaurant Tables
    console.log("Seeding tables...");
    const tableData = [
      { label: "Table 01", seats: 2, state: "occupied", qr_key: `t01_${businessId.slice(0, 5)}`, display_order: 1 },
      { label: "Table 02", seats: 4, state: "occupied", qr_key: `t02_${businessId.slice(0, 5)}`, display_order: 2 },
      { label: "Table 03", seats: 2, state: "available", qr_key: `t03_${businessId.slice(0, 5)}`, display_order: 3 },
      { label: "Table 04", seats: 6, state: "payment_pending", qr_key: `t04_${businessId.slice(0, 5)}`, display_order: 4 },
      { label: "Table 05", seats: 4, state: "available", qr_key: `t05_${businessId.slice(0, 5)}`, display_order: 5 },
      { label: "Table 06", seats: 2, state: "available", qr_key: `t06_${businessId.slice(0, 5)}`, display_order: 6 },
      { label: "Table 07", seats: 8, state: "occupied", qr_key: `t07_${businessId.slice(0, 5)}`, display_order: 7 },
      { label: "Table 08", seats: 4, state: "available", qr_key: `t08_${businessId.slice(0, 5)}`, display_order: 8 },
      { label: "Table 09", seats: 2, state: "available", qr_key: `t09_${businessId.slice(0, 5)}`, display_order: 9 },
      { label: "Table 10", seats: 6, state: "available", qr_key: `t10_${businessId.slice(0, 5)}`, display_order: 10 },
    ];

    for (const t of tableData) {
      await adminSupabase.from("restaurant_tables").upsert(
        {
          business_id: businessId,
          branch_id: branchId,
          label: t.label,
          seats: t.seats,
          state: t.state,
          qr_slug: t.qr_key,
          display_order: t.display_order,
        },
        { onConflict: "business_id,label" }
      );
    }

    // Categories
    console.log("Seeding categories...");
    const categoriesData = [
      { name: "Starters & Appetizers", display_order: 1 },
      { name: "Chef's Special Mains", display_order: 2 },
      { name: "Artisan Naan & Rice", display_order: 3 },
      { name: "Craft Cocktails & Shakes", display_order: 4 },
      { name: "Gourmet Desserts", display_order: 5 },
    ];

    const catMap = {};
    for (const c of categoriesData) {
      const { data: cat } = await adminSupabase
        .from("menu_categories")
        .upsert(
          { business_id: businessId, name: c.name, display_order: c.display_order, is_active: true },
          { onConflict: "business_id,name" }
        )
        .select("id, name")
        .single();
      if (cat) catMap[c.name] = cat.id;
    }

    // Products
    console.log("Seeding products...");
    const productsData = [
      {
        category: "Starters & Appetizers",
        name: "Paneer Tikka Angara",
        description: "Fiery red chili yoghurt marinated cottage cheese charred in tandoor.",
        base_price: 340,
        tags: ["Veg", "Spicy", "Bestseller"],
        is_available: true,
      },
      {
        category: "Starters & Appetizers",
        name: "Tandoori Stuffed Mushrooms",
        description: "Button mushrooms stuffed with spiced cheese & chargrilled.",
        base_price: 320,
        tags: ["Veg", "Chef Special"],
        is_available: true,
      },
      {
        category: "Chef's Special Mains",
        name: "Butter Chicken Royale",
        description: "Tender tandoori chicken simmered in rich makhani gravy with butter & cream.",
        base_price: 460,
        tags: ["Non-Veg", "Bestseller"],
        is_available: true,
      },
      {
        category: "Chef's Special Mains",
        name: "Dal Makhani Special",
        description: "Slow-cooked black lentils simmered overnight with butter & aromatic spices.",
        base_price: 380,
        tags: ["Veg", "Popular"],
        is_available: true,
      },
      {
        category: "Chef's Special Mains",
        name: "Malai Prawn Curry",
        description: "Jumbo prawns cooked in aromatic coconut cream & mild Bengali spices.",
        base_price: 540,
        tags: ["Non-Veg", "Chef Special"],
        is_available: true,
      },
      {
        category: "Artisan Naan & Rice",
        name: "Truffle Garlic Naan",
        description: "Tandoori naan brushed with truffle oil and minced garlic.",
        base_price: 110,
        tags: ["Veg"],
        is_available: true,
      },
      {
        category: "Artisan Naan & Rice",
        name: "Hyderabadi Dum Biryani",
        description: "Fragrant basmati rice layered with spiced marinated chicken and saffron.",
        base_price: 420,
        tags: ["Non-Veg", "Popular"],
        is_available: true,
      },
      {
        category: "Craft Cocktails & Shakes",
        name: "Mango Passionfruit Cooler",
        description: "Fresh Alphonso mango pulp blended with passionfruit syrup & sparkling soda.",
        base_price: 180,
        tags: ["Veg"],
        is_available: true,
      },
      {
        category: "Gourmet Desserts",
        name: "Chocolate Lava Cake with Gelato",
        description: "Molten chocolate cake served with vanilla gelato.",
        base_price: 240,
        tags: ["Veg", "Bestseller"],
        is_available: true,
      },
    ];

    for (const p of productsData) {
      const catId = catMap[p.category];
      if (catId) {
        await adminSupabase.from("products").upsert(
          {
            business_id: businessId,
            category_id: catId,
            name: p.name,
            description: p.description,
            base_price: p.base_price,
            tags: p.tags,
            is_available: p.is_available,
          },
          { onConflict: "business_id,name" }
        );
      }
    }

    // Orders
    console.log("Seeding live active orders...");
    const ordersData = [
      {
        order_number: `ORD-101_${businessId.slice(0, 4)}`,
        table_label: "Table 04",
        customer_name: "Rahul Sharma",
        status: "preparing",
        payment_status: "unpaid",
        channel: "dine_in",
        subtotal: 800,
        tax_amount: 40,
        grand_total: 840,
      },
      {
        order_number: `ORD-102_${businessId.slice(0, 4)}`,
        table_label: "Table 02",
        customer_name: "Priya Patel",
        status: "pending",
        payment_status: "unpaid",
        channel: "dine_in",
        subtotal: 920,
        tax_amount: 46,
        grand_total: 966,
      },
      {
        order_number: `ORD-103_${businessId.slice(0, 4)}`,
        table_label: "Table 07",
        customer_name: "Vikram Malhotra",
        status: "ready",
        payment_status: "unpaid",
        channel: "dine_in",
        subtotal: 1360,
        tax_amount: 68,
        grand_total: 1428,
      },
      {
        order_number: `ORD-104_${businessId.slice(0, 4)}`,
        table_label: "Counter 01",
        customer_name: "Ananya Iyer",
        status: "served",
        payment_status: "paid",
        channel: "counter",
        subtotal: 720,
        tax_amount: 36,
        grand_total: 756,
      },
      {
        order_number: `ORD-105_${businessId.slice(0, 4)}`,
        table_label: "Table 01",
        customer_name: "Siddharth Rao",
        status: "completed",
        payment_status: "paid",
        channel: "dine_in",
        subtotal: 480,
        tax_amount: 24,
        grand_total: 504,
      },
    ];

    for (const o of ordersData) {
      const { data: existingOrd } = await adminSupabase
        .from("orders")
        .select("id")
        .eq("business_id", businessId)
        .eq("order_number", o.order_number)
        .maybeSingle();

      let orderId = existingOrd?.id;

      if (!existingOrd) {
        const { data: newOrder } = await adminSupabase
          .from("orders")
          .insert({
            business_id: businessId,
            branch_id: branchId,
            order_number: o.order_number,
            table_label: o.table_label,
            customer_name: o.customer_name,
            status: o.status,
            payment_status: o.payment_status,
            channel: o.channel,
            subtotal: o.subtotal,
            tax_amount: o.tax_amount,
            grand_total: o.grand_total,
          })
          .select("id")
          .single();
        orderId = newOrder?.id;
      }

      if (orderId) {
        await adminSupabase.from("order_items").upsert({
          order_id: orderId,
          item_name: o.table_label === "Table 04" ? "Paneer Tikka Angara" : "Butter Chicken Royale",
          quantity: 2,
          unit_price: 400,
          total_price: 800,
        });
      }
    }
  }

  console.log("\n✅ Demo data seeded successfully for all user businesses!");
}

seedDemoDataForAllBusinesses();
