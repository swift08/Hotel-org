import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface KpiCardProps {
  label: string;
  value: string | number | null | undefined;
  icon?: LucideIcon;
  hint?: string;
  emptyHint?: string;
  trend?: { value: number; label?: string } | null;
  loading?: boolean;
  className?: string;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value.toLocaleString();
  return value;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  emptyHint = "No data yet",
  trend,
  loading = false,
  className,
}: KpiCardProps) {
  const formatted = formatValue(value);
  const isEmpty = formatted === null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "font-mono text-2xl font-semibold tracking-tight tabular-nums",
              isEmpty ? "text-muted-foreground/60" : "text-foreground",
            )}
          >
            {isEmpty ? "—" : formatted}
          </span>
          {trend && !isEmpty && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend.value > 0 && "text-success",
                trend.value < 0 && "text-destructive",
                trend.value === 0 && "text-muted-foreground",
              )}
            >
              {trend.value > 0 && <ArrowUpRight className="size-3.5" />}
              {trend.value < 0 && <ArrowDownRight className="size-3.5" />}
              {trend.value === 0 && <Minus className="size-3.5" />}
              {Math.abs(trend.value)}
              {trend.label ?? "%"}
            </span>
          )}
        </div>
      )}

      {!loading && (
        <p className="text-xs text-muted-foreground">{isEmpty ? emptyHint : (hint ?? "\u00A0")}</p>
      )}
    </div>
  );
}
