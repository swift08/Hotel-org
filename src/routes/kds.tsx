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
  Bell,
  Sparkles,
  Flame,
  Volume1,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateOrderStatus } from "@/lib/order.functions";

export const Route = createFileRoute("/kds")({
  component: KitchenDisplaySystem,
});

function KitchenDisplaySystem() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize or resume Web Audio Context on user interaction
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    setAudioUnlocked(true);
    return audioCtxRef.current;
  };

  const playKitchenChime = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Pulse 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.6, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Pulse 2: 1320Hz (E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.7, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);

      // Pulse 3: 1760Hz (A6)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1760, now + 0.3);
      gain3.gain.setValueAtTime(0.8, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.7);
    } catch (e) {
      console.log("Audio chime error:", e);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Unlock audio on initial user touch/click anywhere on page
    const handleUserInteraction = () => {
      getAudioContext();
    };
    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("touchstart", handleUserInteraction, { once: true });

    fetchKdsOrders();

    // 5-second polling interval fallback to ensure no dropped orders
    const intervalId = setInterval(() => {
      fetchKdsOrders();
    }, 5000);

    const businessId = context?.membership?.business_id;
    if (!businessId) {
      return () => clearInterval(intervalId);
    }

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
            if (soundEnabled) playKitchenChime();
          } else {
            toast.info("Kitchen tickets updated!");
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
      clearInterval(intervalId);
      supabase.removeChannel(channel);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [soundEnabled, context?.membership?.business_id]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    getAudioContext();
    if (!context?.membership?.business_id) return;
    try {
      await updateOrderStatus({
        data: {
          businessId: context.membership.business_id,
          orderId,
          toStatus: nextStatus,
        }
      });

      // Automatically set table state to occupied when the order is accepted
      const targetOrder = orders.find((o) => o.id === orderId);
      if (nextStatus === "accepted" && targetOrder?.table_id) {
        const { error: tblErr } = await supabase
          .from("restaurant_tables")
          .update({ state: "occupied" })
          .eq("id", targetOrder.table_id);
        if (tblErr) console.error("Failed to set table occupied:", tblErr.message);
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

  const canViewKds = !context || context.permissions?.includes("kds.view") || context.membership?.role === "owner" || context.membership?.role === "business_admin";

  if (!loading && context && !canViewKds) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Access Denied (403)</h2>
          <p className="text-slate-400">You do not have permission (`kds.view`) to access Kitchen Display System.</p>
          <Link to="/admin/dashboard">
            <Button variant="outline" className="mt-4 border-slate-800 text-white hover:bg-slate-900">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={getAudioContext}
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col"
    >
      {/* Sound Activation Banner if Audio is Suspended */}
      {!audioUnlocked && soundEnabled && (
        <div 
          onClick={getAudioContext}
          className="bg-amber-500 text-slate-950 font-extrabold px-4 py-2 text-center text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:bg-amber-400 transition-colors shrink-0"
        >
          <Volume1 className="h-4 w-4 animate-bounce" />
          <span>Tap anywhere on screen to enable Kitchen Sound Alerts</span>
        </div>
      )}

      {/* High-Contrast Header Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-6 flex items-center justify-between shadow-2xl shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Admin
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <img src="/images/logo.webp" alt="Rasoi Logo" className="h-10 w-auto object-contain shrink-0 drop-shadow-md" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                RASOI KDS
              </h1>
              <span className="text-xs text-slate-400 font-medium">
                {context?.business?.name || "Kitchen Terminal"} — {orders.length} Active Tickets
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              getAudioContext();
              playKitchenChime();
            }}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-bold"
          >
            <Bell className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Test Chime
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) getAudioContext();
            }}
            variant="outline"
            size="sm"
            className={`border-slate-800 font-bold text-xs ${
              soundEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-900 text-slate-400"
            }`}
          >
            {soundEnabled ? <Volume2 className="mr-1.5 h-3.5 w-3.5" /> : <VolumeX className="mr-1.5 h-3.5 w-3.5" />}
            Sound {soundEnabled ? "ON" : "OFF"}
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              fetchKdsOrders();
            }}
            variant="outline"
            size="sm"
            className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs font-bold"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
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
              logoUrl="/images/logo.webp"
            />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center text-slate-500">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-1">Kitchen All Clear!</h2>
            <p className="text-sm text-slate-400">No active cooking tickets waiting in queue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
            {orders.map((ord) => {
              const elapsedMins = getElapsedMins(ord.created_at);
              // Priority Color & Label
              let priorityColor = "border-slate-800 bg-slate-900/90";
              let badgeColor = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              let ageLabel = "NORMAL";

              if (elapsedMins > 15) {
                priorityColor = "border-red-500/50 bg-red-950/20";
                badgeColor = "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse";
                ageLabel = "CRITICAL";
              } else if (elapsedMins > 8) {
                priorityColor = "border-amber-500/50 bg-amber-950/20";
                badgeColor = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                ageLabel = "WARNING";
              }

              return (
                <Card key={ord.id} className={`border-2 ${priorityColor} shadow-xl flex flex-col justify-between overflow-hidden transition-all`}>
                  {/* Card Header */}
                  <CardHeader className="p-4 pb-3 border-b border-slate-800/80 bg-slate-950/50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black text-amber-400 flex items-center gap-2">
                        {ord.table_label || "Takeaway"}
                        <span className="text-xs font-semibold text-slate-500">#{ord.order_number || ord.id.slice(0, 6)}</span>
                      </CardTitle>
                      {ord.customer_name && (
                        <p className="text-xs text-slate-400 mt-0.5">Customer: {ord.customer_name}</p>
                      )}
                    </div>

                    <Badge className={`text-[10px] font-bold border ${badgeColor}`}>
                      <Clock className="mr-1 h-3 w-3" /> {elapsedMins}m ({ageLabel})
                    </Badge>
                  </CardHeader>

                  {/* Card Content: Items list */}
                  <CardContent className="p-4 space-y-3 flex-1">
                    {ord.notes && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{ord.notes}</span>
                      </div>
                    )}

                    <div className="space-y-2.5 divide-y divide-slate-800/60">
                      {ord.order_items?.map((item: any) => (
                        <div key={item.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-amber-400 text-sm">{item.quantity}×</span>
                              <span className="font-bold text-white text-sm break-words">{item.product_name}</span>
                            </div>

                            {item.variant_name && (
                              <p className="text-xs text-slate-400 ml-5 font-medium">Variant: {item.variant_name}</p>
                            )}

                            {Array.isArray(item.addons) && item.addons.length > 0 && (
                              <p className="text-xs text-emerald-400 ml-5 font-medium">
                                + {item.addons.map((a: any) => a.name).join(", ")}
                              </p>
                            )}

                            {item.special_instructions && (
                              <p className="text-[11px] text-amber-300/80 italic ml-5 mt-0.5">
                                Note: "{item.special_instructions}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {/* Card Footer: Status Transition Action Button */}
                  <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
                    {ord.status === "pending" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(ord.id, "accepted");
                        }}
                        className="w-full bg-amber-500 text-slate-950 font-black hover:bg-amber-400 text-sm shadow-md shadow-amber-500/20 py-2.5"
                      >
                        ACCEPT TICKET
                      </Button>
                    )}

                    {ord.status === "accepted" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(ord.id, "preparing");
                        }}
                        className="w-full bg-blue-600 text-white font-black hover:bg-blue-500 text-sm shadow-md shadow-blue-600/20 py-2.5"
                      >
                        START PREPARING
                      </Button>
                    )}

                    {ord.status === "preparing" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(ord.id, "ready");
                        }}
                        className="w-full bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400 text-sm shadow-md shadow-emerald-500/20 py-2.5"
                      >
                        MARK READY FOR SERVING
                      </Button>
                    )}

                    {ord.status === "ready" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(ord.id, "served");
                        }}
                        className="w-full bg-purple-600 text-white font-black hover:bg-purple-500 text-sm shadow-md shadow-purple-600/20 py-2.5"
                      >
                        MARK SERVED
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
