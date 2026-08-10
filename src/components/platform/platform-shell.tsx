import { createContext, useContext } from "react";
import type { getPlatformContext } from "@/lib/platform.functions";

export type PlatformContextValue = Awaited<ReturnType<typeof getPlatformContext>>;

export interface PlatformShellState {
  context: PlatformContextValue | null;
  refresh: () => Promise<void>;
  supportOrg: { id: string; name: string } | null;
  enterSupportMode: (org: { id: string; name: string }) => Promise<void>;
  exitSupportMode: () => Promise<void>;
}

export const PlatformShellContext = createContext<PlatformShellState | null>(null);

export function usePlatformShell() {
  const ctx = useContext(PlatformShellContext);
  if (!ctx) {
    throw new Error("usePlatformShell must be used within the platform layout.");
  }
  return ctx;
}
