import { LifeBuoy, X } from "lucide-react";

export interface SupportBannerProps {
  organizationName: string | null | undefined;
  onExit: () => void;
}

export function SupportBanner({ organizationName, onExit }: SupportBannerProps) {
  if (!organizationName) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-violet-500/20 bg-violet-500/10 px-4 py-2.5 sm:px-6">
      <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
        <LifeBuoy className="size-4 shrink-0" />
        <span>
          Support mode — viewing platform data as{" "}
          <span className="font-semibold">{organizationName}</span>.
        </span>
      </div>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-500/15 dark:text-violet-300"
      >
        <X className="size-3.5" />
        Exit support mode
      </button>
    </div>
  );
}
