import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import { listTables } from "@/lib/tables.functions";
import {
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  QrCode,
  Utensils,
  ChefHat,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
  Timer,
  Flame,
  Circle,
  CreditCard,
  Banknote,
  DollarSign,
  User,
  Phone,
  BedDouble,
  LogOut,
  Bell,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ROLE_CAN, ROLE_DISPLAY, type StaffRole } from "@/lib/rbac";

export const Route = createFileRoute("/admin/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrdersCount: 0,
    averageOrderValue: 0,
    activeTablesCount: 0,
    occupiedTablesCount: 0,
    pendingOrdersCount: 0,
    preparingOrdersCount: 0,
    paidOrdersCount: 0,
    unpaidOrdersCount: 0,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.membership?.business_id) {
        const tbls = await listTables({ data: { businessId: ctx.membership.business_id } });
        setTables(tbls || []);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: orders } = await supabase
          .from("orders")
          .select("id, grand_total, status, payment_status, created_at, table_label, customer_name, customer_phone")
          .eq("business_id", ctx.membership.business_id)
          .gte("created_at", todayStart.toISOString())
          .order("created_at", { ascending: false });

        if (orders) {
          const completedPaid = orders.filter(
            (o) => o.status === "completed" || o.payment_status === "paid"
          );
          const revenue = completedPaid.reduce((acc, curr) => acc + Number(curr.grand_total || 0), 0);
          const count = orders.length;
          const aov = completedPaid.length > 0 ? revenue / completedPaid.length : 0;
          const occupied = tbls
            ? tbls.filter((t: any) => t.state === "occupied" || t.state === "payment_pending").length
            : 0;
          const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "new").length;
          const preparingCount = orders.filter((o) => o.status === "preparing").length;
          const paidCount = orders.filter((o) => o.payment_status === "paid").length;
          const unpaidCount = orders.filter((o) => o.payment_status !== "paid" && o.status !== "cancelled").length;

          setStats({
            todayRevenue: revenue,
            todayOrdersCount: count,
            averageOrderValue: aov,
            activeTablesCount: tbls ? tbls.length : 0,
            occupiedTablesCount: occupied,
            pendingOrdersCount: pendingCount,
            preparingOrdersCount: preparingCount,
            paidOrdersCount: paidCount,
            unpaidOrdersCount: unpaidCount,
          });

          setRecentOrders(orders.slice(0, 8));
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const businessId = context?.membership?.business_id;
    if (!businessId) return;

    const channel = supabase
      .channel(`dashboard_live_${businessId}`)
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
            toast.info(`🔔 New live order #${payload.new?.order_number || ""} on ${payload.new?.table_label || "Table"}`);
          }
          loadDashboardData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [context?.membership?.business_id]);

  const currencySymbol = context?.business?.currency === "INR" ? "₹" : "$";
  const userRole = (context?.membership?.role || "owner") as StaffRole;
  const roleInfo = ROLE_DISPLAY[userRole] || ROLE_DISPLAY.owner;

  const occupancyPct =
    stats.activeTablesCount > 0
      ? Math.round((stats.occupiedTablesCount / stats.activeTablesCount) * 100)
      : 0;

  const getTableStatusStyle = (state: string) => {
    switch (state) {
      case "occupied":
        return { border: "border-amber-500/40", bg: "bg-amber-500/8", dot: "bg-amber-400", text: "text-white" };
      case "payment_pending":
        return { border: "border-red-500/40", bg: "bg-red-500/8", dot: "bg-red-400", text: "text-white" };
      case "available":
      default:
        return { border: "border-slate-800", bg: "bg-slate-900/30", dot: "bg-emerald-400", text: "text-slate-300" };
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-orange-500/15 text-orange-300 border-orange-500/25",
      new: "bg-orange-500/15 text-orange-300 border-orange-500/25",
      preparing: "bg-blue-500/15 text-blue-300 border-blue-500/25",
      ready: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
      served: "bg-purple-500/15 text-purple-300 border-purple-500/25",
      completed: "bg-slate-700 text-slate-400",
      cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
    };
    return map[status] || "bg-slate-700 text-slate-400";
  };

  // Render role header banner
  const HeaderBanner = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {title}
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold text-xs">
              <Circle className="h-2 w-2 fill-emerald-400 mr-1" />
              Live
            </Badge>
          </h1>
          <Badge className={`text-[10px] font-bold px-2 py-0.5 border ${roleInfo.color}`}>
            {roleInfo.label}
          </Badge>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {subtitle} <span className="text-slate-300 font-medium">{context?.business?.name}</span>
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Button
          onClick={loadDashboardData}
          variant="outline"
          size="sm"
          disabled={loading}
          className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>

        {ROLE_CAN.viewKds(userRole) && (
          <Link to="/kds">
            <Button
              size="sm"
              className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
            >
              <ChefHat className="mr-2 h-4 w-4" />
              Open KDS
            </Button>
          </Link>
        )}
      </div>
    </div>
  );

  // ── 1. CHEF / KITCHEN / BAR WORKSPACE ──────────────────────────────────────
  if (userRole === "chef" || userRole === "kitchen_staff" || userRole === "bar_staff") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <HeaderBanner
          title={`${roleInfo.label} Station Command`}
          subtitle="Real-time kitchen tickets and prep progression for"
        />

        {/* Kitchen Status Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-orange-500/30 bg-orange-500/5 text-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-orange-400">New Tickets</p>
                <p className="text-3xl font-black text-white mt-1">{stats.pendingOrdersCount}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400/80" />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Awaiting kitchen acceptance</p>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/5 text-slate-100 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-blue-400">Cooking Now</p>
                <p className="text-3xl font-black text-white mt-1">{stats.preparingOrdersCount}</p>
              </div>
              <Flame className="h-8 w-8 text-blue-400/80" />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Actively preparing on stations</p>
          </Card>

          <Card className="border-emerald-500/30 bg-emerald-500/5 text-slate-100 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-emerald-400">Live KDS Display</p>
                <p className="text-sm font-bold text-white mt-1">Full Touchscreen Mode</p>
              </div>
              <ChefHat className="h-8 w-8 text-emerald-400/80" />
            </div>
            <Link to="/kds" className="mt-3">
              <Button className="w-full bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 h-9">
                Launch KDS Fullscreen →
              </Button>
            </Link>
          </Card>
        </div>

        {/* Recent Kitchen Orders */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white">Active Kitchen Queue</CardTitle>
            <CardDescription className="text-xs text-slate-400">Current orders requiring preparation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.filter(o => o.status !== "completed" && o.status !== "cancelled").length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <ChefHat className="h-10 w-10 mx-auto mb-2 text-slate-700" />
                <p className="text-sm font-semibold text-slate-300">Kitchen Queue Clean!</p>
                <p className="text-xs text-slate-600">All pending tickets have been prepared and served.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentOrders.filter(o => o.status !== "completed" && o.status !== "cancelled").map(o => (
                  <div key={o.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{o.table_label || "Counter"}</span>
                      <Badge className={`text-[10px] font-bold capitalize ${getOrderStatusBadge(o.status)}`}>
                        {o.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      Placed at {new Date(o.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <Link to="/kds">
                      <Button size="sm" variant="outline" className="w-full text-xs h-7 border-slate-700 mt-1">
                        View Ticket Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 2. CASHIER WORKSPACE ──────────────────────────────────────────────────
  if (userRole === "cashier") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <HeaderBanner
          title="Cashier & Billing Terminal"
          subtitle="Real-time payment collection and receipt billing for"
        />

        {/* Cashier KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5 text-slate-100 p-5">
            <p className="text-xs uppercase font-bold text-emerald-400">Today's Collections</p>
            <p className="text-3xl font-black text-white mt-1">
              {currencySymbol}{stats.todayRevenue.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">{stats.paidOrdersCount} paid transactions today</p>
          </Card>

          <Card className="border-red-500/30 bg-red-500/5 text-slate-100 p-5">
            <p className="text-xs uppercase font-bold text-red-400">Unpaid Bills Queue</p>
            <p className="text-3xl font-black text-white mt-1">{stats.unpaidOrdersCount}</p>
            <p className="text-[11px] text-slate-400 mt-2">Tables waiting for checkout</p>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5 text-slate-100 p-5 flex flex-col justify-between">
            <p className="text-xs uppercase font-bold text-amber-400">Quick Counter POS</p>
            <Link to="/admin/orders" className="mt-2">
              <Button className="w-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400">
                Collect Payment & Print Receipt →
              </Button>
            </Link>
          </Card>
        </div>

        {/* Unpaid Orders Table Queue */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-white">Pending Collections Queue</CardTitle>
              <CardDescription className="text-xs text-slate-400">Orders requiring payment confirmation</CardDescription>
            </div>
            <Link to="/admin/orders">
              <Button size="sm" variant="outline" className="border-slate-700 text-xs">
                Open Billing Console
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentOrders.filter(o => o.payment_status !== "paid").length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-300">All Bills Settled!</p>
              </div>
            ) : (
              recentOrders.filter(o => o.payment_status !== "paid").map(o => (
                <div key={o.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-400">{o.table_label || "Counter"}</span>
                    <span className="text-xs text-slate-400 ml-2">#{o.id.slice(0, 8)}</span>
                    <p className="text-[11px] text-slate-500">Time: {new Date(o.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-white text-base">
                      {currencySymbol}{Number(o.grand_total).toFixed(2)}
                    </span>
                    <Link to="/admin/orders">
                      <Button size="sm" className="bg-amber-500 text-slate-950 font-bold text-xs h-8">
                        Collect
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 3. WAITER WORKSPACE ────────────────────────────────────────────────────
  if (userRole === "waiter") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <HeaderBanner
          title="Floor Service Station"
          subtitle="Table status map and order taking portal for"
        />

        {/* Table Station Grid */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                Floor Table Status
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse" />
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Green = Free, Amber = Occupied, Red = Bill Due</CardDescription>
            </div>
            <Link to="/admin/orders">
              <Button size="sm" className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 text-xs">
                + New Order
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {tables.map((t) => {
                const s = getTableStatusStyle(t.state);
                return (
                  <div key={t.id} className={`p-4 rounded-xl border ${s.border} ${s.bg} flex flex-col justify-between gap-3`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-base ${s.text}`}>{t.label}</span>
                      <div className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>{t.seats} seats</span>
                      <span className="capitalize text-[10px] font-semibold text-slate-300">{t.state.replace("_", " ")}</span>
                    </div>
                    <Link to="/admin/orders">
                      <Button size="sm" variant="outline" className="w-full text-xs h-7 border-slate-700 bg-slate-950">
                        Select Table
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 4. RECEPTIONIST / FRONT DESK / FLOOR MANAGER WORKSPACE ─────────────────
  if (userRole === "floor_manager") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <HeaderBanner
          title="Front Desk & Floor Command"
          subtitle="Guest requests, room/table status, and check-in tracking for"
        />

        {/* Receptionist Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Check-ins Today</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">18</p>
            <p className="text-[10px] text-slate-500">14 completed · 4 pending</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Occupancy Rate</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{occupancyPct}%</p>
            <p className="text-[10px] text-slate-500">{stats.occupiedTablesCount} occupied / {stats.activeTablesCount} total</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Active Orders</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{stats.todayOrdersCount}</p>
            <p className="text-[10px] text-slate-500">{stats.pendingOrdersCount} pending kitchen</p>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 p-4">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Guest Requests</p>
            <p className="text-2xl font-black text-purple-400 mt-1">4</p>
            <p className="text-[10px] text-slate-500">Room service & housekeeping</p>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/admin/tables">
            <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-200 text-xs h-11">
              <QrCode className="mr-2 h-4 w-4 text-amber-400" /> Table & Room Map
            </Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="outline" className="w-full border-slate-700 bg-slate-900 text-slate-200 text-xs h-11">
              <ShoppingBag className="mr-2 h-4 w-4 text-blue-400" /> Room Service Tickets
            </Button>
          </Link>
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 text-xs h-11">
            <User className="mr-2 h-4 w-4 text-emerald-400" /> Guest Check-In
          </Button>
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 text-xs h-11">
            <Bell className="mr-2 h-4 w-4 text-purple-400" /> Service Requests
          </Button>
        </div>

        {/* Floor Map & Active Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tables Map */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white">Live Floor & Room Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2.5">
                {tables.map((tbl) => {
                  const s = getTableStatusStyle(tbl.state);
                  return (
                    <div key={tbl.id} className={`p-3 rounded-xl border ${s.border} ${s.bg}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${s.text}`}>{tbl.label}</span>
                        <div className={`h-2 w-2 rounded-full ${s.dot}`} />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{tbl.seats} Seats</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Active Orders */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white">Active Service Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-amber-400">{o.table_label || "Counter"}</span>
                    <p className="text-[10px] text-slate-500">{new Date(o.created_at).toLocaleTimeString()}</p>
                  </div>
                  <Badge className={`text-[9px] font-bold capitalize ${getOrderStatusBadge(o.status)}`}>
                    {o.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── 5. OWNER / GM / ADMIN WORKSPACE (Full Command Center) ──────────────────
  const kpiCards = [
    {
      label: "Today's Revenue",
      value: `${currencySymbol}${stats.todayRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
      sub: "From completed transactions",
      icon: IndianRupee,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Orders Today",
      value: stats.todayOrdersCount,
      sub: "All dine-in & counter tickets",
      icon: ShoppingBag,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Avg Order Value",
      value: `${currencySymbol}${stats.averageOrderValue.toFixed(0)}`,
      sub: "Per completed bill",
      icon: Sparkles,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Table Occupancy",
      value: `${stats.occupiedTablesCount} / ${stats.activeTablesCount}`,
      sub: `${occupancyPct}% occupied right now`,
      icon: QrCode,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      label: "New (Pending)",
      value: stats.pendingOrdersCount,
      sub: "Awaiting kitchen action",
      icon: Clock,
      color: stats.pendingOrdersCount > 0 ? "text-orange-400" : "text-slate-500",
      bg: stats.pendingOrdersCount > 0 ? "bg-orange-500/10 border-orange-500/20" : "bg-slate-800/40 border-slate-700/40",
      urgent: stats.pendingOrdersCount > 3,
    },
    {
      label: "Kitchen Queue",
      value: stats.preparingOrdersCount,
      sub: "Orders actively preparing",
      icon: Flame,
      color: stats.preparingOrdersCount > 0 ? "text-red-400" : "text-slate-500",
      bg: stats.preparingOrdersCount > 0 ? "bg-red-500/10 border-red-500/20" : "bg-slate-800/40 border-slate-700/40",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <HeaderBanner
        title="Executive Command Center"
        subtitle="Real-time financial metrics and multi-tenant operations overview for"
      />

      {/* KPI Grid (6 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {kpiCards.map((card) => {
          const IconComp = card.icon;
          return (
            <Card
              key={card.label}
              className={`border bg-slate-900/80 backdrop-blur text-slate-100 shadow-lg transition-transform hover:-translate-y-0.5 ${
                card.urgent ? "ring-1 ring-orange-500/30" : ""
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 leading-tight">
                    {card.label}
                  </span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${card.bg}`}>
                    <IconComp className={`h-3.5 w-3.5 ${card.color}`} />
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-extrabold text-white block leading-none">
                  {loading ? (
                    <span className="inline-block h-6 w-16 rounded bg-slate-800 animate-pulse" />
                  ) : (
                    card.value
                  )}
                </span>
                <p className="text-[10px] sm:text-xs text-slate-600 mt-1.5 leading-snug">{card.sub}</p>
                {card.urgent && (
                  <Badge className="mt-2 bg-orange-500/15 text-orange-400 border-orange-500/25 text-[9px] font-bold px-1.5 py-0.5">
                    ⚡ Needs attention
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            to: "/admin/menu",
            icon: Utensils,
            label: "Manage Menu CMS",
            sub: "Categories, items, add-ons & variants",
            iconBg: "bg-amber-500/10 text-amber-400",
            hoverBg: "group-hover:bg-amber-500 group-hover:text-slate-950",
            hoverText: "group-hover:text-amber-400",
            arrowColor: "group-hover:text-amber-400",
          },
          {
            to: "/admin/tables",
            icon: QrCode,
            label: "Tables & QR Codes",
            sub: "Download PNG/PDF, bulk print, floor view",
            iconBg: "bg-blue-500/10 text-blue-400",
            hoverBg: "group-hover:bg-blue-500 group-hover:text-white",
            hoverText: "group-hover:text-blue-400",
            arrowColor: "group-hover:text-blue-400",
          },
          {
            to: "/admin/staff",
            icon: Users,
            label: "Staff & Permissions",
            sub: "Manage team roles & RBAC matrix",
            iconBg: "bg-purple-500/10 text-purple-400",
            hoverBg: "group-hover:bg-purple-500 group-hover:text-white",
            hoverText: "group-hover:text-purple-400",
            arrowColor: "group-hover:text-purple-400",
          },
        ].map((action) => {
          const IconComp = action.icon;
          return (
            <Link key={action.to} to={action.to}>
              <Card className="border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-all cursor-pointer group shadow-md hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent transition-all ${action.iconBg} ${action.hoverBg}`}
                    >
                      <IconComp className="h-4.5 w-4.5" style={{ width: "18px", height: "18px" }} />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold text-white text-sm transition-colors ${action.hoverText}`}>
                        {action.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">{action.sub}</p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 text-slate-600 shrink-0 transition-all ${action.arrowColor} group-hover:translate-x-1`}
                  />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* ── World-Class Visual Analytics & Hourly Revenue Curve ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Revenue Curve (2/3 Width) */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" /> Hourly Dining Revenue Trend
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">Live peak hours breakdown & sales velocity curve</CardDescription>
            </div>
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 font-bold text-xs">
              Peak: 8 PM - 10 PM
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-56 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="amberGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#d97706" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {/* SVG Grid Lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                <line x1="0" y1="165" x2="500" y2="165" stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />

                {/* Smooth Gradient Area Fill */}
                <path
                  d="M 0 165 Q 60 140 120 100 T 240 130 T 360 40 T 480 70 L 500 75 L 500 165 Z"
                  fill="url(#amberGlow)"
                />

                {/* Smooth Curve Line */}
                <path
                  d="M 0 165 Q 60 140 120 100 T 240 130 T 360 40 T 480 70 L 500 75"
                  fill="none"
                  stroke="url(#lineGlow)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Peak Highlighting Dots */}
                <circle cx="360" cy="40" r="5" fill="#fbbf24" className="animate-ping opacity-75" />
                <circle cx="360" cy="40" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                <circle cx="120" cy="100" r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
                <circle cx="480" cy="70" r="4" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
              </svg>

              {/* Peak Tooltip */}
              <div className="absolute top-3 left-[66%] -translate-x-1/2 bg-slate-950/90 border border-amber-500/40 px-2.5 py-1 rounded-lg shadow-lg text-[10px] text-amber-300 font-bold backdrop-blur">
                Dinner Peak: ₹14,250
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 border-t border-slate-800/80 pt-3">
              <span>12 PM (Lunch)</span>
              <span>3 PM</span>
              <span>6 PM</span>
              <span className="text-amber-400 font-extrabold">9 PM (Dinner Rush)</span>
              <span>11 PM</span>
            </div>
          </CardContent>
        </Card>

        {/* Category Revenue Breakdown (1/3 Width) */}
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <CardHeader className="border-b border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" /> Category Revenue Share
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">Sales split across culinary categories</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {[
              { cat: "Biryani & Rice Specialties", pct: 42, color: "bg-amber-500", val: "₹18,480" },
              { cat: "Tandoor & Starters", pct: 28, color: "bg-orange-500", val: "₹12,320" },
              { cat: "Rich Curries & Breads", pct: 18, color: "bg-emerald-500", val: "₹7,920" },
              { cat: "Beverages & Desserts", pct: 12, color: "bg-purple-500", val: "₹5,280" },
            ].map((item) => (
              <div key={item.cat} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-200">{item.cat}</span>
                  <span className="text-amber-300 font-extrabold">{item.val} ({item.pct}%)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/60">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Live Floor View (3/5 width) */}
        <Card className="lg:col-span-3 border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                Live Floor View
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 animate-pulse" />
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs mt-0.5">
                Current state of all tables — click Tables & QRs to manage.
              </CardDescription>
            </div>
            <Link to="/admin/tables">
              <Button size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs">
                Manage Tables
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <QrCode className="h-10 w-10 mx-auto mb-3 text-slate-700" />
                <p className="text-sm font-medium text-slate-400">No tables configured</p>
                <p className="text-xs text-slate-600 mt-1">Set up your floor plan to see live status</p>
                <Link to="/admin/tables" className="mt-3 inline-block">
                  <Button size="sm" className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Tables
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4 text-[11px] text-slate-500">
                  {[
                    { dot: "bg-emerald-400", label: "Available" },
                    { dot: "bg-amber-400", label: "Occupied" },
                    { dot: "bg-red-400", label: "Payment Due" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${l.dot}`} />
                      {l.label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {tables.map((tbl) => {
                    const s = getTableStatusStyle(tbl.state);
                    return (
                      <div
                        key={tbl.id}
                        className={`rounded-xl border p-3 transition-all flex flex-col justify-between gap-2 ${s.border} ${s.bg}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className={`font-bold text-xs leading-tight ${s.text}`}>{tbl.label}</span>
                          <div className={`h-2 w-2 rounded-full shrink-0 mt-0.5 ${s.dot}`} />
                        </div>
                        <div className="text-[10px] text-slate-600">{tbl.seats} seats</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders (2/5 width) */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-white">Recent Orders</CardTitle>
              <CardDescription className="text-slate-500 text-xs mt-0.5">
                Latest tickets from today's service.
              </CardDescription>
            </div>
            <Link to="/admin/orders">
              <Button size="sm" variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs">
                All Orders
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-slate-800 animate-pulse" />
              ))
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                <p className="text-xs">No orders today yet</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {order.table_label || "Counter"}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      {new Date(order.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-white">
                      {currencySymbol}{Number(order.grand_total || 0).toFixed(0)}
                    </span>
                    <Badge
                      className={`text-[9px] font-bold px-1.5 py-0 capitalize border ${getOrderStatusBadge(order.status)}`}
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
