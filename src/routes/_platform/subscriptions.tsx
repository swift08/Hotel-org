import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPlans, listSubscriptions, updateSubscription } from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/subscriptions")({ component: SubscriptionsPage });

type SubRow = Awaited<ReturnType<typeof listSubscriptions>>[number];

const STATUS_FILTERS = ["all", "active", "trial", "past_due", "cancelled", "suspended"] as const;

function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<SubRow | null>(null);
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState("");
  const [billingCycle, setBillingCycle] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "subscriptions", statusFilter],
    queryFn: () =>
      listSubscriptions({
        data: statusFilter === "all" ? {} : { status: statusFilter as "trial" | "active" | "past_due" | "paused" | "cancelled" | "expired" | "suspended" },
      }),
  });

  const { data: plans } = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => listPlans(),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateSubscription({
        data: {
          id: editing!.id,
          planId: planId || undefined,
          status: status || undefined,
          billingCycle: billingCycle || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "subscriptions"] });
      setEditing(null);
      toast.success("Subscription updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update subscription"),
  });

  const rows = data ?? [];
  const planOptions = useMemo(() => plans ?? [], [plans]);

  function openEdit(row: SubRow) {
    setEditing(row);
    setPlanId(row.planId ?? "");
    setStatus(row.status ?? "");
    setBillingCycle(row.billingCycle ?? "");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tenant subscriptions across all organizations.</p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <CreditCard className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No subscriptions found</p>
            <p className="text-xs text-muted-foreground">
              Subscriptions will appear here once organizations enroll in a plan.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Renews</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">
                    {row.businessName ?? row.organizationName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.plan ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {row.billingCycle ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {row.amount != null
                      ? `₹${Number(row.amount).toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.renewalAt || row.renewsAt
                      ? new Date(row.renewalAt ?? row.renewsAt!).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update subscription</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Plan</p>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Status</p>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {["active", "trial", "past_due", "paused", "cancelled", "suspended"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Billing cycle</p>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
