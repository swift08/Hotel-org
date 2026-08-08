import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testInsert() {
  const { data: curryBiz } = await supabase.from("businesses").select("*").eq("name", "The Curry Courtyard").single();
  const { data: branch } = await supabase.from("branches").select("*").eq("business_id", curryBiz.id).single();

  console.log("Business ID:", curryBiz.id);
  console.log("Branch ID:", branch.id);

  const { data, error } = await supabase.from("restaurant_tables").insert({
    business_id: curryBiz.id,
    branch_id: branch.id,
    label: "T01",
    seats: 2,
    state: "available",
    qr_slug: "the-curry-courtyard-t01"
  }).select();

  console.log("Insert Table T01 Result:", data, "Error:", error);
}

testInsert();
