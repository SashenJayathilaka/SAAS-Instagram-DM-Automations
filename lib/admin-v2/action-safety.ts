// lib/admin-v2/action-safety.ts
// Central definition of admin action safety metadata.
// Used by UI components for warning copy, confirmation requirements, and irreversibility indicators.
// Used by invariant tests to verify UI and actions stay aligned.

export type ActionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionSafetyMeta = {
  severity: ActionSeverity;
  /** Exact word the admin must type to confirm. null = reason-only, no typed confirmation. */
  confirmationWord: string | null;
  reasonRequired: boolean;
  /** Whether this action can be undone by another admin action. */
  reversible: boolean;
  /** Human-readable note on how to reverse, or what cannot be undone. */
  reversalNote: string | null;
  /** Fixed warning shown in modal before the action form. null = no fixed warning. */
  warningCopy: string | null;
};

export const ACTION_SAFETY: Record<string, ActionSafetyMeta> = {
  ADMIN_USER_DELETED: {
    severity: "HIGH",
    confirmationWord: "DELETE",
    reasonRequired: true,
    reversible: false,
    reversalNote: null,
    warningCopy: "Permanently removes the customer, every Instagram connection and sign-in access. Cancels active subscriptions without automatically refunding payments.",
  },
  ADMIN_USER_SUSPENDED: {
    severity: "CRITICAL",
    confirmationWord: "SUSPEND",
    reasonRequired: true,
    reversible: true,
    reversalNote:
      "Reactivate the user to restore access. Automations remain paused — restart them manually if needed.",
    warningCopy:
      "Suspending removes login access immediately and pauses all active automations. Records, integrations, leads, and billing are preserved.",
  },
  ADMIN_USER_REACTIVATED: {
    severity: "MEDIUM",
    confirmationWord: null,
    reasonRequired: true,
    reversible: true,
    reversalNote: "Can re-suspend at any time.",
    warningCopy:
      "Automations will NOT auto-resume. Reactivate them manually if needed.",
  },
  ADMIN_PLAN_CHANGED: {
    severity: "MEDIUM",
    confirmationWord: "CHANGE PLAN",
    reasonRequired: true,
    reversible: true,
    reversalNote:
      "Plan can be changed back at any time. Stripe subscription is not modified.",
    warningCopy:
      "Manual plan changes affect AP3K internal access only. Stripe billing is not modified.",
  },
  ADMIN_USER_USAGE_RESET: {
    severity: "HIGH",
    confirmationWord: "RESET USAGE",
    reasonRequired: true,
    reversible: false,
    reversalNote: null,
    warningCopy:
      "Resets reply counters from this moment forward. Message logs, leads, automations, and Stripe data are preserved. This cannot be undone.",
  },
  ADMIN_BILLING_OVERRIDES_UPDATED: {
    severity: "LOW",
    confirmationWord: null,
    reasonRequired: true,
    reversible: true,
    reversalNote: "Clear overrides to restore plan defaults.",
    warningCopy: null,
  },
  ADMIN_PAUSE_CAMPAIGN: {
    severity: "MEDIUM",
    confirmationWord: null,
    reasonRequired: true,
    reversible: true,
    reversalNote: "Resume the automation at any time.",
    warningCopy: null,
  },
  ADMIN_RESUME_CAMPAIGN: {
    severity: "LOW",
    confirmationWord: null,
    reasonRequired: true,
    reversible: true,
    reversalNote: "Pause the automation at any time.",
    warningCopy: null,
  },
};

export function getActionSafety(action: string): ActionSafetyMeta {
  return (
    ACTION_SAFETY[action] ?? {
      severity: "MEDIUM",
      confirmationWord: null,
      reasonRequired: true,
      reversible: false,
      reversalNote: null,
      warningCopy: null,
    }
  );
}

export function isActionIrreversible(action: string): boolean {
  return !getActionSafety(action).reversible;
}
