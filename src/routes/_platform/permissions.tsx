import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPlatformPermissions, updateRolePermissions } from "@/lib/platform.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/permissions")({
  component: PermissionsPage,
});

function PermissionsPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "permissions"],
    queryFn: () => listPlatformPermissions(),
  });

  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];
  const matrix = data?.matrix ?? {};

  useEffect(() => {
    if (!role && roles.length > 0) setRole(roles[0]);
  }, [roles, role]);

  useEffect(() => {
    if (!role) return;
    setSelected(new Set(matrix[role] ?? []));
  }, [role, matrix]);

  const byCategory = useMemo(() => {
    const groups = new Map<string, typeof permissions>();
    for (const perm of permissions) {
      const cat = perm.category || "General";
      const list = groups.get(cat) ?? [];
      list.push(perm);
      groups.set(cat, list);
    }
    return Array.from(groups.entries());
  }, [permissions]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateRolePermissions({
        data: {
          role,
          permissionKeys: Array.from(selected),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "permissions"] });
      toast.success(`Permissions updated for ${role}`);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update permissions"),
  });

  function toggle(key: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const empty = !isLoading && (roles.length === 0 || permissions.length === 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Role permission matrix for the platform control plane.
        </p>
        {!empty && (
          <div className="flex items-center gap-2">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!role || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save role"}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-16 text-center shadow-[var(--shadow-card)]">
          <KeyRound className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No permissions found</p>
          <p className="text-xs text-muted-foreground">
            Permission definitions will appear once RBAC is configured.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {byCategory.map(([category, perms]) => (
            <div
              key={category}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="mb-3 text-sm font-semibold text-foreground">{category}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {perms.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.has(perm.key)}
                      onCheckedChange={(v) => toggle(perm.key, v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">{perm.label}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">
                        {perm.key}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
