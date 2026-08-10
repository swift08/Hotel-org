import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformContext } from "@/lib/platform.functions";
import { ArrowRight, ShieldCheck, Gauge, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) {
          if (!cancelled) setChecking(false);
          return;
        }

        const ctx = await getPlatformContext();
        if (cancelled) return;

        if (ctx?.isPlatformAdmin) {
          navigate({ to: "/dashboard" });
          return;
        }

        setChecking(false);
      } catch {
        if (!cancelled) setChecking(false);
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-black px-6 sm:px-10">
        <Link to="/" className="flex items-center">
          <img
            src="/images/rasoi-logo.png"
            alt="Rasoi"
            className="h-10 w-auto object-contain"
          />
        </Link>
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Internal control plane
        </span>
        <h1 className="max-w-2xl font-[var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Rasoi Platform
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          The single control plane for managing every hotel and restaurant organization,
          subscription, and system metric. Platform administrator access only.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Sign in to the platform <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "Organizations",
              desc: "Track every tenant's lifecycle from trial to churn.",
            },
            {
              icon: Gauge,
              title: "Usage & billing",
              desc: "Monitor subscriptions, invoices, and feature usage.",
            },
            {
              icon: ShieldCheck,
              title: "Governance",
              desc: "Audit logs, permissions, and platform admin controls.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center shadow-[var(--shadow-card)]"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-4.5" />
              </span>
              <span className="text-sm font-semibold text-foreground">{f.title}</span>
              <span className="text-xs text-muted-foreground">{f.desc}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Rasoi Platform. Internal use only.
      </footer>
    </div>
  );
}
