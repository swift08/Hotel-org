// Platform control-plane RBAC: roles, permission keys, and the sidebar navigation
// tree gated by those permissions. This mirrors the seed data written by
// supabase/platform_schema.sql (platform_role enum + platform_permissions table),
// so keep the two in sync when adding new permission keys.

export const PLATFORM_ROLES = [
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_finance",
  "platform_analyst",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  platform_owner: "Owner",
  platform_admin: "Admin",
  platform_support: "Support",
  platform_finance: "Finance",
  platform_analyst: "Analyst",
};

export const PLATFORM_ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  platform_owner: "Full, unrestricted access to every platform module. Always has every permission.",
  platform_admin: "Manage organizations, subscriptions, and system operations. Cannot manage other admins or permissions.",
  platform_support: "Read-only visibility plus support-mode access for helping organizations and triaging errors.",
  platform_finance: "Manage plans, subscriptions, and billing. Read-only on organizations and analytics.",
  platform_analyst: "Read-only access to organizations, subscriptions, billing, usage, analytics, and system health.",
};

/**
 * Canonical permission keys. These must match the `key` column seeded in
 * `public.platform_permissions` by supabase/platform_schema.sql.
 */
export const PLATFORM_PERMISSIONS = {
  DASHBOARD_VIEW: "platform.dashboard.view",
  ORGANIZATIONS_VIEW: "platform.organizations.view",
  ORGANIZATIONS_UPDATE: "platform.organizations.update",
  ORGANIZATIONS_SUSPEND: "platform.organizations.suspend",
  SUBSCRIPTIONS_VIEW: "platform.subscriptions.view",
  SUBSCRIPTIONS_UPDATE: "platform.subscriptions.update",
  PLANS_VIEW: "platform.plans.view",
  PLANS_UPDATE: "platform.plans.update",
  BILLING_VIEW: "platform.billing.view",
  USAGE_VIEW: "platform.usage.view",
  ANALYTICS_VIEW: "platform.analytics.view",
  AUDIT_VIEW: "platform.audit.view",
  SYSTEM_VIEW: "platform.system.view",
  ERRORS_VIEW: "platform.errors.view",
  ERRORS_UPDATE: "platform.errors.update",
  ADMINS_VIEW: "platform.admins.view",
  ADMINS_UPDATE: "platform.admins.update",
  PERMISSIONS_VIEW: "platform.permissions.view",
  PERMISSIONS_UPDATE: "platform.permissions.update",
  SETTINGS_VIEW: "platform.settings.view",
  SETTINGS_UPDATE: "platform.settings.update",
  SUPPORT_ACCESS: "platform.support.access",
} as const;

export type PlatformPermissionKey = (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

export const PLATFORM_PERMISSION_KEYS: PlatformPermissionKey[] = Object.values(PLATFORM_PERMISSIONS);

interface PlatformNavLeaf {
  label: string;
  href: string;
  permission: PlatformPermissionKey;
}

interface PlatformNavSection {
  label: string;
  /** Present only for single-link sections (e.g. Overview) that have no children. */
  href?: string;
  permission: PlatformPermissionKey;
  items?: PlatformNavLeaf[];
}

/**
 * Full sidebar shape. `permission` on a section gates the whole group;
 * each child item can additionally be gated by a more specific permission.
 */
export const PLATFORM_NAV: PlatformNavSection[] = [
  {
    label: "Overview",
    href: "/dashboard",
    permission: PLATFORM_PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    label: "Organizations",
    permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW,
    items: [
      { label: "All", href: "/organizations", permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW },
      { label: "Active", href: "/organizations/active", permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW },
      { label: "Trial", href: "/organizations/trial", permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW },
      { label: "Suspended", href: "/organizations/suspended", permission: PLATFORM_PERMISSIONS.ORGANIZATIONS_VIEW },
    ],
  },
  {
    label: "Subscriptions",
    permission: PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW,
    items: [
      { label: "Plans", href: "/plans", permission: PLATFORM_PERMISSIONS.PLANS_VIEW },
      { label: "Subscriptions", href: "/subscriptions", permission: PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW },
      { label: "Billing", href: "/billing", permission: PLATFORM_PERMISSIONS.BILLING_VIEW },
      { label: "Payments", href: "/payments", permission: PLATFORM_PERMISSIONS.BILLING_VIEW },
    ],
  },
  {
    label: "Usage",
    permission: PLATFORM_PERMISSIONS.USAGE_VIEW,
    items: [
      { label: "Usage Overview", href: "/usage", permission: PLATFORM_PERMISSIONS.USAGE_VIEW },
      { label: "Feature Usage", href: "/usage/features", permission: PLATFORM_PERMISSIONS.USAGE_VIEW },
    ],
  },
  {
    label: "Analytics",
    permission: PLATFORM_PERMISSIONS.ANALYTICS_VIEW,
    items: [
      { label: "Revenue", href: "/analytics/revenue", permission: PLATFORM_PERMISSIONS.ANALYTICS_VIEW },
      { label: "Orders", href: "/analytics/orders", permission: PLATFORM_PERMISSIONS.ANALYTICS_VIEW },
      { label: "Growth", href: "/analytics/growth", permission: PLATFORM_PERMISSIONS.ANALYTICS_VIEW },
    ],
  },
  {
    label: "System",
    permission: PLATFORM_PERMISSIONS.SYSTEM_VIEW,
    items: [
      { label: "System Health", href: "/system", permission: PLATFORM_PERMISSIONS.SYSTEM_VIEW },
      { label: "Errors", href: "/errors", permission: PLATFORM_PERMISSIONS.ERRORS_VIEW },
      { label: "Audit Logs", href: "/audit", permission: PLATFORM_PERMISSIONS.AUDIT_VIEW },
    ],
  },
  {
    label: "Platform",
    permission: PLATFORM_PERMISSIONS.ADMINS_VIEW,
    items: [
      { label: "Platform Admins", href: "/platform-admins", permission: PLATFORM_PERMISSIONS.ADMINS_VIEW },
      { label: "Permissions", href: "/permissions", permission: PLATFORM_PERMISSIONS.PERMISSIONS_VIEW },
      { label: "Settings", href: "/settings", permission: PLATFORM_PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

export function hasPlatformPermission(
  permissions: readonly string[],
  permission: PlatformPermissionKey,
): boolean {
  return permissions.includes(permission);
}

export interface VisiblePlatformNavItem {
  label: string;
  href: string;
}

export interface VisiblePlatformNavSection {
  label: string;
  /** Present only for single-link sections (e.g. Overview) that have no children. */
  href?: string;
  items: VisiblePlatformNavItem[];
}

/** Filters the full nav tree down to what the given permission set can see. */
export function getVisibleNav(permissions: readonly string[]): VisiblePlatformNavSection[] {
  const visible: VisiblePlatformNavSection[] = [];

  for (const section of PLATFORM_NAV) {
    if (!hasPlatformPermission(permissions, section.permission)) continue;

    if (section.href) {
      visible.push({ label: section.label, href: section.href, items: [] });
      continue;
    }

    const items = (section.items ?? [])
      .filter((item) => hasPlatformPermission(permissions, item.permission))
      .map((item) => ({ label: item.label, href: item.href }));

    if (items.length > 0) {
      visible.push({ label: section.label, items });
    }
  }

  return visible;
}
