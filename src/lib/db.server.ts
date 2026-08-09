import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Db = SupabaseClient<Database>;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Non-guessable public identifier used in QR links. Never a sequential id. */
export function randomSlug(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "business"}-${randomSlug(5).toLowerCase()}`;
}

export async function logAudit(
  db: Db,
  entry: {
    business_id: string;
    actor_id: string;
    actor_role?: Database["public"]["Enums"]["staff_role"] | null;
    actor_label?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    before_state?: unknown;
    after_state?: unknown;
    reason?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
  },
) {
  const { error } = await db.from("audit_logs").insert({
    business_id: entry.business_id,
    actor_id: entry.actor_id,
    actor_role: entry.actor_role ?? null,
    actor_label: entry.actor_label ?? null,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    before_state: (entry.before_state ?? null) as never,
    after_state: (entry.after_state ?? null) as never,
    reason: entry.reason ?? null,
    ip_address: entry.ip_address ?? null,
    user_agent: entry.user_agent ?? null,
  });
  if (error) console.error("[audit] failed to write entry", error.message);
}

/** Resolves the caller's single membership, or throws a user-safe error. */
export async function requireMembership(db: Db, userId: string, businessId?: string) {
  let query = db
    .from("memberships")
    .select("id, business_id, role, branch_id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You are not a member of this business.");
  return data;
}

/** Effective permissions: business overrides layered on role defaults. */
export async function resolvePermissions(
  db: Db,
  businessId: string,
  role: Database["public"]["Enums"]["staff_role"],
) {
  if (role === "owner") {
    const { data } = await db.from("permissions").select("key");
    return (data ?? []).map((p) => p.key);
  }
  const [{ data: defaults }, { data: overrides }] = await Promise.all([
    db.from("role_default_permissions").select("permission_key").eq("role", role),
    db.from("role_permissions").select("permission_key, allowed").eq("business_id", businessId).eq("role", role),
  ]);
  const set = new Set((defaults ?? []).map((d) => d.permission_key));
  for (const o of overrides ?? []) {
    if (o.allowed) set.add(o.permission_key);
    else set.delete(o.permission_key);
  }
  return [...set];
}

export function assertPerm(perms: string[], key: string) {
  if (!perms.includes(key)) throw new Error("You do not have permission to do this.");
}

/**
 * Validate that a staff member's discount does not exceed their configured authority.
 * Returns { allowed, requiresApproval } for the calling code to decide next steps.
 */
export async function validateDiscountAuthority(
  db: Db,
  businessId: string,
  role: Database["public"]["Enums"]["staff_role"],
  discountPercent: number,
): Promise<{ allowed: boolean; requiresApproval: boolean; maxPercent: number | null }> {
  if (role === "owner") return { allowed: true, requiresApproval: false, maxPercent: null };

  const { data: authority } = await db
    .from("discount_authorities")
    .select("max_percent, unlimited, approval_required")
    .eq("business_id", businessId)
    .eq("role", role)
    .maybeSingle();

  if (!authority) {
    // No authority configured = no discount allowed
    return { allowed: false, requiresApproval: true, maxPercent: 0 };
  }

  if (authority.unlimited) {
    return { allowed: true, requiresApproval: authority.approval_required, maxPercent: null };
  }

  const maxPercent = Number(authority.max_percent ?? 0);
  const allowed = discountPercent <= maxPercent;

  return {
    allowed,
    requiresApproval: !allowed || authority.approval_required,
    maxPercent,
  };
}

/**
 * Generate a unique order number using an atomic approach.
 * Format: YYMMDD-NNNN where NNNN is a daily sequence.
 *
 * Uses MAX(order_number) to find the last sequence for today's prefix,
 * then increments. The UNIQUE(business_id, order_number) constraint
 * provides the final safety net against duplicates.
 */
export async function nextOrderNumber(db: Db, businessId: string) {
  const prefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");

  // Find the highest sequence number for today's prefix
  const { data: latest } = await db
    .from("orders")
    .select("order_number")
    .eq("business_id", businessId)
    .like("order_number", `${prefix}-%`)
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let seq = 1;
  if (latest?.order_number) {
    const parts = latest.order_number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1] ?? "0", 10);
    if (Number.isFinite(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}-${String(seq).padStart(4, "0")}`;
}

/**
 * Valid order status transitions.
 * Any transition not listed here is invalid and will be rejected.
 */
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:     ["accepted", "cancelled", "rejected"],
  accepted:    ["preparing", "cancelled"],
  preparing:   ["ready", "cancelled"],
  ready:       ["served", "cancelled"],
  served:      ["completed"],
  completed:   ["refunded"],
  cancelled:   [],                     // terminal
  rejected:    [],                     // terminal
  refunded:    [],                     // terminal
  payment_failed: ["pending", "cancelled"],
};

/**
 * Transition an order's status with state machine validation and optimistic locking.
 * Records an order_event for the audit trail.
 */
export async function transitionOrderStatus(
  db: Db,
  opts: {
    businessId: string;
    orderId: string;
    toStatus: string;
    actorId?: string | null;
    actorRole?: string | null;
    actorLabel?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  // 1. Fetch current order (with version for optimistic lock)
  const { data: order, error: fetchErr } = await db
    .from("orders")
    .select("id, status, version")
    .eq("id", opts.orderId)
    .eq("business_id", opts.businessId)
    .maybeSingle();
  if (fetchErr || !order) throw new Error("Order not found.");

  // 2. Validate transition
  const allowed = VALID_ORDER_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(opts.toStatus)) {
    throw new Error(`Invalid order transition: ${order.status} → ${opts.toStatus}`);
  }

  // Map 'rejected' -> 'cancelled' for PostgreSQL enum order_status compatibility
  const dbStatus = opts.toStatus === "rejected" ? "cancelled" : opts.toStatus;

  // 3. Update with optimistic lock (version must match)
  const { data: updated, error: updateErr } = await db
    .from("orders")
    .update({ status: dbStatus as never, version: order.version + 1 })
    .eq("id", opts.orderId)
    .eq("version", order.version) // optimistic lock
    .select("id, status, version")
    .maybeSingle();

  if (updateErr) throw new Error(updateErr.message);
  if (!updated) throw new Error("Order was modified by another user. Please refresh and try again.");

  // 4. Record order event
  await db.from("order_events").insert({
    business_id: opts.businessId,
    order_id: opts.orderId,
    event: `order.${opts.toStatus}`,
    from_status: order.status as never,
    to_status: dbStatus as never,
    actor_id: opts.actorId ?? null,
    actor_label: opts.actorLabel ?? null,
    metadata: (opts.metadata ?? null) as never,
  });

  return updated;
}
