import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function debugUserRLS() {
  const email = "info@kapilariverfront.com";
  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const u = usersData?.users?.find(x => x.email === email);

  console.log("User ID:", u?.id);

  const { data: curryBiz } = await adminSupabase.from("businesses").select("*").eq("name", "The Curry Courtyard").single();
  console.log("The Curry Courtyard Biz:", curryBiz);

  const { data: mems } = await adminSupabase.from("memberships").select("*").eq("user_id", u.id);
  console.log("User Memberships:", mems);

  const { data: tables } = await adminSupabase.from("restaurant_tables").select("*").eq("business_id", curryBiz.id);
  console.log(`Service Role query tables for Curry Courtyard: ${tables.length} tables found.`);

  const { data: prods } = await adminSupabase.from("products").select("*").eq("business_id", curryBiz.id);
  console.log(`Service Role query products for Curry Courtyard: ${prods.length} products found.`);

  const { data: ords } = await adminSupabase.from("orders").select("*").eq("business_id", curryBiz.id);
  console.log(`Service Role query orders for Curry Courtyard: ${ords.length} orders found.`);
}

debugUserRLS();
