import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions } = await import("@/lib/db.server");

    const { data: membership } = await supabase
      .from("memberships")
      .select("id, business_id, role, branch_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("id", userId)
      .maybeSingle();

    if (!membership) {
      return { onboarded: false as const, profile: profile ?? null };
    }
    void requireMembership;

    const [{ data: business }, { data: settings }, { data: branches }, permissions] =
      await Promise.all([
        supabase.from("businesses").select("*").eq("id", membership.business_id).maybeSingle(),
        supabase
          .from("business_settings")
          .select("*")
          .eq("business_id", membership.business_id)
          .maybeSingle(),
        supabase
          .from("branches")
          .select("id, name, city, is_active")
          .eq("business_id", membership.business_id)
          .order("created_at"),
        resolvePermissions(supabase, membership.business_id, membership.role),
      ]);

    return {
      onboarded: true as const,
      profile: profile ?? null,
      membership,
      business,
      settings,
      branches: branches ?? [],
      permissions,
    };
  });

export const createBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        businessType: z.enum([
          "restaurant",
          "cafe",
          "hotel",
          "resort",
          "bar_pub",
          "cloud_kitchen",
          "food_outlet",
        ]),
        branchName: z.string().trim().min(1).max(60),
        city: z.string().trim().max(60).optional(),
        phone: z.string().trim().max(20).optional(),
        gstin: z.string().trim().max(20).optional(),
        tableCount: z.number().int().min(0).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slugifyName, randomSlug, logAudit } = await import("@/lib/db.server");

    const { data: existing } = await supabaseAdmin
      .from("memberships")
      .select("business_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (existing) throw new Error("You already belong to a business.");

    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: data.name,
        slug: slugifyName(data.name),
        business_type: data.businessType,
        created_by: userId,
      })
      .select("id, name, slug")
      .single();
    if (bizError || !business)
      throw new Error(bizError?.message ?? "Could not create the business.");

    const { error: memberError } = await supabaseAdmin
      .from("memberships")
      .insert({ business_id: business.id, user_id: userId, role: "owner" });
    if (memberError) throw new Error(memberError.message);

    const { data: branch, error: branchError } = await supabaseAdmin
      .from("branches")
      .insert({
        business_id: business.id,
        name: data.branchName,
        city: data.city ?? null,
        phone: data.phone ?? null,
      })
      .select("id, name")
      .single();
    if (branchError || !branch)
      throw new Error(branchError?.message ?? "Could not create the branch.");

    await supabaseAdmin
      .from("business_settings")
      .update({ phone: data.phone ?? null, city: data.city ?? null, gstin: data.gstin ?? null })
      .eq("business_id", business.id);

    if (data.tableCount > 0) {
      const rows = Array.from({ length: data.tableCount }, (_, i) => ({
        business_id: business.id,
        branch_id: branch.id,
        label: `Table ${String(i + 1).padStart(2, "0")}`,
        qr_slug: randomSlug(),
        sort_order: i,
      }));
      const { error: tableError } = await supabaseAdmin.from("restaurant_tables").insert(rows);
      if (tableError) throw new Error(tableError.message);
    }

    await logAudit(supabaseAdmin, {
      business_id: business.id,
      actor_id: userId,
      actor_role: "owner",
      action: "business.created",
      entity_type: "business",
      entity_id: business.id,
      after_state: { name: business.name, branch: branch.name, tables: data.tableCount },
    });

    return { businessId: business.id, branchId: branch.id };
  });

export const updateBusinessSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        legal_name: z.string().trim().max(120).nullable().optional(),
        address_line1: z.string().trim().max(160).nullable().optional(),
        city: z.string().trim().max(60).nullable().optional(),
        state: z.string().trim().max(60).nullable().optional(),
        postal_code: z.string().trim().max(12).nullable().optional(),
        phone: z.string().trim().max(20).nullable().optional(),
        gstin: z.string().trim().max(20).nullable().optional(),
        address_line2: z.string().trim().max(500).nullable().optional(),
        tax_mode: z.enum(["inclusive", "exclusive"]).optional(),
        default_tax_rate: z.number().min(0).max(40).optional(),
        service_charge_rate: z.number().min(0).max(30).optional(),
        cash_payment_enabled: z.boolean().optional(),
        online_payment_enabled: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "settings.manage");

    const { data: before } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", data.businessId)
      .maybeSingle();

    const { businessId, ...rest } = data;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    const { data: after, error } = await supabase
      .from("business_settings")
      .update(patch as never)
      .eq("business_id", businessId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "settings.updated",
      entity_type: "business_settings",
      entity_id: businessId,
      before_state: before,
      after_state: after,
    });
    return after;
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "staff.view");

    const { data: rows, error } = await supabase
      .from("memberships")
      .select("id, user_id, role, branch_id, is_active, created_at")
      .eq("business_id", data.businessId)
      .order("created_at");
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, phone")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    return (rows ?? []).map((r) => ({
      ...r,
      profile: (profiles ?? []).find((p) => p.id === r.user_id) ?? null,
    }));
  });

export const updateStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        membershipId: z.string().uuid(),
        role: z.string().min(2),
        branchId: z.string().uuid().nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "staff.edit");

    const { data: target } = await supabase
      .from("memberships")
      .select("id, user_id, role, branch_id, is_active")
      .eq("id", data.membershipId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!target) throw new Error("Staff member not found.");
    if (target.user_id === userId) throw new Error("You cannot change your own role.");
    if (target.role === "owner" && membership.role !== "owner")
      throw new Error("Only an owner can modify another owner.");
    if (data.role === "owner" && membership.role !== "owner")
      throw new Error("Only an owner can assign the owner role.");
    if (data.role === "business_admin" && membership.role !== "owner")
      throw new Error("Only an owner can assign the admin role.");

    const { data: after, error } = await supabase
      .from("memberships")
      .update({
        role: data.role as any,
        branch_id: data.branchId ?? null,
        ...(data.isActive === undefined ? {} : { is_active: data.isActive }),
      })
      .eq("id", data.membershipId)
      .select("id, role, branch_id, is_active")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "staff.role_changed",
      entity_type: "membership",
      entity_id: data.membershipId,
      before_state: target,
      after_state: after,
    });
    return after;
  });

export const updateStaffMemberDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        membershipId: z.string().uuid(),
        displayName: z.string().trim().min(2).optional(),
        phone: z.string().trim().optional(),
        role: z.string().min(2).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "staff.edit");

    const { data: target } = await supabase
      .from("memberships")
      .select("id, user_id, role, is_active")
      .eq("id", data.membershipId)
      .eq("business_id", data.businessId)
      .maybeSingle();

    if (!target) throw new Error("Staff member not found.");
    if (target.user_id === userId && data.role && data.role !== target.role) {
      throw new Error("You cannot change your own role.");
    }
    if (target.role === "owner" && membership.role !== "owner") {
      throw new Error("Only an owner can modify another owner.");
    }
    if (
      data.role &&
      (data.role === "owner" || data.role === "business_admin") &&
      membership.role !== "owner"
    ) {
      throw new Error("Only an owner can assign owner or admin roles.");
    }

    if (data.displayName || data.phone !== undefined) {
      await supabaseAdmin.from("profiles").upsert({
        id: target.user_id,
        ...(data.displayName ? { display_name: data.displayName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      });
    }

    const patch: Record<string, any> = {};
    if (data.role) patch["role"] = data.role;
    if (data.isActive !== undefined) patch["is_active"] = data.isActive;

    if (Object.keys(patch).length > 0) {
      await supabase
        .from("memberships")
        .update(patch as any)
        .eq("id", data.membershipId);
    }

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "staff.updated",
      entity_type: "membership",
      entity_id: data.membershipId,
      after_state: { role: data.role, displayName: data.displayName, isActive: data.isActive },
    });

    return { ok: true };
  });

export const createStaffMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        email: z.string().trim().email(),
        password: z.string().min(6),
        fullName: z.string().trim().min(2),
        phone: z.string().trim().optional(),
        role: z.string().min(2),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const membership = await requireMembership(supabase, userId, data.businessId);
    if (!membership.is_active) throw new Error("Your account is disabled.");

    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "staff.manage");

    if ((data.role === "owner" || data.role === "business_admin") && membership.role !== "owner") {
      throw new Error("Only an owner can create owner or admin accounts.");
    }

    // Check if user already exists in auth
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    let staffUser = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );

    if (!staffUser) {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
      if (createErr || !newUser.user)
        throw new Error(createErr?.message || "Failed to create user account.");
      staffUser = newUser.user;
    }

    // Create or update profile
    await supabaseAdmin.from("profiles").upsert({
      id: staffUser.id,
      display_name: data.fullName,
      phone: data.phone || null,
    });

    // Get branch ID
    const targetBranchId = membership.branch_id || null;

    // Create membership
    const { data: newMem, error: memErr } = await supabaseAdmin
      .from("memberships")
      .insert({
        business_id: data.businessId,
        user_id: staffUser.id,
        branch_id: targetBranchId,
        role: data.role as any,
        is_active: true,
      })
      .select("id, role")
      .single();

    if (memErr) throw new Error(memErr.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "staff.created",
      entity_type: "membership",
      entity_id: newMem.id,
      after_state: { email: data.email, role: data.role },
    });

    return newMem;
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        role: z.string().min(2),
        permissionKey: z.string().min(2),
        allowed: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (membership.role !== "owner")
      throw new Error("Only the business owner can edit the permission matrix.");
    if (data.role === "owner") throw new Error("Owner permissions cannot be reduced.");

    const { error } = await supabase.from("role_permissions").upsert(
      {
        business_id: data.businessId,
        role: data.role as never,
        permission_key: data.permissionKey,
        allowed: data.allowed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id,role,permission_key" },
    );
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "permissions.changed",
      entity_type: "role_permission",
      entity_id: `${data.role}:${data.permissionKey}`,
      after_state: { role: data.role, permission: data.permissionKey, allowed: data.allowed },
    });
    return { ok: true };
  });

export const getPermissionMatrix = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: permissions }, { data: defaults }, { data: overrides }, { data: authorities }] =
      await Promise.all([
        supabase.from("permissions").select("key, label, category").order("category"),
        supabase.from("role_default_permissions").select("role, permission_key"),
        supabase
          .from("role_permissions")
          .select("role, permission_key, allowed")
          .eq("business_id", data.businessId),
        supabase
          .from("discount_authorities")
          .select("role, max_percent, unlimited, approval_required")
          .eq("business_id", data.businessId),
      ]);
    return {
      permissions: permissions ?? [],
      defaults: defaults ?? [],
      overrides: overrides ?? [],
      authorities: authorities ?? [],
    };
  });

export const setDiscountAuthority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        role: z.string().min(2),
        maxPercent: z.number().min(0).max(100),
        approvalRequired: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    if (membership.role !== "owner")
      throw new Error("Only the business owner can change discount limits.");

    const { error } = await supabase.from("discount_authorities").upsert(
      {
        business_id: data.businessId,
        role: data.role as never,
        max_percent: data.maxPercent,
        unlimited: false,
        approval_required: data.approvalRequired,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id,role" },
    );
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "discount_authority.changed",
      entity_type: "discount_authority",
      entity_id: data.role,
      after_state: {
        role: data.role,
        maxPercent: data.maxPercent,
        approvalRequired: data.approvalRequired,
      },
    });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_logs")
      .select(
        "id, action, entity_type, entity_id, actor_role, actor_label, before_state, after_state, reason, created_at",
      )
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
