import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveOrganization,
  getOrganization,
  rejectOrganization,
  restoreOrganization,
  suspendOrganization,
} from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { UsageBar } from "@/components/platform/UsageBar";
import { usePlatformShell } from "@/components/platform/platform-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, LifeBuoy, Building2, Ban, RotateCcw, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/organizations/$organizationId")({
  component: OrganizationDetailPage,
});

const SUSPEND_REASONS = [
  { value: "payment_failure", label: "Payment Failure" },
  { value: "terms_violation", label: "Terms Violation" },
  { value: "security_issue", label: "Security Issue" },
  { value: "abuse", label: "Abuse" },
  { value: "administrative_action", label: "Administrative Action" },
  { value: "other", label: "Other" },
] as const;

type SuspendReason = (typeof SUSPEND_REASONS)[number]["value"];

function OrganizationDetailPage() {
  const { organizationId } = Route.useParams();
  const shell = usePlatformShell();
  const queryClient = useQueryClient();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<SuspendReason>("administrative_action");
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: ["platform", "organization", organizationId],
    queryFn: () => getOrganization({ data: { organizationId } }),
  });

  const invalidateOrg = () => {
    queryClient.invalidateQueries({ queryKey: ["platform", "organization", organizationId] });
    queryClient.invalidateQueries({ queryKey: ["platform", "organizations"] });
    queryClient.invalidateQueries({ queryKey: ["platform", "dashboard-overview"] });
  };

  const suspendMutation = useMutation({
    mutationFn: () =>
      suspendOrganization({
        data: {
          organizationId,
          reason,
          notes: notes.trim() || null,
        },
      }),
    onSuccess: () => {
      invalidateOrg();
      setSuspendOpen(false);
      setNotes("");
      toast.success("Hotel access stopped — they can no longer use Orderly Hub");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to suspend"),
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreOrganization({ data: { organizationId } }),
    onSuccess: () => {
      invalidateOrg();
      toast.success("Hotel access restored");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to restore"),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveOrganization({ data: { organizationId } }),
    onSuccess: () => {
      invalidateOrg();
      toast.success("Registration approved — they can use Rasoi now");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      rejectOrganization({
        data: { organizationId, reason: rejectReason.trim() },
      }),
    onSuccess: () => {
      invalidateOrg();
      setRejectOpen(false);
      setRejectReason("");
      toast.success("Registration rejected");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to reject"),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
        <Building2 className="size-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">Organization not found</p>
        <p className="text-xs text-muted-foreground">
          It may have been removed, or the link is incorrect.
        </p>
        <Link to="/organizations" className="mt-2 text-xs font-medium text-primary hover:underline">
          Back to organizations
        </Link>
      </div>
    );
  }

  const inSupportMode = shell.supportOrg?.id === org.id;
  const isPending = org.status === "pending";
  const isRejected = org.status === "rejected";
  const isSuspended = org.status === "suspended";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={isPending ? "/organizations/pending" : "/organizations"}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {isPending ? "Pending approvals" : "Organizations"}
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{org.name}</h2>
            <StatusBadge status={org.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {org.slug} · {org.ownerEmail ?? "No owner email on file"}
            {org.ownerName ? ` · ${org.ownerName}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isPending || isRejected ? (
            <>
              <Button
                size="sm"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                <Check className="size-4" />
                {approveMutation.isPending ? "Approving…" : "Approve registration"}
              </Button>
              {isPending && (
                <Button variant="destructive" size="sm" onClick={() => setRejectOpen(true)}>
                  <X className="size-4" />
                  Reject
                </Button>
              )}
            </>
          ) : isSuspended ? (
            <Button
              variant="outline"
              size="sm"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate()}
            >
              <RotateCcw className="size-4" />
              Restore access
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)}>
              <Ban className="size-4" />
              Stop hotel access
            </Button>
          )}
          {!isPending && !isRejected && (
            <Button
              variant={inSupportMode ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                void (inSupportMode
                  ? shell.exitSupportMode()
                  : shell.enterSupportMode({ id: org.id, name: org.name }))
              }
            >
              <LifeBuoy className="size-4" />
              {inSupportMode ? "Exit support mode" : "Enter support mode"}
            </Button>
          )}
        </div>
      </div>

      {isPending && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-foreground">
          Awaiting approval. This hotel cannot use Rasoi admin or QR ordering until you approve.
        </div>
      )}

      {isRejected && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Registration rejected
          {org.rejectionReason ? `: ${org.rejectionReason}` : "."} You can still approve later if
          needed.
        </div>
      )}

      {isSuspended && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This hotel is suspended. Staff cannot use Orderly Hub admin, and QR ordering is blocked
          until you restore access.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Registration details</h3>
        <div className="mb-5 flex items-center gap-4">
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={`${org.name} logo`}
              className="size-16 rounded-lg border border-border bg-muted object-contain"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-xs text-muted-foreground">
              No logo
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-foreground">{org.name}</p>
            <p className="text-xs text-muted-foreground">Business logo from registration</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Owner</dt>
            <dd className="font-medium text-foreground">{org.ownerName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-medium text-foreground">{org.ownerEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="font-medium text-foreground">{org.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Business type</dt>
            <dd className="font-medium text-foreground">
              {org.businessType ? String(org.businessType).replace(/_/g, " ") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">GSTIN</dt>
            <dd className="font-medium text-foreground">{org.gstin ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Registered</dt>
            <dd className="font-mono text-xs text-foreground">
              {new Date(org.createdAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Subscription</h3>
          {org.subscription ? (
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Plan</dt>
                <dd className="font-medium text-foreground">{org.subscription.plan ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  {org.subscription.status ? (
                    <StatusBadge status={org.subscription.status} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Renews</dt>
                <dd className="font-mono text-xs text-foreground">
                  {org.subscription.renewsAt
                    ? new Date(org.subscription.renewsAt).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No active subscription on file.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Branches</h3>
          {org.branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches recorded.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {org.branches.map((b) => (
                <li key={b.id} className="text-sm text-foreground">
                  {b.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Usage (last 30 days)</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <UsageBar label="Orders" used={org.usage.orders30d} limit={null} />
          <UsageBar label="Tables" used={org.usage.tables} limit={null} />
          <UsageBar label="Staff members" used={org.usage.staff} limit={null} />
        </div>
      </div>

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop hotel access</DialogTitle>
            <DialogDescription>
              Suspend <span className="font-medium text-foreground">{org.name}</span>. Their staff
              will be locked out of Orderly Hub and customers will not be able to place QR orders.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as SuspendReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUSPEND_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal note for the audit log"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={suspendMutation.isPending}
              onClick={() => suspendMutation.mutate()}
            >
              <Ban className="size-4" />
              {suspendMutation.isPending ? "Stopping…" : "Stop access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              Reject <span className="font-medium text-foreground">{org.name}</span>. The owner will
              see that their registration was not approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why this registration is being rejected"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || rejectReason.trim().length < 3}
              onClick={() => rejectMutation.mutate()}
            >
              <X className="size-4" />
              {rejectMutation.isPending ? "Rejecting…" : "Reject registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
