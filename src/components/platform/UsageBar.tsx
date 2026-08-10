import { cn } from "@/lib/utils";

export interface UsageBarProps {
  label: string;
  used: number | null | undefined;
  limit: number | null | undefined;
  unit?: string;
  className?: string;
}

export function UsageBar({ label, used, limit, unit = "", className }: UsageBarProps) {
  const hasData = used !== null && used !== undefined;
  const isUnlimited = hasData && (limit === null || limit === undefined);
  const percent =
    hasData && typeof limit === "number" && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null;

  const barColor =
    percent === null
      ? "bg-primary/40"
      : percent >= 90
        ? "bg-destructive"
        : percent >= 70
          ? "bg-warning"
          : "bg-primary";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {!hasData
            ? "No usage data"
            : isUnlimited
              ? `${used.toLocaleString()}${unit} · Unlimited`
              : `${used.toLocaleString()}${unit} / ${limit!.toLocaleString()}${unit}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        {hasData && (
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: isUnlimited ? "100%" : `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}
