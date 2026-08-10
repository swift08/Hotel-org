import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPlans, upsertPlan } from "@/lib/platform.functions";
import { StatusBadge } from "@/components/platform/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Boxes, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_platform/plans")({ component: PlansPage });

type PlanRow = Awaited<ReturnType<typeof listPlans>>[number];

type PlanForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  currency: string;
  maxBranches: string;
  maxTables: string;
  maxStaff: string;
  maxOrders: string;
  maxMenuItems: string;
  ocrLimit: string;
  isActive: boolean;
};

const EMPTY_FORM: PlanForm = {
  code: "",
  name: "",
  description: "",
  monthlyPrice: "",
  yearlyPrice: "",
  currency: "INR",
  maxBranches: "",
  maxTables: "",
  maxStaff: "",
  maxOrders: "",
  maxMenuItems: "",
  ocrLimit: "",
  isActive: true,
};

function numOrNull(value: string) {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function planToForm(plan: PlanRow): PlanForm {
  return {
    id: plan.id,
    code: plan.code ?? "",
    name: plan.name ?? "",
    description: plan.description ?? "",
    monthlyPrice: plan.monthlyPrice != null ? String(plan.monthlyPrice) : "",
    yearlyPrice: plan.yearlyPrice != null ? String(plan.yearlyPrice) : "",
    currency: plan.currency ?? "INR",
    maxBranches: plan.maxBranches != null ? String(plan.maxBranches) : "",
    maxTables: plan.maxTables != null ? String(plan.maxTables) : "",
    maxStaff: plan.maxStaff != null ? String(plan.maxStaff) : "",
    maxOrders: plan.maxOrders != null ? String(plan.maxOrders) : "",
    maxMenuItems: plan.maxMenuItems != null ? String(plan.maxMenuItems) : "",
    ocrLimit: plan.ocrLimit != null ? String(plan.ocrLimit) : "",
    isActive: plan.isActive ?? true,
  };
}

function PlansPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => listPlans(),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertPlan({
        data: {
          id: form.id,
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          monthly_price: Number(form.monthlyPrice) || 0,
          yearly_price: Number(form.yearlyPrice) || 0,
          currency: form.currency.trim() || "INR",
          max_branches: numOrNull(form.maxBranches),
          max_tables: numOrNull(form.maxTables),
          max_staff: numOrNull(form.maxStaff),
          max_orders: numOrNull(form.maxOrders),
          max_menu_items: numOrNull(form.maxMenuItems),
          ocr_limit: numOrNull(form.ocrLimit),
          is_active: form.isActive,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "plans"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success(form.id ? "Plan updated" : "Plan created");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save plan"),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(plan: PlanRow) {
    setForm(planToForm(plan));
    setOpen(true);
  }

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Manage subscription plans and limits.</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          New plan
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
            <Boxes className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No plans found</p>
            <p className="text-xs text-muted-foreground">Create a plan to start selling subscriptions.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Yearly</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium text-foreground">{plan.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{plan.code}</TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {plan.monthlyPrice != null
                      ? `${plan.currency ?? "₹"}${Number(plan.monthlyPrice).toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {plan.yearlyPrice != null
                      ? `${plan.currency ?? "₹"}${Number(plan.yearlyPrice).toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={plan.isActive ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(plan)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit plan" : "Create plan"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-code">Code</Label>
              <Input
                id="plan-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-currency">Currency</Label>
              <Input
                id="plan-currency"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-monthly">Monthly price</Label>
              <Input
                id="plan-monthly"
                type="number"
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-yearly">Yearly price</Label>
              <Input
                id="plan-yearly"
                type="number"
                value={form.yearlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, yearlyPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan-description">Description</Label>
              <Input
                id="plan-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            {(
              [
                ["maxBranches", "Max branches"],
                ["maxTables", "Max tables"],
                ["maxStaff", "Max staff"],
                ["maxOrders", "Max orders"],
                ["maxMenuItems", "Max menu items"],
                ["ocrLimit", "OCR limit"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`plan-${key}`}>{label}</Label>
                <Input
                  id={`plan-${key}`}
                  type="number"
                  placeholder="Unlimited"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name.trim() || !form.code.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "Saving…" : "Save plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
