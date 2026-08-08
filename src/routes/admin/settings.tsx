import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getMyContext, updateBusinessSettings } from "@/lib/business.functions";
import { 
  Settings, 
  Building2, 
  Receipt, 
  Percent, 
  DollarSign, 
  CheckCircle2, 
  Save, 
  Loader2,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const isLogoUrl = (url: any) =>
  url &&
  typeof url === "string" &&
  url.trim().length > 0 &&
  (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:"));

export const Route = createFileRoute("/admin/settings")({
  component: BusinessSettingsPage,
});

function BusinessSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<any>(null);

  // Form State
  const [legalName, setLegalName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [taxMode, setTaxMode] = useState<"inclusive" | "exclusive">("exclusive");
  const [defaultTaxRate, setDefaultTaxRate] = useState(5.0);
  const [serviceChargeRate, setServiceChargeRate] = useState(0.0);
  const [cashPaymentEnabled, setCashPaymentEnabled] = useState(true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);

      if (ctx?.settings) {
        setLegalName(ctx.settings.legal_name || "");
        setAddressLine1(ctx.settings.address_line1 || "");
        setCity(ctx.settings.city || "");
        setStateName(ctx.settings.state || "");
        setPostalCode(ctx.settings.postal_code || "");
        setPhone(ctx.settings.phone || "");
        setGstin(ctx.settings.gstin || "");
        setLogoUrl(ctx.settings.address_line2 || "");
        setTaxMode(ctx.settings.tax_mode || "exclusive");
        setDefaultTaxRate(Number(ctx.settings.default_tax_rate || 5.0));
        setServiceChargeRate(Number(ctx.settings.service_charge_rate || 0.0));
        setCashPaymentEnabled(ctx.settings.cash_payment_enabled ?? true);
        setOnlinePaymentEnabled(ctx.settings.online_payment_enabled ?? false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context?.membership?.business_id) return;
    setSaving(true);

    try {
      await updateBusinessSettings({
        data: {
          businessId: context.membership.business_id,
          legal_name: legalName || undefined,
          address_line1: addressLine1 || undefined,
          city: city || undefined,
          state: stateName || undefined,
          postal_code: postalCode || undefined,
          phone: phone || undefined,
          gstin: gstin || undefined,
          address_line2: logoUrl || null,
          tax_mode: taxMode,
          default_tax_rate: Number(defaultTaxRate),
          service_charge_rate: Number(serviceChargeRate),
          cash_payment_enabled: cashPaymentEnabled,
          online_payment_enabled: onlinePaymentEnabled,
        },
      });

      toast.success("Business settings saved!");
      fetchSettingsData();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-amber-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Back link & Header */}
      <div className="flex flex-col gap-1 border-b border-slate-200 dark:border-slate-800 pb-6">
        <Link
          to="/admin/dashboard"
          className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 font-bold mb-2 transition-all w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
              <Settings className="h-7 w-7 text-amber-500 shrink-0" /> Business Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure legal profile, GST tax calculations, receipt layout, and payment options.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Profile & Tax ID */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur shadow-md dark:shadow-xl text-slate-800 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 dark:text-white font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              Legal Entity & Contact Profile
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Details printed on customer GST invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">Legal Business Name</Label>
                <Input
                  placeholder="e.g. Royal Spice Hospitality Pvt Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">GSTIN / Tax ID</Label>
                <Input
                  placeholder="29AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">Street Address</Label>
                <Input
                  placeholder="100 Feet Road, Indiranagar"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">City</Label>
                <Input
                  placeholder="Bangalore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">Phone</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">Business Logo URL</Label>
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="e.g. /images/logo.png or external link"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white flex-1"
                  />
                  {isLogoUrl(logoUrl) && (
                    <div className="h-10 w-28 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      <img src={logoUrl} alt="Logo Preview" className="h-full w-auto object-contain" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GST & Tax Engine Configuration */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur shadow-md dark:shadow-xl text-slate-800 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 dark:text-white font-bold flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              GST Tax & Pricing Engine
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Tax calculation rules strictly enforced by the server-side pricing engine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">Tax Mode</Label>
                <Select value={taxMode} onValueChange={(val: any) => setTaxMode(val)}>
                  <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white">
                    <SelectItem value="exclusive">Tax Exclusive (Prices + GST added at checkout)</SelectItem>
                    <SelectItem value="inclusive">Tax Exclusive (Prices + GST added at checkout)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600 dark:text-slate-300">Default Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="40"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-850 dark:text-white">Cash & Manual Counter Payments</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Allow customers and cashiers to settle bills via Cash or UPI at table.</p>
                </div>
                <Switch
                  checked={cashPaymentEnabled}
                  onCheckedChange={setCashPaymentEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-slate-850 dark:text-white">Razorpay Online Gateways</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enable direct online payment via Razorpay on table QR checkout.</p>
                </div>
                <Switch
                  checked={onlinePaymentEnabled}
                  onCheckedChange={setOnlinePaymentEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 bg-amber-500 font-bold text-slate-950 hover:bg-amber-400 shadow-xl text-base border border-amber-600/35"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Settings...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" /> Save Business Configuration
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
