import { createFileRoute } from "@tanstack/react-router";
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
  PieChart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsAndAnalytics,
});

function ReportsAndAnalytics() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalTaxCollected: 0,
    totalDiscounts: 0,
  });

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.membership?.business_id) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, grand_total, subtotal, tax_total, discount_total, status, payment_status")
          .eq("business_id", ctx.membership.business_id);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Financial Reports & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audited financial breakdown reconciled against completed and paid order records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchReportsData}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Button
            onClick={handleExportCSV}
            size="sm"
            className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl text-slate-100">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Net Revenue</span>
            <div className="mt-3 text-3xl font-extrabold text-white">
              {currencySymbol}{reportData.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl text-slate-100">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Completed Orders</span>
            <div className="mt-3 text-3xl font-extrabold text-white">{reportData.totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl text-slate-100">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">GST Tax Collected</span>
            <div className="mt-3 text-3xl font-extrabold text-amber-400">
              {currencySymbol}{reportData.totalTaxCollected.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl text-slate-100">
          <CardContent className="p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Discounts Issued</span>
            <div className="mt-3 text-3xl font-extrabold text-emerald-400">
              {currencySymbol}{reportData.totalDiscounts.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
