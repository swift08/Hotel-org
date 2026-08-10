import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listUsage } from "@/lib/platform.functions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_platform/usage/features")({
  component: UsageFeaturesPage,
});

function UsageFeaturesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "usage"],
    queryFn: () => listUsage(),
  });

  const rows = data ?? [];

  const featureKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const org of rows) {
      Object.keys(org.features ?? {}).forEach((k) => keys.add(k));
    }
    return Array.from(keys).sort();
  }, [rows]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Feature flag enablement across organizations.
        </p>
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

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 || featureKeys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <ToggleLeft className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No feature usage found</p>
            <p className="text-xs text-muted-foreground">
              Feature flags will show here once organizations report entitlement data.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card">Organization</TableHead>
                {featureKeys.map((key) => (
                  <TableHead key={key} className="capitalize">
                    {key.replace(/_/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((org) => (
                <TableRow key={org.businessId}>
                  <TableCell className="sticky left-0 bg-card font-medium text-foreground">
                    {org.name}
                  </TableCell>
                  {featureKeys.map((key) => {
                    const enabled = org.features?.[key];
                    return (
                      <TableCell key={key}>
                        {enabled == null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Badge variant={enabled ? "default" : "secondary"}>
                            {enabled ? "On" : "Off"}
                          </Badge>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
