import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMenu = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [categories, products, variants, groups, addons] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("id, name, description, sort_order, state, is_active, parent_id")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("products")
        .select(
          "id, category_id, name, description, base_price, sku, tax_rate, prep_time_minutes, food_tags, station, is_available, available_from, available_to, state, is_archived, sort_order, images",
        )
        .eq("business_id", data.businessId)
        .eq("is_archived", false)
        .order("sort_order"),
      supabase
        .from("product_variants")
        .select("id, product_id, name, price, is_default, is_available, sort_order")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("addon_groups")
        .select("id, product_id, name, is_required, min_select, max_select, sort_order")
        .eq("business_id", data.businessId)
        .order("sort_order"),
      supabase
        .from("addons")
        .select("id, group_id, name, price, is_available, sort_order")
        .eq("business_id", data.businessId)
        .order("sort_order"),
    ]);

    return {
      categories: categories.data ?? [],
      products: products.data ?? [],
      variants: variants.data ?? [],
      addonGroups: groups.data ?? [],
      addons: addons.data ?? [],
    };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(60),
        description: z.string().trim().max(240).optional(),
        parentId: z.string().uuid().nullable().optional(),
        sortOrder: z.number().int().min(0).max(999).optional(),
        state: z.enum(["draft", "published"]).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const payload = {
      business_id: data.businessId,
      name: data.name,
      description: data.description ?? null,
      parent_id: data.parentId ?? null,
      sort_order: data.sortOrder ?? 0,
      state: data.state ?? "published",
      is_active: data.isActive ?? true,
    };

    const query = data.id
      ? supabase.from("menu_categories").update(payload).eq("id", data.id).eq("business_id", data.businessId)
      : supabase.from("menu_categories").insert(payload);
    const { data: row, error } = await query.select("id, name, state, is_active").single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: data.id ? "menu.category_updated" : "menu.category_created",
      entity_type: "menu_category",
      entity_id: row.id,
      after_state: row,
    });
    return row;
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        id: z.string().uuid().optional(),
        categoryId: z.string().uuid().nullable().optional(),
        name: z.string().trim().min(1).max(80),
        description: z.string().trim().max(500).optional(),
        basePrice: z.number().min(0).max(1000000),
        sku: z.string().trim().max(40).optional(),
        taxRate: z.number().min(0).max(40).nullable().optional(),
        prepTimeMinutes: z.number().int().min(0).max(240).optional(),
        foodTags: z.array(z.string().max(20)).max(8).optional(),
        station: z.enum(["kitchen", "bar"]).optional(),
        availableFrom: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        availableTo: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
        state: z.enum(["draft", "published"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    let before: { base_price: number } | null = null;
    if (data.id) {
      const { data: existing } = await supabase
        .from("products")
        .select("base_price")
        .eq("id", data.id)
        .eq("business_id", data.businessId)
        .maybeSingle();
      before = existing ?? null;
      if (before && before.base_price !== data.basePrice) assertPerm(perms, "menu.price");
    }
    if (data.state === "published") assertPerm(perms, "menu.publish");

    const payload = {
      business_id: data.businessId,
      category_id: data.categoryId ?? null,
      name: data.name,
      description: data.description ?? null,
      base_price: data.basePrice,
      sku: data.sku ?? null,
      tax_rate: data.taxRate ?? null,
      prep_time_minutes: data.prepTimeMinutes ?? 10,
      food_tags: data.foodTags ?? [],
      station: data.station ?? "kitchen",
      available_from: data.availableFrom ?? null,
      available_to: data.availableTo ?? null,
      state: data.state ?? "draft",
    };

    const query = data.id
      ? supabase.from("products").update(payload).eq("id", data.id).eq("business_id", data.businessId)
      : supabase.from("products").insert(payload);
    const { data: row, error } = await query.select("id, name, base_price, state").single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: data.id ? "menu.item_updated" : "menu.item_created",
      entity_type: "product",
      entity_id: row.id,
      before_state: before,
      after_state: row,
    });
    return row;
  });

export const setProductAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        productId: z.string().uuid(),
        isAvailable: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const { data: row, error } = await supabase
      .from("products")
      .update({ is_available: data.isAvailable })
      .eq("id", data.productId)
      .eq("business_id", data.businessId)
      .select("id, name, is_available")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: data.isAvailable ? "menu.item_available" : "menu.item_out_of_stock",
      entity_type: "product",
      entity_id: data.productId,
      after_state: row,
    });
    return row;
  });

export const setProductState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        productId: z.string().uuid(),
        state: z.enum(["draft", "published"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, data.state === "published" ? "menu.publish" : "menu.edit");

    const { data: row, error } = await supabase
      .from("products")
      .update({ state: data.state })
      .eq("id", data.productId)
      .eq("business_id", data.businessId)
      .select("id, name, state")
      .single();
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: data.state === "published" ? "menu.item_published" : "menu.item_unpublished",
      entity_type: "product",
      entity_id: data.productId,
      after_state: row,
    });
    return row;
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), productId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.delete");

    const { error } = await supabase
      .from("products")
      .update({ is_archived: true, is_available: false, state: "draft" })
      .eq("id", data.productId)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "menu.item_archived",
      entity_type: "product",
      entity_id: data.productId,
    });
    return { ok: true };
  });

export const saveVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        productId: z.string().uuid(),
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(40),
        price: z.number().min(0).max(1000000),
        isDefault: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const payload = {
      business_id: data.businessId,
      product_id: data.productId,
      name: data.name,
      price: data.price,
      is_default: data.isDefault ?? false,
    };
    const query = data.id
      ? supabase.from("product_variants").update(payload).eq("id", data.id).eq("business_id", data.businessId)
      : supabase.from("product_variants").insert(payload);
    const { data: row, error } = await query.select("id, name, price, is_default").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), variantId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", data.variantId)
      .eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveAddonGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        productId: z.string().uuid(),
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(40),
        isRequired: z.boolean().optional(),
        minSelect: z.number().int().min(0).max(10).optional(),
        maxSelect: z.number().int().min(1).max(10).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const payload = {
      business_id: data.businessId,
      product_id: data.productId,
      name: data.name,
      is_required: data.isRequired ?? false,
      min_select: data.minSelect ?? 0,
      max_select: data.maxSelect ?? 1,
    };
    const query = data.id
      ? supabase.from("addon_groups").update(payload).eq("id", data.id).eq("business_id", data.businessId)
      : supabase.from("addon_groups").insert(payload);
    const { data: row, error } = await query.select("id, name, is_required, min_select, max_select").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        groupId: z.string().uuid(),
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(40),
        price: z.number().min(0).max(100000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");

    const payload = {
      business_id: data.businessId,
      group_id: data.groupId,
      name: data.name,
      price: data.price,
    };
    const query = data.id
      ? supabase.from("addons").update(payload).eq("id", data.id).eq("business_id", data.businessId)
      : supabase.from("addons").insert(payload);
    const { data: row, error } = await query.select("id, name, price").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAddonEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        kind: z.enum(["group", "addon"]),
        id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm } = await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "menu.edit");
    const table = data.kind === "group" ? "addon_groups" : "addons";
    const { error } = await supabase.from(table).delete().eq("id", data.id).eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
