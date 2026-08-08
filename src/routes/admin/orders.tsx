import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import {
  ShoppingBag,
  Search,
  IndianRupee,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Phone,
  QrCode,
  RefreshCw,
  Receipt,
  Loader2,
  DollarSign,
  ChefHat,
  Utensils,
  Circle,
  CreditCard,
  Banknote,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { collectPayment, generateInvoice, updateOrderStatus } from "@/lib/order.functions";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersManager,
});

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "New" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  pending: {
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25",
    dot: "bg-orange-500 dark:bg-orange-400",
    label: "New",
  },
  accepted: {
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25",
    dot: "bg-sky-500 dark:bg-sky-400",
    label: "Accepted",
  },
  preparing: {
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/25",
    dot: "bg-blue-500 dark:bg-blue-400",
    label: "Preparing",
  },
  ready: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    label: "Ready",
  },
  served: {
    badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25",
    dot: "bg-purple-500 dark:bg-purple-400",
    label: "Served",
  },
  completed: {
    badge: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25",
    dot: "bg-slate-500 dark:bg-slate-400",
    label: "Completed",
  },
  cancelled: {
    badge: "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25",
    dot: "bg-red-500 dark:bg-red-400",
    label: "Cancelled",
  },
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI / QR", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "netbanking", label: "Net Banking", icon: DollarSign },
];

function AdminOrdersManager() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Drawer / modals
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [invoice, setInvoice] = useState<any>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.membership?.business_id) {
        let query = supabase
          .from("orders")
          .select(`*, order_items (*)`)
          .eq("business_id", ctx.membership.business_id)
          .order("created_at", { ascending: false });

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter as any);
        }

        const { data: orderList, error } = await query;
        if (error) throw error;
        setOrders(orderList || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const businessId = context?.membership?.business_id;
    if (!businessId) return;

    const channel = supabase
      .channel(`admin_orders_${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            toast.info(`🎉 New Order #${payload.new?.order_number || ""} received!`, {
              description: `Table: ${payload.new?.table_label || "Counter"} — ₹${payload.new?.grand_total || 0}`,
            });
          }
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, context?.membership?.business_id]);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    if (!context?.membership?.business_id) return;
    try {
      await updateOrderStatus({
        data: {
          businessId: context.membership.business_id,
          orderId,
          toStatus: nextStatus,
        }
      });

      // Automatically set table to occupied when order is accepted
      if (nextStatus === "accepted") {
        const targetOrder = orders.find((o) => o.id === orderId) || selectedOrder;
        if (targetOrder?.table_id) {
          await supabase
            .from("restaurant_tables")
            .update({ state: "occupied" })
            .eq("id", targetOrder.table_id);
        } else if (targetOrder?.table_label) {
          await supabase
            .from("restaurant_tables")
            .update({ state: "occupied" })
            .eq("business_id", context.membership.business_id)
            .eq("label", targetOrder.table_label);
        }
      }

      // Automatically free table when order is completed
      if (nextStatus === "completed") {
        const targetOrder = orders.find((o) => o.id === orderId) || selectedOrder;
        if (targetOrder?.table_id) {
          await supabase
            .from("restaurant_tables")
            .update({ state: "available" })
            .eq("id", targetOrder.table_id);
        } else if (targetOrder?.table_label) {
          await supabase
            .from("restaurant_tables")
            .update({ state: "available" })
            .eq("business_id", context.membership.business_id)
            .eq("label", targetOrder.table_label);
        }
      }

      toast.success(`Order → ${nextStatus.toUpperCase()}`);
      setSelectedOrder((prev: any) => prev ? { ...prev, status: nextStatus } : prev);
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update order status");
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder || !context?.membership?.business_id) return;
    try {
      await collectPayment({
        data: {
          businessId: context.membership.business_id,
          orderId: selectedOrder.id,
          method: paymentMethod as any,
          amount: Number(selectedOrder.grand_total),
        }
      });

      await supabase
        .from("orders")
        .update({ payment_status: "paid", status: "completed" })
        .eq("id", selectedOrder.id);

      // AUTOMATIC TABLE RELEASE: Set table state to available
      if (selectedOrder.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ state: "available" })
          .eq("id", selectedOrder.table_id);
      } else if (selectedOrder.table_label) {
        await supabase
          .from("restaurant_tables")
          .update({ state: "available" })
          .eq("business_id", context.membership.business_id)
          .eq("label", selectedOrder.table_label);
      }

      // Complete the dining session
      await supabase
        .from("dining_sessions" as any)
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("table_id", selectedOrder.table_id || "")
        .eq("status", "active");

      toast.success(`Payment collected! Order completed & Table ${selectedOrder.table_label || ""} freed (Available).`);
      setPayModalOpen(false);
      setDrawerOpen(false);
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to process payment");
    }
  };

  const handleOpenBillModal = async () => {
    if (!selectedOrder || !context?.membership?.business_id) return;
    setGeneratingInvoice(true);
    setBillModalOpen(true);
    setInvoice(null);
    try {
      const inv = await generateInvoice({
        data: {
          businessId: context.membership.business_id,
          orderId: selectedOrder.id,
        }
      });
      setInvoice(inv);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate tax invoice");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const currencySymbol = context?.business?.currency === "INR" ? "₹" : "$";

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      (o.table_label && o.table_label.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q))
    );
  });

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.value] = tab.value === "all"
      ? orders.length
      : orders.filter((o) => o.status === tab.value).length;
    return acc;
  }, {} as Record<string, number>);

  const getStatusConf = (s: string) =>
    STATUS_CONFIG[s] || { badge: "bg-slate-700 text-slate-400 border-slate-700", dot: "bg-slate-500", label: s };

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-6 w-6 text-amber-500 shrink-0" /> Live Orders & Billing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time counter tickets, order progression, and payment processing.
          </p>
        </div>
        <Button
          onClick={fetchOrders}
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white shrink-0"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Status Tab Bar ───────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.value] || 0;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                id={`orders-tab-${tab.value}`}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                    : "border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0 text-[10px] font-bold min-w-[18px] text-center ${
                      isActive ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-3">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search by order #, table, customer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-850 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-amber-500/60 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 hover:text-slate-750 dark:hover:text-slate-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Orders Grid ──────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="h-12 w-12 text-slate-400 dark:text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No orders found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-600 mt-1">
              {searchQuery ? "Try a different search term." : "No orders match this status filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((ord) => {
              const isPaid = ord.payment_status === "paid";
              const itemCount = ord.order_items?.length || 0;
              const sc = getStatusConf(ord.status);

              return (
                <Card
                  key={ord.id}
                  className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur shadow-md dark:shadow-lg text-slate-800 dark:text-slate-100 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-700 transition-all hover:-translate-y-0.5"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Order header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-black text-amber-600 dark:text-amber-400">
                            {ord.table_label || "Counter"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            #{ord.order_number}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500">
                          {new Date(ord.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={`text-[10px] font-bold px-2 py-0 capitalize ${sc.badge}`}>
                          <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </Badge>
                        <Badge
                          className={`text-[9px] font-bold px-1.5 py-0 ${
                            isPaid
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                              : "bg-slate-55 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isPaid ? "PAID" : "UNPAID"}
                        </Badge>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 border-y border-slate-100 dark:border-slate-800/80 py-2.5">
                      {ord.order_items?.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center gap-2">
                          <span className="truncate">
                            <span className="text-amber-650 dark:text-amber-400 font-bold">{item.quantity}×</span>{" "}
                            {item.product_name}
                          </span>
                          <span className="font-semibold shrink-0">
                            {currencySymbol}{Number(item.line_total).toFixed(0)}
                          </span>
                        </div>
                      ))}
                      {itemCount > 3 && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-600 italic">+ {itemCount - 3} more items</p>
                      )}
                    </div>

                    {/* Total + action */}
                    <div className="flex items-center justify-between">                     {itemCount > 3 && (
                        <p className="text-[10px] text-slate-600 italic">+ {itemCount - 3} more items</p>
                      )}
                    </div>

                    {/* Total + action */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wide">Grand Total</p>
                        <p className="text-lg font-black text-amber-400">
                          {currencySymbol}{Number(ord.grand_total).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        id={`view-order-${ord.id}`}
                        onClick={() => {
                          setSelectedOrder(ord);
                          setDrawerOpen(true);
                        }}
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-8"
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Order Detail Sheet (Right Drawer) ────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 text-slate-100 overflow-y-auto p-0"
        >
          <SheetHeader className="sticky top-0 bg-slate-900/95 backdrop-blur z-10 px-6 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg font-bold text-white">
                  Order #{selectedOrder?.order_number}
                </SheetTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedOrder?.table_label || "Counter"} ·{" "}
                  {selectedOrder?.created_at
                    ? new Date(selectedOrder.created_at).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : ""}
                </p>
              </div>
              {selectedOrder && (
                <Badge
                  className={`text-[11px] font-bold px-2.5 py-1 capitalize ${
                    getStatusConf(selectedOrder.status).badge
                  }`}
                >
                  {getStatusConf(selectedOrder.status).label}
                </Badge>
              )}
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-6">
            {/* Status Timeline */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Order Progress</p>
              <div className="flex items-center gap-0">
                {["pending", "accepted", "preparing", "ready", "served", "completed"].map((s, idx, arr) => {
                  const statusOrder = ["pending", "accepted", "preparing", "ready", "served", "completed"];
                  const currentIdx = statusOrder.indexOf(selectedOrder?.status);
                  const reached = statusOrder.indexOf(s) <= currentIdx;
                  const isCurrent = s === selectedOrder?.status;
                  const sc = getStatusConf(s);
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isCurrent
                              ? `${sc.dot} border-current ring-2 ring-current/30`
                              : reached
                              ? "bg-slate-600 border-slate-600"
                              : "bg-transparent border-slate-700"
                          }`}
                        >
                          {reached && <div className="h-1.5 w-1.5 rounded-full bg-white/80" />}
                        </div>
                        <span className={`text-[9px] font-semibold capitalize leading-none ${
                          isCurrent ? "text-white" : reached ? "text-slate-500" : "text-slate-700"
                        }`}>
                          {s}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-0.5 -mt-4 ${
                            statusOrder.indexOf(arr[idx + 1]!) <= currentIdx
                              ? "bg-slate-600"
                              : "bg-slate-800"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer info */}
            {selectedOrder?.customer_name && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-1.5 text-xs">
                <p className="text-slate-500 uppercase tracking-wide font-semibold text-[10px] mb-2">Customer</p>
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="h-3.5 w-3.5 text-slate-600" />
                  {selectedOrder.customer_name}
                </div>
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-slate-600" />
                    {selectedOrder.customer_phone}
                  </div>
                )}
              </div>
            )}

            {/* Order items */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Items ({selectedOrder?.order_items?.length || 0})
              </p>
              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                {selectedOrder?.order_items?.map((item: any) => (
                  <div key={item.id} className="px-4 py-3 bg-slate-950/60 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.quantity}× {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p className="text-[11px] text-slate-500 mt-0.5">Variant: {item.variant_name}</p>
                      )}
                      {item.special_instructions && (
                        <p className="text-[11px] text-amber-400 mt-0.5 font-medium">
                          ⚠ {item.special_instructions}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-amber-400 text-sm shrink-0">
                      {currencySymbol}{Number(item.line_total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial summary */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{currencySymbol}{Number(selectedOrder?.subtotal || 0).toFixed(2)}</span>
              </div>
              {Number(selectedOrder?.discount_total || 0) > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Discount</span>
                  <span>-{currencySymbol}{Number(selectedOrder?.discount_total).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Tax (GST)</span>
                <span>{currencySymbol}{Number(selectedOrder?.tax_total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                <span>Grand Total</span>
                <span className="text-amber-400">
                  {currencySymbol}{Number(selectedOrder?.grand_total || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Status update actions */}
            {selectedOrder?.status !== "completed" && selectedOrder?.status !== "cancelled" && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Update Status
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["accepted", "preparing", "ready", "served", "completed", "cancelled"].map((s) => {
                    const sc = getStatusConf(s);
                    return (
                      <Button
                        key={s}
                        id={`status-btn-${s}`}
                        onClick={() => handleUpdateOrderStatus(selectedOrder?.id, s)}
                        size="sm"
                        variant="outline"
                        disabled={selectedOrder?.status === s}
                        className={`border-slate-800 bg-slate-950/80 text-xs capitalize h-8 ${
                          s === "cancelled"
                            ? "text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        } disabled:opacity-40`}
                      >
                        {s}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment + Print actions */}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                id="print-gst-bill"
                onClick={handleOpenBillModal}
                variant="outline"
                className="border-slate-700 bg-slate-950/80 text-slate-200 hover:bg-slate-800 w-full"
              >
                <Printer className="mr-2 h-4 w-4" /> Print GST Bill
              </Button>

              {selectedOrder?.payment_status !== "paid" && (
                <Button
                  id="collect-payment"
                  onClick={() => setPayModalOpen(true)}
                  className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 w-full shadow-md shadow-amber-500/20"
                >
                  <DollarSign className="mr-2 h-4 w-4" /> Collect Payment
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Collect Payment Modal ─────────────────────────── */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Collect Payment
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              Order #{selectedOrder?.order_number} ·{" "}
              <span className="text-amber-400 font-bold">
                {currencySymbol}{Number(selectedOrder?.grand_total || 0).toFixed(2)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = pm.icon;
                const isSelected = paymentMethod === pm.value;
                return (
                  <button
                    key={pm.value}
                    id={`pay-method-${pm.value}`}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                      isSelected
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                        : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                    {pm.label}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleProcessPayment}
              className="w-full bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 h-11"
            >
              Confirm & Complete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Printable GST Receipt Modal ───────────────────── */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="bg-white text-black max-w-sm p-6 rounded-2xl print:p-0">
          <DialogHeader className="text-center border-b border-gray-200 pb-3">
            <DialogTitle className="text-lg font-bold uppercase tracking-wide">
              {context?.business?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              TAX INVOICE —{" "}
              {context?.settings?.gstin
                ? `GSTIN: ${context.settings.gstin}`
                : "GST INVOICE"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex justify-between text-gray-600 font-semibold">
              <span>Invoice: {generatingInvoice ? "Generating..." : invoice?.invoice_number || "Draft"}</span>
              <span>Table: {selectedOrder?.table_label || "Counter"}</span>
            </div>
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Order ID: #{selectedOrder?.order_number}</span>
              <span>
                {selectedOrder?.created_at
                  ? new Date(selectedOrder.created_at).toLocaleString()
                  : ""}
              </span>
            </div>

            <div className="border-t border-b border-gray-200 py-2 space-y-1.5 font-mono">
              {selectedOrder?.order_items?.map((item: any) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.quantity}× {item.product_name}</span>
                  <span>{currencySymbol}{Number(item.line_total).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right font-mono">
              <div className="text-gray-600">
                Subtotal: {currencySymbol}{Number(selectedOrder?.subtotal || 0).toFixed(2)}
              </div>
              <div className="text-gray-600">
                GST: {currencySymbol}{Number(selectedOrder?.tax_total || 0).toFixed(2)}
              </div>
              <div className="text-sm font-extrabold pt-1 border-t border-black">
                Total: {currencySymbol}{Number(selectedOrder?.grand_total || 0).toFixed(2)}
              </div>
            </div>

            <div className="text-center text-[10px] text-gray-400 pt-3 border-t border-gray-200">
              Thank you for dining with us! 🙏
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button
              onClick={() => window.print()}
              className="w-full bg-black text-white font-bold hover:bg-gray-800"
            >
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
