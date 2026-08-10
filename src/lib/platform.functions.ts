import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertPlatformPerm,
  getOrganizationUsage,
  getRequestMeta,
  logPlatformAudit,
  requirePlatformAdmin,
  type BillingCycle,
  type PlatformErrorStatus,
  type PlanRow,
  type SubscriptionRow,
  type SubscriptionStatus,
  type SuspensionReason,
} from "@/lib/platform.server";
import { PLATFORM_PERMISSIONS, PLATFORM_ROLES, type PlatformRole } from "@/lib/platform-rbac";

// ---------------------------------------------------------------------------
// Shared helpers (server-fn local)
// ---------------------------------------------------------------------------

type AdminDb = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as AdminDb;
}

function monthlyMrr(sub: { amount: number | string | null; billing_cycle: string; status: string }) {
  if (!["active", "trial", "past_due"].includes(sub.status)) return 0;
  const amount = Number(sub.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return sub.billing_cycle === "yearly" ? amount / 12 : amount;
}

function deriveOrgStatus(biz: {
  approval_status?: string | null;
  is_active?: boolean | null;
  suspended_at?: string | null;
  subscriptionStatus?: string | null;
}): string {
  const approval = biz.approval_status ?? "approved";
  if (approval === "pending") return "pending";
  if (approval === "rejected") return "rejected";
  if (biz.suspended_at || biz.is_active === false) return "suspended";
  if (biz.subscriptionStatus) return biz.subscriptionStatus;
  if (biz.is_active) return "active";
  return "suspended";
}

async function resolveOwner(
  db: AdminDb,
  businessId: string,
): Promise<{ ownerEmail: string | null; ownerName: string | null; ownerUserId: string | null }> {
  const { data: membership } = await db
    .from("memberships")
    .select("user_id")
    .eq("business_id", businessId)
    .eq("role", "owner")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership?.user_id) {
    return { ownerEmail: null, ownerName: null, ownerUserId: null };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("display_name")
    .eq("id", membership.user_id)
    .maybeSingle();

  let ownerEmail: string | null = null;
  try {
    const { data: userData, error } = await db.auth.admin.getUserById(membership.user_id);
    if (!error) ownerEmail = userData?.user?.email ?? null;
  } catch {
    ownerEmail = null;
  }

  return {
    ownerEmail,
    ownerName: profile?.display_name ?? null,
    ownerUserId: membership.user_id,
  };
}

async function findUserIdByEmail(db: AdminDb, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  // Paginate through auth users (admin API has no email filter).
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const match = (data?.users ?? []).find(
      (u: { email?: string | null }) => (u.email ?? "").toLowerCase() === normalized,
    );
    if (match?.id) return match.id as string;
    if (!data?.users?.length || data.users.length < 200) break;
  }
  return null;
}

function rangeStart(range: "7d" | "30d" | "90d" | "6m" | "1y"): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "7d":
      d.setDate(d.getDate() - 7);
      break;
    case "30d":
      d.setDate(d.getDate() - 30);
      break;
    case "90d":
      d.setDate(d.getDate() - 90);
      break;
    case "6m":
      d.setMonth(d.getMonth() - 6);
      break;
    case "1y":
      d.setFullYear(d.getFullYear() - 1);
      break;
  }
  return d;
}

function eachDayIso(from: Date, to: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

const suspensionReasonSchema = z.enum([
  "payment_failure",
  "terms_violation",
  "security_issue",
  "abuse",
  "administrative_action",
  "other",
]);

const subscriptionStatusSchema = z.enum([
  "trial",
  "active",
  "past_due",
  "paused",
  "cancelled",
  "expired",
  "suspended",
]);

const billingCycleSchema = z.enum(["monthly", "yearly"]);

const analyticsRangeSchema = z.enum(["7d", "30d", "90d", "6m", "1y"]);

const platformRoleSchema = z.enum([
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_finance",
  "platform_analyst",
]);

const planInputSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  monthly_price: z.number().min(0),
  yearly_price: z.number().min(0),
  currency: z.string().trim().min(1).max(8).default("INR"),
  max_branches: z.number().int().nullable().optional(),
  max_tables: z.number().int().nullable().optional(),
  max_staff: z.number().int().nullable().optional(),
  max_orders: z.number().int().nullable().optional(),
  max_menu_items: z.number().int().nullable().optional(),
  ocr_limit: z.number().int().nullable().optional(),
  storage_limit_mb: z.number().int().nullable().optional(),
  kds_enabled: z.boolean().optional(),
  pos_enabled: z.boolean().optional(),
  advanced_reports_enabled: z.boolean().optional(),
  multi_branch_enabled: z.boolean().optional(),
  api_enabled: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// ---------------------------------------------------------------------------
// Context / dashboard
// ---------------------------------------------------------------------------

export const getPlatformContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context;

    try {
      const admin = await requirePlatformAdmin(userId, { touchLastLogin: true });
      const db = await getAdmin();

      let email: string | null = null;
      try {
        const { data: authUser } = await supabase.auth.getUser();
        email = authUser?.user?.email ?? null;
      } catch {
        email = null;
      }
      if (!email) {
        try {
          const { data } = await db.auth.admin.getUserById(userId);
          email = data?.user?.email ?? null;
        } catch {
          email = null;
        }
      }

      const { data: profile } = await db
        .from("profiles")
        .select("id, display_name, phone, avatar_url, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();

      return {
        isPlatformAdmin: true as const,
        userId,
        email,
        role: admin.role,
        displayName: admin.displayName,
        permissions: admin.permissions,
        profile: profile ?? null,
      };
    } catch {
      return {
        isPlatformAdmin: false as const,
        userId,
        email: null,
        role: null,
        displayName: null,
        permissions: [] as string[],
        profile: null,
      };
    }
  });

export const getDashboardOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.DASHBOARD_VIEW);

    const db = await getAdmin();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [{ data: businesses, error: bizErr }, { data: subscriptions, error: subErr }] =
      await Promise.all([
        db
          .from("businesses")
          .select("id, name, is_active, suspended_at, approval_status, created_at")
          .order("created_at", { ascending: false }),
        db.from("subscriptions").select("*, plans:plan_id(id, code, name)"),
      ]);

    if (bizErr) throw new Error(bizErr.message);
    if (subErr) throw new Error(subErr.message);

    const bizRows = businesses ?? [];
    const subRows = (subscriptions ?? []) as Array<
      SubscriptionRow & { plans?: { id: string; code: string; name: string } | null }
    >;
    const subByBiz = new Map(subRows.map((s) => [s.business_id, s]));

    let active = 0;
    let trial = 0;
    let suspended = 0;
    let pending = 0;
    let paid = 0;

    for (const b of bizRows) {
      const sub = subByBiz.get(b.id);
      const status = deriveOrgStatus({
        approval_status: b.approval_status,
        is_active: b.is_active,
        suspended_at: b.suspended_at,
        subscriptionStatus: sub?.status ?? null,
      });
      if (status === "pending") pending += 1;
      else if (status === "suspended") suspended += 1;
      else if (status === "trial") trial += 1;
      else if (status === "active") active += 1;

      if (sub && ["active", "past_due"].includes(sub.status) && Number(sub.amount) > 0) paid += 1;
    }

    const mrr = subRows.reduce((sum, s) => sum + monthlyMrr(s), 0);
    const arr = mrr * 12;
    const activeSubscriptions = subRows.filter((s) =>
      ["active", "trial", "past_due"].includes(s.status),
    ).length;
    const newSignups30d = bizRows.filter(
      (b: { created_at: string }) => new Date(b.created_at) >= thirtyDaysAgo,
    ).length;

    const [
      { count: ordersToday },
      { count: ordersThisMonth },
      { count: totalBranches },
      { count: totalUsers },
    ] = await Promise.all([
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayStart.toISOString()),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString()),
      db.from("branches").select("id", { count: "exact", head: true }),
      db.from("memberships").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const recentOrganizations = bizRows.slice(0, 10).map((b: (typeof bizRows)[number]) => {
      const sub = subByBiz.get(b.id);
      return {
        id: b.id as string,
        name: b.name as string,
        plan: sub?.plans?.name ?? null,
        status: deriveOrgStatus({
          approval_status: b.approval_status,
          is_active: b.is_active,
          suspended_at: b.suspended_at,
          subscriptionStatus: sub?.status ?? null,
        }),
        createdAt: b.created_at as string,
      };
    });

    return {
      organizations: {
        total: bizRows.length,
        active,
        trial,
        suspended,
        pending,
        paid,
      },
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      activeSubscriptions,
      newSignups30d,
      ordersToday: ordersToday ?? 0,
      ordersThisMonth: ordersThisMonth ?? 0,
      totalBranches: totalBranches ?? 0,
      totalUsers: totalUsers ?? 0,
      recentOrganizations,
    };
  });

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        status: z.enum(["active", "trial", "suspended", "pending", "rejected", "all"]).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW);

    const db = await getAdmin();
    const statusFilter = data.status ?? "all";

    const [{ data: businesses, error: bizErr }, { data: subscriptions, error: subErr }] =
      await Promise.all([
        db
          .from("businesses")
          .select("id, name, slug, is_active, suspended_at, approval_status, created_at")
          .order("created_at", { ascending: false }),
        db.from("subscriptions").select("*, plans:plan_id(id, code, name)"),
      ]);
    if (bizErr) throw new Error(bizErr.message);
    if (subErr) throw new Error(subErr.message);

    const subByBiz = new Map(
      ((subscriptions ?? []) as Array<SubscriptionRow & { plans?: { name: string } | null }>).map(
        (s) => [s.business_id, s],
      ),
    );

    const usageRows = await Promise.all(
      (businesses ?? []).map(async (b: { id: string }) => {
        try {
          return await getOrganizationUsage(b.id);
        } catch {
          return {
            business_id: b.id,
            branches: 0,
            tables: 0,
            staff: 0,
            menu_items: 0,
            orders: 0,
            orders_today: 0,
            orders_month: 0,
            ocr_imports: 0,
          };
        }
      }),
    );
    const usageByBiz = new Map(usageRows.map((u) => [u.business_id, u]));

    const results = [];
    for (const b of businesses ?? []) {
      const sub = subByBiz.get(b.id);
      const status = deriveOrgStatus({
        approval_status: b.approval_status,
        is_active: b.is_active,
        suspended_at: b.suspended_at,
        subscriptionStatus: sub?.status ?? null,
      });

      if (statusFilter !== "all") {
        if (statusFilter === "active" && status !== "active") continue;
        if (statusFilter === "trial" && status !== "trial") continue;
        if (statusFilter === "suspended" && status !== "suspended") continue;
        if (statusFilter === "pending" && status !== "pending") continue;
        if (statusFilter === "rejected" && status !== "rejected") continue;
      }

      const owner = await resolveOwner(db, b.id);
      const usage = usageByBiz.get(b.id);

      results.push({
        id: b.id as string,
        name: b.name as string,
        slug: b.slug as string,
        ownerEmail: owner.ownerEmail,
        ownerName: owner.ownerName,
        plan: sub?.plans?.name ?? null,
        status,
        mrr: sub ? monthlyMrr(sub) : 0,
        createdAt: b.created_at as string,
        branches: usage?.branches ?? 0,
        users: usage?.staff ?? 0,
        orders: usage?.orders ?? 0,
      });
    }

    return results;
  });

export const getOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ organizationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW);

    const db = await getAdmin();
    const { data: biz, error } = await db
      .from("businesses")
      .select(
        "id, name, slug, is_active, suspended_at, suspension_reason, suspension_notes, approval_status, approved_at, approved_by, rejection_reason, business_type, currency, created_at, last_activity_at, updated_at",
      )
      .eq("id", data.organizationId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!biz) return null;

    const [{ data: sub }, { data: branches }, { data: settings }, owner, usage] = await Promise.all([
      db
        .from("subscriptions")
        .select("*, plans:plan_id(id, code, name)")
        .eq("business_id", biz.id)
        .maybeSingle(),
      db.from("branches").select("id, name").eq("business_id", biz.id).order("name"),
      db.from("business_settings").select("*").eq("business_id", biz.id).maybeSingle(),
      resolveOwner(db, biz.id),
      getOrganizationUsage(biz.id),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: orders30d } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", biz.id)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const typedSub = sub as
      | (SubscriptionRow & { plans?: { name: string } | null })
      | null;

    return {
      id: biz.id as string,
      name: biz.name as string,
      slug: biz.slug as string,
      businessType: (biz.business_type as string | null) ?? null,
      approvalStatus: (biz.approval_status as string | null) ?? "approved",
      approvedAt: (biz.approved_at as string | null) ?? null,
      rejectionReason: (biz.rejection_reason as string | null) ?? null,
      status: deriveOrgStatus({
        approval_status: biz.approval_status,
        is_active: biz.is_active,
        suspended_at: biz.suspended_at,
        subscriptionStatus: typedSub?.status ?? null,
      }),
      ownerEmail: owner.ownerEmail,
      ownerName: owner.ownerName,
      phone: settings?.phone ?? null,
      gstin: settings?.gstin ?? null,
      currency: biz.currency ?? "INR",
      createdAt: biz.created_at as string,
      lastActivityAt: (biz.last_activity_at as string | null) ?? (biz.updated_at as string | null),
      subscription: typedSub
        ? {
            plan: typedSub.plans?.name ?? null,
            status: typedSub.status,
            renewsAt: typedSub.renewal_at,
            billingCycle: typedSub.billing_cycle,
            amount: Number(typedSub.amount ?? 0),
          }
        : null,
      branches: (branches ?? []).map((b: { id: string; name: string }) => ({
        id: b.id,
        name: b.name,
      })),
      usage: {
        orders30d: orders30d ?? 0,
        tables: usage.tables,
        staff: usage.staff,
        branches: usage.branches,
        menuItems: usage.menu_items,
        ocrImports: usage.ocr_imports,
      },
      settings: settings ?? null,
    };
  });

export const suspendOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        reason: suspensionReasonSchema,
        notes: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ORGANIZATIONS_SUSPEND);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const { data: before } = await db
      .from("businesses")
      .select("id, is_active, suspended_at, suspension_reason, suspension_notes")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!before) throw new Error("Organization not found.");

    const { error: bizErr } = await db
      .from("businesses")
      .update({
        is_active: false,
        suspended_at: now,
        suspension_reason: data.reason as SuspensionReason,
        suspension_notes: data.notes ?? null,
      })
      .eq("id", data.organizationId);
    if (bizErr) throw new Error(bizErr.message);

    const { data: subBefore } = await db
      .from("subscriptions")
      .select("*")
      .eq("business_id", data.organizationId)
      .maybeSingle();

    if (subBefore) {
      const { error: subErr } = await db
        .from("subscriptions")
        .update({ status: "suspended", updated_at: now })
        .eq("id", subBefore.id);
      if (subErr) throw new Error(subErr.message);

      await db.from("subscription_events").insert({
        subscription_id: subBefore.id,
        business_id: data.organizationId,
        event_type: "subscription.suspended",
        from_status: subBefore.status,
        to_status: "suspended",
        actor_id: context.userId,
        metadata: { reason: data.reason, notes: data.notes ?? null },
      });
    }

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "organization.suspend",
      resource_type: "organization",
      resource_id: data.organizationId,
      organization_id: data.organizationId,
      before_state: before,
      after_state: {
        is_active: false,
        suspended_at: now,
        suspension_reason: data.reason,
        suspension_notes: data.notes ?? null,
      },
      reason: data.notes ?? data.reason,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return { ok: true as const };
  });

export const restoreOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        notes: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ORGANIZATIONS_SUSPEND);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const { data: before } = await db
      .from("businesses")
      .select("id, is_active, suspended_at, suspension_reason, suspension_notes")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!before) throw new Error("Organization not found.");

    const { error: bizErr } = await db
      .from("businesses")
      .update({
        is_active: true,
        suspended_at: null,
        suspension_reason: null,
        suspension_notes: data.notes ?? null,
      })
      .eq("id", data.organizationId);
    if (bizErr) throw new Error(bizErr.message);

    const { data: subBefore } = await db
      .from("subscriptions")
      .select("*")
      .eq("business_id", data.organizationId)
      .maybeSingle();

    if (subBefore && subBefore.status === "suspended") {
      const restoreStatus: SubscriptionStatus =
        subBefore.trial_ends_at && new Date(subBefore.trial_ends_at) > new Date()
          ? "trial"
          : "active";
      const { error: subErr } = await db
        .from("subscriptions")
        .update({ status: restoreStatus, updated_at: now })
        .eq("id", subBefore.id);
      if (subErr) throw new Error(subErr.message);

      await db.from("subscription_events").insert({
        subscription_id: subBefore.id,
        business_id: data.organizationId,
        event_type: "subscription.restored",
        from_status: subBefore.status,
        to_status: restoreStatus,
        actor_id: context.userId,
        metadata: { notes: data.notes ?? null },
      });
    }

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "organization.restore",
      resource_type: "organization",
      resource_id: data.organizationId,
      organization_id: data.organizationId,
      before_state: before,
      after_state: {
        is_active: true,
        suspended_at: null,
        suspension_reason: null,
        suspension_notes: data.notes ?? null,
      },
      reason: data.notes ?? null,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return { ok: true as const };
  });

export const approveOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        notes: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ORGANIZATIONS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const { data: before } = await db
      .from("businesses")
      .select(
        "id, is_active, approval_status, approved_at, approved_by, rejection_reason, suspended_at",
      )
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!before) throw new Error("Organization not found.");
    if (before.approval_status === "approved" && before.is_active && !before.suspended_at) {
      throw new Error("Organization is already approved.");
    }

    const { error: bizErr } = await db
      .from("businesses")
      .update({
        approval_status: "approved",
        approved_at: now,
        approved_by: context.userId,
        rejection_reason: null,
        is_active: true,
        suspended_at: null,
        suspension_reason: null,
        suspension_notes: null,
      })
      .eq("id", data.organizationId);
    if (bizErr) throw new Error(bizErr.message);

    // Start a Free trial if they have no subscription yet.
    const { data: existingSub } = await db
      .from("subscriptions")
      .select("id")
      .eq("business_id", data.organizationId)
      .maybeSingle();

    if (!existingSub) {
      const { data: freePlan } = await db
        .from("plans")
        .select("id")
        .eq("code", "free")
        .eq("is_active", true)
        .maybeSingle();

      if (freePlan?.id) {
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);
        const { data: createdSub, error: subErr } = await db
          .from("subscriptions")
          .insert({
            business_id: data.organizationId,
            plan_id: freePlan.id,
            status: "trial",
            billing_cycle: "monthly",
            amount: 0,
            currency: "INR",
            payment_status: "unpaid",
            trial_ends_at: trialEnds.toISOString(),
            started_at: now,
            renewal_at: trialEnds.toISOString(),
          })
          .select("id, status")
          .single();
        if (subErr) throw new Error(subErr.message);

        await db.from("subscription_events").insert({
          subscription_id: createdSub.id,
          business_id: data.organizationId,
          event_type: "subscription.trial_started",
          from_status: null,
          to_status: "trial",
          actor_id: context.userId,
          metadata: { source: "registration_approval", notes: data.notes ?? null },
        });
      }
    }

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "organization.approve",
      resource_type: "organization",
      resource_id: data.organizationId,
      organization_id: data.organizationId,
      before_state: before,
      after_state: {
        approval_status: "approved",
        approved_at: now,
        approved_by: context.userId,
        is_active: true,
      },
      reason: data.notes ?? null,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return { ok: true as const };
  });

export const rejectOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        reason: z.string().trim().min(3).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ORGANIZATIONS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const { data: before } = await db
      .from("businesses")
      .select("id, is_active, approval_status, rejection_reason")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!before) throw new Error("Organization not found.");
    if (before.approval_status === "rejected") {
      throw new Error("Organization is already rejected.");
    }

    const { error: bizErr } = await db
      .from("businesses")
      .update({
        approval_status: "rejected",
        rejection_reason: data.reason,
        is_active: false,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", data.organizationId);
    if (bizErr) throw new Error(bizErr.message);

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "organization.reject",
      resource_type: "organization",
      resource_id: data.organizationId,
      organization_id: data.organizationId,
      before_state: before,
      after_state: {
        approval_status: "rejected",
        rejection_reason: data.reason,
        is_active: false,
        decided_at: now,
      },
      reason: data.reason,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return { ok: true as const };
  });

// ---------------------------------------------------------------------------
// Plans / subscriptions / billing
// ---------------------------------------------------------------------------

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.PLANS_VIEW);

    const db = await getAdmin();
    const { data, error } = await db.from("plans").select("*").order("sort_order").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as PlanRow[];
  });

export const upsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => planInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.PLANS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const payload = {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      monthly_price: data.monthly_price,
      yearly_price: data.yearly_price,
      currency: data.currency ?? "INR",
      max_branches: data.max_branches ?? null,
      max_tables: data.max_tables ?? null,
      max_staff: data.max_staff ?? null,
      max_orders: data.max_orders ?? null,
      max_menu_items: data.max_menu_items ?? null,
      ocr_limit: data.ocr_limit ?? null,
      storage_limit_mb: data.storage_limit_mb ?? null,
      kds_enabled: data.kds_enabled ?? true,
      pos_enabled: data.pos_enabled ?? true,
      advanced_reports_enabled: data.advanced_reports_enabled ?? false,
      multi_branch_enabled: data.multi_branch_enabled ?? false,
      api_enabled: data.api_enabled ?? false,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
      updated_at: now,
    };

    let row: PlanRow | null = null;
    let before: PlanRow | null = null;

    if (data.id) {
      const { data: existing } = await db.from("plans").select("*").eq("id", data.id).maybeSingle();
      before = existing as PlanRow | null;
      const { data: updated, error } = await db
        .from("plans")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      row = updated as PlanRow;
    } else {
      const { data: inserted, error } = await db
        .from("plans")
        .insert(payload)
        .select("*")
        .maybeSingle();
      if (error) throw new Error(error.message);
      row = inserted as PlanRow;
    }

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: data.id ? "plan.update" : "plan.create",
      resource_type: "plan",
      resource_id: row?.id ?? null,
      before_state: before,
      after_state: row,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return row;
  });

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        status: subscriptionStatusSchema.optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW);

    const db = await getAdmin();
    let query = db
      .from("subscriptions")
      .select(
        "*, plans:plan_id(id, code, name, monthly_price, yearly_price), businesses:business_id(id, name, slug)",
      )
      .order("updated_at", { ascending: false });

    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map(
      (s: SubscriptionRow & {
        plans?: { id: string; code: string; name: string } | null;
        businesses?: { id: string; name: string; slug: string } | null;
      }) => ({
        id: s.id,
        businessId: s.business_id,
        businessName: s.businesses?.name ?? null,
        businessSlug: s.businesses?.slug ?? null,
        planId: s.plan_id,
        plan: s.plans?.name ?? null,
        planCode: s.plans?.code ?? null,
        status: s.status,
        billingCycle: s.billing_cycle,
        amount: Number(s.amount ?? 0),
        currency: s.currency,
        paymentStatus: s.payment_status,
        trialEndsAt: s.trial_ends_at,
        startedAt: s.started_at,
        renewsAt: s.renewal_at,
        expiresAt: s.expires_at,
        cancelledAt: s.cancelled_at,
        mrr: monthlyMrr(s),
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }),
    );
  });

export const updateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        planId: z.string().uuid().optional(),
        status: subscriptionStatusSchema.optional(),
        billingCycle: billingCycleSchema.optional(),
        amount: z.number().min(0).optional(),
        renewalAt: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SUBSCRIPTIONS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const { data: before, error: fetchErr } = await db
      .from("subscriptions")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!before) throw new Error("Subscription not found.");

    const patch: {
      updated_at: string;
      plan_id?: string;
      status?: SubscriptionStatus;
      billing_cycle?: BillingCycle;
      amount?: number;
      renewal_at?: string | null;
      cancelled_at?: string;
    } = { updated_at: now };
    if (data.planId !== undefined) patch.plan_id = data.planId;
    if (data.status !== undefined) patch.status = data.status;
    if (data.billingCycle !== undefined) patch.billing_cycle = data.billingCycle;
    if (data.amount !== undefined) patch.amount = data.amount;
    if (data.renewalAt !== undefined) patch.renewal_at = data.renewalAt;
    if (data.status === "cancelled") patch.cancelled_at = now;

    if (data.planId && data.amount === undefined) {
      const { data: plan } = await db
        .from("plans")
        .select("monthly_price, yearly_price")
        .eq("id", data.planId)
        .maybeSingle();
      if (plan) {
        const cycle = (data.billingCycle ?? before.billing_cycle) as BillingCycle;
        patch.amount = cycle === "yearly" ? Number(plan.yearly_price) : Number(plan.monthly_price);
      }
    }

    const { data: updated, error } = await db
      .from("subscriptions")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await db.from("subscription_events").insert({
      subscription_id: data.id,
      business_id: before.business_id,
      event_type: "subscription.updated",
      from_plan_id: before.plan_id,
      to_plan_id: patch.plan_id ?? before.plan_id,
      from_status: before.status,
      to_status: patch.status ?? before.status,
      amount: Number(patch.amount ?? before.amount ?? 0),
      actor_id: context.userId,
      metadata: patch,
    });

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "subscription.update",
      resource_type: "subscription",
      resource_id: data.id,
      organization_id: before.business_id,
      before_state: before,
      after_state: updated,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return updated;
  });

export const getBillingSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.BILLING_VIEW);

    const db = await getAdmin();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: subscriptions, error } = await db.from("subscriptions").select("*");
    if (error) throw new Error(error.message);
    const subs = (subscriptions ?? []) as SubscriptionRow[];

    const mrr = subs.reduce((sum, s) => sum + monthlyMrr(s), 0);
    const arr = mrr * 12;

    const { data: events } = await db
      .from("subscription_events")
      .select("event_type, amount, created_at, to_status, from_status")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const ev = events ?? [];
    const newSubs = ev.filter((e: { event_type: string }) =>
      ["subscription.created", "subscription.started", "subscription.activated"].includes(
        e.event_type,
      ),
    ).length;
    const renewals = ev.filter((e: { event_type: string }) =>
      e.event_type.includes("renew"),
    ).length;
    const cancellations = ev.filter(
      (e: { event_type: string; to_status?: string | null }) =>
        e.event_type.includes("cancel") || e.to_status === "cancelled",
    ).length;
    const failedPayments = ev.filter((e: { event_type: string }) =>
      e.event_type.includes("payment_failed") || e.event_type.includes("payment.failed"),
    ).length;
    const refunds = ev.filter((e: { event_type: string }) => e.event_type.includes("refund")).length;

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr * 100) / 100,
      newSubs,
      renewals,
      cancellations,
      pastDue: subs.filter((s) => s.status === "past_due").length,
      failedPayments,
      refunds,
    };
  });

export const listSubscriptionEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.BILLING_VIEW);

    const db = await getAdmin();
    const limit = data.limit ?? 100;
    const { data: rows, error } = await db
      .from("subscription_events")
      .select("id, event_type, amount, created_at, business_id, businesses:business_id(name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);

    return (rows ?? []).map(
      (e: {
        id: string;
        event_type: string;
        amount: number | null;
        created_at: string;
        businesses?: { name: string } | null;
      }) => ({
        id: e.id,
        eventType: e.event_type,
        businessName: e.businesses?.name ?? null,
        createdAt: e.created_at,
        amount: e.amount != null ? Number(e.amount) : null,
      }),
    );
  });

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export const listUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.USAGE_VIEW);

    const db = await getAdmin();
    const [{ data: businesses, error: bizErr }, { data: subscriptions, error: subErr }] =
      await Promise.all([
        db.from("businesses").select("id, name").order("name"),
        db
          .from("subscriptions")
          .select(
            "business_id, plans:plan_id(max_branches, max_tables, max_staff, max_menu_items, max_orders, ocr_limit, kds_enabled, pos_enabled, advanced_reports_enabled, multi_branch_enabled, api_enabled)",
          ),
      ]);
    if (bizErr) throw new Error(bizErr.message);
    if (subErr) throw new Error(subErr.message);

    type PlanLimits = {
      max_branches: number | null;
      max_tables: number | null;
      max_staff: number | null;
      max_menu_items: number | null;
      max_orders: number | null;
      ocr_limit: number | null;
      kds_enabled: boolean;
      pos_enabled: boolean;
      advanced_reports_enabled: boolean;
      multi_branch_enabled: boolean;
      api_enabled: boolean;
    };

    const planByBiz = new Map<string, PlanLimits | null>(
      (subscriptions ?? []).map((s: { business_id: string; plans?: PlanLimits | null }) => [
        s.business_id as string,
        (s.plans ?? null) as PlanLimits | null,
      ]),
    );

    const results = [];
    for (const b of businesses ?? []) {
      const usage = await getOrganizationUsage(b.id);
      const plan = planByBiz.get(b.id);
      results.push({
        businessId: b.id as string,
        name: b.name as string,
        branches: usage.branches,
        maxBranches: plan?.max_branches ?? null,
        tables: usage.tables,
        maxTables: plan?.max_tables ?? null,
        staff: usage.staff,
        maxStaff: plan?.max_staff ?? null,
        menuItems: usage.menu_items,
        maxMenuItems: plan?.max_menu_items ?? null,
        orders: usage.orders,
        maxOrders: plan?.max_orders ?? null,
        ocrImports: usage.ocr_imports,
        ocrLimit: plan?.ocr_limit ?? null,
        features: {
          kds: plan?.kds_enabled ?? false,
          pos: plan?.pos_enabled ?? false,
          advancedReports: plan?.advanced_reports_enabled ?? false,
          multiBranch: plan?.multi_branch_enabled ?? false,
          api: plan?.api_enabled ?? false,
        } as Record<string, boolean>,
      });
    }
    return results;
  });

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const getRevenueAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ range: analyticsRangeSchema.default("30d") }).parse(input ?? { range: "30d" }),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ANALYTICS_VIEW);

    const db = await getAdmin();
    const from = rangeStart(data.range);
    const to = new Date();

    const { data: subscriptions, error } = await db
      .from("subscriptions")
      .select("*, plans:plan_id(name)");
    if (error) throw new Error(error.message);

    const subs = (subscriptions ?? []) as Array<
      SubscriptionRow & { plans?: { name: string } | null }
    >;

    const days = eachDayIso(from, to);
    const series = days.map((date) => {
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      let mrr = 0;
      for (const s of subs) {
        const started = new Date(s.started_at);
        if (started > dayEnd) continue;
        if (s.cancelled_at && new Date(s.cancelled_at) <= dayEnd) continue;
        if (s.expires_at && new Date(s.expires_at) <= dayEnd) continue;
        // Historical reconstruction from current row fields (no fabricated values).
        const statusAtDay =
          s.status === "cancelled" && s.cancelled_at && new Date(s.cancelled_at) > dayEnd
            ? "active"
            : s.status;
        mrr += monthlyMrr({ ...s, status: statusAtDay });
      }
      return {
        date,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
      };
    });

    const byPlanMap = new Map<string, number>();
    for (const s of subs) {
      if (!["active", "trial", "past_due"].includes(s.status)) continue;
      const name = s.plans?.name ?? "Unknown";
      byPlanMap.set(name, (byPlanMap.get(name) ?? 0) + monthlyMrr(s));
    }
    const byPlan = [...byPlanMap.entries()]
      .map(([plan, revenue]) => ({ plan, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);

    return { series, byPlan };
  });

export const getOrderAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ range: analyticsRangeSchema.default("30d") }).parse(input ?? { range: "30d" }),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ANALYTICS_VIEW);

    const db = await getAdmin();
    const from = rangeStart(data.range);

    const { data: orders, error } = await db
      .from("orders")
      .select("id, business_id, grand_total, created_at, businesses:business_id(name)")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = orders ?? [];
    const totalOrders = rows.length;
    const revenue = rows.reduce(
      (sum: number, o: { grand_total?: number | null }) => sum + Number(o.grand_total ?? 0),
      0,
    );
    const aov = totalOrders > 0 ? revenue / totalOrders : 0;

    const byDay = new Map<string, { orders: number; revenue: number }>();
    for (const o of rows) {
      const date = String(o.created_at).slice(0, 10);
      const cur = byDay.get(date) ?? { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.grand_total ?? 0);
      byDay.set(date, cur);
    }
    const series = eachDayIso(from, new Date()).map((date) => ({
      date,
      orders: byDay.get(date)?.orders ?? 0,
      revenue: Math.round((byDay.get(date)?.revenue ?? 0) * 100) / 100,
    }));

    const byOrgMap = new Map<string, { name: string; orders: number; revenue: number }>();
    for (const o of rows) {
      const name =
        (o.businesses as { name?: string } | null)?.name ??
        (o.business_id as string) ??
        "Unknown";
      const key = o.business_id as string;
      const cur = byOrgMap.get(key) ?? { name, orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.grand_total ?? 0);
      byOrgMap.set(key, cur);
    }
    const byOrg = [...byOrgMap.values()]
      .map((o) => ({
        name: o.name,
        orders: o.orders,
        aov: o.orders > 0 ? Math.round((o.revenue / o.orders) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 25);

    return {
      totals: {
        orders: totalOrders,
        totalOrders,
        revenue: Math.round(revenue * 100) / 100,
        aov: Math.round(aov * 100) / 100,
        averageOrderValue: Math.round(aov * 100) / 100,
      },
      byOrg,
      series,
    };
  });

export const getGrowthAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ range: analyticsRangeSchema.default("30d") }).parse(input ?? { range: "30d" }),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ANALYTICS_VIEW);

    const db = await getAdmin();
    const from = rangeStart(data.range);

    const [{ data: businesses, error: bizErr }, { data: cancelled, error: subErr }] =
      await Promise.all([
        db.from("businesses").select("id, created_at, suspended_at").gte("created_at", from.toISOString()),
        db
          .from("subscriptions")
          .select("cancelled_at, updated_at, status")
          .in("status", ["cancelled", "expired", "suspended"]),
      ]);
    if (bizErr) throw new Error(bizErr.message);
    if (subErr) throw new Error(subErr.message);

    const newByDay = new Map<string, number>();
    for (const b of businesses ?? []) {
      const date = String(b.created_at).slice(0, 10);
      newByDay.set(date, (newByDay.get(date) ?? 0) + 1);
    }

    const churnByDay = new Map<string, number>();
    for (const b of businesses ?? []) {
      if (!b.suspended_at) continue;
      if (new Date(b.suspended_at) < from) continue;
      const date = String(b.suspended_at).slice(0, 10);
      churnByDay.set(date, (churnByDay.get(date) ?? 0) + 1);
    }
    for (const s of cancelled ?? []) {
      const ts = s.cancelled_at ?? s.updated_at;
      if (!ts || new Date(ts) < from) continue;
      const date = String(ts).slice(0, 10);
      churnByDay.set(date, (churnByDay.get(date) ?? 0) + 1);
    }

    const series = eachDayIso(from, new Date()).map((date) => ({
      date,
      newOrgs: newByDay.get(date) ?? 0,
      churned: churnByDay.get(date) ?? 0,
    }));

    return { series };
  });

// ---------------------------------------------------------------------------
// System health / errors / audit
// ---------------------------------------------------------------------------

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SYSTEM_VIEW);

    const db = await getAdmin();
    const checks: Array<{ name: string; status: "healthy" | "degraded" | "down"; detail?: string }> =
      [];

    // Database
    try {
      const started = Date.now();
      const { error } = await db.from("businesses").select("id").limit(1);
      if (error) {
        checks.push({ name: "Database", status: "down", detail: error.message });
      } else {
        checks.push({
          name: "Database",
          status: "healthy",
          detail: `Responded in ${Date.now() - started}ms`,
        });
      }
    } catch (e: unknown) {
      checks.push({
        name: "Database",
        status: "down",
        detail: e instanceof Error ? e.message : "Database probe failed",
      });
    }

    // Auth
    try {
      const started = Date.now();
      const { error } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        checks.push({ name: "Auth", status: "down", detail: error.message });
      } else {
        checks.push({
          name: "Auth",
          status: "healthy",
          detail: `Admin API responded in ${Date.now() - started}ms`,
        });
      }
    } catch (e: unknown) {
      checks.push({
        name: "Auth",
        status: "down",
        detail: e instanceof Error ? e.message : "Auth probe failed",
      });
    }

    // Storage
    try {
      const started = Date.now();
      const { data, error } = await db.storage.listBuckets();
      if (error) {
        checks.push({ name: "Storage", status: "down", detail: error.message });
      } else {
        checks.push({
          name: "Storage",
          status: "healthy",
          detail: `${(data ?? []).length} bucket(s), ${Date.now() - started}ms`,
        });
      }
    } catch (e: unknown) {
      checks.push({
        name: "Storage",
        status: "down",
        detail: e instanceof Error ? e.message : "Storage probe failed",
      });
    }

    // Realtime — URL reachability (no fake healthy channel without subscription)
    try {
      const url = process.env["SUPABASE_URL"];
      if (!url) {
        checks.push({
          name: "Realtime",
          status: "degraded",
          detail: "SUPABASE_URL not configured",
        });
      } else {
        const started = Date.now();
        const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
          method: "HEAD",
          headers: {
            apikey: process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "",
          },
        });
        if (res.ok || res.status === 400 || res.status === 401 || res.status === 404) {
          checks.push({
            name: "Realtime",
            status: "healthy",
            detail: `Supabase endpoint reachable in ${Date.now() - started}ms`,
          });
        } else {
          checks.push({
            name: "Realtime",
            status: "degraded",
            detail: `HTTP ${res.status}`,
          });
        }
      }
    } catch (e: unknown) {
      checks.push({
        name: "Realtime",
        status: "degraded",
        detail: e instanceof Error ? e.message : "Reachability check failed",
      });
    }

    // OCR / background worker — not configured in this control plane
    const ocrConfigured = Boolean(process.env["OCR_WORKER_URL"] || process.env["BACKGROUND_WORKER_URL"]);
    checks.push({
      name: "OCR / Background",
      status: ocrConfigured ? "healthy" : "degraded",
      detail: ocrConfigured
        ? "Worker URL configured"
        : "not configured — no OCR/background worker URL in environment",
    });

    return { checks };
  });

export const listPlatformErrors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        status: z.enum(["open", "investigating", "resolved", "ignored"]).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ERRORS_VIEW);

    const db = await getAdmin();
    let query = db
      .from("platform_errors")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updatePlatformError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "investigating", "resolved", "ignored"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ERRORS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();

    const { data: before } = await db
      .from("platform_errors")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Error record not found.");

    const { data: updated, error } = await db
      .from("platform_errors")
      .update({ status: data.status as PlatformErrorStatus })
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "platform_error.update",
      resource_type: "platform_error",
      resource_id: data.id,
      organization_id: before.organization_id,
      before_state: before,
      after_state: updated,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return updated;
  });

export const listPlatformAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.AUDIT_VIEW);

    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("platform_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------------------------------------------------------------------------
// Platform admins / permissions / settings
// ---------------------------------------------------------------------------

export const listPlatformAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ADMINS_VIEW);

    const db = await getAdmin();
    const { data: rows, error } = await db
      .from("platform_admins")
      .select("user_id, role, is_active, display_name, last_login_at, created_at, level")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const results = [];
    for (const row of rows ?? []) {
      let email: string | null = null;
      try {
        const { data: userData } = await db.auth.admin.getUserById(row.user_id);
        email = userData?.user?.email ?? null;
      } catch {
        email = null;
      }
      const { data: profile } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", row.user_id)
        .maybeSingle();

      results.push({
        userId: row.user_id as string,
        email,
        role: row.role as PlatformRole,
        isActive: Boolean(row.is_active),
        displayName: (row.display_name as string | null) ?? profile?.display_name ?? null,
        lastLoginAt: (row.last_login_at as string | null) ?? null,
        createdAt: row.created_at as string,
      });
    }
    return results;
  });

export const upsertPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid().optional(),
        email: z.string().email().optional(),
        role: platformRoleSchema,
        displayName: z.string().trim().max(120).nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .refine((v) => Boolean(v.userId || v.email), {
        message: "Either userId or email is required.",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.ADMINS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();

    let targetUserId = data.userId ?? null;
    if (!targetUserId && data.email) {
      targetUserId = await findUserIdByEmail(db, data.email);
      if (!targetUserId) {
        const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(
          data.email,
        );
        if (inviteErr) throw new Error(inviteErr.message);
        targetUserId = invited?.user?.id ?? null;
      }
    }
    if (!targetUserId) throw new Error("Could not resolve target user.");

    const { data: before } = await db
      .from("platform_admins")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const payload = {
      user_id: targetUserId,
      role: data.role,
      display_name: data.displayName ?? before?.display_name ?? null,
      is_active: data.isActive ?? before?.is_active ?? true,
      level:
        data.role === "platform_owner"
          ? "owner"
          : data.role.replace("platform_", ""),
    };

    const { data: upserted, error } = await db
      .from("platform_admins")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: before ? "platform_admin.update" : "platform_admin.create",
      resource_type: "platform_admin",
      resource_id: targetUserId,
      before_state: before,
      after_state: upserted,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return upserted;
  });

export const listPlatformPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.PERMISSIONS_VIEW);

    const db = await getAdmin();
    const [{ data: permissions, error: permErr }, { data: rolePerms, error: rpErr }] =
      await Promise.all([
        db.from("platform_permissions").select("key, label, category, description").order("category"),
        db.from("platform_role_permissions").select("role, permission_key"),
      ]);
    if (permErr) throw new Error(permErr.message);
    if (rpErr) throw new Error(rpErr.message);

    const matrix: Record<string, string[]> = {};
    for (const role of PLATFORM_ROLES) matrix[role] = [];
    for (const rp of rolePerms ?? []) {
      const role = rp.role as string;
      if (!matrix[role]) matrix[role] = [];
      matrix[role].push(rp.permission_key as string);
    }

    return {
      permissions: (permissions ?? []).map(
        (p: { key: string; label: string; category: string; description?: string | null }) => ({
          key: p.key,
          label: p.label,
          category: p.category,
          description: p.description ?? null,
        }),
      ),
      roles: [...PLATFORM_ROLES],
      matrix,
    };
  });

export const updateRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        role: platformRoleSchema,
        permissionKeys: z.array(z.string().min(1)),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.PERMISSIONS_UPDATE);

    if (data.role === "platform_owner") {
      throw new Error("platform_owner always has every permission; matrix is not editable.");
    }

    const db = await getAdmin();
    const meta = getRequestMeta();

    const { data: before } = await db
      .from("platform_role_permissions")
      .select("permission_key")
      .eq("role", data.role);

    const { error: delErr } = await db
      .from("platform_role_permissions")
      .delete()
      .eq("role", data.role);
    if (delErr) throw new Error(delErr.message);

    if (data.permissionKeys.length > 0) {
      const { error: insErr } = await db.from("platform_role_permissions").insert(
        data.permissionKeys.map((permission_key) => ({
          role: data.role,
          permission_key,
        })),
      );
      if (insErr) throw new Error(insErr.message);
    }

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "role_permissions.update",
      resource_type: "platform_role",
      resource_id: data.role,
      before_state: { permissionKeys: (before ?? []).map((r: { permission_key: string }) => r.permission_key) },
      after_state: { permissionKeys: data.permissionKeys },
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return { ok: true as const, role: data.role, permissionKeys: data.permissionKeys };
  });

export const getPlatformSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SETTINGS_VIEW);

    const db = await getAdmin();
    const { data, error } = await db.from("platform_settings").select("key, value, updated_at, updated_by");
    if (error) throw new Error(error.message);

    const result: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const row of data ?? []) {
      result[row.key as string] = row.value;
    }
    return result;
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ value: z.record(z.any()) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SETTINGS_UPDATE);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    const { data: beforeRows } = await db.from("platform_settings").select("key, value");
    const before: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const row of beforeRows ?? []) before[row.key as string] = row.value;

    const upserts = Object.entries(data.value).map(([key, value]) => ({
      key,
      value,
      updated_at: now,
      updated_by: context.userId,
    }));

    if (upserts.length > 0) {
      const { error } = await db.from("platform_settings").upsert(upserts, { onConflict: "key" });
      if (error) throw new Error(error.message);
    }

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "platform_settings.update",
      resource_type: "platform_settings",
      resource_id: "platform_settings",
      before_state: before,
      after_state: data.value,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return data.value as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

// ---------------------------------------------------------------------------
// Support mode
// ---------------------------------------------------------------------------

export const startSupportMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        organizationId: z.string().uuid(),
        reason: z.string().trim().min(3).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SUPPORT_ACCESS);

    const db = await getAdmin();
    const meta = getRequestMeta();

    // End any existing open sessions for this admin first.
    await db
      .from("platform_support_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("platform_admin_id", context.userId)
      .is("ended_at", null);

    const { data: session, error } = await db
      .from("platform_support_sessions")
      .insert({
        platform_admin_id: context.userId,
        organization_id: data.organizationId,
        reason: data.reason,
      })
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await logPlatformAudit({
      actor_id: admin.userId,
      actor_role: admin.role,
      actor_label: admin.displayName,
      action: "support_mode.start",
      resource_type: "organization",
      resource_id: data.organizationId,
      organization_id: data.organizationId,
      support_session_id: session?.id ?? null,
      reason: data.reason,
      after_state: session,
      ip_address: meta.ipAddress,
      user_agent: meta.userAgent,
    });

    return session;
  });

export const endSupportMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        sessionId: z.string().uuid().optional(),
        organizationId: z.string().uuid().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SUPPORT_ACCESS);

    const db = await getAdmin();
    const meta = getRequestMeta();
    const now = new Date().toISOString();

    let query = db
      .from("platform_support_sessions")
      .update({ ended_at: now })
      .eq("platform_admin_id", context.userId)
      .is("ended_at", null);

    if (data.sessionId) query = query.eq("id", data.sessionId);
    if (data.organizationId) query = query.eq("organization_id", data.organizationId);

    const { data: ended, error } = await query.select("*");
    if (error) throw new Error(error.message);

    for (const session of ended ?? []) {
      await logPlatformAudit({
        actor_id: admin.userId,
        actor_role: admin.role,
        actor_label: admin.displayName,
        action: "support_mode.end",
        resource_type: "organization",
        resource_id: session.organization_id,
        organization_id: session.organization_id,
        support_session_id: session.id,
        after_state: session,
        ip_address: meta.ipAddress,
        user_agent: meta.userAgent,
      });
    }

    return { ok: true as const, ended: ended ?? [] };
  });

export const getActiveSupportSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await requirePlatformAdmin(context.userId);
    assertPlatformPerm(admin.permissions, PLATFORM_PERMISSIONS.SUPPORT_ACCESS);

    const db = await getAdmin();
    const { data: session, error } = await db
      .from("platform_support_sessions")
      .select("*, businesses:organization_id(id, name, slug)")
      .eq("platform_admin_id", context.userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!session) return null;

    return {
      id: session.id as string,
      organizationId: session.organization_id as string,
      organizationName: (session.businesses as { name?: string } | null)?.name ?? null,
      organizationSlug: (session.businesses as { slug?: string } | null)?.slug ?? null,
      reason: session.reason as string,
      startedAt: session.started_at as string,
    };
  });
