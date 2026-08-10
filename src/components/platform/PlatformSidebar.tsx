import { useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  Wallet,
  Gauge,
  LineChart,
  ServerCog,
  AlertTriangle,
  ScrollText,
  ShieldCheck,
  KeyRound,
  Settings,
  ChevronDown,
  LogOut,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLeaf {
  label: string;
  to: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  children?: NavLeaf[];
}

const NAV: NavGroup[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  {
    id: "organizations",
    label: "Organizations",
    icon: Building2,
    to: "/organizations",
    children: [
      { label: "All organizations", to: "/organizations" },
      { label: "Active", to: "/organizations/active" },
      { label: "Trial", to: "/organizations/trial" },
      { label: "Suspended", to: "/organizations/suspended" },
    ],
  },
  { id: "plans", label: "Plans", icon: Boxes, to: "/plans" },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, to: "/subscriptions" },
  { id: "billing", label: "Billing", icon: Receipt, to: "/billing" },
  { id: "payments", label: "Payments", icon: Wallet, to: "/payments" },
  {
    id: "usage",
    label: "Usage",
    icon: Gauge,
    to: "/usage",
    children: [
      { label: "Overview", to: "/usage" },
      { label: "Features", to: "/usage/features" },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: LineChart,
    children: [
      { label: "Revenue", to: "/analytics/revenue" },
      { label: "Orders", to: "/analytics/orders" },
      { label: "Growth", to: "/analytics/growth" },
    ],
  },
  { id: "system", label: "System", icon: ServerCog, to: "/system" },
  { id: "errors", label: "Errors", icon: AlertTriangle, to: "/errors" },
  { id: "audit", label: "Audit Log", icon: ScrollText, to: "/audit" },
  { id: "platform-admins", label: "Platform Admins", icon: ShieldCheck, to: "/platform-admins" },
  { id: "permissions", label: "Permissions", icon: KeyRound, to: "/permissions" },
  { id: "settings", label: "Settings", icon: Settings, to: "/settings" },
];

export interface PlatformSidebarProps {
  adminEmail?: string | null;
  adminRole?: string | null;
  onSignOut: () => void;
  className?: string;
}

export function PlatformSidebar({
  adminEmail,
  adminRole,
  onSignOut,
  className,
}: PlatformSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activeGroupId = useMemo(() => {
    const group = NAV.find(
      (g) =>
        (g.to && pathname === g.to) ||
        g.children?.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`)),
    );
    return group?.id ?? null;
  }, [pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    organizations: true,
    usage: true,
    analytics: true,
  }));

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isLeafActive(to: string) {
    return pathname === to || (to !== "/organizations" && to !== "/usage" && pathname.startsWith(`${to}/`));
  }

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <img
          src="/images/rasoi-logo.png"
          alt="Rasoi"
          className="h-9 w-auto max-w-[150px] object-contain object-left"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV.map((group) => {
            const Icon = group.icon;
            const hasChildren = !!group.children?.length;
            const isOpen = hasChildren && (openGroups[group.id] ?? activeGroupId === group.id);
            const groupActive = activeGroupId === group.id;

            return (
              <li key={group.id}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      groupActive && "text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 shrink-0 text-sidebar-foreground/40 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                ) : (
                  <Link
                    to={group.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      groupActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{group.label}</span>
                  </Link>
                )}

                {hasChildren && isOpen && (
                  <ul className="ml-[1.4rem] mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                    {group.children!.map((leaf) => (
                      <li key={leaf.to}>
                        <Link
                          to={leaf.to}
                          className={cn(
                            "block rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isLeafActive(leaf.to) &&
                              "bg-sidebar-accent text-sidebar-accent-foreground",
                          )}
                        >
                          {leaf.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase text-sidebar-accent-foreground">
            {adminEmail ? adminEmail.charAt(0) : "?"}
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-medium text-sidebar-foreground">
              {adminEmail ?? "Unknown admin"}
            </span>
            <span className="truncate text-[11px] capitalize text-sidebar-foreground/50">
              {adminRole ?? "platform admin"}
            </span>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
