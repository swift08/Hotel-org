import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listUsage } from "@/lib/platform.functions";
import { UsageBar } from "@/components/platform/UsageBar";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_platform/usage/")({ component: UsageOverviewPage });

function UsageOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "usage"],
    queryFn: () => listUsage(),
  });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Resource consumption against plan limits.</p>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          <Link
            to="/usage"
            activeOptions={{ exact: true }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              "data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm",
            )}
          >
            Overview
          </Link>
          <Link
            to="/usage/features"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              "data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm",
            )}
          >
            Features
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <Gauge className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No usage found</p>
          <p className="text-xs text-muted-foreground">
            Usage metrics will appear once organizations start operating.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((org) => (
            <div
              key={org.businessId}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="mb-4 text-sm font-semibold text-foreground">{org.name}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <UsageBar label="Branches" used={org.branches} limit={org.maxBranches} />
                <UsageBar label="Tables" used={org.tables} limit={org.maxTables} />
                <UsageBar label="Staff" used={org.staff} limit={org.maxStaff} />
                <UsageBar label="Menu items" used={org.menuItems} limit={org.maxMenuItems} />
                <UsageBar label="Orders" used={org.orders} limit={org.maxOrders} />
                <UsageBar label="OCR imports" used={org.ocrImports} limit={org.ocrLimit} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
