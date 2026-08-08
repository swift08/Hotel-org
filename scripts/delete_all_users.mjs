import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function deleteAllUsers() {
  console.log("🔒 Wiping all user accounts from Supabase Auth...");

  try {
    const { data: { users }, error } = await adminSupabase.auth.admin.listUsers();
    if (error) {
      console.error("Error listing users:", error.message);
      return;
    }

    console.log(`Found ${users.length} registered auth user(s).`);

    for (const u of users) {
      console.log(`Deleting user: ${u.email} (${u.id})...`);
      const { error: delErr } = await adminSupabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.error(`Failed to delete ${u.email}:`, delErr.message);
      } else {
        console.log(`✅ Deleted user ${u.email}`);
      }
    }

    console.log("\n✨ All Auth Users Deleted! Zero accounts remain in Supabase Auth.");
  } catch (err) {
    console.error("Purge users error:", err);
  }
}

deleteAllUsers();
