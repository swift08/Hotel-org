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
 * Permission checking helpers
 */
export const ROLE_CAN = {
  viewRevenue: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager"].includes(role),
  manageMenu: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager", "chef"].includes(role),
  manageStaff: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager"].includes(role),
  collectPayment: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager", "cashier", "waiter"].includes(role),
  viewKds: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager", "floor_manager", "chef", "kitchen_staff", "bar_staff"].includes(role),
  createOrders: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager", "floor_manager", "waiter", "cashier"].includes(role),
  viewReports: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager"].includes(role),
  manageSettings: (role: StaffRole) =>
    ["owner", "business_admin"].includes(role),
  viewFullFloor: (role: StaffRole) =>
    ["owner", "business_admin", "general_manager", "branch_manager", "floor_manager"].includes(role),
};
