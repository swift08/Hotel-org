import { cn } from "@/lib/utils";

type StatusTone = "success" | "info" | "warning" | "destructive" | "neutral";

const TONE_BY_STATUS: Record<string, StatusTone> = {
  active: "success",
  healthy: "success",
  paid: "success",
  succeeded: "success",
  completed: "success",
  live: "success",
  operational: "success",

  trial: "info",
  trialing: "info",
  pending: "info",
  processing: "info",
  invited: "info",

  suspended: "destructive",
  overdue: "destructive",
  failed: "destructive",
  error: "destructive",
  down: "destructive",
  past_due: "warning",
  cancelled: "neutral",
  canceled: "neutral",
  churned: "neutral",
  inactive: "neutral",
  disabled: "neutral",
  archived: "neutral",

  degraded: "warning",
  warning: "warning",
  expiring: "warning",
};

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success border-success/25",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  info: "bg-sky-500",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/50",
};

function formatLabel(status: string) {
  return status
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({ status, label, className, dot = true }: StatusBadgeProps) {
  const key = status?.toLowerCase?.() ?? "";
  const tone = TONE_BY_STATUS[key] ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[tone])} />}
      {label ?? formatLabel(status || "unknown")}
    </span>
  );
}
