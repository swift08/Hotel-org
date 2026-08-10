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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[oklch(0.14_0.02_45)] font-sans text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 90% 70% at 50% -20%, oklch(0.5 0.18 48 / 0.4), transparent 55%), radial-gradient(ellipse 40% 35% at 100% 60%, oklch(0.65 0.14 80 / 0.18), transparent)",
        }}
      />

      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
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

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-10 text-center">
        <img
          src="/images/rasoi-logo.png"
          alt=""
          aria-hidden
          className="mb-8 h-20 w-auto object-contain drop-shadow-[0_12px_40px_oklch(0.55_0.18_48/0.45)] sm:h-24"
        />
        <h1 className="max-w-2xl font-[var(--font-display)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Platform control plane
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
          Manage every hotel and restaurant organization, subscription, and system metric from one
          Rasoi console. Platform administrator access only.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-2 rounded-md brand-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
          >
            Sign in to the platform <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "Organizations",
              desc: "Approve signups and track every tenant lifecycle.",
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
              className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur-sm"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <f.icon className="size-4.5" />
              </span>
              <span className="text-sm font-semibold text-white">{f.title}</span>
              <span className="text-xs text-white/50">{f.desc}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
