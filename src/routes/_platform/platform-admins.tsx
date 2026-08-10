import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPlatformAdmins, upsertPlatformAdmin } from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/platform-admins")({
  component: PlatformAdminsPage,
});

type AdminRow = Awaited<ReturnType<typeof listPlatformAdmins>>[number];

const ROLES = [
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_finance",
  "platform_analyst",
] as const;

type AdminForm = {
  userId?: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
};

const EMPTY_FORM: AdminForm = {
  email: "",
  displayName: "",
  role: "platform_support",
  isActive: true,
};

function PlatformAdminsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "admins"],
    queryFn: () => listPlatformAdmins(),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertPlatformAdmin({
        data: {
          userId: form.userId,
          email: form.email.trim() || undefined,
          displayName: form.displayName.trim() || undefined,
          role: form.role,
          isActive: form.isActive,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "admins"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success(form.userId ? "Admin updated" : "Admin added");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save admin"),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(row: AdminRow) {
    setForm({
      userId: row.userId ?? row.id,
      email: row.email ?? "",
      displayName: row.displayName ?? "",
      role: row.role ?? "platform_support",
      isActive: row.isActive ?? true,
    });
    setOpen(true);
  }

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Control who can access the Orderly Hub platform console.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          Add admin
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-full animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No platform admins found</p>
            <p className="text-xs text-muted-foreground">
              Invite an admin to grant console access.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId ?? row.id ?? row.email}>
                  <TableCell className="font-medium text-foreground">
                    {row.displayName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.email ?? "—"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{row.role ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.isActive ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.userId ? "Edit admin" : "Add admin"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!!form.userId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Display name</Label>
              <Input
                id="admin-name"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={(!form.userId && !form.email.trim()) || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
