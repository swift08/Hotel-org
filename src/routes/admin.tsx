import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";
import { useState, useEffect } from "react";
import { getMyContext } from "@/lib/business.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Utensils,
  LayoutDashboard,
  MenuSquare,
  QrCode,
  ShoppingBag,
  ChefHat,
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  Store,
  Bell,
  Loader2,
  Menu,
  X,
  HelpCircle,
  DollarSign,
  Grid3x3,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ROLE_NAV,
  ROLE_DISPLAY,
  type StaffRole,
} from "@/lib/rbac";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

// Icon map — map rbac icon string to lucide component
const ICON_MAP: Record<string, any> = {
  grid: LayoutDashboard,
  "shopping-bag": ShoppingBag,
  "chef-hat": ChefHat,
  "qr-code": QrCode,
  "menu-square": MenuSquare,
  users: Users,
  "bar-chart": BarChart3,
  shield: ShieldAlert,
  settings: Settings,
  store: Store,
  dollar: DollarSign,
};

function AdminLayout() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("rasoi_theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("rasoi_theme", nextTheme);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    }
  }, [theme]);

  useEffect(() => {
    getMyContext()
      .then((ctx) => {
        if (!ctx?.membership) {
          navigate({ to: "/auth/login" });
          return;
        }
        setContext(ctx);
      })
      .catch(() => navigate({ to: "/auth/login" }))
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate({ to: "/auth/login" });
  };

  if (loading) {
    return (
      <BrandedLoadingScreen
        restaurantName={context?.business?.name || "RASOI"}
        subtitle="Loading workspace & live floor state..."
        logoUrl="/images/logo.png"
      />
    );
  }

  if (!context?.membership) return null;

  const role = (context.membership.role || "owner") as StaffRole;
  const roleDisplay = ROLE_DISPLAY[role] || ROLE_DISPLAY.owner;
  const navSections = ROLE_NAV[role] || ROLE_NAV.owner;
  const businessName = context?.business?.name || "My Business";
  const branchName = context?.branches?.[0]?.name || "Main Branch";
  const userName = context?.profile?.full_name || context?.user?.email?.split("@")[0] || "User";

  // ── Sidebar component (shared between mobile + desktop)
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/60">
        <div className="flex flex-col items-start gap-1">
          <img src="/images/logo.png" alt="Rasoi Logo" className="h-11 w-auto object-contain shrink-0" />
          <div className="min-w-0 flex-1 pl-1">
            <p className="font-extrabold text-white text-xs truncate leading-tight">{businessName}</p>
            <p className="text-[10px] text-amber-400/80 font-medium truncate">{branchName}</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-none">
        {navSections.map((section) => (
          <div key={section.section}>
            <p className="px-2 mb-2 text-[10px] font-bold text-slate-600 tracking-widest uppercase">
              {section.section}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = ICON_MAP[item.icon] || LayoutDashboard;
                // For KDS, path is /kds not /admin/kds
                const href = item.to === "/admin/kds" ? "/kds" : item.to;
                const isActive =
                  href === "/admin/dashboard"
                    ? currentPath === "/admin/dashboard" || currentPath === "/admin"
                    : currentPath.startsWith(href);

                return (
                  <Link
                    key={item.to}
                    to={href as any}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                      isActive
                        ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                        : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                    }`}
                  >
                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400 rounded-r-full" />
                    )}
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isActive ? "text-amber-400" : "text-slate-600 group-hover:text-slate-400"
                      }`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {item.badge === "live" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    )}
                    {item.badge === "urgent" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800/60 p-4 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <Badge className={`text-[9px] font-bold px-1.5 py-0 border mt-0.5 ${roleDisplay.color}`}>
              {roleDisplay.label}
            </Badge>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all group"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-red-400" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col bg-slate-900/80 border-r border-slate-800/60 backdrop-blur">
        <SidebarContent />
      </aside>

      {/* ── Mobile Overlay ────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-sm font-bold text-white">Navigation</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800/60 bg-slate-900/90 backdrop-blur px-4 lg:px-6 shrink-0">
          {/* Left: mobile menu + breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-black text-white tracking-wider uppercase text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md text-amber-400">RASOI</span>
              <span>›</span>
              <span className="font-semibold text-slate-300 truncate max-w-[160px]">{businessName}</span>
              <span>›</span>
              <span className="truncate max-w-[120px]">{branchName}</span>
            </div>
          </div>

          {/* Right: role badge + icons + user */}
          <div className="flex items-center gap-2">
            {/* Role badge — shows workspace type */}
            <Badge className={`hidden sm:flex text-[10px] font-bold px-2 py-0.5 border ${roleDisplay.color}`}>
              {roleDisplay.label}
            </Badge>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-800/80 border border-slate-700/80 text-amber-300 hover:bg-slate-800 transition-all shadow-sm shrink-0"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden md:inline text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-blue-400" />
                  <span className="hidden md:inline text-[11px]">Dark</span>
                </>
              )}
            </button>

            <button className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors relative">
              <Bell className="h-4 w-4" />
            </button>
            <button className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors">
              <HelpCircle className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 ml-1 pl-3 border-l border-slate-800">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[11px] font-black text-slate-950">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-xs font-semibold text-slate-300 max-w-[100px] truncate">
                {userName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
