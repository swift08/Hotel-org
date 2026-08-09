import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import { 
  BarChart3, 
  Download, 
  IndianRupee, 
  ShoppingBag, 
  TrendingUp, 
  Calendar, 
  RefreshCw,
  Loader2,
  PieChart,
  DollarSign,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsAndAnalytics,
});

const PIE_COLORS = ["#f59e0b", "#10b981", "#6366f1", "#06b6d4", "#ec4899", "#8b5cf6"];

function ReportsAndAnalytics() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalTaxCollected: 0,
    totalDiscounts: 0,
  });

  const [dailySales, setDailySales] = useState<any[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [topDishData, setTopDishData] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.membership?.business_id) {
        const businessId = ctx.membership.business_id;

        // Fetch Orders with created_at and channel
        const { data: orders } = await supabase
          .from("orders")
          .select("id, grand_total, subtotal, tax_total, discount_total, status, payment_status, created_at, channel")
          .eq("business_id", businessId);

        // Fetch Order Items for Top Dishes
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_name, quantity, line_total")
          .eq("business_id", businessId);

        if (orders) {
          const completedPaid = orders.filter(
            (o) => o.status === "completed" || o.payment_status === "paid"
          );

          const revenue = completedPaid.reduce((acc, curr) => acc + Number(curr.grand_total || 0), 0);
          const tax = completedPaid.reduce((acc, curr) => acc + Number(curr.tax_total || 0), 0);
          const discount = completedPaid.reduce((acc, curr) => acc + Number(curr.discount_total || 0), 0);
          const count = completedPaid.length;
          const aov = count > 0 ? revenue / count : 0;

          setReportData({
            totalRevenue: revenue,
            totalOrders: count,
            averageOrderValue: aov,
            totalTaxCollected: tax,
            totalDiscounts: discount,
          });

          // 1. Compute Sales Trend (Last 14 days)
          const dateDailyMap: Record<string, number> = {};
          const sortedOrders = [...completedPaid].sort(
            (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );

          sortedOrders.forEach((o) => {
            if (!o.created_at) return;
            const dateKey = o.created_at.split("T")[0] || "";
            dateDailyMap[dateKey] = (dateDailyMap[dateKey] || 0) + Number(o.grand_total || 0);
          });

          const dailyTrend = Object.entries(dateDailyMap)
            .map(([date, amount]) => ({
              date: new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
              amount: Math.round(amount),
            }))
            .slice(-14);

          setDailySales(dailyTrend);

          // 2. Compute Channels Distribution
          const channelMap: Record<string, number> = {};
          orders.forEach((o) => {
            const ch = o.channel === "qr" ? "QR Ordering" : o.channel === "waiter" ? "Waiter App" : "POS Desktop";
            channelMap[ch] = (channelMap[ch] || 0) + 1;
          });

          const channelStats = Object.entries(channelMap).map(([name, value]) => ({
            name,
            value,
          }));

          setChannelData(channelStats);
        }

        // 3. Compute Top Selling Products
        if (orderItems) {
          const productMap: Record<string, { quantity: number; sales: number }> = {};
          orderItems.forEach((item) => {
            const name = item.product_name || "Unknown Item";
            const qty = Number(item.quantity || 0);
            const total = Number(item.line_total || 0);
            if (!productMap[name]) {
              productMap[name] = { quantity: 0, sales: 0 };
            }
            productMap[name].quantity += qty;
            productMap[name].sales += total;
          });

          const topDishes = Object.entries(productMap)
            .map(([name, data]) => ({
              name: name.replace("Curry Courtyard ", ""), // Shorten product names for layout
              quantity: data.quantity,
              sales: Math.round(data.sales),
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

          setTopDishData(topDishes);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load financial reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Metric,Value\n" +
      `Total Revenue,${reportData.totalRevenue}\n` +
      `Total Completed Orders,${reportData.totalOrders}\n` +
      `Average Order Value,${reportData.averageOrderValue.toFixed(2)}\n` +
      `Total GST Tax Collected,${reportData.totalTaxCollected}\n` +
      `Total Discounts Issued,${reportData.totalDiscounts}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Financial report exported to CSV");
  };

  const currencySymbol = context?.business?.currency === "INR" ? "₹" : "$";

  const canViewReports = !context || context.permissions?.includes("reports.view") || context.membership?.role === "owner" || context.membership?.role === "business_admin";

  if (!loading && context && !canViewReports) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-24 space-y-4">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Access Denied (403)</h2>
        <p className="text-slate-500 dark:text-slate-400">You do not have permission (`reports.view`) to access Reports & Analytics.</p>
        <Link to="/admin/dashboard">
          <Button variant="outline" className="mt-4">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-amber-500 shrink-0" /> Financial Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audited financial breakdown reconciled against completed and paid order records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchReportsData}
            variant="outline"
            size="sm"
            className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Button
            onClick={handleExportCSV}
            size="sm"
            className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 border border-amber-600/30"
          >
            <Download className="mr-2 h-4 w-4 shrink-0" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-md dark:shadow-xl text-slate-800 dark:text-slate-100 hover:border-slate-350 dark:hover:border-slate-700/60 transition-all duration-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Net Revenue</span>
            <div className="mt-3 text-3xl font-extrabold text-slate-800 dark:text-white">
              {currencySymbol}{reportData.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-md dark:shadow-xl text-slate-800 dark:text-slate-100 hover:border-slate-350 dark:hover:border-slate-700/60 transition-all duration-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Completed Orders</span>
            <div className="mt-3 text-3xl font-extrabold text-slate-800 dark:text-white">{reportData.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-md dark:shadow-xl text-slate-800 dark:text-slate-100 hover:border-slate-350 dark:hover:border-slate-700/60 transition-all duration-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">GST Tax Collected</span>
            <div className="mt-3 text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {currencySymbol}{reportData.totalTaxCollected.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-md dark:shadow-xl text-slate-800 dark:text-slate-100 hover:border-slate-350 dark:hover:border-slate-700/60 transition-all duration-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Discounts Issued</span>
            <div className="mt-3 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {currencySymbol}{reportData.totalDiscounts.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Revenue Trend (takes 2 cols on lg) */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-md dark:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" /> Daily Revenue Trend
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Total completed/paid sales volumes over the past 14 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 pr-4">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : isMounted && dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${currencySymbol}${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value) => [`${currencySymbol}${value}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No revenue history available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Channels Pie Chart */}
        <Card className="border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-md dark:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-amber-500" /> Order Channels
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Distribution of orders by placement source.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : isMounted && channelData.length > 0 ? (
              <div className="relative w-full h-full">
                <ResponsiveContainer width="100%" height="80%">
                  <RechartsPieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#fff" }}
                      labelStyle={{ color: "#fff" }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div className="absolute bottom-2 inset-x-0 flex justify-center gap-4 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 px-4">
                  {channelData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No channel analytics available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Top Selling Dishes (takes full width) */}
        <Card className="lg:col-span-3 border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-md dark:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" /> Top Selling Dishes
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Top 5 best selling menu items ranked by quantity ordered.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80 pr-4 pb-6">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : isMounted && topDishData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDishData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "#334155",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#fff" }}
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  />
                  <Bar dataKey="quantity" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {topDishData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No menu item sales data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
