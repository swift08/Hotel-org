import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Collect a payment against an order.
 * Creates a payment record and updates the order's payment_status.
 * Supports split payments: multiple calls for the same order accumulate.
 */
export const collectPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        orderId: z.string().uuid(),
        method: z.enum(["cash", "upi", "card", "netbanking", "wallet", "other"]),
        amount: z.number().min(0.01).max(10000000),
        provider: z.string().trim().max(40).optional(),
        providerPaymentId: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "payments.collect");

    // Fetch order
    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, grand_total, payment_status, status")
      .eq("id", data.orderId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (fetchErr || !order) throw new Error("Order not found.");
    if (order.payment_status === "paid") throw new Error("This order is already fully paid.");

    // Sum existing payments for this order
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("order_id", data.orderId)
      .eq("status", "paid");

    const previouslyPaid = (existingPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAfterThis = previouslyPaid + data.amount;
    const grandTotal = Number(order.grand_total);

    // Create payment record
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        business_id: data.businessId,
        order_id: data.orderId,
        provider: data.provider ?? "manual",
        method: data.method as never,
        status: "paid" as never,
        amount: data.amount,
        currency: "INR",
        provider_payment_id: data.providerPaymentId ?? null,
        verified_at: new Date().toISOString(),
        collected_by: userId,
      })
      .select("id, amount, method, status")
      .single();
    if (payErr) throw new Error(payErr.message);

    // Update order payment_status
    const newPaymentStatus = totalAfterThis >= grandTotal ? "paid" : "pending";
    await supabase
      .from("orders")
      .update({ payment_status: newPaymentStatus as never })
      .eq("id", data.orderId);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "payment.collected",
      entity_type: "payment",
      entity_id: payment.id,
      after_state: {
        orderId: data.orderId,
        amount: data.amount,
        method: data.method,
        totalPaid: totalAfterThis,
        grandTotal,
        fullyPaid: totalAfterThis >= grandTotal,
      },
    });

    return {
      payment,
      totalPaid: totalAfterThis,
      grandTotal,
      fullyPaid: totalAfterThis >= grandTotal,
    };
  });

/**
 * Issue a refund against a payment.
 * Supports partial refunds: multiple calls for the same payment accumulate.
 */
export const issueRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        paymentId: z.string().uuid(),
        amount: z.number().min(0.01).max(10000000),
        reason: z.string().trim().min(2).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "payments.refund");

    // Fetch payment
    const { data: payment } = await supabase
      .from("payments")
      .select("id, order_id, amount, status")
      .eq("id", data.paymentId)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (!payment) throw new Error("Payment not found.");
    if (payment.status !== "paid") throw new Error("Only paid payments can be refunded.");

    // Check refund doesn't exceed payment amount
    const { data: existingRefunds } = await supabase
      .from("refunds")
      .select("amount")
      .eq("payment_id", data.paymentId);
    const previouslyRefunded = (existingRefunds ?? []).reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    if (previouslyRefunded + data.amount > Number(payment.amount)) {
      throw new Error("Refund amount exceeds the original payment.");
    }

    // Create refund record
    const { data: refund, error: refErr } = await supabase
      .from("refunds")
      .insert({
        business_id: data.businessId,
        payment_id: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        issued_by: userId,
      })
      .select("id, amount, reason")
      .single();
    if (refErr) throw new Error(refErr.message);

    // Update statuses
    const totalRefunded = previouslyRefunded + data.amount;
    const isFullRefund = totalRefunded >= Number(payment.amount);
    const newPaymentStatus = isFullRefund ? "refunded" : "partially_refunded";

    await supabase
      .from("payments")
      .update({ status: newPaymentStatus as never })
      .eq("id", data.paymentId);

    await supabase
      .from("orders")
      .update({ payment_status: newPaymentStatus as never })
      .eq("id", payment.order_id);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "payment.refunded",
      entity_type: "refund",
      entity_id: refund.id,
      after_state: {
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        totalRefunded,
        fullRefund: isFullRefund,
      },
    });

    return refund;
  });

/**
 * Generate an invoice for an order.
 * Captures a full snapshot of the order + items + payments at invoice time.
 * Idempotent: returns existing invoice if one already exists.
 */
export const generateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ businessId: z.string().uuid(), orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, logAudit } =
      await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);
    assertPerm(perms, "billing.print");

    // Idempotent: return existing invoice
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, issued_at")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (existingInvoice) return existingInvoice;

    // Fetch order + items + settings for invoice snapshot
    const [
      { data: order },
      { data: items },
      { data: settings },
      { data: business },
      { data: payments },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", data.orderId)
        .eq("business_id", data.businessId)
        .maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", data.orderId),
      supabase
        .from("business_settings")
        .select("legal_name, gstin, address_line1, city, state, postal_code, phone, invoice_prefix")
        .eq("business_id", data.businessId)
        .maybeSingle(),
      supabase.from("businesses").select("name, currency").eq("id", data.businessId).maybeSingle(),
      supabase.from("payments").select("*").eq("order_id", data.orderId).eq("status", "paid"),
    ]);

    if (!order) throw new Error("Order not found.");

    // Generate sequential invoice number
    const prefix = settings?.invoice_prefix ?? "INV";
    const { count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", data.businessId);
    const seq = (count ?? 0) + 1;
    const invoiceNumber = `${prefix}-${String(seq).padStart(6, "0")}`;

    const snapshot = {
      business: { name: business?.name, currency: business?.currency },
      settings: settings ?? {},
      order,
      items: items ?? [],
      payments: payments ?? [],
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
    };

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        business_id: data.businessId,
        order_id: data.orderId,
        invoice_number: invoiceNumber,
        snapshot: snapshot as never,
      })
      .select("id, invoice_number, issued_at")
      .single();
    if (invErr) throw new Error(invErr.message);

    await logAudit(supabase, {
      business_id: data.businessId,
      actor_id: userId,
      actor_role: membership.role,
      action: "invoice.generated",
      entity_type: "invoice",
      entity_id: invoice.id,
      after_state: { invoiceNumber, orderId: data.orderId },
    });

    return invoice;
  });

/**
 * Transition an order's status using the server-side state machine.
 * Validates the transition against VALID_ORDER_TRANSITIONS and uses
 * optimistic locking (version field) to prevent concurrent modification.
 */
export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        businessId: z.string().uuid(),
        orderId: z.string().uuid(),
        toStatus: z.string().min(2),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { requireMembership, resolvePermissions, assertPerm, transitionOrderStatus } =
      await import("@/lib/db.server");
    const membership = await requireMembership(supabase, userId, data.businessId);
    const perms = await resolvePermissions(supabase, membership.business_id, membership.role);

    // Require appropriate permission based on target status
    if (data.toStatus === "cancelled" || data.toStatus === "rejected") {
      assertPerm(perms, "orders.cancel");
    } else if (data.toStatus === "refunded") {
      assertPerm(perms, "orders.refund");
    } else {
      if (
        !perms.includes("orders.edit") &&
        !perms.includes("kds.view") &&
        !perms.includes("kds.manage")
      ) {
        assertPerm(perms, "orders.edit");
      }
    }

    const updated = await transitionOrderStatus(supabase, {
      businessId: data.businessId,
      orderId: data.orderId,
      toStatus: data.toStatus,
      actorId: userId,
      actorRole: membership.role,
      reason: data.reason ?? null,
    });

    return updated;
  });
