import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public (customer) endpoints. No session: the QR slug is the only key, and it
 * resolves business -> branch -> table server-side. Prices, taxes and totals are
 * always recomputed from the database — client values are never trusted.
 */

export const resolveTable = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ slug: z.string().min(3).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: table } = await supabaseAdmin
      .from("restaurant_tables")
      .select("id, label, state, is_active, business_id, branch_id, scan_count")
      .eq("qr_slug", data.slug)
      .maybeSingle();

    if (!table) return { ok: false as const, reason: "unknown" as const };
    if (!table.is_active || table.state === "disabled") {
      return { ok: false as const, reason: "disabled" as const, tableLabel: table.label };
    }

    const [{ data: business }, { data: settings }, { data: branch }] = await Promise.all([
      supabaseAdmin.from("businesses").select("id, name, currency, is_active").eq("id", table.business_id).maybeSingle(),
      supabaseAdmin
        .from("business_settings")
        .select("tax_mode, default_tax_rate, service_charge_rate, cash_payment_enabled, online_payment_enabled")
        .eq("business_id", table.business_id)
        .maybeSingle(),
      supabaseAdmin.from("branches").select("id, name, is_active").eq("id", table.branch_id).maybeSingle(),
    ]);

    if (!business?.is_active || !branch?.is_active) return { ok: false as const, reason: "closed" as const };

    await supabaseAdmin
      .from("restaurant_tables")
      .update({ scan_count: (table.scan_count ?? 0) + 1, last_scanned_at: new Date().toISOString() })
      .eq("id", table.id);

    return {
      ok: true as const,
      table: { id: table.id, label: table.label, state: table.state },
      business: { id: business.id, name: business.name, currency: business.currency },
      branch: { id: branch.id, name: branch.name },
      settings: settings ?? null,
    };
  });

export const getPublicMenu = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ slug: z.string().min(3).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: table } = await supabaseAdmin
      .from("restaurant_tables")
      .select("business_id, is_active, state")
      .eq("qr_slug", data.slug)
      .maybeSingle();
    if (!table || !table.is_active || table.state === "disabled") {
      return { categories: [], products: [], variants: [], addonGroups: [], addons: [] };
    }

    const businessId = table.business_id;
    const [categories, products, variants, groups, addons] = await Promise.all([
      supabaseAdmin
        .from("menu_categories")
        .select("id, name, description, sort_order, parent_id")
        .eq("business_id", businessId)
        .eq("state", "published")
        .eq("is_active", true)
        .order("sort_order"),
      supabaseAdmin
        .from("products")
        .select(
          "id, category_id, name, description, base_price, tax_rate, prep_time_minutes, food_tags, is_available, available_from, available_to, images, sort_order",
        )
        .eq("business_id", businessId)
        .eq("state", "published")
        .eq("is_archived", false)
        .order("sort_order"),
      supabaseAdmin
        .from("product_variants")
        .select("id, product_id, name, price, is_default, is_available, sort_order")
        .eq("business_id", businessId)
        .eq("is_available", true)
        .order("sort_order"),
      supabaseAdmin
        .from("addon_groups")
        .select("id, product_id, name, is_required, min_select, max_select, sort_order")
        .eq("business_id", businessId)
        .order("sort_order"),
      supabaseAdmin
        .from("addons")
        .select("id, group_id, name, price, is_available, sort_order")
        .eq("business_id", businessId)
        .eq("is_available", true)
        .order("sort_order"),
    ]);

    // Time-based availability windows switch automatically.
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const withinWindow = (from: string | null, to: string | null) => {
      if (!from || !to) return true;
      const parse = (t: string) => {
        const [h, m] = t.split(":");
        return Number(h ?? 0) * 60 + Number(m ?? 0);
      };
      const start = parse(from);
      const end = parse(to);
      return start <= end ? minutesNow >= start && minutesNow <= end : minutesNow >= start || minutesNow <= end;
    };

    return {
      categories: categories.data ?? [],
      products: (products.data ?? []).filter((p) => withinWindow(p.available_from, p.available_to)),
      variants: variants.data ?? [],
      addonGroups: groups.data ?? [],
      addons: addons.data ?? [],
    };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        slug: z.string().min(3).max(100),
        sessionToken: z.string().min(8).max(64),
        idempotencyKey: z.string().min(8).max(64),
        customerName: z.string().trim().max(60).optional(),
        customerPhone: z.string().trim().max(20).optional(),
        notes: z.string().trim().max(300).optional(),
        items: z
          .array(
            z.object({
              productId: z.string().uuid(),
              variantId: z.string().uuid().nullable().optional(),
              addonIds: z.array(z.string().uuid()).max(20).optional(),
              quantity: z.number().int().min(1).max(50),
              specialInstructions: z.string().trim().max(200).optional(),
            }),
          )
          .min(1)
          .max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeTotals, round2 } = await import("@/lib/pricing");
    const { nextOrderNumber } = await import("@/lib/db.server");

    const { data: table } = await supabaseAdmin
      .from("restaurant_tables")
      .select("id, label, is_active, state, business_id, branch_id")
      .eq("qr_slug", data.slug)
      .maybeSingle();
    if (!table || !table.is_active || table.state === "disabled") {
      throw new Error("This QR code is no longer active. Please ask a staff member for help.");
    }

    // Idempotent: a double tap returns the order that already exists.
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, grand_total, status")
      .eq("business_id", table.business_id)
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing) return { orderId: existing.id, orderNumber: existing.order_number, duplicate: true };

    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select("tax_mode, default_tax_rate, service_charge_rate")
      .eq("business_id", table.business_id)
      .maybeSingle();

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const variantIds = data.items.map((i) => i.variantId).filter((v): v is string => Boolean(v));
    const addonIds = [...new Set(data.items.flatMap((i) => i.addonIds ?? []))];

    const [{ data: products }, { data: variants }, { data: addons }] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, base_price, tax_rate, station, is_available, state, is_archived, business_id")
        .in("id", productIds),
      variantIds.length
        ? supabaseAdmin.from("product_variants").select("id, product_id, name, price, is_available").in("id", variantIds)
        : Promise.resolve({ data: [] as Array<{ id: string; product_id: string; name: string; price: number; is_available: boolean }> }),
      addonIds.length
        ? supabaseAdmin.from("addons").select("id, name, price, is_available, group_id").in("id", addonIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; price: number; is_available: boolean; group_id: string }> }),
    ]);

    const defaultTax = Number(settings?.default_tax_rate ?? 0);
    const lines = data.items.map((item) => {
      const product = (products ?? []).find((p) => p.id === item.productId);
      if (
        !product ||
        product.business_id !== table.business_id ||
        product.is_archived ||
        product.state !== "published" ||
        !product.is_available
      ) {
        throw new Error("One of the items is no longer available. Please review your cart.");
      }
      const variant = item.variantId ? (variants ?? []).find((v) => v.id === item.variantId) : undefined;
      if (item.variantId && (!variant || variant.product_id !== product.id || !variant.is_available)) {
        throw new Error("A selected option is no longer available.");
      }
      const selectedAddons = (item.addonIds ?? []).map((id) => {
        const addon = (addons ?? []).find((a) => a.id === id);
        if (!addon || !addon.is_available) throw new Error("A selected add-on is no longer available.");
        return { id: addon.id, name: addon.name, price: Number(addon.price) };
      });

      const unitPrice = round2(Number(variant?.price ?? product.base_price));
      const addonsPrice = round2(selectedAddons.reduce((a, b) => a + b.price, 0));
      const taxRate = Number(product.tax_rate ?? defaultTax);

      return {
        product,
        variant,
        selectedAddons,
        priced: { unitPrice, addonsPrice, quantity: item.quantity, taxRate },
        specialInstructions: item.specialInstructions ?? null,
      };
    });

    const totals = computeTotals(
      lines.map((l) => l.priced),
      {
        taxMode: (settings?.tax_mode ?? "exclusive") as "inclusive" | "exclusive",
        serviceChargeRate: Number(settings?.service_charge_rate ?? 0),
      },
    );

    const orderNumber = await nextOrderNumber(supabaseAdmin, table.business_id);
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        business_id: table.business_id,
        branch_id: table.branch_id,
        table_id: table.id,
        table_label: table.label,
        order_number: orderNumber,
        channel: "qr",
        status: "pending",
        session_token: data.sessionToken,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        notes: data.notes ?? null,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        service_charge: totals.serviceCharge,
        discount_total: totals.discountTotal,
        grand_total: totals.grandTotal,
        idempotency_key: data.idempotencyKey,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      // Unique violation on the idempotency key = the first request already won.
      const { data: raced } = await supabaseAdmin
        .from("orders")
        .select("id, order_number")
        .eq("business_id", table.business_id)
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle();
      if (raced) return { orderId: raced.id, orderNumber: raced.order_number, duplicate: true };
      throw new Error(orderError?.message ?? "Could not place the order.");
    }

    const itemRows = lines.map((l, index) => ({
      business_id: table.business_id,
      order_id: order.id,
      product_id: l.product.id,
      variant_id: l.variant?.id ?? null,
      product_name: l.product.name,
      variant_name: l.variant?.name ?? null,
      addons: l.selectedAddons as never,
      unit_price: l.priced.unitPrice,
      addons_price: l.priced.addonsPrice,
      quantity: l.priced.quantity,
      tax_rate: l.priced.taxRate,
      tax_amount: totals.lines[index]?.taxAmount ?? 0,
      line_total: totals.lines[index]?.lineTotal ?? 0,
      special_instructions: l.specialInstructions,
      station: l.product.station,
    }));
    const { error: itemError } = await supabaseAdmin.from("order_items").insert(itemRows);
    if (itemError) throw new Error(itemError.message);

    await supabaseAdmin.from("order_events").insert({
      business_id: table.business_id,
      order_id: order.id,
      event: "order.placed",
      to_status: "pending",
      actor_label: `Customer • ${table.label}`,
      metadata: { channel: "qr", items: itemRows.length } as never,
    });
    await supabaseAdmin.from("restaurant_tables").update({ state: "occupied" }).eq("id", table.id);
    await supabaseAdmin.from("print_jobs").insert({
      business_id: table.business_id,
      branch_id: table.branch_id,
      order_id: order.id,
      job_type: "kitchen_ticket",
      status: "queued",
    });

    return { orderId: order.id, orderNumber: order.order_number, duplicate: false };
  });

export const getPublicOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        sessionToken: z.string().min(8).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, payment_status, table_label, subtotal, tax_total, service_charge, discount_total, grand_total, created_at, session_token",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    // Session token acts as the customer's bearer for their own order only.
    if (!order || order.session_token !== data.sessionToken) throw new Error("Order not found.");

    const [{ data: items }, { data: events }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select("id, product_name, variant_name, addons, quantity, line_total, special_instructions")
        .eq("order_id", order.id),
      supabaseAdmin
        .from("order_events")
        .select("event, to_status, created_at")
        .eq("order_id", order.id)
        .order("created_at"),
    ]);

    const { session_token: _ignored, ...safe } = order;
    return { order: safe, items: items ?? [], events: events ?? [] };
  });
