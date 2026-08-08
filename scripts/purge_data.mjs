import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function purgeRemainingBusinesses() {
  console.log("🧹 Purging remaining business data...");
  try {
    const { error: err1 } = await adminSupabase.from("business_settings").delete().neq("business_id", "00000000-0000-0000-0000-000000000000");
    if (err1) console.log("business_settings:", err1.message);
  } catch (e) {}

  try {
    const { error: err2 } = await adminSupabase.from("businesses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (err2) console.log("businesses:", err2.message);
  } catch (e) {}
}

purgeRemainingBusinesses();
