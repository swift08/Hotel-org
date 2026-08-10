import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBillingSummary } from "@/lib/platform.functions";
import { KpiCard } from "@/components/platform/KpiCard";
import {
  Wallet,
  TrendingUp,
  UserPlus,
  RefreshCw,
  UserMinus,
  AlertTriangle,
  XCircle,
  RotateCcw,
} from "lucide-react";

export const Route = createFileRoute("/_platform/billing")({ component: BillingPage });

function money(value: number | null | undefined) {
  if (value == null) return null;
  return `₹${Number(value).toLocaleString()}`;
}

function BillingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "billing-summary"],
    queryFn: () => getBillingSummary(),
  });

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Platform-wide billing health across subscriptions and payments.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="MRR" value={money(data?.mrr)} icon={Wallet} loading={isLoading} />
        <KpiCard label="ARR" value={money(data?.arr)} icon={TrendingUp} loading={isLoading} />
        <KpiCard label="New subscriptions" value={data?.newSubs} icon={UserPlus} loading={isLoading} />
        <KpiCard label="Renewals" value={data?.renewals} icon={RefreshCw} loading={isLoading} />
        <KpiCard
          label="Cancellations"
          value={data?.cancellations}
          icon={UserMinus}
          loading={isLoading}
        />
        <KpiCard label="Past due" value={data?.pastDue} icon={AlertTriangle} loading={isLoading} />
        <KpiCard
          label="Failed payments"
          value={data?.failedPayments}
          icon={XCircle}
          loading={isLoading}
        />
        <KpiCard label="Refunds" value={data?.refunds} icon={RotateCcw} loading={isLoading} />
      </div>
    </div>
  );
}
