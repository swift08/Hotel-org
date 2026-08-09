import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public (customer) endpoints. No session: the QR slug is the only key, and it
 * resolves business -> branch -> table server-side. Prices, taxes and totals are
 * always recomputed from the database — client values are never trusted.
 * Scoped and secured using server-controlled signed HttpOnly cookies to prevent IDOR/BOLA.
 */

export async function resolveTableCore(slug: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: table } = await supabaseAdmin
    .from("restaurant_tables")
    .select("id, label, state, is_active, business_id, branch_id, scan_count")
    .eq("qr_slug", slug)
    .maybeSingle();

  if (!table) return { ok: false as const, reason: "unknown" as const };
  if (!table.is_active || table.state === "disabled") {
    return { ok: false as const, reason: "disabled" as const, tableLabel: table.label };
  }

  const [{ data: business }, { data: settings }, { data: branch }] = await Promise.all([
    supabaseAdmin
      .from("businesses")
      .select("id, name, currency, is_active")
      .eq("id", table.business_id)
      .maybeSingle(),
    supabaseAdmin
      .from("business_settings")
      .select(
        "tax_mode, default_tax_rate, service_charge_rate, cash_payment_enabled, online_payment_enabled, address_line2",
      )
      .eq("business_id", table.business_id)
      .maybeSingle(),
    supabaseAdmin
      .from("branches")
      .select("id, name, is_active")
      .eq("id", table.branch_id)
      .maybeSingle(),
  ]);

  if (!business?.is_active || !branch?.is_active)
    return { ok: false as const, reason: "closed" as const };

  await supabaseAdmin
    .from("restaurant_tables")
    .update({ scan_count: (table.scan_count ?? 0) + 1, last_scanned_at: new Date().toISOString() })
    .eq("id", table.id);

  let diningSessionId: string | null = null;
  const { data: activeSession } = (await (supabaseAdmin as any)
    .from("dining_sessions")
    .select("id, session_token")
    .eq("table_id", table.id)
    .eq("status", "active")
    .maybeSingle()) as any;

  let sessionToken = "";
  if (activeSession) {
    diningSessionId = (activeSession as any).id;
    sessionToken = (activeSession as any).session_token;
  } else {
    const crypto = await import("crypto");
    sessionToken = "sess_" + crypto.randomBytes(8).toString("hex");
    const { data: newSession, error: sessErr } = (await (supabaseAdmin as any)
      .from("dining_sessions")
      .insert({
        business_id: table.business_id,
        branch_id: table.branch_id,
        table_id: table.id,
        session_token: sessionToken,
        status: "active",
      })
      .select("id")
      .single()) as any;
    if (sessErr || !newSession) {
      throw new Error("Could not initialize dining session.");
    }
    diningSessionId = (newSession as any).id;
  }

  // Set signed customer session cookie if in HTTP server context
  try {
    const { setCustomerSession } = await import("@/lib/cookie");
    setCustomerSession({
      businessId: table.business_id,
      branchId: table.branch_id,
      tableId: table.id,
      diningSessionId,
      sessionToken,
    });
  } catch {
    // Ignore cookie setting when called outside HTTP request context (e.g. CLI runner)
  }

  return {
    ok: true as const,
    table: { id: table.id, label: table.label, state: table.state },
    business: { id: business.id, name: business.name, currency: business.currency },
    branch: { id: branch.id, name: branch.name },
    settings: settings ?? null,
    diningSessionId,
  };
}

export const resolveTable = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ slug: z.string().min(3).max(100) }).parse(input))
  .handler(async ({ data }) => {
    return resolveTableCore(data.slug);
  });

export const getPublicMenu = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ slug: z.string().min(3).max(100) }).parse(input))
  .handler(async () => {
    const { getCustomerSession } = await import("@/lib/cookie");
    const session = getCustomerSession();
    if (!session) {
      return { categories: [], products: [], variants: [], addonGroups: [], addons: [] };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const businessId = session["businessId"];

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
      return start <= end
        ? minutesNow >= start && minutesNow <= end
        : minutesNow >= start || minutesNow <= end;
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
        idempotencyKey: z.string().min(8).max(100),
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
    const { getCustomerSession } = await import("@/lib/cookie");
    const session = getCustomerSession();
    if (!session || !session["diningSessionId"]) {
      throw new Error("Session expired or invalid. Please scan the QR code again.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeTotals, round2 } = await import("@/lib/pricing");
    const { nextOrderNumber } = await import("@/lib/db.server");

    // Authoritative verification of dining session and its status
    const { data: dbSession } = (await (supabaseAdmin as any)
      .from("dining_sessions")
      .select("id, status, table_id, business_id, branch_id, session_token")
      .eq("id", session["diningSessionId"])
      .maybeSingle()) as any;

    if (!dbSession) {
      throw new Error("Dining session not found. Please scan the QR code again.");
    }
    if ((dbSession as any).status !== "active") {
      throw new Error(
        "This dining session has already been completed or settled. Further orders are not permitted.",
      );
    }

    const { data: table } = await supabaseAdmin
      .from("restaurant_tables")
      .select("id, label, is_active, state, business_id, branch_id")
      .eq("id", dbSession.table_id)
      .maybeSingle();

    if (!table || !table.is_active || table.state === "disabled") {
      throw new Error("This table is no longer active. Please contact staff.");
    }

    // Double tap protection: check idempotency
    const { data: existing } = await (supabaseAdmin as any)
      .from("orders")
      .select("id, order_number, grand_total, status")
      .eq("business_id", dbSession.business_id)
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing)
      return { orderId: existing.id, orderNumber: existing.order_number, duplicate: true };

    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select("tax_mode, default_tax_rate, service_charge_rate")
      .eq("business_id", dbSession.business_id)
      .maybeSingle();

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const variantIds = data.items.map((i) => i.variantId).filter(Boolean) as string[];
    const addonIds = data.items.flatMap((i) => i.addonIds ?? []);

    const [{ data: dbProducts }, { data: dbVariants }, { data: dbAddons }] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, base_price, tax_rate, is_available, business_id, station")
        .in("id", productIds)
        .eq("business_id", dbSession.business_id), // Scope strictly to current business
      supabaseAdmin
        .from("product_variants")
        .select("id, name, price, is_available")
        .in("id", variantIds)
        .eq("business_id", dbSession.business_id),
      supabaseAdmin
        .from("addons")
        .select("id, name, price, is_available")
        .in("id", addonIds)
        .eq("business_id", dbSession.business_id),
    ]);

    const productsMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));
    const variantsMap = new Map((dbVariants ?? []).map((v) => [v.id, v]));
    const addonsMap = new Map((dbAddons ?? []).map((a) => [a.id, a]));

    const lines = data.items.map((item) => {
      const p = productsMap.get(item.productId);
      if (!p || !p.is_available) {
        throw new Error(`Product not available or access denied.`);
      }
      let variant = null;
      if (item.variantId) {
        variant = variantsMap.get(item.variantId);
        if (!variant || !variant.is_available) {
          throw new Error("Selected variant not available.");
        }
      }
      const selectedAddons = (item.addonIds ?? []).map((aid) => {
        const ad = addonsMap.get(aid);
        if (!ad || !ad.is_available) {
          throw new Error("Selected addon not available.");
        }
        return ad;
      });

      const basePrice = variant ? Number(variant.price) : Number(p.base_price);
      const addonsPrice = selectedAddons.reduce((acc, ad) => acc + Number(ad.price), 0);
      const unitPrice = round2(basePrice);
      const quantity = item.quantity;
      const taxRate = Number(p.tax_rate ?? settings?.default_tax_rate ?? 0);

      return {
        product: p,
        variant,
        selectedAddons,
        priced: { unitPrice, addonsPrice, quantity, taxRate },
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

    const orderNumber = await nextOrderNumber(supabaseAdmin, dbSession.business_id);
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from("orders")
      .insert({
        business_id: dbSession.business_id,
        branch_id: dbSession.branch_id,
        table_id: dbSession.table_id,
        table_label: table.label,
        order_number: orderNumber,
        channel: "qr",
        status: "pending",
        session_token: dbSession.session_token,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        notes: data.notes ?? null,
        subtotal: totals.subtotal,
        tax_total: totals.taxTotal,
        service_charge: totals.serviceCharge,
        discount_total: totals.discountTotal,
        grand_total: totals.grandTotal,
        idempotency_key: data.idempotencyKey,
        dining_session_id: dbSession.id,
      } as any)
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      // Race condition check
      const { data: raced } = (await (supabaseAdmin as any)
        .from("orders")
        .select("id, order_number, dining_session_id")
        .eq("business_id", dbSession.business_id)
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle()) as any;
      if (raced)
        return {
          orderId: (raced as any).id,
          orderNumber: (raced as any).order_number,
          diningSessionId: (raced as any).dining_session_id,
          duplicate: true,
        };
      throw new Error(orderError?.message ?? "Could not place the order.");
    }

    const itemRows = lines.map((l, index) => ({
      business_id: dbSession.business_id,
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
      business_id: dbSession.business_id,
      order_id: order.id,
      event: "order.placed",
      to_status: "pending",
      actor_label: `Customer • ${table.label}`,
      metadata: { channel: "qr", items: itemRows.length } as never,
    });
    await supabaseAdmin.from("restaurant_tables").update({ state: "occupied" }).eq("id", table.id);
    await supabaseAdmin.from("print_jobs").insert({
      business_id: dbSession.business_id,
      branch_id: dbSession.branch_id,
      order_id: order.id,
      job_type: "kitchen_ticket",
      status: "queued",
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      diningSessionId: dbSession.id,
      duplicate: false,
    };
  });

export const getPublicOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getCustomerSession } = await import("@/lib/cookie");
    const session = getCustomerSession();
    if (!session || !session["diningSessionId"]) {
      throw new Error("Unauthorized: Please scan the table QR code first.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await (supabaseAdmin as any)
      .from("orders")
      .select(
        "id, order_number, status, payment_status, table_label, subtotal, tax_total, service_charge, discount_total, grand_total, created_at, dining_session_id",
      )
      .eq("id", data.orderId)
      .maybeSingle();

    if (!order || (order as any).dining_session_id !== session["diningSessionId"]) {
      throw new Error("Order not found or access denied.");
    }

    const [{ data: items }, { data: events }] = await Promise.all([
      supabaseAdmin
        .from("order_items")
        .select(
          "id, product_name, variant_name, addons, quantity, line_total, special_instructions",
        )
        .eq("order_id", (order as any).id),
      supabaseAdmin
        .from("order_events")
        .select("event, to_status, created_at")
        .eq("order_id", (order as any).id)
        .order("created_at"),
    ]);

    const { dining_session_id: _ignored, ...safe } = order as any;
    return { order: safe, items: items ?? [], events: events ?? [] };
  });

export const getPublicDiningSession = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        diningSessionId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getCustomerSession } = await import("@/lib/cookie");
    const session = getCustomerSession();
    if (
      !session ||
      !session["diningSessionId"] ||
      session["diningSessionId"] !== data.diningSessionId
    ) {
      throw new Error("Unauthorized: Invalid dining session context.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dbSession } = (await (supabaseAdmin as any)
      .from("dining_sessions")
      .select("id, status")
      .eq("id", session["diningSessionId"])
      .maybeSingle()) as any;

    if (!dbSession) throw new Error("Dining session not found.");

    const { data: orders } = await (supabaseAdmin as any)
      .from("orders")
      .select("id, order_number, status, payment_status, grand_total, created_at")
      .eq("dining_session_id", session["diningSessionId"])
      .order("created_at", { ascending: false });

    return { session: dbSession, sessionStatus: (dbSession as any).status, orders: orders ?? [] };
  });

export const submitContactForm = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(2, "Full name is required").max(100, "Name too long"),
        businessName: z
          .string()
          .trim()
          .min(2, "Business name is required")
          .max(120, "Business name too long"),
        workEmail: z.string().trim().email("Invalid email address").max(150),
        phoneNumber: z
          .string()
          .trim()
          .min(7, "Phone number too short")
          .max(20, "Phone number too long"),
        businessType: z.string().trim().min(1, "Please select a business type").max(50),
        numberOfOutlets: z.string().trim().min(1, "Please select number of outlets").max(50),
        message: z.string().trim().max(1000, "Message cannot exceed 1000 characters").optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Sanitize string inputs to prevent HTML/Script injection
    const sanitize = (str: string) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const payload = {
      fullName: sanitize(data.fullName),
      businessName: sanitize(data.businessName),
      workEmail: sanitize(data.workEmail.toLowerCase()),
      phoneNumber: sanitize(data.phoneNumber),
      businessType: sanitize(data.businessType),
      numberOfOutlets: sanitize(data.numberOfOutlets),
      message: data.message ? sanitize(data.message) : "",
      submittedAt: new Date().toISOString(),
    };

    // Log contact lead securely on server
    console.log("[RASOI CONTACT LEAD]", payload);

    return {
      ok: true as const,
      message:
        "Thank you! Our ADMARK DIGITALS hospitality operations team will contact you within 24 hours.",
      referenceId: `LEAD-${Date.now().toString(36).toUpperCase()}`,
    };
  });
