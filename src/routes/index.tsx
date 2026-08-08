import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyContext } from "@/lib/business.functions";
import {
  QrCode,
  Utensils,
  ChefHat,
  Receipt,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  Smartphone,
  Layers,
  BarChart3,
  Globe,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          const ctx = await getMyContext();
          setUserContext(ctx);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    }
    checkUser();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Header / Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center">
              <img
                src="/images/logo.png"
                alt="Rasoi Logo"
                className="h-12 sm:h-14 md:h-16 w-auto object-contain transition-transform hover:scale-105 drop-shadow-md"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {userContext?.onboarded ? (
              <Button
                onClick={() => navigate({ to: "/admin/dashboard" })}
                className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : userContext?.profile ? (
              <Button
                onClick={() => navigate({ to: "/onboarding" })}
                className="bg-amber-500 font-semibold text-slate-950 hover:bg-amber-400"
              >
                Complete Onboarding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Link to="/auth/login">
                  <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-900 text-sm">
                    Staff Sign In
                  </Button>
                </Link>
                <Link to="/auth/signup">
                  <Button className="bg-gradient-to-r from-amber-500 to-amber-600 font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 text-sm">
                    Register Business
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.1),transparent_50%)]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-amber-400 mb-6 shadow-inner">
              <Sparkles className="h-4 w-4 text-amber-400" />
              The Operating System for Modern Restaurants
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white leading-tight">
              Every table gets its own QR. <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                Every order flows seamlessly.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
              Rasoi powers QR ordering, Kitchen Display Systems (KDS), counter billing, role-based workspaces, multi-branch management, and real-time reports for restaurants, cafes, and hotels.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 shadow-xl shadow-amber-500/25">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base border-slate-800 bg-slate-900/60 text-slate-200 hover:bg-slate-900 hover:text-white">
                  Demo Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Generated Hero Image Showcase */}
          <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-amber-500/20 bg-slate-900/80 p-2 sm:p-3 shadow-2xl shadow-amber-500/15 backdrop-blur ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 mb-2.5 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
                  https://rasoi.app/admin/dashboard
                </span>
              </div>
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-bold px-2 py-0.5">
                Rasoi Admin
              </Badge>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <img
                src="/images/hero_dashboard_mockup.png"
                alt="Rasoi Admin Executive Dashboard Mockup"
                className="w-full h-auto rounded-xl object-cover shadow-2xl transition-transform duration-500 hover:scale-[1.01]"
              />
            </div>
          </div>

          {/* Feature Highlights Grid — Sub-products */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur text-slate-100">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Rasoi QR</h3>
                <p className="text-sm text-slate-400">
                  Cryptographically secure QR codes per table with instant context resolution. No app download required for customers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur text-slate-100">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 mb-4 border border-emerald-500/20">
                  <ChefHat className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Rasoi KDS</h3>
                <p className="text-sm text-slate-400">
                  High-contrast real-time kitchen tickets with status transitions, sound alerts, special instructions, and item prioritization.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur text-slate-100">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
                  <Layers className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Rasoi Menu</h3>
                <p className="text-sm text-slate-400">
                  Full control over categories, variants, add-on groups, food tags (Veg/Non-veg/Vegan), pricing history, and instant out-of-stock toggles.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur text-slate-100">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Rasoi Admin & RBAC</h3>
                <p className="text-sm text-slate-400">
                  Strict database-level row isolation and granular permission matrix for Owners, GMs, Receptionists, Cashiers, Waiters, and Chefs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Visual Showcase Section — Mobile Menu & Kitchen KDS */}
      <section className="border-t border-slate-800 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mb-3 px-3 py-1 text-xs">
              End-to-End Hospitality Experience
            </Badge>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Designed for Speed, Accuracy, and Elegance</h2>
            <p className="mt-3 text-slate-400 text-base max-w-2xl mx-auto">
              From the customer's phone at Table 01 to the touch display in the kitchen, every step is synchronized.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Mobile Menu Preview */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Smartphone className="h-4 w-4" /> Customer Ordering Experience
              </div>
              <h3 className="text-2xl font-bold text-white">Mobile-First Instant QR Ordering</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Customers scan the table QR code to view a rich digital menu with food badges (Veg/Non-veg), customizable variants, add-on groups, and a sticky bottom cart bar. Zero app installation needed.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Auto-resolves table number and business currency
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Supports special notes & cooking instructions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Live order ticket status updates directly on phone
                </li>
              </ul>
              <div className="pt-2">
                <img
                  src="/images/customer_qr_ordering_mobile.png"
                  alt="Customer Mobile QR Menu Ordering App"
                  className="rounded-2xl border border-slate-800 shadow-2xl max-h-[420px] object-cover mx-auto lg:mx-0"
                />
              </div>
            </div>

            {/* KDS Touchscreen Preview */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <ChefHat className="h-4 w-4" /> Kitchen Operations
              </div>
              <h3 className="text-2xl font-bold text-white">Touchscreen Kitchen Display System (KDS)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Order tickets land instantly on the high-contrast kitchen screen with prep timers, table indicators, and one-tap status advancement from Pending → Preparing → Ready.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Audio notifications for incoming table tickets
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Station filtering (Kitchen vs Bar)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Instant bump buttons to notify waiters
                </li>
              </ul>
              <div className="pt-2">
                <img
                  src="/images/kitchen_kds_screen.png"
                  alt="Commercial Kitchen Display System Screen"
                  className="rounded-2xl border border-slate-800 shadow-2xl max-h-[420px] object-cover mx-auto lg:mx-0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Primary Workflow Demo Section */}
      <section className="border-t border-slate-800 bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">Built for High-Volume HORECA Operations</h2>
            <p className="mt-3 text-slate-400">Reliable during the busiest Friday dinner rush.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-4 font-bold text-xl">1</div>
              <h3 className="text-xl font-bold text-white mb-2">Customer Scans Table QR</h3>
              <p className="text-sm text-slate-400">Customer scans Table 07 QR code, sees clean mobile menu, selects variants & add-ons, and places order instantly.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-4 font-bold text-xl">2</div>
              <h3 className="text-xl font-bold text-white mb-2">Kitchen Accepts & Prepares</h3>
              <p className="text-sm text-slate-400">Order appears live on KDS with table number, special notes, and item count. Chef marks preparing then ready.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 mb-4 font-bold text-xl">3</div>
              <h3 className="text-xl font-bold text-white mb-2">Served, Paid & Recorded</h3>
              <p className="text-sm text-slate-400">Waiter serves the order. Cashier collects payment via UPI/Cash/Card. Revenue & audit logs reconcile in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img src="/images/logo.png" alt="Rasoi Logo" className="h-10 w-auto object-contain" />
          </div>
          <p>© {new Date().getFullYear()} Rasoi Platform. The Operating System for Modern Restaurants.</p>
        </div>
      </footer>
    </div>
  );
}
