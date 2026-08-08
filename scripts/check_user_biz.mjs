import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUserBiz() {
  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const u = usersData?.users?.find(x => x.email === "info@kapilariverfront.com");
  console.log("User ID:", u?.id);

  if (u) {
    const { data: memberships } = await adminSupabase.from("memberships").select("*, businesses(*)").eq("user_id", u.id);
    console.log("Memberships:", JSON.stringify(memberships, null, 2));

    const { data: allBiz } = await adminSupabase.from("businesses").select("*");
    console.log("All Businesses:", JSON.stringify(allBiz, null, 2));
  }
}

checkUserBiz();
