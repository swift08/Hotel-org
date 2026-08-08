import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), branchId: z.string().uuid().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase
      .from("restaurant_tables")
      .select("id, label, seats, state, qr_slug, qr_version, scan_count, is_active, branch_id, sort_order")
      .eq("business_id", data.businessId)
      .order("sort_order")
      .order("label");
    if (data.branchId) query = query.eq("branch_id", data.branchId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createTables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
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
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "tables.manage");

    const { count } = await supabase
      .from("restaurant_tables")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", data.branchId);

    const rows = data.labels.map((label, i) => ({
      business_id: data.businessId,
      branch_id: data.branchId,
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
      after_state: { labels: data.labels },
    });
    return inserted ?? [];
  });

export const updateTable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
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
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "tables.manage");

    const { data: before } = await supabase
      .from("restaurant_tables")
      .select("id, label, seats, state, is_active")
      .eq("id", data.tableId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!before) throw new Error("Table not found.");

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
  .inputValidator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), tableId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, randomSlug, logAudit } = await import(
      "@/lib/db.server"
    );
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "qr.manage");

    const { data: before } = await supabase
      .from("restaurant_tables")
      .select("id, qr_slug, qr_version")
      .eq("id", data.tableId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!before) throw new Error("Table not found.");

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
