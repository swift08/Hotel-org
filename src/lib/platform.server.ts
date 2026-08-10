// Server-only helpers for the platform control plane.
// Uses supabaseAdmin (service role) — bypasses RLS, never import from client code.
//
// The tables/columns below (platform_admins.role/is_active/display_name,
// platform_permissions, platform_role_permissions, plans, subscriptions,
// subscription_events, platform_audit_logs, platform_support_sessions,
// platform_errors, platform_settings, businesses.suspended_at/suspension_*,
// organization_usage) are defined in supabase/platform_schema.sql but are not
// yet present in the generated src/integrations/supabase/types.ts. Until that
// file is regenerated we type them locally and cast `.from(...)` calls with
// `as any` rather than fighting the generated Database type.
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { PlatformPermissionKey, PlatformRole } from "@/lib/platform-rbac";

/** Loosely typed handle onto tables not yet present in the generated Database type. */
function hasServiceRoleKey() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SECRET_KEY"];
  return Boolean(url && key && key.length > 20 && !/your_supabase/i.test(key));
}

function platformDb(fallback?: any) {
  if (hasServiceRoleKey()) {
    return supabaseAdmin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  if (fallback) return fallback;
  return supabaseAdmin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface PlatformAdminRow {
  user_id: string;
  role: PlatformRole;
  is_active: boolean;
  display_name: string | null;
  last_login_at: string | null;
  created_at: string;
  level: string;
}

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "paused"
  | "cancelled"
  | "expired"
  | "suspended";

export type BillingCycle = "monthly" | "yearly";

export interface PlanRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  max_branches: number | null;
  max_tables: number | null;
  max_staff: number | null;
  max_orders: number | null;
  max_menu_items: number | null;
  ocr_limit: number | null;
  storage_limit_mb: number | null;
  kds_enabled: boolean;
  pos_enabled: boolean;
  advanced_reports_enabled: boolean;
  multi_branch_enabled: boolean;
  api_enabled: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRow {
  id: string;
  business_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  payment_status: string;
  trial_ends_at: string | null;
  started_at: string;
  renewal_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SuspensionReason =
  | "payment_failure"
  | "terms_violation"
  | "security_issue"
  | "abuse"
  | "administrative_action"
  | "other";

export type PlatformErrorStatus = "open" | "investigating" | "resolved" | "ignored";

export interface PlatformErrorRow {
  id: string;
  error_fingerprint: string;
  error_message: string;
  organization_id: string | null;
  route: string | null;
  severity: string;
  frequency: number;
  first_seen_at: string;
  last_seen_at: string;
  status: PlatformErrorStatus;
  stack: string | null;
  metadata: unknown;
}

export interface PlatformSupportSessionRow {
  id: string;
  platform_admin_id: string;
  organization_id: string;
  reason: string;
  started_at: string;
  ended_at: string | null;
  actions_performed: unknown[];
}

export interface PlatformSettingRow {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface OrganizationUsageRow {
  business_id: string;
  branches: number;
  tables: number;
  staff: number;
  menu_items: number;
  orders: number;
  orders_today: number;
  orders_month: number;
  ocr_imports: number;
}

export interface PlatformAuditLogEntry {
  actor_id?: string | null;
  actor_role?: PlatformRole | null;
  actor_label?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  organization_id?: string | null;
  before_state?: unknown;
  after_state?: unknown;
  reason?: string | null;
  support_session_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface PlatformAdminContext {
  userId: string;
  role: PlatformRole;
  displayName: string | null;
  lastLoginAt: string | null;
  permissions: PlatformPermissionKey[];
}

/**
 * Loads the caller's platform_admins row (must be active), then resolves the
 * effective permission set for their role. `platform_owner` always gets every
 * permission currently defined in platform_permissions, regardless of what is
 * (or isn't) present in platform_role_permissions.
 */
export async function requirePlatformAdmin(
  userId: string,
  opts: { touchLastLogin?: boolean; db?: any } = {},
): Promise<PlatformAdminContext> {
  const db = platformDb(opts.db);

  let adminRow: {
    user_id: string;
    role?: string | null;
    is_active?: boolean | null;
    display_name?: string | null;
    last_login_at?: string | null;
    level?: string | null;
  } | null = null;

  const full = await db
    .from("platform_admins")
    .select("user_id, role, is_active, display_name, last_login_at, level")
    .eq("user_id", userId)
    .maybeSingle();

  if (full.error) {
    const msg = (full.error.message || "").toLowerCase();
    const missingColumn =
      msg.includes("does not exist") ||
      msg.includes("column") ||
      msg.includes("could not find");
    if (!missingColumn) throw new Error(full.error.message);

    // Legacy platform_admins (user_id + level only) before platform_schema.sql.
    const legacy = await db
      .from("platform_admins")
      .select("user_id, level")
      .eq("user_id", userId)
      .maybeSingle();
    if (legacy.error) throw new Error(legacy.error.message);
    adminRow = legacy.data
      ? {
          user_id: legacy.data.user_id,
          level: legacy.data.level,
          role: null,
          is_active: true,
          display_name: null,
          last_login_at: null,
        }
      : null;
  } else {
    adminRow = full.data;
  }

  if (!adminRow) {
    throw new Error("Unauthorized: You do not have platform admin access.");
  }
  if (adminRow.is_active === false) {
    throw new Error("Unauthorized: Your platform admin account is inactive.");
  }

  const roleFromLevel = (level: string | null | undefined): PlatformRole => {
    switch ((level || "").toLowerCase()) {
      case "owner":
      case "platform_owner":
        return "platform_owner";
      case "admin":
      case "platform_admin":
        return "platform_admin";
      case "finance":
      case "platform_finance":
        return "platform_finance";
      case "analyst":
      case "platform_analyst":
        return "platform_analyst";
      default:
        return "platform_support";
    }
  };

  const role = (adminRow.role as PlatformRole | null) ?? roleFromLevel(adminRow.level);
  let permissionKeys: string[] = [];

  if (role === "platform_owner") {
    const { data: allPermissions, error: permErr } = await db.from("platform_permissions").select("key");
    if (permErr) {
      // Schema not applied yet — owner still gets through with empty/known set.
      if ((permErr.message || "").toLowerCase().includes("does not exist")) {
        permissionKeys = [];
      } else {
        throw new Error(permErr.message);
      }
    } else {
      permissionKeys = (allPermissions ?? []).map((p: { key: string }) => p.key);
    }
  } else {
    const { data: rolePermissions, error: permErr } = await db
      .from("platform_role_permissions")
      .select("permission_key")
      .eq("role", role);
    if (permErr) {
      if ((permErr.message || "").toLowerCase().includes("does not exist")) {
        permissionKeys = [];
      } else {
        throw new Error(permErr.message);
      }
    } else {
      permissionKeys = (rolePermissions ?? []).map((p: { permission_key: string }) => p.permission_key);
    }
  }

  // Owner always has full access even if permission tables are empty/unmigrated.
  if (role === "platform_owner" && permissionKeys.length === 0) {
    const { PLATFORM_PERMISSIONS } = await import("@/lib/platform-rbac");
    permissionKeys = Object.values(PLATFORM_PERMISSIONS);
  }

  if (opts.touchLastLogin && adminRow.role != null) {
    const { error: touchErr } = await db
      .from("platform_admins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (touchErr) console.error("[platform] failed to update last_login_at:", touchErr.message);
  }

  return {
    userId,
    role,
    displayName: adminRow.display_name ?? null,
    lastLoginAt: adminRow.last_login_at ?? null,
    permissions: permissionKeys as PlatformPermissionKey[],
  };
}

/** Throws a user-safe error if `key` is not present in the resolved permission set. */
export function assertPlatformPerm(perms: readonly string[], key: PlatformPermissionKey) {
  if (!perms.includes(key)) {
    throw new Error("You do not have permission to perform this action.");
  }
}

/**
 * Appends an entry to the append-only platform_audit_logs table. Failures are
 * logged but never thrown — an audit-log write failure should not block the
 * underlying admin action from completing.
 */
export async function logPlatformAudit(entry: PlatformAuditLogEntry): Promise<void> {
  try {
    const db = platformDb();
    const { error } = await db.from("platform_audit_logs").insert({
      actor_id: entry.actor_id ?? null,
      actor_role: entry.actor_role ?? null,
      actor_label: entry.actor_label ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      organization_id: entry.organization_id ?? null,
      before_state: entry.before_state ?? null,
      after_state: entry.after_state ?? null,
      reason: entry.reason ?? null,
      support_session_id: entry.support_session_id ?? null,
      ip_address: entry.ip_address ?? null,
      user_agent: entry.user_agent ?? null,
    });
    if (error) console.error("[platform-audit] failed to write entry:", error.message);
  } catch (err) {
    console.error(
      "[platform-audit] skipped:",
      err instanceof Error ? err.message : String(err ?? ""),
    );
  }
}

/** Reads the organization_usage view for one business, zero-filled if the business has no rows yet. */
export async function getOrganizationUsage(
  businessId: string,
  dbClient?: any, // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<OrganizationUsageRow> {
  const db = platformDb(dbClient);
  const { data, error } = await db
    .from("organization_usage")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return (
    data ?? {
      business_id: businessId,
      branches: 0,
      tables: 0,
      staff: 0,
      menu_items: 0,
      orders: 0,
      orders_today: 0,
      orders_month: 0,
      ocr_imports: 0,
    }
  );
}

/** Best-effort caller IP/user-agent extraction for audit logging. */
export function getRequestMeta(): { ipAddress: string | null; userAgent: string | null } {
  try {
    const request = getRequest();
    const headers = request?.headers;
    if (!headers) return { ipAddress: null, userAgent: null };

    const forwardedFor = headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
    const userAgent = headers.get("user-agent");

    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}
