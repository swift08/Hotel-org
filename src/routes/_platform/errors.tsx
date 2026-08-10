import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPlatformErrors, updatePlatformError } from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/errors")({ component: ErrorsPage });

const STATUSES = ["open", "investigating", "resolved", "ignored"] as const;

function ErrorsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "errors"],
    queryFn: () => listPlatformErrors(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updatePlatformError({ data: { id, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "errors"] });
      toast.success("Error status updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update error"),
  });

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Aggregated platform errors for triage and resolution.
      </p>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <AlertTriangle className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No errors found</p>
            <p className="text-xs text-muted-foreground">
              Platform error reports will appear here when they occur.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="w-[160px]">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.errorMessage ?? row.message ?? "Unknown error"}
                      </p>
                      {(row.errorFingerprint || row.fingerprint) && (
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {row.errorFingerprint ?? row.fingerprint}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {row.occurrenceCount ?? row.count ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.lastSeenAt
                      ? new Date(row.lastSeenAt).toLocaleString()
                      : row.updatedAt
                        ? new Date(row.updatedAt).toLocaleString()
                        : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.status}
                      onValueChange={(status) => updateMutation.mutate({ id: row.id, status })}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
