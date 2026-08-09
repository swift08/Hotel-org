import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setPrimaryBusiness() {
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const u = usersData?.users?.find((x) => x.email === "info@kapilariverfront.com");

  if (u) {
    const { data: curryBiz } = await supabase
      .from("businesses")
      .select("id")
      .eq("name", "The Curry Courtyard")
      .single();

    if (curryBiz) {
      // Deactivate other memberships for this demo user so The Curry Courtyard is 100% active primary
      await supabase.from("memberships").update({ is_active: false }).eq("user_id", u.id);
      await supabase
        .from("memberships")
        .update({ is_active: true })
        .eq("user_id", u.id)
        .eq("business_id", curryBiz.id);

      console.log(
        `✅ Set 'The Curry Courtyard' (${curryBiz.id}) as primary active membership for ${u.email}!`,
      );
    }
  }
}

setPrimaryBusiness();
