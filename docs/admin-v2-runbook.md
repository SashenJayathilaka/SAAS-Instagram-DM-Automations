# AP3k Admin v2 — Runbook

## Access

**URL:** `/ap3k-admin-v2`

Access is controlled by `requireOwnerAdmin()` in `lib/admin.ts`. On every request the server checks the authenticated Clerk user against two env vars:

| Env var | Format | Notes |
|---|---|---|
| `ADMIN_EMAILS` | Comma-separated emails | Case-insensitive |
| `ADMIN_CLERK_USER_IDS` | Comma-separated Clerk user IDs | Case-insensitive |

An unauthorized visitor receives a **404**, not a 403 — the route does not reveal its existence. There is no public login page for admin access; you must already be signed in to the app via Clerk.

To add an admin, append their email to `ADMIN_EMAILS` in the production environment and redeploy (no code change required).

---

## Tabs

| Tab | Path | What it shows |
|---|---|---|
| **Overview** | `/ap3k-admin-v2/overview` | Platform-wide stats: total users, active subscriptions, campaign counts, reply volume |
| **Users** | `/ap3k-admin-v2/users` | Searchable user list with plan, status, and account counts |
| **Accounts** | `/ap3k-admin-v2/accounts` | All connected Instagram accounts across all users |
| **Campaigns** | `/ap3k-admin-v2/campaigns` | All automation campaigns across all users with active/paused status |
| **Replies** | `/ap3k-admin-v2/replies` | Recent DM and comment replies sent by automations |
| **Activity** | `/ap3k-admin-v2/activity` | Recent webhook events and processing activity |
| **Diagnostics** | `/ap3k-admin-v2/diagnostics` | System health: Meta token status, webhook connectivity, queue depth |
| **Audit** | `/ap3k-admin-v2/audit` | Full ledger of every admin mutation (see Audit Log section) |

---

## User Detail Page

Navigate to **Users → click any user** to reach `/ap3k-admin-v2/users/[userId]`.

The detail page contains four cards:

- **Identity** — Clerk ID, email, status, join date, last admin action (actor + timestamp)
- **Subscription** — current plan, monthly usage counters, billing cycle anchor
- **Internal Overrides** — per-user limit overrides (see Overrides section)
- **Admin Actions** — panel for all mutating operations (see sections below)

---

## Suspend / Reactivate

### Suspend

Suspension is used when a user violates terms of service or requires immediate access removal.

**What happens:**
- `user.status` → `SUSPENDED`
- `suspendedAt` and `suspendedReason` recorded
- **All active automations paused immediately** (`automation.active = false`)

**Typed confirmation required:** type `SUSPEND` exactly.

**Side effects to be aware of:**
- Paused automations are not automatically re-enabled on reactivation — the user must re-enable them manually or an admin must do so via the Campaigns tab.
- Suspension does **not** cancel Stripe billing. Handle billing separately in the Stripe dashboard if needed.

### Reactivate

Reverses a suspension.

**What happens:**
- `user.status` → `ACTIVE`
- `suspendedAt` and `suspendedReason` cleared

**No typed confirmation required.** Reason (5+ characters) is still mandatory for the audit record.

---

## Manual Plan Change

Used to correct a billing mismatch, grant a plan as part of a support resolution, or enforce a downgrade outside the normal Stripe flow.

**What happens:**
- `subscription.plan` upserted to the selected value (`FREE` or `PRO`)
- Before and after state written to the audit log

**Typed confirmation required:** type `CHANGE PLAN` exactly (with the space).

**Important:**
- This changes the in-app plan record only. It does **not** modify, cancel, or create any Stripe subscription. Stripe billing and the app plan are independent.
- If downgrading PRO → FREE and the user has active internal overrides, a warning is shown in the modal. The overrides will remain after the downgrade unless cleared separately.
- The action is reversible — a second plan change undoes it.

---

## Reset Usage

Resets the monthly usage window anchor for a user. Used when a user legitimately needs a fresh usage count (e.g. after an error on our side consumed quota they shouldn't have used).

**What happens:**
- `subscription.usageResetAt` set to `now()`
- Usage counters displayed in the app restart counting from this moment

**Typed confirmation required:** type `RESET USAGE` exactly.

**This action is irreversible.** There is no undo. The previous usage anchor is permanently discarded. Use only when the reason is clearly documented.

---

## Internal Overrides

Overrides allow per-user limit increases without changing the user's plan. Useful for beta testers, enterprise pilots, and support resolutions.

**Overridable fields:**

| Field | What it controls |
|---|---|
| `monthlyReplyLimitOverride` | Monthly DM/comment reply cap |
| `aiReplyLimitOverride` | Monthly AI-generated reply cap |
| `activeCampaignLimitOverride` | Max concurrent active automations |
| `connectedAccountLimitOverride` | Max connected Instagram accounts |

Leave any field empty to keep the plan default for that limit.

**Override reason** is required on every save, even when clearing.

**Override expiry** (`overrideExpiresAt`) is optional. If left blank, overrides persist indefinitely — a warning is shown in the UI. Always set an expiry unless the override is intentionally permanent.

An override is **active** when `overrideReason` is set and either no expiry exists or the expiry is in the future. Expired overrides are displayed with an "Expired" badge but the values remain in the database until explicitly cleared.

**To clear all overrides:** leave all four fields empty and submit with a reason. This nulls all override columns and clears `overrideReason` and `overrideExpiresAt`.

---

## Audit Log

Every admin mutation is recorded in `AdminAuditLog`. Navigate to **Audit** tab for the full ledger.

**Columns:** timestamp, admin email, action, target user, status.

**Status values:**

| Status | Meaning |
|---|---|
| `SUCCESS` | Action completed and persisted |
| `BLOCKED` | Typed confirmation word was wrong — action was not executed |
| `FAILED` | Action attempted but a server or database error occurred |

Click **View details** on any row to expand the full JSON record including `before` and `after` state snapshots.

`BLOCKED` entries are normal — they appear whenever someone types the wrong confirmation word and retries. A cluster of `BLOCKED` entries on a single action without a subsequent `SUCCESS` may warrant investigation.

---

## Production Migration Reminder

Admin v2 requires database migrations that must be applied before deploying. See `docs/deploy-migrations.md` for the runbook.

New admin mutations that add columns (e.g. new override fields, audit log columns) must have a corresponding migration committed and applied before the server action is deployed. Deploying the code without the migration will cause runtime errors.

---

## Things Admins Must Never Do

- **Never edit the database directly** (via `psql`, Prisma Studio, or any DB GUI) without a corresponding audit record. All mutations must go through the admin panel.
- **Never share or commit `ADMIN_EMAILS` or `ADMIN_CLERK_USER_IDS` values** in code, docs, or chat.
- **Never use suspension as a billing enforcement tool.** Suspension pauses automations and is meant for ToS violations. For billing issues, change the plan or contact the user.
- **Never reset usage punitively.** Usage reset is a support relief action, not a penalty. It is irreversible.
- **Never assume a manual plan change also changes Stripe.** The two systems are independent. If you change a plan in the admin panel, verify Stripe separately if billing alignment matters.
- **Never set overrides without an expiry unless intentionally permanent.** Indefinite overrides with no documentation reason create silent technical debt.
- **Never approve access for a new admin by hardcoding their email in source code.** Use the `ADMIN_EMAILS` env var.
