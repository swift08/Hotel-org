import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardOverview } from "@/lib/platform.functions";
import { KpiCard } from "@/components/platform/KpiCard";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Users, Wallet, TrendingUp, Inbox, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_platform/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "dashboard-overview"],
    queryFn: () => getDashboardOverview(),
  });

  const orgs = data?.organizations;
  const recent = data?.recentOrganizations ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Pending approvals"
          value={orgs?.pending}
          icon={ClipboardCheck}
          loading={isLoading}
          hint={
            orgs?.pending
              ? "New Rasoi registrations waiting for review"
              : "No registrations waiting"
          }
        />
        <KpiCard
          label="Total organizations"
          value={orgs?.total}
          icon={Building2}
          loading={isLoading}
          hint={orgs ? `${orgs.active} active · ${orgs.trial} trial` : undefined}
        />
        <KpiCard
          label="Monthly recurring revenue"
          value={data?.mrr != null ? `₹${data.mrr.toLocaleString()}` : null}
          icon={Wallet}
          loading={isLoading}
        />
        <KpiCard
          label="Active subscriptions"
          value={data?.activeSubscriptions}
          icon={Users}
          loading={isLoading}
        />
        <KpiCard
          label="New signups (30d)"
          value={data?.newSignups30d}
          icon={TrendingUp}
          loading={isLoading}
        />
      </div>

      {(orgs?.pending ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {orgs?.pending} registration{orgs?.pending === 1 ? "" : "s"} awaiting approval
            </p>
            <p className="text-xs text-muted-foreground">
              Approve to unlock Rasoi for those businesses.
            </p>
          </div>
          <Link
            to="/organizations/pending"
            className="text-sm font-medium text-primary hover:underline"
          >
            Review pending →
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Recently added organizations</h2>
          <Link to="/organizations" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <Inbox className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No organizations yet</p>
            <p className="text-xs text-muted-foreground">
              New organizations will appear here as they sign up.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((org) => (
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
                  <TableCell className="text-muted-foreground">{org.plan ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={org.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
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
