import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSystemHealth } from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_platform/system")({ component: SystemHealthPage });

function statusDotClass(status: string) {
  const key = status?.toLowerCase?.() ?? "";
  if (key === "healthy" || key === "operational") return "bg-success";
  if (key === "degraded" || key === "warning") return "bg-warning";
  if (key === "down" || key === "error") return "bg-destructive";
  return "bg-muted-foreground/50";
}

function SystemHealthPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "system-health"],
    queryFn: () => getSystemHealth(),
    refetchInterval: 30_000,
  });

  const checks = data?.checks ?? [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Live health checks for platform services and dependencies.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : checks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <ServerCog className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No system checks found</p>
          <p className="text-xs text-muted-foreground">
            Health probes have not reported any status yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((check) => (
            <div
              key={check.name}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      statusDotClass(check.status),
                    )}
                    aria-hidden
                  />
                  <h3 className="text-sm font-semibold text-foreground">{check.name}</h3>
                </div>
                <StatusBadge status={check.status} />
              </div>
              {check.detail ? (
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No additional detail</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
