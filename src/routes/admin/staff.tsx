import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getMyContext, listStaff, updateStaffRole, createStaffMember, updateStaffMemberDetails } from "@/lib/business.functions";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  User, 
  Loader2,
  Settings2,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/staff")({
  component: StaffManagement,
});

const ALL_ROLES = [
  "owner",
  "business_admin",
  "general_manager",
  "branch_manager",
  "floor_manager",
  "waiter",
  "cashier",
  "chef",
  "kitchen_staff",
  "bar_staff",
];

const PERMISSION_KEYS = [
  { key: "orders.view", label: "View Orders", cat: "Orders" },
  { key: "orders.create", label: "Create Orders", cat: "Orders" },
  { key: "orders.edit", label: "Edit Active Orders", cat: "Orders" },
  { key: "orders.cancel", label: "Cancel Orders", cat: "Orders" },
  { key: "orders.discount", label: "Apply Discounts", cat: "Orders" },
  { key: "kds.view", label: "View Kitchen Display", cat: "Kitchen" },
  { key: "kds.manage", label: "Manage KDS Statuses", cat: "Kitchen" },
  { key: "menu.view", label: "View Menu", cat: "Menu" },
  { key: "menu.edit", label: "Edit Menu CMS", cat: "Menu" },
  { key: "tables.manage", label: "Manage Tables & QRs", cat: "Tables" },
  { key: "staff.view", label: "View Staff List", cat: "Staff" },
  { key: "staff.manage", label: "Manage Staff Roles", cat: "Staff" },
  { key: "payments.collect", label: "Process Payments", cat: "Billing" },
  { key: "payments.refund", label: "Issue Refunds", cat: "Billing" },
  { key: "reports.view", label: "View Sales Reports", cat: "Reports" },
  { key: "reports.financial", label: "Export Financial Reports", cat: "Reports" },
  { key: "settings.manage", label: "Manage Business Settings", cat: "Admin" },
];

function StaffManagement() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Add Staff Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addRole, setAddRole] = useState("chef");
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [addPassword, setAddPassword] = useState("RasoiStaff123");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const ctx = await getMyContext();
      setContext(ctx);
      if (ctx?.membership?.business_id) {
        const staff = await listStaff({ data: { businessId: ctx.membership.business_id } });
        setStaffList(staff || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to load staff list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  // Edit Staff Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("waiter");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [updatingStaffDetails, setUpdatingStaffDetails] = useState(false);

  const handleOpenEditStaff = (staff: any) => {
    setSelectedStaff(staff);
    setNewRole(staff.role);
    setEditDisplayName(staff.profile?.display_name || "");
    setEditPhone(staff.profile?.phone || "");
    setEditIsActive(staff.is_active ?? true);
    setCustomRoleTitle("");
    setEditModalOpen(true);
  };

  const handleSaveStaffDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !context?.membership?.business_id) return;
    const finalRole = newRole === "custom" ? (customRoleTitle.trim().toLowerCase().replace(/\s+/g, "_") || selectedStaff.role) : newRole;

    setUpdatingStaffDetails(true);
    try {
      await updateStaffMemberDetails({
        data: {
          businessId: context.membership.business_id,
          membershipId: selectedStaff.id,
          displayName: editDisplayName,
          phone: editPhone,
          role: finalRole,
          isActive: editIsActive,
        },
      });
      toast.success(`Updated details for ${editDisplayName || "Staff member"}`);
      setEditModalOpen(false);
      fetchStaffData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update staff details");
    } finally {
      setUpdatingStaffDetails(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFullName || !addEmail || !context?.membership?.business_id) return;
    const finalRole = addRole === "custom" ? (customRoleTitle.trim().toLowerCase().replace(/\s+/g, "_") || "staff") : addRole;
    setCreatingStaff(true);
    try {
      await createStaffMember({
        data: {
          businessId: context.membership.business_id,
          fullName: addFullName,
          email: addEmail,
          phone: addPhone || undefined,
          role: finalRole,
          password: addPassword || "RasoiStaff123",
        },
      });
      toast.success(`Successfully added ${addFullName} as ${finalRole.toUpperCase().replace(/_/g, " ")}!`);
      setAddModalOpen(false);
      setAddFullName("");
      setAddEmail("");
      setAddPhone("");
      setCustomRoleTitle("");
      setAddPassword("RasoiStaff123");
      setShowPassword(false);
      fetchStaffData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add staff member");
    } finally {
      setCreatingStaff(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Staff & Permissions Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage team access, role assignments, and granular RBAC permission matrix.
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          className="bg-amber-500 font-extrabold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Add Staff Member
        </Button>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 text-slate-400 p-1 rounded-xl">
          <TabsTrigger value="members" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold rounded-lg text-xs">
            Team Members ({staffList.length})
          </TabsTrigger>
          <TabsTrigger value="matrix" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 font-bold rounded-lg text-xs">
            RBAC Permission Matrix
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Members List */}
        <TabsContent value="members">
          {loading ? (
            <div className="flex justify-center py-12 text-amber-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg text-white font-bold">Active Staff Members</CardTitle>
                <CardDescription className="text-slate-400">
                  Every user assigned to {context?.business?.name}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-slate-800">
                  {staffList.map((m) => (
                    <div key={m.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-bold">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">
                            {m.profile?.display_name || "Unnamed User"}
                          </h4>
                          <p className="text-xs text-slate-400">{m.profile?.phone || "No phone attached"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className="uppercase text-xs font-bold bg-amber-500/20 text-amber-300 border-amber-500/30">
                          {m.role}
                        </Badge>

                        <Button
                          onClick={() => handleOpenEditStaff(m)}
                          variant="outline"
                          size="sm"
                          className="border-slate-700 bg-slate-950 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-colors h-8 text-xs font-bold shadow-sm"
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Edit Staff
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Permission Matrix Table */}
        <TabsContent value="matrix">
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg text-white font-bold">Role-Based Access Control (RBAC)</CardTitle>
              <CardDescription className="text-slate-400">
                Server-side enforced granular permission matrix evaluated on every request.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-300">
                    <th className="p-4 font-bold min-w-[200px]">Permission Key</th>
                    <th className="p-4 font-bold text-center">Owner</th>
                    <th className="p-4 font-bold text-center">Manager</th>
                    <th className="p-4 font-bold text-center">Waiter</th>
                    <th className="p-4 font-bold text-center">Cashier</th>
                    <th className="p-4 font-bold text-center">Chef</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {PERMISSION_KEYS.map((pk) => {
                    // Default logic per matrix
                    const isOwnerAllowed = true;
                    const isManagerAllowed = !pk.key.startsWith("settings") && pk.key !== "reports.financial";
                    const isWaiterAllowed = ["orders.view", "orders.create", "orders.edit", "menu.view", "tables.manage"].includes(pk.key);
                    const isCashierAllowed = ["orders.view", "orders.create", "payments.collect", "menu.view"].includes(pk.key);
                    const isChefAllowed = pk.key.startsWith("kds.") || pk.key === "menu.view" || pk.key === "orders.view";

                    return (
                      <tr key={pk.key} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-medium text-white">
                          <div className="font-bold">{pk.label}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{pk.key}</div>
                        </td>
                        <td className="p-4 text-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                        </td>
                        <td className="p-4 text-center">
                          {isManagerAllowed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-600 mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isWaiterAllowed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-600 mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isCashierAllowed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-600 mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {isChefAllowed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto" />
                          ) : (
                            <XCircle className="h-4 w-4 text-slate-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Staff Member Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-amber-400" /> Edit Staff Details
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStaffDetails} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Full Name *</Label>
              <Input
                placeholder="e.g. Aarav Mehta"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Phone Number</Label>
              <Input
                placeholder="+91 80 4567 8901"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Role & Access Level *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="chef">👨‍🍳 Chef / Kitchen Manager</SelectItem>
                  <SelectItem value="kitchen_staff">🍳 Kitchen Staff</SelectItem>
                  <SelectItem value="cashier">💳 Cashier / Front Desk</SelectItem>
                  <SelectItem value="waiter">🤵 Waiter / Server</SelectItem>
                  <SelectItem value="floor_manager">📋 Floor Manager</SelectItem>
                  <SelectItem value="branch_manager">🏢 Branch Manager</SelectItem>
                  <SelectItem value="business_admin">🛡️ Business Admin</SelectItem>
                  <SelectItem value="custom">✨ Custom Role...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRole === "custom" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <Label className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Custom Role Title *
                </Label>
                <Input
                  placeholder="e.g. Head Bartender, Captain, Hostess"
                  value={customRoleTitle}
                  onChange={(e) => setCustomRoleTitle(e.target.value)}
                  required
                  className="bg-slate-950 border-amber-500/50 text-white placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <p className="text-xs font-bold text-white">Account Active Status</p>
                <p className="text-[11px] text-slate-400">Allow or revoke system login permissions</p>
              </div>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={updatingStaffDetails}
                className="w-full bg-amber-500 font-extrabold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
              >
                {updatingStaffDetails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add New Staff Member Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-400" /> Add Team Member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Full Name *</Label>
              <Input
                placeholder="e.g. Vikram Simha"
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Email Address *</Label>
              <Input
                type="email"
                placeholder="e.g. chef.vikram@rasoi.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Phone Number (Optional)</Label>
              <Input
                placeholder="+91 98765 43210"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Role & Access Level *</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="chef">👨‍🍳 Chef / Kitchen Manager</SelectItem>
                  <SelectItem value="kitchen_staff">🍳 Kitchen Staff</SelectItem>
                  <SelectItem value="cashier">💳 Cashier / Front Desk</SelectItem>
                  <SelectItem value="waiter">🤵 Waiter / Server</SelectItem>
                  <SelectItem value="floor_manager">📋 Floor Manager</SelectItem>
                  <SelectItem value="branch_manager">🏢 Branch Manager</SelectItem>
                  <SelectItem value="business_admin">🛡️ Business Admin</SelectItem>
                  <SelectItem value="custom">✨ Custom Role...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {addRole === "custom" && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <Label className="text-xs text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Custom Role Title *
                </Label>
                <Input
                  placeholder="e.g. Head Bartender, Captain, Sommelier, Hostess"
                  value={customRoleTitle}
                  onChange={(e) => setCustomRoleTitle(e.target.value)}
                  required
                  className="bg-slate-950 border-amber-500/50 text-white placeholder:text-slate-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Account Password *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="RasoiStaff123"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-amber-400 transition-colors"
                  title={showPassword ? "Hide Password" : "Show Password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={creatingStaff}
                className="w-full bg-amber-500 font-extrabold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20"
              >
                {creatingStaff ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Staff...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Create Staff Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
