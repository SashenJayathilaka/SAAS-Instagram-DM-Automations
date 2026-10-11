# Subscription downgrades and automation access

## Customer behavior

- A failed renewal does not immediately revoke access while Stripe reports `past_due`. Stripe's retry/final-status settings control when that status becomes `unpaid` or `canceled`; AP3K does not invent a separate retry deadline.
- When the effective plan becomes Free, saved automations and contacts remain. The oldest five eligible active automations (createdAt then id) remain active on the permitted Instagram account. Paid-feature automations and excess automations pause.
- Business to Pro preserves unlimited automations on the oldest three permitted accounts. Other accounts remain saved but locked, and their active automations pause.
- A pause reason appears in Automations. Customers can pause an active automation and activate another eligible one. Removing paid features or upgrading makes a saved automation eligible for manual activation.
- An upgrade never silently restarts paused campaigns or canceled queued jobs. Previously used monthly actions remain counted; a downgrade is not a quota reset.
- Already dispatched requests to Instagram cannot be recalled. Pending delayed sends, follow-ups, capture waits, AI sessions and scheduled/waiting custom Flow sessions for newly paused automations are canceled.

## Implementation

`syncSubscriptionForUser` locks the owner User row, updates the effective plan, and calls `syncInstagramAccountEntitlements`. That function also calls `syncAutomationPlanEntitlements` after applying account locks. Account disconnect/reconnect reconciliation and administrative plan changes use this path too.

`withAutomationPlanWrite` holds the same owner lock while saving and validating persisted settings. Comment, DM, Story, Flow, list activation and legacy listener/post mutations pass through it. Early UI checks remain convenience only. The final database guard rolls back a sixth activation, forbidden paid features, suspended users and unavailable/foreign Instagram accounts. No provider credentials or billing operations are accepted from the browser.

Plan pauses use the reserved `Paused after a plan change: ` prefix in `reviewReason`, without setting `needsReview`. Existing repair warnings are preserved. Resuming clears only a plan reason; normal repair gates still apply.

`20261011193000_reconcile_automation_plan_limits` is a data-only migration for previously downgraded accounts. It pauses violations and cancels pending work without deleting any configuration. Its SQL feature classification must stay aligned with `usesPaidAutomationFeatures` in `lib/automation-plan-policy.ts`.

## Verification

- `npm test` covers 60-to-5 selection, all paid-feature flags, locked accounts, guards, repeat reconciliation, ownership and existing billing/webhook behavior.
- `scripts/qa/verify-plan-downgrade.mjs` executes the actual migration against isolated PostgreSQL using PGlite. The header includes installation/run commands. It verifies preservation of all 137 fixture automations, 60-to-5, each paid feature, queued jobs, idempotency and no automatic restart on upgrade.
- Do not cancel a real subscription or send Instagram messages to exercise this behavior. Use isolated test data/Stripe sandbox for destructive billing tests.
