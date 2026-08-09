/**
 * RBAC — Role-Based Access Control
 * Maps staff_role enum values to nav items, permissions, and workspace types.
 */

export type StaffRole =
  | "owner"
  | "business_admin"
  | "general_manager"
  | "branch_manager"
  | "floor_manager"
  | "waiter"
  | "cashier"
  | "chef"
  | "kitchen_staff"
  | "bar_staff";

export type WorkspaceType =
  | "owner"
  | "manager"
  | "floor_ops"
  | "waiter"
  | "cashier"
  | "kitchen"
  | "bar";

/**
 * Map each role to a workspace type for dashboard rendering
 */
export const ROLE_WORKSPACE: Record<StaffRole, WorkspaceType> = {
  owner: "owner",
  business_admin: "owner",
  general_manager: "manager",
  branch_manager: "manager",
  floor_manager: "floor_ops",
  waiter: "waiter",
  cashier: "cashier",
  chef: "kitchen",
  kitchen_staff: "kitchen",
  bar_staff: "bar",
};

/**
 * Nav item definition
 */
export interface NavItem {
  to: string;
  label: string;
  icon: string;
  badge?: "live" | "urgent";
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

/**
 * Role-specific navigation — only show what each role needs
 */
export const ROLE_NAV: Record<StaffRole, NavSection[]> = {
  // ─── OWNER / BUSINESS ADMIN ──────────────────────────────────────────────
  owner: [
    {
      section: "COMMAND CENTER",
      items: [
        { to: "/admin/dashboard", label: "Dashboard", icon: "grid" },
        { to: "/admin/orders", label: "Live Orders", icon: "shopping-bag", badge: "live" },
        { to: "/admin/kds", label: "Kitchen KDS", icon: "chef-hat" },
      ],
    },
    {
      section: "OPERATIONS",
      items: [
        { to: "/admin/tables", label: "Tables & QRs", icon: "qr-code" },
        { to: "/admin/menu", label: "Menu CMS", icon: "menu-square" },
        { to: "/admin/staff", label: "Staff & Roles", icon: "users" },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        { to: "/admin/reports", label: "Reports", icon: "bar-chart" },
        { to: "/admin/audit", label: "Audit Logs", icon: "shield" },
        { to: "/admin/settings", label: "Settings", icon: "settings" },
      ],
    },
  ],

  business_admin: [
    {
      section: "COMMAND CENTER",
      items: [
        { to: "/admin/dashboard", label: "Dashboard", icon: "grid" },
        { to: "/admin/orders", label: "Live Orders", icon: "shopping-bag", badge: "live" },
        { to: "/admin/kds", label: "Kitchen KDS", icon: "chef-hat" },
      ],
    },
    {
      section: "OPERATIONS",
      items: [
        { to: "/admin/tables", label: "Tables & QRs", icon: "qr-code" },
        { to: "/admin/menu", label: "Menu CMS", icon: "menu-square" },
        { to: "/admin/staff", label: "Staff & Roles", icon: "users" },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        { to: "/admin/reports", label: "Reports", icon: "bar-chart" },
        { to: "/admin/audit", label: "Audit Logs", icon: "shield" },
        { to: "/admin/settings", label: "Settings", icon: "settings" },
      ],
    },
  ],

  // ─── GENERAL MANAGER ─────────────────────────────────────────────────────
  general_manager: [
    {
      section: "OPERATIONS",
      items: [
        { to: "/admin/dashboard", label: "Dashboard", icon: "grid" },
        { to: "/admin/orders", label: "Live Orders", icon: "shopping-bag", badge: "live" },
        { to: "/admin/kds", label: "Kitchen KDS", icon: "chef-hat" },
      ],
    },
    {
      section: "FLOOR",
      items: [
        { to: "/admin/tables", label: "Tables & QRs", icon: "qr-code" },
        { to: "/admin/menu", label: "Menu CMS", icon: "menu-square" },
        { to: "/admin/staff", label: "Staff", icon: "users" },
      ],
    },
    {
      section: "REPORTS",
      items: [
        { to: "/admin/reports", label: "Reports", icon: "bar-chart" },
      ],
    },
  ],

  // ─── BRANCH MANAGER ──────────────────────────────────────────────────────
  branch_manager: [
    {
      section: "BRANCH OPERATIONS",
      items: [
        { to: "/admin/dashboard", label: "Branch Dashboard", icon: "grid" },
        { to: "/admin/orders", label: "Live Orders", icon: "shopping-bag", badge: "live" },
        { to: "/admin/kds", label: "Kitchen KDS", icon: "chef-hat" },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        { to: "/admin/tables", label: "Tables & QRs", icon: "qr-code" },
        { to: "/admin/menu", label: "Menu Availability", icon: "menu-square" },
        { to: "/admin/staff", label: "Branch Staff", icon: "users" },
      ],
    },
    {
      section: "REPORTS",
      items: [
        { to: "/admin/reports", label: "Branch Reports", icon: "bar-chart" },
      ],
    },
  ],

  // ─── FLOOR MANAGER ───────────────────────────────────────────────────────
  floor_manager: [
    {
      section: "FLOOR OPS",
      items: [
        { to: "/admin/dashboard", label: "Floor View", icon: "grid" },
        { to: "/admin/orders", label: "Active Orders", icon: "shopping-bag", badge: "live" },
        { to: "/admin/tables", label: "Tables", icon: "qr-code" },
      ],
    },
  ],

  // ─── WAITER ──────────────────────────────────────────────────────────────
  waiter: [
    {
      section: "MY STATION",
      items: [
        { to: "/admin/dashboard", label: "My Tables", icon: "grid" },
        { to: "/admin/orders", label: "Active Orders", icon: "shopping-bag", badge: "live" },
        { to: "/admin/tables", label: "Table Map", icon: "qr-code" },
      ],
    },
  ],

  // ─── CASHIER ─────────────────────────────────────────────────────────────
  cashier: [
    {
      section: "BILLING",
      items: [
        { to: "/admin/dashboard", label: "Payment Queue", icon: "grid" },
        { to: "/admin/orders", label: "Orders & Bills", icon: "shopping-bag", badge: "live" },
      ],
    },
  ],

  // ─── CHEF ────────────────────────────────────────────────────────────────
  chef: [
    {
      section: "KITCHEN",
      items: [
        { to: "/admin/kds", label: "Kitchen Display", icon: "chef-hat", badge: "live" },
        { to: "/admin/dashboard", label: "Kitchen Overview", icon: "grid" },
        { to: "/admin/menu", label: "Menu Availability", icon: "menu-square" },
      ],
    },
  ],

  // ─── KITCHEN STAFF ───────────────────────────────────────────────────────
  kitchen_staff: [
    {
      section: "KITCHEN",
      items: [
        { to: "/admin/kds", label: "Kitchen Display", icon: "chef-hat", badge: "live" },
      ],
    },
  ],

  // ─── BAR STAFF ───────────────────────────────────────────────────────────
  bar_staff: [
    {
      section: "BAR",
      items: [
        { to: "/admin/kds", label: "Bar Display", icon: "chef-hat", badge: "live" },
        { to: "/admin/orders", label: "Bar Orders", icon: "shopping-bag", badge: "live" },
      ],
    },
  ],
};

/**
 * Role display config — label, color badge, description
 */
export const ROLE_DISPLAY: Record<StaffRole, { label: string; color: string; description: string }> = {
  owner: { label: "OWNER", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", description: "Full business access" },
  business_admin: { label: "ADMIN", color: "bg-amber-500/15 text-amber-400 border-amber-500/25", description: "Business administrator" },
  general_manager: { label: "GM", color: "bg-blue-500/15 text-blue-300 border-blue-500/25", description: "General Manager" },
  branch_manager: { label: "BRANCH MGR", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/25", description: "Branch Manager" },
  floor_manager: { label: "FLOOR MGR", color: "bg-purple-500/15 text-purple-300 border-purple-500/25", description: "Floor Manager" },
  waiter: { label: "WAITER", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", description: "Service Staff" },
  cashier: { label: "CASHIER", color: "bg-green-500/15 text-green-300 border-green-500/25", description: "Billing & Payments" },
  chef: { label: "CHEF", color: "bg-orange-500/15 text-orange-300 border-orange-500/25", description: "Kitchen Lead" },
  kitchen_staff: { label: "KITCHEN", color: "bg-red-500/15 text-red-300 border-red-500/25", description: "Kitchen Staff" },
  bar_staff: { label: "BAR", color: "bg-pink-500/15 text-pink-300 border-pink-500/25", description: "Bar Staff" },
};

/**
 * Client-side permission check for **UI/nav filtering only**.
 * This is purely cosmetic — all real authorization is enforced server-side
 * via assertPerm() in server functions and has_perm() in RLS policies.
 *
 * SECURITY: Do NOT use this to gate sensitive operations.
 */
export const getCustomPermission = (role: string, permissionKey: string, _businessId?: string): boolean => {
  // Owner & Business Admin always have full access to everything
  if (role === "owner" || role === "business_admin") return true;

  const DEFAULT_MATRIX: Record<string, Record<string, boolean>> = {
    "orders.view": { manager: true, waiter: true, cashier: true, chef: true },
    "orders.create": { manager: true, waiter: true, cashier: true, chef: false },
    "orders.edit": { manager: true, waiter: true, cashier: false, chef: false },
    "orders.cancel": { manager: true, waiter: false, cashier: false, chef: false },
    "orders.discount": { manager: true, waiter: false, cashier: false, chef: false },
    "kds.view": { manager: true, waiter: false, cashier: false, chef: true },
    "kds.manage": { manager: true, waiter: false, cashier: false, chef: true },
    "menu.view": { manager: true, waiter: true, cashier: true, chef: true },
    "menu.edit": { manager: true, waiter: false, cashier: false, chef: true },
    "tables.view": { manager: true, waiter: true, cashier: false, chef: false },
    "tables.manage": { manager: true, waiter: true, cashier: false, chef: false },
    "staff.view": { manager: true, waiter: false, cashier: false, chef: false },
    "staff.manage": { manager: true, waiter: false, cashier: false, chef: false },
    "payments.collect": { manager: true, waiter: false, cashier: true, chef: false },
    "payments.refund": { manager: true, waiter: false, cashier: false, chef: false },
    "reports.view": { manager: true, waiter: false, cashier: false, chef: false },
    "reports.financial": { manager: false, waiter: false, cashier: false, chef: false },
    "settings.manage": { manager: false, waiter: false, cashier: false, chef: false },
  };

  let matrixRole = role;
  if (role === "general_manager" || role === "branch_manager" || role === "floor_manager") {
    matrixRole = "manager";
  } else if (role === "kitchen_staff" || role === "bar_staff") {
    matrixRole = "chef";
  }

  return DEFAULT_MATRIX[permissionKey]?.[matrixRole] ?? false;
};

/**
 * Permission checking helpers
 */
export const ROLE_CAN = {
  viewTables: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "tables.view", businessId),
  manageTables: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "tables.manage", businessId),
  viewRevenue: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "reports.view", businessId),
  manageMenu: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "menu.edit", businessId),
  manageStaff: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "staff.manage", businessId),
  collectPayment: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "payments.collect", businessId),
  viewKds: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "kds.view", businessId),
  createOrders: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "orders.create", businessId),
  viewReports: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "reports.view", businessId),
  manageSettings: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "settings.manage", businessId),
  viewFullFloor: (role: StaffRole, businessId?: string) =>
    getCustomPermission(role, "tables.manage", businessId),
};
