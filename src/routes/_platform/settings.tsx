import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/platform.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/settings")({ component: SettingsPage });

type SettingsMap = Record<string, unknown>;

function isBool(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SettingsMap>({});
  const [rawJson, setRawJson] = useState("");
  const [useRaw, setUseRaw] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "settings"],
    queryFn: () => getPlatformSettings(),
  });

  useEffect(() => {
    if (!data) return;
    setDraft({ ...data });
    setRawJson(JSON.stringify(data, null, 2));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      let value: SettingsMap = draft;
      if (useRaw) {
        value = JSON.parse(rawJson) as SettingsMap;
      }
      return updatePlatformSettings({ data: { value } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] });
      toast.success("Settings saved");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save settings"),
  });

  const keys = Object.keys(draft);
  const empty = !isLoading && keys.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Global platform configuration for the control plane.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={useRaw} onCheckedChange={setUseRaw} id="raw-json" />
            <Label htmlFor="raw-json">Edit as JSON</Label>
          </div>
          <Button size="sm" disabled={saveMutation.isPending || isLoading} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : empty && !useRaw ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <Settings className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No settings found</p>
          <p className="text-xs text-muted-foreground">
            Platform settings will appear once configured, or switch to JSON edit to seed them.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              setUseRaw(true);
              setRawJson("{\n  \n}");
            }}
          >
            Edit as JSON
          </Button>
        </div>
      ) : useRaw ? (
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <Label htmlFor="settings-json" className="mb-2 block">
            Settings JSON
          </Label>
          <Textarea
            id="settings-json"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            className="min-h-[320px] font-mono text-xs"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {keys.map((key) => {
              const value = draft[key];
              if (isBool(value)) {
                return (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                    <Label className="font-mono text-xs">{key}</Label>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) =>
                        setDraft((d) => ({ ...d, [key]: checked }))
                      }
                    />
                  </div>
                );
              }
              return (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`setting-${key}`} className="font-mono text-xs">
                    {key}
                  </Label>
                  <Input
                    id={`setting-${key}`}
                    type={isNumber(value) ? "number" : "text"}
                    value={isString(value) || isNumber(value) ? String(value) : JSON.stringify(value)}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDraft((d) => {
                        if (isNumber(value)) {
                          const n = Number(next);
                          return { ...d, [key]: Number.isFinite(n) ? n : value };
                        }
                        if (isString(value)) return { ...d, [key]: next };
                        try {
                          return { ...d, [key]: JSON.parse(next) };
                        } catch {
                          return { ...d, [key]: next };
                        }
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
