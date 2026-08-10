import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listPlatformAudit } from "@/lib/platform.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_platform/audit")({ component: AuditPage });

function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: () => listPlatformAudit({ data: { limit: 100 } }),
  });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Immutable record of privileged platform admin actions.
      </p>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <ScrollText className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No audit entries found</p>
            <p className="text-xs text-muted-foreground">
              Admin actions will be logged here as they happen.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">
                    {row.action ?? row.eventType ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.actorEmail ?? row.actorName ?? row.actorId ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.targetName ?? row.organizationName ?? row.targetId ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
