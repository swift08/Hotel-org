import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixPermissions() {
  console.log("==================================================================");
  console.log("🛠️ SEEDING KDS & ORDER PERMISSIONS FOR KITCHEN & BAR STAFF");
  console.log("==================================================================");

  // 1. Get all businesses
  const { data: businesses, error: bizErr } = await supabase.from("businesses").select("id, name");
  if (bizErr) {
    console.error("Error fetching businesses:", bizErr);
    process.exit(1);
  }

  console.log(`Found ${businesses.length} businesses.`);

  const rolesToUpdate = [
    "kitchen_staff",
    "bar_staff",
    "chef",
    "waiter",
    "floor_manager",
    "branch_manager",
    "general_manager",
  ];
  const permissionsToAdd = ["orders.view", "orders.view_all", "kds.view", "kds.manage"];

  // 2. Seed role_default_permissions
  for (const role of rolesToUpdate) {
    for (const perm of permissionsToAdd) {
      const { error } = await supabase.from("role_default_permissions").upsert(
        {
          role,
          permission_key: perm,
        },
        { onConflict: "role,permission_key" },
      );
      if (error) console.log(`Warning role_default_permissions (${role}, ${perm}):`, error.message);
    }
  }

  // 3. Seed role_permissions for each business
  for (const biz of businesses) {
    console.log(`Updating permissions for business: ${biz.name} (${biz.id})...`);
    for (const role of rolesToUpdate) {
      for (const perm of permissionsToAdd) {
        const { error } = await supabase.from("role_permissions").upsert(
          {
            business_id: biz.id,
            role,
            permission_key: perm,
            allowed: true,
          },
          { onConflict: "business_id,role,permission_key" },
        );
        if (error)
          console.log(`Warning role_permissions (${biz.name}, ${role}, ${perm}):`, error.message);
      }
    }
  }

  console.log("✅ Successfully seeded orders.view and kds.view permissions for all staff roles!");
}

fixPermissions();
