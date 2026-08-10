import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getGrowthAnalytics } from "@/lib/platform.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_platform/analytics/growth")({
  component: GrowthAnalyticsPage,
});

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
] as const;

const chartConfig = {
  newOrgs: { label: "New orgs", color: "var(--chart-3)" },
  churned: { label: "Churned", color: "var(--chart-5)" },
} satisfies ChartConfig;

function GrowthAnalyticsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "analytics", "growth", range],
    queryFn: () => getGrowthAnalytics({ data: { range } }),
  });

  const series = data?.series ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">New organization signups versus churn.</p>
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
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      ) : series.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <TrendingUp className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No growth analytics found</p>
          <p className="text-xs text-muted-foreground">
            Growth charts will appear as organizations join or churn.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-4 text-sm font-semibold text-foreground">New orgs vs churned</h3>
          <ChartContainer config={chartConfig} className="aspect-[21/9] w-full">
            <LineChart data={series}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="newOrgs"
                stroke="var(--color-newOrgs)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="churned"
                stroke="var(--color-churned)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
