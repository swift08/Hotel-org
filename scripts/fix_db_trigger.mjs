import pg from 'pg';

const { Client } = pg;

// Connection string for Supabase PostgreSQL
const connectionString = "postgresql://postgres:Harshi0812_@db.pzyiffaaeqrpbzwymbmv.supabase.co:5432/postgres";

async function fixTrigger() {
  console.log("==================================================================");
  console.log("🛠️ FIXING POSTGRESQL DB TRIGGER: enforce_order_status_transition");
  console.log("==================================================================");

  // Try direct connection or pooler connection
  const connectionStrings = [
    "postgresql://postgres:Harshi0812_@db.pzyiffaaeqrpbzwymbmv.supabase.co:5432/postgres",
    "postgresql://postgres.pzyiffaaeqrpbzwymbmv:Harshi0812_@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.pzyiffaaeqrpbzwymbmv:Harshi0812_@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
  ];

  let client = null;
  for (const connStr of connectionStrings) {
    try {
      console.log(`Connecting to: ${connStr.split('@')[1]}...`);
      client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log("✅ Connected to PostgreSQL successfully!");
      break;
    } catch (err) {
      console.log(`Failed connecting to ${connStr.split('@')[1]}: ${err.message}`);
      client = null;
    }
  }

  if (!client) {
    console.error("Could not connect to PostgreSQL via direct connection strings.");
    return;
  }

  try {
    console.log("\nRecreating enforce_order_status_transition() function without invalid 'rejected' enum literal...");
    const sql = `
CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled')) OR
      (OLD.status = 'accepted' AND NEW.status IN ('preparing', 'cancelled')) OR
      (OLD.status = 'preparing' AND NEW.status IN ('ready', 'cancelled')) OR
      (OLD.status = 'ready' AND NEW.status IN ('served', 'cancelled')) OR
      (OLD.status = 'served' AND NEW.status IN ('completed')) OR
      (OLD.status = 'completed' AND NEW.status IN ('refunded')) OR
      (OLD.status = 'payment_failed' AND NEW.status IN ('pending', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
`;
    await client.query(sql);
    console.log("✅ Successfully replaced enforce_order_status_transition() function in PostgreSQL!");

    // Also check track_price_change
    console.log("\nRecreating track_price_change() function with base_price...");
    const sqlPrice = `
CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'products' AND NEW.base_price IS DISTINCT FROM OLD.base_price THEN
    INSERT INTO public.price_history (business_id, product_id, old_price, new_price, changed_by)
    VALUES (NEW.business_id, NEW.id, OLD.base_price, NEW.base_price, auth.uid());
  ELSIF TG_TABLE_NAME = 'product_variants' AND NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.price_history (business_id, product_id, variant_id, old_price, new_price, changed_by)
    VALUES (NEW.business_id, NEW.product_id, NEW.id, OLD.price, NEW.price, auth.uid());
  END IF;
  RETURN NEW;
END; $$;
`;
    await client.query(sqlPrice);
    console.log("✅ Successfully replaced track_price_change() function in PostgreSQL!");

    await client.end();
  } catch (err) {
    console.error("Error executing DDL:", err.message);
    if (client) await client.end();
  }
}

fixTrigger();
