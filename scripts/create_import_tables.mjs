import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pzyiffaaeqrpbzwymbmv.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6eWlmZmFhZXFycGJ6d3ltYm12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjE3NTQ4MywiZXhwIjoyMTAxNzUxNDgzfQ.5IfPZ7fgMbOgeIsT2X-mBr7OZvIYrzhceuSKzqYbr8M";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function initTables() {
  console.log("Checking menu_imports and menu_versions table access...");

  const { data: impData, error: impErr } = await supabase.from("menu_imports").select("*").limit(1);
  if (impErr && impErr.message.includes("does not exist")) {
    console.log("menu_imports table needs creation in DB via SQL editor.");
  } else {
    console.log("✅ menu_imports table accessible.");
  }

  const { data: verData, error: verErr } = await supabase
    .from("menu_versions")
    .select("*")
    .limit(1);
  if (verErr && verErr.message.includes("does not exist")) {
    console.log("menu_versions table needs creation in DB via SQL editor.");
  } else {
    console.log("✅ menu_versions table accessible.");
  }
}

initTables();
