import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupProductionOwnerAccount() {
  const email = "info@kapilariverfront.com";
  const password = "Harshi0812_";

  console.log(`Checking account for ${email}...`);

  // Create user in auth if not existing
  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const existingUser = usersData?.users?.find((u) => u.email === email);

  let userId = existingUser?.id;

  if (!existingUser) {
    console.log("Creating user account in Supabase Auth...");
    const { data: newUser, error: createErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Kapila Riverfront Bistro Admin" },
    });
    if (createErr) {
      console.error("Create user error:", createErr.message);
      return;
    }
    userId = newUser.user.id;
    console.log(`✅ Auth user created: ${userId}`);
  } else {
    console.log(`User already exists: ${userId}. Resetting password...`);
    await adminSupabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }

  // Create Profile
  await adminSupabase.from("profiles").upsert({
    id: userId,
    display_name: "Kapila Riverfront Admin",
    phone: "+919876543210",
  });

  // Create Business: Kapila Riverfront Bistro
  const { data: existingBiz } = await adminSupabase.from("businesses").select("*").eq("name", "Kapila Riverfront Bistro").maybeSingle();
  let bizId = existingBiz?.id;

  if (!existingBiz) {
    console.log("Creating business record...");
    const { data: newBiz, error: bizErr } = await adminSupabase
      .from("businesses")
      .insert({
        name: "Kapila Riverfront Bistro",
        slug: "kapila-riverfront-bistro",
        business_type: "restaurant",
        currency: "INR",
        created_by: userId,
      })
      .select("id")
      .single();
    if (bizErr) console.error("Biz error:", bizErr.message);
    else bizId = newBiz.id;
  }

  if (bizId) {
    // Create business settings
    await adminSupabase.from("business_settings").upsert({
      business_id: bizId,
      legal_name: "Kapila Riverfront Bistro Pvt Ltd",
      tax_mode: "exclusive",
      default_tax_rate: 5.00,
      cash_payment_enabled: true,
      online_payment_enabled: true,
    });

    // Create Main Branch
    const { data: existingBranch } = await adminSupabase.from("branches").select("*").eq("business_id", bizId).maybeSingle();
    let branchId = existingBranch?.id;

    if (!existingBranch) {
      const { data: newBranch } = await adminSupabase
        .from("branches")
        .insert({
          business_id: bizId,
          name: "Main Riverfront Branch",
          city: "Bengaluru",
        })
        .select("id")
        .single();
      branchId = newBranch?.id;
    }

    // Create Membership as Owner
    await adminSupabase.from("memberships").upsert({
      business_id: bizId,
      user_id: userId,
      branch_id: branchId,
      role: "owner",
      is_active: true,
    });

    console.log("✅ Business, Branch, and Owner Membership linked successfully!");
  }
}

setupProductionOwnerAccount();
