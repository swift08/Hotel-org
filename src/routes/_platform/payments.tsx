import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listSubscriptionEvents } from "@/lib/platform.functions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_platform/payments")({ component: PaymentsPage });

function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "subscription-events"],
    queryFn: () => listSubscriptionEvents({ data: {} }),
  });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        SaaS payment and subscription lifecycle events from the billing system.
      </p>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <Wallet className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No SaaS payment records yet</p>
            <p className="text-xs text-muted-foreground">
              Payment events will appear here when subscriptions charge or fail.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium capitalize text-foreground">
                    {(row.eventType ?? "").replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.businessName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {row.amount != null ? `₹${Number(row.amount).toLocaleString()}` : "—"}
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
