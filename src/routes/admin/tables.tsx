import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getMyContext } from "@/lib/business.functions";
import {
  listTables,
  createTables,
  updateTable,
  regenerateTableQr,
  clearTableAndCompleteOrders,
} from "@/lib/tables.functions";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import {
  QrCode,
  Plus,
  Download,
  Printer,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export const Route = createFileRoute("/admin/tables")({
  component: TablesManager,
});

function TablesManager() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);

  // QR Modal State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Create Table Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [singleLabel, setSingleLabel] = useState("");
  const [seatsCount, setSeatsCount] = useState(2);

  // Bulk Create Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("Table ");
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkSeats, setBulkSeats] = useState(4);

  // Print Sheet View
  const [isPrintView, setIsPrintView] = useState(false);
  const [printedQrMap, setPrintedQrMap] = useState<Record<string, string>>({});

  const fetchTablesData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);
      if (!ctx?.membership?.business_id) {
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return;
      }

      const activeBranchId = ctx.membership?.branch_id || ctx.branches?.[0]?.id;
      const tbls = await listTables({
        data: {
          businessId: ctx.membership.business_id,
          branchId: activeBranchId,
        },
      });
      setTables(tbls || []);

      // Pre-generate QR data URLs for quick render
      const qrMap: Record<string, string> = {};
      for (const t of tbls || []) {
        const publicUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/q/${t.qr_slug}`
            : `/q/${t.qr_slug}`;
        try {
          const url = await QRCode.toDataURL(publicUrl, { width: 300, margin: 2 });
          qrMap[t.id] = url;
        } catch (e) {
          console.error("QR Data URL generation failed for table:", t.id, e);
        }
      }
      setPrintedQrMap(qrMap);
    } catch (err: any) {
      console.error("fetchTablesData error:", err);
      const msg = err?.message?.toLowerCase() || "";
      if (
        msg.includes("unauthorized") ||
        msg.includes("sign in") ||
        msg.includes("no authorization")
      ) {
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      } else {
        toast.error(err?.message || "Failed to load tables");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesData();

    const businessId = context?.membership?.business_id;
    if (!businessId) return;

    const channel = supabase
      .channel(`tables_live_${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "restaurant_tables",
          filter: `business_id=eq.${businessId}`,
        },
        (payload: any) => {
          if (payload.eventType === "UPDATE") {
            toast.info(
              `Table ${payload.new?.label || ""} state changed to ${String(payload.new?.state || "").toUpperCase()}`,
            );
          }
          fetchTablesData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [context?.membership?.business_id]);

  // View & Download QR
  const handleViewQr = async (table: any) => {
    setSelectedTable(table);
    setShowRegenConfirm(false);
    setCopiedSlug(false);
    const publicUrl = `${window.location.origin}/q/${table.qr_slug}`;
    const dataUrl = await QRCode.toDataURL(publicUrl, { width: 400, margin: 2 });
    setQrDataUrl(dataUrl);
    setQrModalOpen(true);
  };

  const handleCopyLink = () => {
    if (!selectedTable) return;
    const fullUrl = `${window.location.origin}/q/${selectedTable.qr_slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(true);
    toast.success("Public QR URL copied to clipboard!");
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  const handleDownloadQr = (format: "png" | "svg") => {
    if (!selectedTable || !qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${selectedTable.label.replace(/\s+/g, "_")}.png`;
    a.click();
    toast.success(`Downloaded QR code for ${selectedTable.label}`);
  };

  // Regenerate QR Slug
  const handleRegenerateQr = async (tableId: string) => {
    if (!context?.membership?.business_id) return;
    setIsRegenerating(true);
    try {
      const updated = await regenerateTableQr({
        data: {
          businessId: context.membership.business_id,
          tableId,
        },
      });
      toast.success("QR code regenerated! Old QR code is permanently retired.");

      // Update selected table locally
      if (selectedTable && updated) {
        const newTable = {
          ...selectedTable,
          qr_slug: updated.qr_slug,
          qr_version: updated.qr_version,
        };
        setSelectedTable(newTable);
        const publicUrl = `${window.location.origin}/q/${updated.qr_slug}`;
        const dataUrl = await QRCode.toDataURL(publicUrl, { width: 400, margin: 2 });
        setQrDataUrl(dataUrl);
      }
      setShowRegenConfirm(false);
      fetchTablesData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to regenerate QR code");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Change Table State
  const handleChangeState = async (tableId: string, newState: string) => {
    if (!context?.membership?.business_id) return;
    try {
      await updateTable({
        data: {
          businessId: context.membership.business_id,
          tableId,
          state: newState as any,
        },
      });
      toast.success("Table status updated!");
      fetchTablesData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update table state");
    }
  };

  // Clear Table & Collect Payment -> Set State to Available
  const handleClearTableAndPay = async (table: any) => {
    if (!context?.membership?.business_id) return;
    try {
      await clearTableAndCompleteOrders({
        data: {
          businessId: context.membership.business_id,
          tableId: table.id,
        },
      });
      toast.success(`Payment collected! ${table.label} is now AVAILABLE.`);
      fetchTablesData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear table");
    }
  };

  // Save Single Table
  const handleCreateSingleTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeBranchId = context?.membership?.branch_id || context?.branches?.[0]?.id;
    if (!singleLabel || !context?.membership?.business_id || !activeBranchId) return;
    try {
      await createTables({
        data: {
          businessId: context.membership.business_id,
          branchId: activeBranchId,
          labels: [singleLabel],
          seats: Number(seatsCount),
        },
      });
      toast.success("Table created!");
      setSingleLabel("");
      setCreateModalOpen(false);
      fetchTablesData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create table");
    }
  };

  // Bulk Create Tables
  const handleBulkCreateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeBranchId = context?.membership?.branch_id || context?.branches?.[0]?.id;
    if (!context?.membership?.business_id || !activeBranchId) return;
    const startIdx = tables.length + 1;
    const labels = Array.from(
      { length: bulkCount },
      (_, i) => `${bulkPrefix}${(startIdx + i).toString().padStart(2, "0")}`,
    );
    try {
      await createTables({
        data: {
          businessId: context.membership.business_id,
          branchId: activeBranchId,
          labels,
          seats: Number(bulkSeats),
        },
      });
      toast.success(`Created ${bulkCount} new tables with unique QRs!`);
      setBulkModalOpen(false);
      fetchTablesData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to bulk create tables");
    }
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const getTableCardStyle = (state: string) => {
    switch (state) {
      case "occupied":
        return {
          border: "border-amber-500/40",
          glow: "shadow-amber-500/5",
          dot: "bg-amber-400",
          dotRing: "ring-amber-400/30",
        };
      case "payment_pending":
        return {
          border: "border-red-500/40",
          glow: "shadow-red-500/5",
          dot: "bg-red-400",
          dotRing: "ring-red-400/30",
        };
      case "reserved":
        return {
          border: "border-purple-500/40",
          glow: "shadow-purple-500/5",
          dot: "bg-purple-400",
          dotRing: "ring-purple-400/30",
        };
      case "disabled":
        return {
          border: "border-slate-700/40",
          glow: "",
          dot: "bg-slate-600",
          dotRing: "ring-slate-600/30",
        };
      case "available":
      default:
        return {
          border: "border-emerald-500/30",
          glow: "shadow-emerald-500/5",
          dot: "bg-emerald-400",
          dotRing: "ring-emerald-400/30",
        };
    }
  };

  const canView =
    !context ||
    context.permissions?.includes("tables.view") ||
    context.membership?.role === "owner" ||
    context.membership?.role === "business_admin";
  const canManage =
    context?.permissions?.includes("tables.manage") ||
    context?.membership?.role === "owner" ||
    context?.membership?.role === "business_admin";

  if (!loading && context && !canView) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center py-24 space-y-4">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Access Denied (403)</h2>
        <p className="text-slate-500 dark:text-slate-400">
          You do not have permission (`tables.view`) to access Tables & QRs.
        </p>
        <Link to="/admin/dashboard">
          <Button variant="outline" className="mt-4">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            Tables & QR Codes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Permanent unique QR code resolution per table. Download PNG or print bulk table stand
            sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={() => setIsPrintView(!isPrintView)}
            variant="outline"
            size="sm"
            className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="mr-2 h-4 w-4" />
            {isPrintView ? "Exit Print Sheet" : "Bulk Print Sheet"}
          </Button>

          {canManage && (
            <>
              <Button
                onClick={() => setBulkModalOpen(true)}
                variant="outline"
                size="sm"
                className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Bulk Add Tables
              </Button>

              <Button
                onClick={() => setCreateModalOpen(true)}
                size="sm"
                className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 border border-amber-600/30"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Single Table
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Print View Mode */}
      {isPrintView ? (
        <div className="space-y-6 bg-white text-black p-8 rounded-2xl print:p-0 border border-slate-200 shadow-md">
          <div className="flex items-center justify-between border-b pb-4 print:hidden">
            <div>
              <h2 className="text-xl font-bold">Printable QR Stand Sheet</h2>
              <p className="text-sm text-gray-600">Cut out or place in acrylic stands on tables.</p>
            </div>
            <Button onClick={handlePrintSheet} className="bg-black text-white font-bold">
              <Printer className="mr-2 h-4 w-4" /> Print Now
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {tables.map((t) => (
              <div
                key={t.id}
                className="border-2 border-black rounded-2xl p-4 text-center flex flex-col items-center justify-between space-y-2 bg-white"
              >
                <div className="font-extrabold text-lg tracking-wider uppercase text-black">
                  {context?.business?.name}
                </div>
                <div className="text-2xl font-black text-amber-600 my-1">{t.label}</div>
                {printedQrMap[t.id] && (
                  <img
                    src={printedQrMap[t.id]}
                    alt={`QR ${t.label}`}
                    className="h-40 w-40 border border-gray-300 rounded-lg p-1"
                  />
                )}
                <div className="text-[11px] font-medium text-gray-700">
                  Scan to View Digital Menu & Order
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Normal Table Cards Grid */
        <>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse"
                />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center text-slate-500 dark:text-slate-400">
              <QrCode className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-slate-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                No Tables Configured
              </h3>
              <p className="text-xs mb-4">
                Create tables to generate unique QR codes for your customers.
              </p>
              <Button
                onClick={() => setBulkModalOpen(true)}
                className="bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
              >
                Bulk Create Tables
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((t) => {
                const qrUrl = printedQrMap[t.id];
                const publicScanUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/q/${t.qr_slug}`;
                const cardStyle = getTableCardStyle(t.state);

                return (
                  <Card
                    key={t.id}
                    className={`border ${cardStyle.border} bg-white dark:bg-slate-900/80 backdrop-blur shadow-md dark:shadow-lg ${cardStyle.glow} text-slate-800 dark:text-slate-100 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-xl transition-all`}
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Top Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ring-2 ${cardStyle.dot} ${cardStyle.dotRing}`}
                          />
                          <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">
                            {t.label}
                          </h3>
                          <Badge className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                            {t.seats}p
                          </Badge>
                        </div>

                        <Select
                          value={t.state}
                          onValueChange={(val) => handleChangeState(t.id, val)}
                        >
                          <SelectTrigger className="h-7 w-28 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white">
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="payment_pending">Payment Pending</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* QR Thumbnail Preview */}
                      <div className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-800/80">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={t.label}
                            className="h-28 w-28 rounded-lg border border-slate-200 bg-white p-1"
                          />
                        ) : (
                          <div className="h-28 w-28 flex items-center justify-center text-slate-400 dark:text-slate-500">
                            <QrCode className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Stats & Public Link */}
                      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-between">
                          <span>Total Customer Scans:</span>
                          <span className="font-bold text-slate-800 dark:text-white">
                            {t.scan_count || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>QR Version:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            v{t.qr_version}
                          </span>
                        </div>
                        <div className="pt-1">
                          <a
                            href={publicScanUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">/q/{t.qr_slug}</span>
                          </a>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {(t.state === "occupied" || t.state === "payment_pending") && (
                          <Button
                            onClick={() => handleClearTableAndPay(t)}
                            size="sm"
                            className="w-full bg-emerald-500 text-slate-950 font-extrabold hover:bg-emerald-400 h-8 text-xs shadow-md shadow-emerald-500/20"
                          >
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Settle & Free Table
                          </Button>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleViewQr(t)}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-white h-8 text-xs"
                          >
                            <Eye className="mr-1.5 h-3.5 w-3.5" /> View & Print
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* QR Inspector & Download Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-sm rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <DialogTitle className="text-xl font-extrabold text-white">
                {selectedTable?.label}
              </DialogTitle>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-bold px-2 py-0.5">
                v{selectedTable?.qr_version || 1}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              Scans automatically resolve to{" "}
              <span className="text-slate-200 font-medium">{context?.business?.name}</span> -{" "}
              {selectedTable?.label}
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex flex-col items-center justify-center space-y-3">
            {qrDataUrl && (
              <div className="relative group p-3 bg-slate-950 rounded-2xl border border-slate-800/80 shadow-inner">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="h-48 w-48 rounded-xl bg-white p-2.5 shadow-md transition-transform group-hover:scale-[1.02]"
                />
              </div>
            )}

            {/* URL Display with Copy Button */}
            <div className="w-full flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-xs font-mono text-amber-400 truncate">
                /q/{selectedTable?.qr_slug}
              </span>
              <Button
                onClick={handleCopyLink}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 shrink-0"
              >
                {copiedSlug ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1 text-slate-400" /> Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Action Area - Stacked Vertically */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <Button
              onClick={() => handleDownloadQr("png")}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-extrabold hover:from-amber-400 hover:to-amber-300 h-10 rounded-xl shadow-md shadow-amber-500/20 text-xs flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" /> Download High-Res PNG
            </Button>

            {!showRegenConfirm ? (
              <Button
                onClick={() => setShowRegenConfirm(true)}
                variant="ghost"
                className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 font-semibold text-xs h-9 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate QR Code
              </Button>
            ) : (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-left space-y-2 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-200 font-medium leading-tight">
                    Confirm regenerating QR code? Current physical printout will be permanently
                    retired.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    onClick={() => handleRegenerateQr(selectedTable?.id)}
                    disabled={isRegenerating}
                    size="sm"
                    className="flex-1 bg-red-600 text-white hover:bg-red-500 font-bold h-8 text-[11px] rounded-lg"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Regenerating...
                      </>
                    ) : (
                      "Yes, Regenerate"
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowRegenConfirm(false)}
                    disabled={isRegenerating}
                    variant="ghost"
                    size="sm"
                    className="bg-slate-800 text-slate-300 hover:bg-slate-700 h-8 text-[11px] rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Table Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add Single Table</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSingleTable} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Table Label / Name *</Label>
              <Input
                placeholder="e.g. Table 15 or Patio 02"
                value={singleLabel}
                onChange={(e) => setSingleLabel(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Seat Capacity</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={seatsCount}
                onChange={(e) => setSeatsCount(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
              >
                Create Table
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Tables Create Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Bulk Generate Tables</DialogTitle>
            <DialogDescription className="text-slate-400">
              Generates multiple sequential tables with unique non-guessable QRs in one click.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkCreateTables} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Label Prefix</Label>
                <Input
                  placeholder="Table "
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-300">Number of Tables</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Default Seat Count</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={bulkSeats}
                onChange={(e) => setBulkSeats(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 w-full"
              >
                Generate {bulkCount} Tables
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
