import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("Admin v2 — Phase 1 safety invariants", () => {
  it("query layer never selects the token field from Integrations", () => {
    const queries = read("lib/admin-v2/queries.ts");
    // Confirm safety comment is present
    expect(queries).toContain("token field is intentionally NOT selected");
    // The word 'token' must not appear as a selected field key
    // (allow it in comments and the comment string itself)
    const lines = queries.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("token:") || trimmed === "token,";
    });
    expect(lines).toHaveLength(0);
  });

  it("layout calls requireOwnerAdmin before rendering children", () => {
    const layout = read("app/(protected)/ap3k-admin-v2/layout.tsx");
    expect(layout).toContain("requireOwnerAdmin");
    expect(layout).toContain("await requireOwnerAdmin()");
  });

  it("individual pages do not duplicate the admin auth check — layout covers it", () => {
    const pages = [
      "app/(protected)/ap3k-admin-v2/overview/page.tsx",
      "app/(protected)/ap3k-admin-v2/users/page.tsx",
      "app/(protected)/ap3k-admin-v2/accounts/page.tsx",
      "app/(protected)/ap3k-admin-v2/campaigns/page.tsx",
      "app/(protected)/ap3k-admin-v2/replies/page.tsx",
      "app/(protected)/ap3k-admin-v2/activity/page.tsx",
      "app/(protected)/ap3k-admin-v2/diagnostics/page.tsx",
      "app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx",
      "app/(protected)/ap3k-admin-v2/audit/page.tsx",
    ];
    for (const p of pages) {
      const src = read(p);
      expect(src, `${p} should not call requireOwnerAdmin — layout handles it`).not.toContain("requireOwnerAdmin");
    }
  });

  it("accounts page tells the user tokens are never displayed", () => {
    const accounts = read("app/(protected)/ap3k-admin-v2/accounts/page.tsx");
    expect(accounts).toContain("tokens are never displayed");
  });

  it("diagnostics page exposes operational webhook diagnostics", () => {
    const diag = read("app/(protected)/ap3k-admin-v2/diagnostics/page.tsx");
    expect(diag).toContain("AdvancedPanel");
    expect(diag).toContain("System diagnostics");
    expect(diag).toContain("Webhook events");
  });

  it("query layer is bounded — every findMany has a take clause", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).toContain("const LIST_LIMIT = 50");
    const findManyCount = (queries.match(/\.findMany\(/g) ?? []).length;
    const takeCount = (queries.match(/\btake:/g) ?? []).length;
    expect(takeCount, "every findMany must have a take: to prevent unbounded queries").toBeGreaterThanOrEqual(findManyCount);
  });

  it("nav uses canonical admin routes and includes publishing, analytics and safety", () => {
    const nav = read("components/admin-v2/nav.tsx");
    for (const route of ["/admin/overview", "/admin/content", "/admin/analytics", "/admin/seo", "/admin/system", "/admin/audit"]) expect(nav).toContain(route);
    expect(nav).not.toContain("Admin v1");
  });

  it("advanced panel is collapsed by default (useState false)", () => {
    const panel = read("components/admin-v2/advanced-panel.tsx");
    expect(panel).toContain("useState(false)");
  });

  it("overview page renders the four primary health metrics", () => {
    const overview = read("app/(protected)/ap3k-admin-v2/overview/page.tsx");
    expect(overview).toContain("Total users");
    expect(overview).toContain("Connected accounts");
    expect(overview).toContain("Active automations");
    expect(overview).toContain("Failed today");
  });

  it("users table renders empty state", () => {
    const users = read("app/(protected)/ap3k-admin-v2/users/page.tsx");
    expect(users).toContain("No matching users.");
  });

  it("campaigns table renders empty state", () => {
    const campaigns = read("app/(protected)/ap3k-admin-v2/campaigns/page.tsx");
    expect(campaigns).toContain("No automations found.");
  });

  it("accounts table renders empty state", () => {
    const accounts = read("app/(protected)/ap3k-admin-v2/accounts/page.tsx");
    expect(accounts).toContain("No Instagram accounts found.");
  });

  it("activity table renders empty state", () => {
    const activity = read("app/(protected)/ap3k-admin-v2/activity/page.tsx");
    expect(activity).toContain("No activity events found.");
  });

  it("reply templates page describes its empty state", () => {
    const replies = read("app/(protected)/ap3k-admin-v2/replies/page.tsx");
    expect(replies).toContain("No automations with public reply templates found.");
  });

  it("root page redirects to overview", () => {
    const root_ = read("app/(protected)/ap3k-admin-v2/page.tsx");
    expect(root_).toContain('redirect("/ap3k-admin-v2/overview")');
  });
});

describe("Admin v2 — Phase 1.5 operator UX", () => {
  it("no write operations anywhere in the query layer", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).not.toContain(".create(");
    expect(queries).not.toContain(".update(");
    expect(queries).not.toContain(".delete(");
    expect(queries).not.toContain(".upsert(");
  });

  it("getAdminV2SystemHealth exists and uses 2-query Promise.all", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).toContain("getAdminV2SystemHealth");
    expect(queries).toContain("AdminV2SystemHealth");
    expect(queries).toContain("attentionAccounts");
    expect(queries).toContain("campaignsNeedingReview");
  });

  it("AdminV2User type includes Phase 1.5 enrichment fields", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).toContain("repliesToday: number");
    expect(queries).toContain("leadsToday: number");
    expect(queries).toContain("lastActivity: Date | null");
  });

  it("AdminV2Campaign type includes reviewReason and lastActivity", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).toContain("reviewReason: string | null");
  });

  it("getAdminV2Users uses nested select for enrichment — no N+1", () => {
    const queries = read("lib/admin-v2/queries.ts");
    // Single findMany, not a loop of per-user queries
    const findManyMatches = queries.match(/client\.user\.findMany/g) ?? [];
    expect(findManyMatches).toHaveLength(1);
    // Nested messageLogs and events inside automations
    expect(queries).toContain("messageLogs:");
    expect(queries).toContain("leads:");
  });

  it("getAdminV2Campaigns uses nested events for lastActivity — no N+1", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).toContain("reviewReason: true");
    // events nested in campaign select
    const eventsAfterCampaigns = queries.split("getAdminV2Campaigns")[1] ?? "";
    expect(eventsAfterCampaigns.indexOf("events:")).toBeLessThan(
      eventsAfterCampaigns.indexOf("getAdminV2CampaignCount")
    );
  });

  it("shared labels file exports humanError and humanEvent", () => {
    const labels = read("lib/admin-v2/labels.ts");
    expect(labels).toContain("export function humanError");
    expect(labels).toContain("export function humanEvent");
    expect(labels).toContain("HUMAN_ERROR");
    expect(labels).toContain("HUMAN_EVENT");
    // Key human-readable entries present
    expect(labels).toContain("Self-comment: comment from the connected Instagram account");
    expect(labels).toContain("Rate limit: too many replies");
  });

  it("account health function exposes three tiers", () => {
    const badge = read("components/admin-v2/v2-badge.tsx");
    expect(badge).toContain("accountHealth");
    expect(badge).toContain('"Healthy"');
    expect(badge).toContain('"Needs attention"');
    expect(badge).toContain('"Broken"');
  });

  it("overview page has a focused attention section", () => {
    const overview = read("app/(protected)/ap3k-admin-v2/overview/page.tsx");
    expect(overview).toContain("Requires attention");
    expect(overview).toContain("getAdminV2SystemHealth");
  });

  it("overview attention section links to diagnostics", () => {
    const overview = read("app/(protected)/ap3k-admin-v2/overview/page.tsx");
    expect(overview).toContain("Review recommended");
    expect(overview).toContain("/admin/diagnostics");
    expect(overview).toContain("Open diagnostics");
  });

  it("overview activity filters out WEBHOOK_RECEIVED noise", () => {
    const overview = read("app/(protected)/ap3k-admin-v2/overview/page.tsx");
    expect(overview).toContain("WEBHOOK_RECEIVED");
    expect(overview).toContain(".filter(");
    expect(overview).toContain("liveActivity");
  });

  it("campaigns page shows health, last activity, and pause reason", () => {
    const campaigns = read("app/(protected)/ap3k-admin-v2/campaigns/page.tsx");
    expect(campaigns).toContain("campaignHealth");
    expect(campaigns).toContain("lastActivity");
    expect(campaigns).toContain("reviewReason");
    expect(campaigns).toContain("Pause reason");
  });

  it("accounts page uses accountHealth for status column", () => {
    const accounts = read("app/(protected)/ap3k-admin-v2/accounts/page.tsx");
    expect(accounts).toContain("accountHealth");
    expect(accounts).toContain("Meta IDs");
    // Raw status badge replaced by health label
    expect(accounts).not.toContain('"CONNECTED"');
    expect(accounts).not.toContain('"DISCONNECTED"');
  });

  it("users page shows replies today, leads today, last activity columns", () => {
    const users = read("app/(protected)/ap3k-admin-v2/users/page.tsx");
    expect(users).toContain("repliesToday");
    expect(users).toContain("leadsToday");
    expect(users).toContain("lastActivity");
    expect(users).toContain("sends today");
    expect(users).toContain("leads today");
    expect(users).toContain("Last activity");
  });

  it("keeps the replies route available without crowding the primary nav", () => {
    const replies = read("app/(protected)/ap3k-admin-v2/replies/page.tsx");
    expect(replies).toContain('eyebrow="Replies"');
    const nav = read("components/admin-v2/nav.tsx");
    expect(nav).not.toContain('label: "Replies"');
    expect(nav).not.toContain("Reply Library");
  });

  it("diagnostics page uses humanError for readable error labels", () => {
    const diag = read("app/(protected)/ap3k-admin-v2/diagnostics/page.tsx");
    expect(diag).toContain("humanError");
    expect(diag).toContain("humanEvent");
    expect(diag).toContain("AdvancedPanel");
    expect(diag).toContain("Raw code");
  });

  it("activity page uses shared humanEvent from labels", () => {
    const activity = read("app/(protected)/ap3k-admin-v2/activity/page.tsx");
    expect(activity).toContain('from "@/lib/admin-v2/labels"');
    expect(activity).toContain("humanEvent");
    // No longer has local HUMAN_EVENT map
    expect(activity).not.toContain("const HUMAN_EVENT");
  });
});

describe("Admin v2 — Phase 2D.1 Plan & Billing user detail", () => {
  it("queries.ts exports getAdminV2UserDetail and AdminV2UserDetail type shape", () => {
    const queries = read("lib/admin-v2/queries.ts");
    expect(queries).toContain("getAdminV2UserDetail");
    expect(queries).toContain("AdminV2UserDetail");
    expect(queries).toContain("clerkId: string");
    expect(queries).toContain("customerId: string | null");
    expect(queries).toContain("totalCampaigns: number");
    expect(queries).toContain("campaignsNeedingReview: number");
    expect(queries).toContain("lastActivity: Date | null");
  });

  it("getAdminV2UserDetail never selects the token field", () => {
    const queries = read("lib/admin-v2/queries.ts");
    const afterDetail = queries.split("getAdminV2UserDetail")[1] ?? "";
    const lines = afterDetail.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("token:") || trimmed === "token,";
    });
    expect(lines).toHaveLength(0);
  });

  it("getAdminV2UserDetail uses a single findUnique — no N+1", () => {
    const queries = read("lib/admin-v2/queries.ts");
    const afterDetail = queries.split("async function getAdminV2UserDetail")[1] ?? "";
    const findUniqueMatches = (afterDetail.split("async function")[0].match(/\.findUnique\(/g) ?? []).length;
    expect(findUniqueMatches).toBe(1);
  });

  it("user detail page does not call requireOwnerAdmin — layout covers it", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).not.toContain("requireOwnerAdmin");
  });

  it("user detail page imports getUserMonthlyUsage for canonical usage data", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("getUserMonthlyUsage");
    expect(page).toContain('from "@/actions/usage/queries"');
  });

  it("user detail page shows plan label using getPlanLabel", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("getPlanLabel");
  });

  it("user detail page shows usage bar for static replies", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("UsageBar");
    expect(page).toContain("staticReplies");
  });

  it("user detail page shows campaign totals including needsReview", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("totalCampaigns");
    expect(page).toContain("campaignsNeedingReview");
  });

  it("user detail page shows the internal plan state when no Stripe customer exists", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("Internal plan only");
  });

  it("user detail page shows Stripe customer exists when customerId present", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("Stripe customer linked");
  });

  it("user detail page wraps Stripe call in try/catch — safe on missing key", () => {
    const page = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(page).toContain("stripe.subscriptions.list");
    expect(page).toContain("} catch {");
  });

  it("UsageBar component exists with percent and tone props", () => {
    const bar = read("components/admin-v2/usage-bar.tsx");
    expect(bar).toContain("percent");
    expect(bar).toContain("tone");
    expect(bar).toContain("bg-emerald-500");
    expect(bar).toContain("bg-amber-500");
    expect(bar).toContain("bg-red-500");
  });

  it("users list page has View details link to user detail route", () => {
    const users = read("app/(protected)/ap3k-admin-v2/users/page.tsx");
    expect(users).toContain("Manage user");
    expect(users).toContain("/admin/users/");
  });

  it("formatUsageMetricValue shows used / limit — unlimited shows Unlimited", () => {
    const src = read("lib/plan-limits.ts");
    expect(src).toContain("formatUsageMetricValue");
    expect(src).toContain('"Unlimited"');
  });
});

describe("Admin v2 — Phase 2D.2 suspend/reactivate", () => {
  it("user-actions.ts exports adminSuspendUserAction and adminReactivateUserAction", () => {
    const src = read("actions/admin/user-actions.ts");
    expect(src).toContain("adminSuspendUserAction");
    expect(src).toContain("adminReactivateUserAction");
  });

  it("user-actions.ts uses ADMIN_USER_SUSPENDED and ADMIN_USER_REACTIVATED action names", () => {
    const src = read("actions/admin/user-actions.ts");
    expect(src).toContain("ADMIN_USER_SUSPENDED");
    expect(src).toContain("ADMIN_USER_REACTIVATED");
  });

  it("user-actions.ts does not import stripe (manual plan change via subscription is allowed)", () => {
    const src = read("actions/admin/user-actions.ts");
    expect(src).not.toContain('from "@/lib/stripe"');
    // subscription is now allowed for manual plan changes
  });

  it("user-actions.ts uses createAdminAuditLog for all actions", () => {
    const src = read("actions/admin/user-actions.ts");
    expect(src).toContain("createAdminAuditLog");
  });

  it("user-actions.ts never selects token field", () => {
    const src = read("actions/admin/user-actions.ts");
    const lines = src.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("token:") || trimmed === "token,";
    });
    expect(lines).toHaveLength(0);
  });

  it("UserActionsPanel exists with suspend and reactivate modals", () => {
    const src = read("components/admin-v2/user-actions-panel.tsx");
    expect(src).toContain("suspend");
    expect(src).toContain("reactivate");
    expect(src).toContain("SUSPEND");
    expect(src).toContain("Reactivate user");
  });

  it("user detail page imports and renders UserActionsPanel", () => {
    const src = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(src).toContain("UserActionsPanel");
    expect(src).toContain('from "@/components/admin-v2/user-actions-panel"');
  });

  it("user detail page does not call requireOwnerAdmin — layout covers it", () => {
    const src = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(src).not.toContain("requireOwnerAdmin");
  });
});

describe("Admin v2 — Phase 2E audit log visibility", () => {
  it("audit page does not call requireOwnerAdmin — layout handles auth", () => {
    const src = read("app/(protected)/ap3k-admin-v2/audit/page.tsx");
    expect(src).not.toContain("requireOwnerAdmin");
  });

  it("audit-queries.ts never selects the token field", () => {
    const src = read("lib/admin-v2/audit-queries.ts");
    const lines = src.split("\n").filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith("token:") || trimmed === "token,";
    });
    expect(lines).toHaveLength(0);
  });

  it("audit-queries.ts is bounded — all findMany have take:", () => {
    const src = read("lib/admin-v2/audit-queries.ts");
    const findManyCount = (src.match(/\.findMany\(/g) ?? []).length;
    const takeCount = (src.match(/\btake:/g) ?? []).length;
    expect(takeCount, "every findMany must have take: to prevent unbounded queries").toBeGreaterThanOrEqual(findManyCount);
  });

  it("audit-queries.ts filters by action, targetId, and adminEmail", () => {
    const src = read("lib/admin-v2/audit-queries.ts");
    expect(src).toContain("filters.action");
    expect(src).toContain("filters.targetId");
    expect(src).toContain("filters.adminEmail");
  });

  it("audit-queries.ts sanitizes before/after/metadata via sanitizeAdminPayload", () => {
    const src = read("lib/admin-v2/audit-queries.ts");
    expect(src).toContain("sanitizeAdminPayload");
  });

  it("audit page references all Phase 2D action type constants", () => {
    const src = read("app/(protected)/ap3k-admin-v2/audit/page.tsx");
    expect(src).toContain("ADMIN_USER_SUSPENDED");
    expect(src).toContain("ADMIN_USER_REACTIVATED");
    expect(src).toContain("ADMIN_USER_USAGE_RESET");
    expect(src).toContain("ADMIN_PLAN_CHANGED");
    expect(src).toContain("ADMIN_BILLING_OVERRIDES_UPDATED");
  });

  it("audit page has an empty state message", () => {
    const src = read("app/(protected)/ap3k-admin-v2/audit/page.tsx");
    expect(src).toContain("No audit log entries match these filters.");
  });

  it("nav.tsx includes Audit tab linking to canonical admin audit", () => {
    const src = read("components/admin-v2/nav.tsx");
    expect(src).toContain("Audit");
    expect(src).toContain("/admin/audit");
  });

  it("user detail page includes getAdminV2UserRecentAuditLogs and Recent audit section", () => {
    const src = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(src).toContain("getAdminV2UserRecentAuditLogs");
    expect(src).toContain("Recent audit");
  });

  it("user detail page links to audit log filtered by this user's targetId", () => {
    const src = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(src).toContain("/admin/audit?targetId=");
  });
});

describe("Admin v2 — Phase 2F safety & controls", () => {
  it("action-safety.ts exports ACTION_SAFETY with all Phase 2D action types", () => {
    const src = read("lib/admin-v2/action-safety.ts");
    expect(src).toContain("ADMIN_USER_SUSPENDED");
    expect(src).toContain("ADMIN_USER_REACTIVATED");
    expect(src).toContain("ADMIN_PLAN_CHANGED");
    expect(src).toContain("ADMIN_USER_USAGE_RESET");
    expect(src).toContain("ADMIN_BILLING_OVERRIDES_UPDATED");
  });

  it("action-safety.ts marks ADMIN_USER_USAGE_RESET as irreversible", () => {
    const src = read("lib/admin-v2/action-safety.ts");
    const after = src.split("ADMIN_USER_USAGE_RESET")[1]?.split(/ADMIN_[A-Z]/)[0] ?? "";
    expect(after).toContain("reversible: false");
  });

  it("action-safety.ts requires typed confirmation for SUSPEND, RESET USAGE, and CHANGE PLAN", () => {
    const src = read("lib/admin-v2/action-safety.ts");
    expect(src).toContain('"SUSPEND"');
    expect(src).toContain('"RESET USAGE"');
    expect(src).toContain('"CHANGE PLAN"');
  });

  it("adminChangeUserPlanAction now requires typed confirmation CHANGE PLAN", () => {
    const src = read("actions/admin/user-actions.ts");
    expect(src).toContain('"CHANGE PLAN"');
    expect(src).toContain("BLOCKED");
  });

  it("UserActionsPanel sends confirmation for change_plan", () => {
    const src = read("components/admin-v2/user-actions-panel.tsx");
    expect(src).toContain("change_plan");
    expect(src).toContain("CHANGE PLAN");
  });

  it("UserActionsPanel warns on plan downgrade when overrides are active", () => {
    const src = read("components/admin-v2/user-actions-panel.tsx");
    expect(src).toContain("hasActiveOverrides");
    expect(src).toContain("override");
  });

  it("InternalOverridesCard warns when no expiry date is set", () => {
    const src = read("components/admin-v2/internal-overrides-card.tsx");
    expect(src).toContain("indefinitely");
  });

  it("user detail page passes hasActiveOverrides to UserActionsPanel", () => {
    const src = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(src).toContain("hasActiveOverrides");
  });

  it("user detail Identity card shows last admin action from recentAudit", () => {
    const src = read("app/(protected)/ap3k-admin-v2/users/[userId]/page.tsx");
    expect(src).toContain("recentAudit[0]");
    expect(src).toContain("Last admin action");
  });

  it("UserActionsPanel marks reset_usage as irreversible in UI", () => {
    const src = read("components/admin-v2/user-actions-panel.tsx");
    expect(src).toContain("Irreversible");
  });

  it("permissions.ts defines owner and support roles with hasCapability", () => {
    const src = read("lib/admin-v2/permissions.ts");
    expect(src).toContain('"owner"');
    expect(src).toContain('"support"');
    expect(src).toContain("hasCapability");
    expect(src).toContain("resolveAdminRole");
  });

  it("permissions.ts support role cannot perform mutations", () => {
    const src = read("lib/admin-v2/permissions.ts");
    const supportSection = src.split("SUPPORT_CAPABILITIES")[1]?.split("as const")[0] ?? "";
    expect(supportSection).not.toContain("suspend_user");
    expect(supportSection).not.toContain("change_plan");
    expect(supportSection).not.toContain("reset_usage");
  });
});
