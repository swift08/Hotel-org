import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listOrganizations } from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_platform/organizations/")({ component: OrganizationsPage });

const FILTERS = [
  { label: "All", to: "/organizations" as const },
  { label: "Active", to: "/organizations/active" as const },
  { label: "Trial", to: "/organizations/trial" as const },
  { label: "Suspended", to: "/organizations/suspended" as const },
];

function OrganizationsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "organizations", "all"],
    queryFn: () => listOrganizations({ data: {} }),
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.slug?.toLowerCase().includes(q) ||
        org.ownerEmail?.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              activeOptions={{ exact: true }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                "data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="pl-9"
          />
        </div>
      </div>

      <OrganizationsTable rows={filtered} isLoading={isLoading} />
    </div>
  );
}

export function OrganizationsTable({
  rows,
  isLoading,
}: {
  rows: Awaited<ReturnType<typeof listOrganizations>>;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      {isLoading ? (
        <div className="flex flex-col gap-2 p-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <Building2 className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No organizations found</p>
          <p className="text-xs text-muted-foreground">
            Organizations that sign up for Orderly Hub will appear here.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium text-foreground">
                  <Link
                    to="/organizations/$organizationId"
                    params={{ organizationId: org.id }}
                    className="hover:underline"
                  >
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{org.ownerEmail ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{org.plan ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={org.status} />
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  {org.mrr != null ? `₹${org.mrr.toLocaleString()}` : "—"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {new Date(org.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Link
                    to="/organizations/$organizationId"
                    params={{ organizationId: org.id }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {org.status === "suspended" ? "Restore / manage" : "Stop access"}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
