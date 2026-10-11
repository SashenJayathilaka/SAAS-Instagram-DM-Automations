// lib/admin-v2/permissions.ts
// Admin role and capability model.
// Currently all admins are "owner" role — "support" role is architecturally defined but not yet assigned.
// To add support admins in future: change resolveAdminRole() to look up from env or DB.

export type AdminRole = "owner" | "support";

export const OWNER_CAPABILITIES = [
  // Mutations
  "delete_user",
  "suspend_user",
  "reactivate_user",
  "change_plan",
  "reset_usage",
  "update_billing_overrides",
  "clear_billing_overrides",
  "pause_campaign",
  "resume_campaign",
  "refresh_profile_snapshot",
  "mark_reconnect_required",
  // Read
  "view_audit_logs",
  "view_user_detail",
  "view_diagnostics",
  "view_overview",
  "view_campaigns",
  "view_accounts",
  "view_activity",
] as const;

// Support admins: read-only access only. No mutations.
export const SUPPORT_CAPABILITIES = [
  "view_audit_logs",
  "view_user_detail",
  "view_overview",
  "view_campaigns",
  "view_accounts",
  "view_activity",
] as const;

export type AdminCapability =
  | (typeof OWNER_CAPABILITIES)[number]
  | (typeof SUPPORT_CAPABILITIES)[number];

const CAPABILITIES_BY_ROLE: Record<AdminRole, readonly string[]> = {
  owner: OWNER_CAPABILITIES,
  support: SUPPORT_CAPABILITIES,
};

export function hasCapability(role: AdminRole, capability: AdminCapability): boolean {
  return CAPABILITIES_BY_ROLE[role].includes(capability);
}

// Returns the admin role for a given Clerk user ID.
// All current admins are owner-level. Change this function when support role is introduced.
export function resolveAdminRole(_clerkId: string): AdminRole {
  return "owner";
}
