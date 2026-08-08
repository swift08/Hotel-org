import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";
import { 
  ChefHat, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle2, 
  Play, 
  AlertCircle, 
  Utensils, 
  ArrowLeft,
  RefreshCw,
  Loader2,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/kds")({
  component: KitchenDisplaySystem,
});

function KitchenDisplaySystem() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchKdsOrders = async () => {
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.membership?.business_id) {
        // Fetch active non-completed orders (pending, accepted, preparing, ready)
        const { data: orderList, error } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            table_id,
            table_label,
            status,
            customer_name,
            notes,
            created_at,
            order_items (
              id,
              product_name,
              variant_name,
              addons,
              quantity,
              special_instructions,
              station
            )
          `)
          .eq("business_id", ctx.membership.business_id)
          .in("status", ["pending", "accepted", "preparing", "ready"])
          .order("created_at", { ascending: true });

        if (error) throw error;
        setOrders(orderList || []);
      }
    } catch (err: any) {
      console.error("KDS fetch error:", err);
      toast.error(err?.message || "Failed to load kitchen tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKdsOrders();

    const businessId = context?.membership?.business_id;
    if (!businessId) return;

    const channel = supabase
      .channel(`kds_orders_live_${businessId}`)
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
            toast.info(`🔔 New Kitchen Ticket #${payload.new?.order_number || ""} on ${payload.new?.table_label || "Table"}`);
          } else {
            toast.info("Kitchen tickets updated!");
          }
          if (soundEnabled) {
            playBeepSound();
          }
          fetchKdsOrders();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchKdsOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, context?.membership?.business_id]);

  const playBeepSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.log("Audio alert blocked:", e);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: nextStatus as any })
        .eq("id", orderId);

      if (error) throw error;

      // Automatically set table state to occupied when the order is accepted
      const targetOrder = orders.find((o) => o.id === orderId);
      if (nextStatus === "accepted" && targetOrder?.table_id) {
        const { error: tblErr } = await supabase
          .from("restaurant_tables")
          .update({ state: "occupied" })
          .eq("id", targetOrder.table_id);
        if (tblErr) console.error("Failed to set table occupied:", tblErr.message);
      }

      // Log event
      if (context?.membership?.business_id) {
        await supabase.from("order_events").insert({
          business_id: context.membership.business_id,
          order_id: orderId,
          event: `kds_status_${nextStatus}`,
          to_status: nextStatus as any,
          actor_label: context?.profile?.display_name || "Kitchen Staff",
        });
      }

      toast.success(`Order status set to ${nextStatus.toUpperCase()}`);
      fetchKdsOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  // Helper to compute order age in minutes
  const getElapsedMins = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return Math.floor((now - start) / 60000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col">
      {/* High-Contrast Header Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Admin
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Rasoi Logo" className="h-12 w-auto object-contain shrink-0 drop-shadow-md" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                RASOI KDS
              </h1>
              <span className="text-xs text-slate-400 font-medium">
                {context?.business?.name} — {orders.length} Active Tickets
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setSoundEnabled(!soundEnabled)}
            variant="outline"
            size="sm"
            className={`border-slate-800 font-bold ${
              soundEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 text-slate-400"
            }`}
          >
            {soundEnabled ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
            Sound {soundEnabled ? "ON" : "OFF"}
          </Button>

          <Button
            onClick={fetchKdsOrders}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </header>

      {/* Tickets Column Grid */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <BrandedLoadingScreen
              restaurantName={context?.business?.name || "RASOI"}
              subtitle="Loading Kitchen Display System..."
              logoUrl="/images/logo.png"
            />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-slate-500">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-1">Kitchen All Clear!</h2>
            <p className="text-sm">No active cooking tickets waiting in queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
            {orders.map((ord) => {
              const elapsedMins = getElapsedMins(ord.created_at);
              // Priority Color & Label
              let priorityColor = "border-slate-800 bg-slate-900/90";
              let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              let ageLabel = "NORMAL";

              if (elapsedMins > 20) {
                priorityColor = "border-red-500/80 bg-red-950/30";
                badgeColor = "bg-red-500 text-white font-bold animate-pulse";
                ageLabel = "CRITICAL DELAY";
              } else if (elapsedMins > 10) {
                priorityColor = "border-amber-500/80 bg-amber-950/20";
                badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                ageLabel = "DELAYED";
              }

              return (
                <Card
                  key={ord.id}
                  className={`border-2 shadow-2xl rounded-2xl flex flex-col justify-between overflow-hidden text-slate-100 ${priorityColor}`}
                >
                  {/* Card Header: Table # & Order Age */}
                  <CardHeader className="bg-slate-950/80 p-4 border-b border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-amber-400">
                          {ord.table_label || "Takeaway"}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 font-mono">
                          #{ord.order_number}
                        </span>
                      </div>

                      <Badge className={`text-xs px-2 py-0.5 ${badgeColor}`}>
                        <Clock className="mr-1 h-3 w-3" />
                        {elapsedMins}m ({ageLabel})
                      </Badge>
                    </div>

                    {ord.customer_name && (
                      <div className="text-xs text-slate-400 mt-1">
                        Customer: <span className="text-white font-semibold">{ord.customer_name}</span>
                      </div>
                    )}
                  </CardHeader>

                  {/* Card Body: Items & Special Instructions */}
                  <CardContent className="p-4 space-y-3 flex-1">
                    <div className="space-y-2.5">
                      {ord.order_items?.map((item: any) => (
                        <div key={item.id} className="border-b border-slate-800/60 pb-2 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-extrabold text-base text-white">
                              <span className="text-amber-400 mr-2 text-lg">{item.quantity}×</span>
                              {item.product_name}
                            </div>
                          </div>

                          {item.variant_name && (
                            <div className="text-xs text-slate-400 ml-6">
                              Variant: <span className="text-slate-200 font-medium">{item.variant_name}</span>
                            </div>
                          )}

                          {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                            <div className="text-xs text-amber-300 ml-6">
                              Add-ons: {item.addons.map((a: any) => a.name).join(", ")}
                            </div>
                          )}

                          {item.special_instructions && (
                            <div className="mt-1 ml-6 bg-red-500/10 border border-red-500/30 p-1.5 rounded-lg text-xs font-bold text-red-400 uppercase tracking-wide">
                              ⚠️ Note: "{item.special_instructions}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {ord.notes && (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl text-xs text-amber-300">
                        Order Note: {ord.notes}
                      </div>
                    )}
                  </CardContent>

                  {/* Card Footer: Large Touch Buttons for Kitchen Staff */}
                  <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 flex flex-col gap-2">
                    {ord.status === "pending" && (
                      <Button
                        onClick={() => handleUpdateStatus(ord.id, "accepted")}
                        className="w-full h-12 text-base font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg"
                      >
                        ACCEPT TICKET
                      </Button>
                    )}

                    {ord.status === "accepted" && (
                      <Button
                        onClick={() => handleUpdateStatus(ord.id, "preparing")}
                        className="w-full h-12 text-base font-bold bg-blue-500 text-white hover:bg-blue-400 shadow-lg"
                      >
                        <Play className="mr-2 h-5 w-5 fill-current" /> START PREPARING
                      </Button>
                    )}

                    {ord.status === "preparing" && (
                      <Button
                        onClick={() => handleUpdateStatus(ord.id, "ready")}
                        className="w-full h-12 text-base font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg"
                      >
                        <CheckCircle2 className="mr-2 h-5 w-5" /> MARK READY
                      </Button>
                    )}

                    {ord.status === "ready" && (
                      <Button
                        onClick={() => handleUpdateStatus(ord.id, "served")}
                        className="w-full h-12 text-base font-bold bg-purple-500 text-white hover:bg-purple-400 shadow-lg"
                      >
                        SERVED TO TABLE
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
