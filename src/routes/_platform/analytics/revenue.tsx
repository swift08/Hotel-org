import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRevenueAnalytics } from "@/lib/platform.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { LineChart } from "lucide-react";

export const Route = createFileRoute("/_platform/analytics/revenue")({
  component: RevenueAnalyticsPage,
});

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
] as const;

const seriesConfig = {
  mrr: { label: "MRR", color: "var(--chart-1)" },
  arr: { label: "ARR", color: "var(--chart-2)" },
} satisfies ChartConfig;

const planConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

function RevenueAnalyticsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "analytics", "revenue", range],
    queryFn: () => getRevenueAnalytics({ data: { range } }),
  });

  const series = data?.series ?? [];
  const byPlan = data?.byPlan ?? [];
  const empty = !isLoading && series.length === 0 && byPlan.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">MRR / ARR trends and revenue by plan.</p>
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <LineChart className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No revenue analytics found</p>
          <p className="text-xs text-muted-foreground">
            Charts will populate when subscription revenue is recorded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 text-sm font-semibold text-foreground">MRR & ARR</h3>
            {series.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No series data</p>
            ) : (
              <ChartContainer config={seriesConfig} className="aspect-[16/9] w-full">
                <AreaChart data={series}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="var(--color-mrr)"
                    fill="var(--color-mrr)"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="arr"
                    stroke="var(--color-arr)"
                    fill="var(--color-arr)"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Revenue by plan</h3>
            {byPlan.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No plan breakdown</p>
            ) : (
              <ChartContainer config={planConfig} className="aspect-[16/9] w-full">
                <BarChart data={byPlan}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="plan" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
