/**
 * Shared server DB utilities for the Hotel-org platform control plane.
 * Restaurant-specific helpers (memberships, orders, discounts) live in orderly-hub.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Db = SupabaseClient<Database>;
