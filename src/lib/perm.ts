/**
 * Client-safe permission catalogue. The database is the source of truth
 * (permissions + role_default_permissions + role_permissions overrides);
 * these constants exist only for labels and UI grouping.
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

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Business Owner",
  business_admin: "Business Admin",
  general_manager: "General Manager",
  branch_manager: "Branch Manager",
  floor_manager: "Floor Manager",
  waiter: "Waiter / Server",
  cashier: "Cashier",
  chef: "Chef / Kitchen Manager",
  kitchen_staff: "Kitchen Staff",
  bar_staff: "Bar Staff",
};

export const ASSIGNABLE_ROLES: StaffRole[] = [
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

export const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resort" },
  { value: "bar_pub", label: "Bar / Pub" },
  { value: "cloud_kitchen", label: "Cloud kitchen" },
  { value: "food_outlet", label: "Food outlet" },
] as const;

export const FOOD_TAGS = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
  { value: "egg", label: "Egg" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "spicy", label: "Spicy" },
] as const;

export const ORDER_STATUS_FLOW = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "served",
  "completed",
] as const;

export type OrderStatus =
  | (typeof ORDER_STATUS_FLOW)[number]
  | "cancelled"
  | "refunded"
  | "payment_failed";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  payment_failed: "Payment failed",
};
