import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  endSupportMode,
  getPlatformContext,
  startSupportMode,
} from "@/lib/platform.functions";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { SupportBanner } from "@/components/platform/SupportBanner";
import {
  PlatformShellContext,
  type PlatformContextValue,
  type PlatformShellState,
} from "@/components/platform/platform-shell";
import { toast } from "sonner";

// Re-export for any stale split chunks / HMR that still import from this route module.
export { usePlatformShell, PlatformShellContext } from "@/components/platform/platform-shell";

export const Route = createFileRoute("/_platform")({ component: PlatformLayout });

const SUPPORT_MODE_KEY = "orderly-hub:platform-support-mode";

function readSupportMode(): { id: string; name: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SUPPORT_MODE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const PAGE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/organizations/active", title: "Active Organizations" },
  { prefix: "/organizations/trial", title: "Trial Organizations" },
  { prefix: "/organizations/suspended", title: "Suspended Organizations" },
  { prefix: "/organizations", title: "Organizations" },
  { prefix: "/plans", title: "Plans" },
  { prefix: "/subscriptions", title: "Subscriptions" },
  { prefix: "/billing", title: "Billing" },
  { prefix: "/payments", title: "Payments" },
  { prefix: "/usage/features", title: "Feature Usage" },
  { prefix: "/usage", title: "Usage" },
  { prefix: "/analytics/revenue", title: "Revenue Analytics" },
  { prefix: "/analytics/orders", title: "Order Analytics" },
  { prefix: "/analytics/growth", title: "Growth Analytics" },
  { prefix: "/system", title: "System Health" },
  { prefix: "/errors", title: "Error Logs" },
  { prefix: "/audit", title: "Audit Log" },
  { prefix: "/platform-admins", title: "Platform Admins" },
  { prefix: "/permissions", title: "Permissions" },
  { prefix: "/settings", title: "Settings" },
];

function pageTitleFor(pathname: string) {
  const match = PAGE_TITLES.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  return match?.title ?? "Platform Console";
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

function PlatformLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [status, setStatus] = useState<"checking" | "ready" | "denied">("checking");
  const [context, setContext] = useState<PlatformContextValue | null>(null);
  const [supportOrg, setSupportOrg] = useState<{ id: string; name: string } | null>(null);

  async function verify() {
    setStatus("checking");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setStatus("denied");
        navigate({ to: "/auth/login" });
        return;
      }

      const ctx = await getPlatformContext();
      if (!ctx?.isPlatformAdmin) {
        await supabase.auth.signOut();
        setStatus("denied");
        navigate({ to: "/auth/login" });
        return;
      }

      setContext(ctx);
      setStatus("ready");
    } catch {
      setStatus("denied");
      navigate({ to: "/auth/login" });
    }
  }

  useEffect(() => {
    verify();
    setSupportOrg(readSupportMode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shell = useMemo<PlatformShellState>(
    () => ({
      context,
      refresh: verify,
      supportOrg,
      enterSupportMode: async (org) => {
        try {
          await startSupportMode({
            data: { organizationId: org.id, reason: "Troubleshooting" },
          });
          setSupportOrg(org);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(SUPPORT_MODE_KEY, JSON.stringify(org));
          }
          toast.success(`Support mode: ${org.name}`);
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Could not start support mode");
        }
      },
      exitSupportMode: async () => {
        try {
          if (supportOrg?.id) {
            await endSupportMode({ data: { organizationId: supportOrg.id } });
          }
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "Could not end support mode");
        } finally {
          setSupportOrg(null);
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(SUPPORT_MODE_KEY);
          }
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [context, supportOrg],
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth/login" });
  }

  if (status !== "ready") {
    return <FullScreenLoader />;
  }

  return (
    <PlatformShellContext.Provider value={shell}>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <PlatformSidebar
          adminEmail={context?.email ?? null}
          adminRole={context?.role ?? null}
          onSignOut={handleSignOut}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <SupportBanner
            organizationName={supportOrg?.name}
            onExit={() => {
              void shell.exitSupportMode();
            }}
          />

          <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {pageTitleFor(pathname)}
            </h1>
            <div className="text-xs text-muted-foreground">
              {context?.email && <span className="hidden sm:inline">{context.email}</span>}
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </PlatformShellContext.Provider>
  );
}
