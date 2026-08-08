/**
 * Single pricing + tax service. Every surface (customer cart, staff order,
 * invoice, reports) must use these functions so totals can never drift.
 * Pure functions only — safe on client and server.
 */
export type PricedLine = {
  unitPrice: number;
  addonsPrice: number;
  quantity: number;
  taxRate: number;
};

export type Totals = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  serviceCharge: number;
  grandTotal: number;
  lines: Array<{ lineNet: number; taxAmount: number; lineTotal: number }>;
};

export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function computeTotals(
  lines: PricedLine[],
  opts: {
    taxMode: "inclusive" | "exclusive";
    serviceChargeRate?: number;
    discountType?: "percent" | "amount";
    discountValue?: number;
  },
): Totals {
  const serviceChargeRate = opts.serviceChargeRate ?? 0;
  const gross = lines.map((l) => round2((l.unitPrice + l.addonsPrice) * l.quantity));
  const grossSum = round2(gross.reduce((a, b) => a + b, 0));

  let discountTotal = 0;
  if (opts.discountValue && opts.discountValue > 0) {
    discountTotal =
      opts.discountType === "amount"
        ? round2(opts.discountValue)
        : round2((grossSum * opts.discountValue) / 100);
  }
  // A discount can never exceed the order value.
  discountTotal = Math.min(discountTotal, grossSum);
  const discountFactor = grossSum > 0 ? (grossSum - discountTotal) / grossSum : 0;

  const computed = lines.map((l, i) => {
    const net = round2((gross[i] ?? 0) * discountFactor);
    if (opts.taxMode === "inclusive") {
      const base = round2(net / (1 + l.taxRate / 100));
      return { lineNet: base, taxAmount: round2(net - base), lineTotal: net };
    }
    const taxAmount = round2((net * l.taxRate) / 100);
    return { lineNet: net, taxAmount, lineTotal: round2(net + taxAmount) };
  });

  const subtotal = round2(computed.reduce((a, c) => a + c.lineNet, 0));
  const taxTotal = round2(computed.reduce((a, c) => a + c.taxAmount, 0));
  const serviceCharge = round2((subtotal * serviceChargeRate) / 100);
  const grandTotal = round2(subtotal + taxTotal + serviceCharge);

  return { subtotal, discountTotal, taxTotal, serviceCharge, grandTotal, lines: computed };
}

export function formatMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `${currency} ${(amount ?? 0).toFixed(2)}`;
  }
}

export function orderAgeMinutes(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
}
