import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), branchId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "tables.view");

    // SERVER-SIDE BRANCH SCOPING:
    // If membership has an assigned branch_id, enforce it. Client cannot bypass via data.branchId parameter.
    const effectiveBranchId =
      membership.branch_id && membership.role !== "owner" && membership.role !== "business_admin"
        ? membership.branch_id
        : data.branchId;

    let query = supabase
      .from("restaurant_tables")
      .select("id, label, seats, state, qr_slug, qr_version, scan_count, is_active, branch_id, sort_order")
      .eq("business_id", data.businessId)
      .order("sort_order")
      .order("label");

    if (effectiveBranchId) {
      query = query.eq("branch_id", effectiveBranchId);
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        branchId: z.string().uuid(),
        labels: z.array(z.string().trim().min(1).max(20)).min(1).max(100),
        seats: z.number().int().min(1).max(30).default(2),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, randomSlug, logAudit } = await import(
      "@/lib/db.server"
    );
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "tables.manage");

    // SERVER-SIDE BRANCH SCOPING:
    const targetBranchId =
      membership.branch_id && membership.role !== "owner" && membership.role !== "business_admin"
        ? membership.branch_id
        : data.branchId;

    if (membership.branch_id && membership.role !== "owner" && membership.role !== "business_admin") {
      if (data.branchId !== membership.branch_id) {
        throw new Error("Unauthorized: You can only manage tables for your assigned branch.");
      }
    }

    const { count } = await supabase
      .from("restaurant_tables")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", targetBranchId);

    const rows = data.labels.map((label, i) => ({
      business_id: data.businessId,
      branch_id: targetBranchId,
      label,
      seats: data.seats,
      qr_slug: randomSlug(),
      sort_order: (count ?? 0) + i,
    }));
    const { data: inserted, error } = await supabase.from("restaurant_tables").insert(rows).select("id, label");
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "tables.created",
      entity_type: "restaurant_table",
      after_state: { labels: data.labels, branchId: targetBranchId },
    });
    return inserted ?? [];
  });

export const updateTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        tableId: z.string().uuid(),
        label: z.string().trim().min(1).max(20).optional(),
        seats: z.number().int().min(1).max(30).optional(),
        state: z.enum(["available", "occupied", "payment_pending", "reserved", "disabled"]).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "tables.manage");

    const { data: before } = await supabase
      .from("restaurant_tables")
      .select("id, label, seats, state, is_active, branch_id")
      .eq("id", data.tableId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!before) throw new Error("Table not found.");

    if (membership.branch_id && membership.role !== "owner" && membership.role !== "business_admin") {
      if (before.branch_id !== membership.branch_id) {
        throw new Error("Unauthorized: You cannot modify a table belonging to another branch.");
      }
    }

    const patch: Record<string, unknown> = {};
    if (data.label !== undefined) patch["label"] = data.label;
    if (data.seats !== undefined) patch["seats"] = data.seats;
    if (data.state !== undefined) patch["state"] = data.state;
    if (data.isActive !== undefined) patch["is_active"] = data.isActive;

    const { data: after, error } = await supabase
      .from("restaurant_tables")
      .update(patch as never)
      .eq("id", data.tableId)
      .select("id, label, seats, state, is_active")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "tables.updated",
      entity_type: "restaurant_table",
      entity_id: data.tableId,
      before_state: before,
      after_state: after,
    });
    return after;
  });

export const regenerateTableQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), tableId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, randomSlug, logAudit } = await import(
      "@/lib/db.server"
    );
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "qr.manage");

    const { data: before } = await supabase
      .from("restaurant_tables")
      .select("id, qr_slug, qr_version, branch_id")
      .eq("id", data.tableId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!before) throw new Error("Table not found.");

    if (membership.branch_id && membership.role !== "owner" && membership.role !== "business_admin") {
      if (before.branch_id !== membership.branch_id) {
        throw new Error("Unauthorized: You cannot modify a table belonging to another branch.");
      }
    }

    const newSlug = randomSlug();
    const { data: after, error } = await supabase
      .from("restaurant_tables")
      .update({ qr_slug: newSlug, qr_version: before.qr_version + 1 })
      .eq("id", data.tableId)
      .select("id, qr_slug, qr_version")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("qr_slug_history").insert({
      business_id: data.businessId,
      table_id: data.tableId,
      old_slug: before.qr_slug,
      retired_by: userId,
    });
    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "qr.regenerated",
      entity_type: "restaurant_table",
      entity_id: data.tableId,
      before_state: { qr_version: before.qr_version },
      after_state: { qr_version: after.qr_version },
    });
    return after;
  });

export const clearTableAndCompleteOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), tableId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    if (!perms.includes("tables.manage") && !perms.includes("tables.view") && !perms.includes("orders.edit")) {
      assertPerm(perms, "tables.manage");
    }

    const { data: targetTable } = await supabase
      .from("restaurant_tables")
      .select("id, label, state, branch_id")
      .eq("id", data.tableId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!targetTable) throw new Error("Table not found.");

    if (membership.branch_id && membership.role !== "owner" && membership.role !== "business_admin") {
      if (targetTable.branch_id !== membership.branch_id) {
        throw new Error("Unauthorized: You cannot clear a table belonging to another branch.");
      }
    }

    // 1. Optimistic lock: only clear if table is NOT already available
    const { data: updatedTable, error: tErr } = await supabase
      .from("restaurant_tables")
      .update({ state: "available" })
      .eq("id", data.tableId)
      .eq("business_id", data.businessId)
      .neq("state", "available") // optimistic lock — prevents double-clear
      .select("id, label, state")
      .maybeSingle();

    if (tErr) throw new Error(tErr.message);
    if (!updatedTable) throw new Error("Table is already available or was cleared by another staff member.");

    // 2. Mark active orders for this table as completed and paid
    const activeStatuses = ["pending", "accepted", "preparing", "ready", "served"] as const;
    await supabase
      .from("orders")
      .update({ payment_status: "paid", status: "completed" })
      .eq("business_id", data.businessId)
      .eq("table_id", data.tableId)
      .in("status", activeStatuses);

    if (updatedTable.label) {
      await supabase
        .from("orders")
        .update({ payment_status: "paid", status: "completed" })
        .eq("business_id", data.businessId)
        .eq("table_label", updatedTable.label)
        .in("status", activeStatuses);
    }

    // 3. Mark dining session as completed
    await supabase
      .from("dining_sessions" as any)
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("table_id", data.tableId)
      .eq("status", "active");

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "tables.cleared_and_paid",
      entity_type: "restaurant_table",
      entity_id: data.tableId,
      after_state: { state: "available" },
    });

    return updatedTable;
  });
