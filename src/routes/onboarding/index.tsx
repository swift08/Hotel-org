import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createBusiness, getMyContext } from "@/lib/business.functions";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  UtensilsCrossed, 
  MapPin, 
  QrCode, 
  FileText, 
  ArrowRight, 
  CheckCircle, 
  Loader2, 
  Store,
  Hotel,
  Coffee,
  GlassWater,
  Flame,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/")({
  component: Onboarding,
});

const BUSINESS_TYPES = [
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, desc: "Full service dine-in & table ordering" },
  { id: "cafe", label: "Café", icon: Coffee, desc: "Quick service, coffee, snacks & counter ordering" },
  { id: "hotel", label: "Hotel / Resort", icon: Hotel, desc: "Rooms, room service & multi-outlet dining" },
  { id: "bar_pub", label: "Bar & Pub", icon: GlassWater, desc: "High volume bar ordering & table QRs" },
  { id: "cloud_kitchen", label: "Cloud Kitchen", icon: Flame, desc: "Delivery & takeaway focused operations" },
  { id: "food_outlet", label: "Food Outlet / Kiosk", icon: ShoppingBag, desc: "Counter ordering & fast takeaway" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<any>("restaurant");
  const [branchName, setBranchName] = useState("Main Branch");
  const [city, setCity] = useState("Bangalore");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [tableCount, setTableCount] = useState(10);

  useEffect(() => {
    async function checkExisting() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          navigate({ to: "/auth/login" });
          return;
        }
        const ctx = await getMyContext();
        if (ctx.onboarded) {
          toast.info("You already have an active business context.");
          navigate({ to: "/admin/dashboard" });
        }
      } catch (err) {
        console.error("Context error:", err);
      } finally {
        setChecking(false);
      }
    }
    checkExisting();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!businessName.trim()) {
      toast.error("Please enter a business name.");
      return;
    }
    if (businessName.trim().length < 2) {
      toast.error("Business name must be at least 2 characters.");
      return;
    }
    if (!branchName.trim()) {
      toast.error("Please enter a branch name.");
      return;
    }

    setLoading(true);
    try {
      await createBusiness({
        data: {
          name: businessName.trim(),
          businessType: businessType,
          branchName: branchName.trim(),
          city: city || undefined,
          phone: phone || undefined,
          gstin: gstin || undefined,
          tableCount: Number(tableCount),
        },
      });

      toast.success("Business created! Initialized tables & unique QR codes.");
      navigate({ to: "/admin/dashboard" });
    } catch (err: any) {
      console.error(err);
      // Parse Zod validation error JSON if present
      let userMessage = err?.message || "Failed to create business.";
      try {
        const parsed = JSON.parse(userMessage);
        if (Array.isArray(parsed) && parsed[0]?.message) {
          const field = parsed[0]?.path?.[0];
          const msg = parsed[0].message;
          userMessage = field ? `${String(field).replace(/_/g, ' ')}: ${msg}` : msg;
        }
      } catch {
        // not JSON, use as-is
      }
      toast.error(userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 selection:bg-amber-500 selection:text-slate-950">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 mb-2">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Set Up Your Business</h1>
          <p className="text-sm text-slate-400">
            Create your business profile, primary branch, and initial tables to generate QR codes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Business Profile */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                1. Business Details
              </CardTitle>
              <CardDescription className="text-slate-400">
                This identity will appear on your digital QR menus and customer receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-xs font-semibold text-slate-300">Business Name *</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    autoComplete="organization"
                    placeholder="e.g. Royal Spice Bistro"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-semibold text-slate-300">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500"
                  />
                </div>
              </div>


              {/* Business Type Grid */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-slate-300">Business Type *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {BUSINESS_TYPES.map((bt) => {
                    const IconComp = bt.icon;
                    const isSelected = businessType === bt.id;
                    return (
                      <div
                        key={bt.id}
                        onClick={() => setBusinessType(bt.id)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10"
                            : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <IconComp className={`h-4 w-4 ${isSelected ? "text-amber-400" : "text-slate-500"}`} />
                          <span className="text-sm font-bold">{bt.label}</span>
                        </div>
                        <p className="text-[11px] leading-tight line-clamp-2 text-slate-500">{bt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Branch & Tables Initializer */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl text-slate-100">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <QrCode className="h-5 w-5 text-amber-400" />
                2. Branch & Tables Initialization
              </CardTitle>
              <CardDescription className="text-slate-400">
                Servio automatically generates permanent unique QR codes for each table.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="branchName" className="text-xs font-semibold text-slate-300">Branch Name *</Label>
                  <Input
                    id="branchName"
                    name="branchName"
                    autoComplete="off"
                    placeholder="e.g. Indiranagar Branch"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs font-semibold text-slate-300">City</Label>
                  <Input
                    id="city"
                    name="city"
                    autoComplete="address-level2"
                    placeholder="e.g. Bangalore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="tableCount" className="text-xs font-semibold text-slate-300">Initial Table Count</Label>
                  <Input
                    id="tableCount"
                    name="tableCount"
                    type="number"
                    min={0}
                    max={100}
                    value={tableCount}
                    onChange={(e) => setTableCount(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">Creates Table 01 to Table {tableCount} with QR codes.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin" className="text-xs font-semibold text-slate-300">GSTIN / Tax ID (Optional)</Label>
                  <Input
                    id="gstin"
                    name="gstin"
                    autoComplete="off"
                    placeholder="29AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white focus:border-amber-500"
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-xl shadow-amber-500/25 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Initializing Business & Generating QRs...
              </>
            ) : (
              <>
                Complete Setup & Launch Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
