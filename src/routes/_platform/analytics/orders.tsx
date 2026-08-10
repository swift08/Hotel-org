import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getOrderAnalytics } from "@/lib/platform.functions";
import { KpiCard } from "@/components/platform/KpiCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart as RechartsLine, XAxis, YAxis } from "recharts";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_platform/analytics/orders")({
  component: OrderAnalyticsPage,
});

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
] as const;

const seriesConfig = {
  orders: { label: "Orders", color: "var(--chart-1)" },
} satisfies ChartConfig;

function OrderAnalyticsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "analytics", "orders", range],
    queryFn: () => getOrderAnalytics({ data: { range } }),
  });

  const totals = data?.totals;
  const byOrg = data?.byOrg ?? [];
  const series = data?.series ?? [];
  const empty = !isLoading && byOrg.length === 0 && series.length === 0 && !totals;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Order volume and average order value by org.</p>
        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <ShoppingBag className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No order analytics found</p>
          <p className="text-xs text-muted-foreground">
            Order charts will appear once tenants process orders.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Total orders"
              value={totals?.orders ?? totals?.totalOrders}
              loading={isLoading}
            />
            <KpiCard
              label="Average order value"
              value={
                totals?.aov != null
                  ? `₹${Number(totals.aov).toLocaleString()}`
                  : totals?.averageOrderValue != null
                    ? `₹${Number(totals.averageOrderValue).toLocaleString()}`
                    : null
              }
              loading={isLoading}
            />
            <KpiCard
              label="Gross volume"
              value={
                totals?.volume != null
                  ? `₹${Number(totals.volume).toLocaleString()}`
                  : totals?.revenue != null
                    ? `₹${Number(totals.revenue).toLocaleString()}`
                    : null
              }
              loading={isLoading}
            />
          </div>

          {series.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Orders over time</h3>
              <ChartContainer config={seriesConfig} className="aspect-[21/9] w-full">
                <RechartsLine data={series}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={48} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="var(--color-orders)"
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLine>
              </ChartContainer>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            {byOrg.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No organization breakdown
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>AOV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byOrg.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {row.orders?.toLocaleString() ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {row.aov != null ? `₹${Number(row.aov).toLocaleString()}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
