# Clerk Development to Production Migration Runbook

This runbook changes only the Clerk identifier bound to each existing AP3K `User` row. `User.id` is the stable internal UUID and remains the owner of subscriptions, integrations, Meta OAuth selections, automations, leads, and activity. Do not recreate users or move business data between rows.

## 1. Preconditions and stop conditions

Confirm all of the following before scheduling a cutover:

- Clerk Production Google OAuth credentials are configured and tested.
- `ap3k.com`, `clerk.ap3k.com`, and `accounts.ap3k.com` are verified; Frontend API and Account Portal SSL are issued.
- Clerk email and DKIM records are verified.
- Direct Clerk account deletion remains disabled.
- Database backup and point-in-time recovery are enabled, current, and restoration has been rehearsed.
- The PR containing `scripts/migrate-clerk-user-ids.ts` and Stripe webhook hardening is merged, deployed, and verified before Clerk keys change.
- No Clerk webhook is configured. AP3K has no Clerk webhook route or Clerk webhook secret.
- Stripe webhook deliveries are healthy and ownership failures return a retriable `5xx`.
- A verified owner/admin email remains in `ADMIN_EMAILS`.
- No unrelated Meta, Stripe, database, or Draft PR #4 changes are included in the release.

Stop if any user has ambiguous identity evidence, duplicate rows, a Stripe customer conflict, an unexpected current Clerk ID, an incomplete backup, or a failed dry run. Do not fix ambiguity by matching email automatically.

## 2. Staging process

1. Create a Vercel Preview deployment containing the merged migration tooling and webhook hardening.
2. Use Clerk Production keys in Preview only. Keep the production deployment on the Development key pair.
3. Point Preview to a staging/Neon clone of production data. Never use the production database for initial Production Clerk identity creation.
4. Use Stripe test mode where possible. Never connect a live Stripe customer to the staging clone.
5. For the controlled identity-creation exercise, set Preview-only Clerk post-auth redirects to a public, non-provisioning page such as `/`. Do not let a newly authenticated Production Clerk identity visit `/dashboard` or `/onboarding` until its cloned `User.clerkId` has been mapped.
6. Verify the Preview key pair belongs to the same Clerk Production instance. Never deploy a publishable key and secret key from different instances.

## 3. Create Production Clerk identities

Have each existing user authenticate through the controlled Production-Clerk Preview. This creates the Production Clerk identity without changing production AP3K data.

Do not run the mapping tool in any mode until the required Production Clerk identities exist and their Production Clerk IDs have been recorded securely.

- Record the new Production Clerk user ID in an encrypted workspace or secure password manager.
- Do not commit, email, paste into tickets, or log the ID list.
- Do not create a second AP3K `User` row.
- Do not use email as an automatic claim key.
- Do not change the AP3K email field.
- If Preview accidentally provisions a duplicate row in the staging clone, stop. Recreate the clone and correct the Preview redirect before continuing; do not copy that row to production.

## 4. Build and review the mapping

Create an uncommitted JSON file containing exactly one object per user:

```json
[
  {
    "internalUserId": "stable-internal-user-uuid",
    "oldClerkId": "old-development-clerk-id",
    "newClerkId": "new-production-clerk-id"
  }
]
```

The file may contain only `internalUserId`, `oldClerkId`, and `newClerkId`. It must not contain email, Stripe customer IDs, Instagram IDs, Facebook Page IDs, access tokens, or secrets.

Two operators must review, for every entry:

- the stable internal UUID from AP3K;
- the expected Development Clerk ID;
- the proposed Production Clerk ID;
- exactly one mapping for the user and no reused old/new ID;
- the verified primary email, checked manually in both Clerk instances as corroborating evidence only—not as the mapping authority—and not copied into the file;
- confirmation that the Production Clerk ID is unused in AP3K;
- confirmation that the AP3K row is the original row owning the expected subscription, integration, and campaign counts.

Save a reverse-capable copy encrypted outside Git for the complete rollback window. Before the production window, rehearse apply followed by reverse against a disposable staging clone, verify the original bindings are restored, and retain the reviewed mapping securely for rollback.

## 5. Baseline read-only queries

Run read-only queries from a restricted database session. These examples intentionally show only internal UUIDs and redacted external identifiers:

```sql
SELECT COUNT(*) AS users FROM "User";
SELECT COUNT(*) AS subscriptions FROM "Subscription";
SELECT COUNT(*) AS integrations FROM "Integrations";
SELECT COUNT(*) AS automations FROM "Automation";
SELECT COUNT(*) AS leads FROM "Lead";

SELECT
  u.id AS "internalUserId",
  RIGHT(u."clerkId", 6) AS "clerkIdSuffix",
  COUNT(DISTINCT i.id) AS integrations,
  COUNT(DISTINCT a.id) AS automations,
  COUNT(DISTINCT l.id) AS leads,
  CASE WHEN s.id IS NULL THEN false ELSE true END AS "hasSubscription",
  CASE WHEN s."customerId" IS NULL THEN false ELSE true END AS "hasCustomer"
FROM "User" u
LEFT JOIN "Subscription" s ON s."userId" = u.id
LEFT JOIN "Integrations" i ON i."userId" = u.id
LEFT JOIN "Automation" a ON a."userId" = u.id
LEFT JOIN "Lead" l ON l."automationId" = a.id
GROUP BY u.id, u."clerkId", s.id, s."customerId"
ORDER BY u.id;
```

Export only the counts and redacted review evidence. Do not export tokens, emails, full Clerk IDs, or full Stripe customer IDs.

## 6. Dry run

Run first against the staging clone, then against production in read-only dry-run mode:

```bash
npm run clerk:migrate-ids -- --mapping /secure/path/clerk-id-mapping.json --dry-run
```

Expected output contains counts, internal UUIDs, hashes of Clerk IDs, and `validated` or `already-migrated`. It must report zero updates. Any mismatch or collision aborts the complete batch.

## 7. Maintenance window

1. Announce the maintenance window and prevent new checkout sessions from being created using a separately reviewed operational maintenance control.
2. Do not disable the Stripe webhook; queued events must remain visible and retriable.
3. Inventory open/pending Checkout Sessions. Resolve completed sessions through their existing Stripe customer ownership; allow unresolved sessions to fail visibly rather than creating a new AP3K owner.
4. Wait for in-flight sign-ins and provisioning requests to finish.
5. Capture final user, subscription, integration, automation, lead, and pending-checkout counts.
6. Re-run the production dry run against the final mapping.
7. Confirm the encrypted reverse mapping is accessible to the rollback operator outside Git.

## 8. Apply the mapping

Run once during the maintenance window:

```bash
npm run clerk:migrate-ids -- --mapping /secure/path/clerk-id-mapping.json --apply
```

The command validates the whole batch in one serializable database transaction, conditionally updates only `User.clerkId`, re-reads every row before commit, and rolls back the entire batch on any mismatch. An entry already bound to its expected Production Clerk ID is an idempotent skip when neither old nor new ID collides.

Do not edit `User.id`, email, status, subscription, customer ID, integrations, campaigns, leads, or activity.

## 9. Stripe metadata

The deployed webhook fallback is the primary cutover protection. It resolves stale Clerk metadata through `Subscription.customerId` and the stable owning `User.id`. A metadata/customer conflict fails closed and returns `5xx`; customer ownership is never moved.

Optional metadata backfill may happen only after successful cutover verification:

1. Export an encrypted inventory of affected Checkout Sessions/subscriptions from Stripe without logging full customer IDs.
2. Dry-run the proposed metadata changes and join each customer to exactly one AP3K `Subscription.customerId`.
3. Reject missing or conflicting ownership.
4. Update only the Clerk ID metadata on the Stripe object to the reviewed Production Clerk ID.
5. Do not change the Stripe customer, AP3K `Subscription.customerId`, prices, billing state, or AP3K owner.
6. Record counts and redacted fingerprints, then delete the working inventory after the rollback window.

Backfill is optional; stale metadata may remain while customer-scoped fallback is active.

There is no durable Stripe event-ID ledger. Current handlers remain idempotent because they only upsert subscription state. Future non-idempotent webhook side effects must add durable event-ID deduplication before deployment.

## 10. Vercel cutover

Prepare one atomic Production configuration change and deploy the matched key pair together:

- set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` to the Production publishable key;
- set `CLERK_SECRET_KEY` to the matching Production secret key;
- add reviewed Production Clerk IDs to `ADMIN_CLERK_USER_IDS` before cutover when ID-based admin access is required;
- keep the old Development Clerk admin IDs during the rollback window, so old and new IDs may temporarily coexist;
- preserve the verified admin email in `ADMIN_EMAILS`;
- preserve `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`, and `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`;
- preserve `NEXT_PUBLIC_HOST_URL=https://ap3k.com`;
- do not change Meta, Stripe, or database variables.

Never deploy only one Clerk key. Do not configure a Clerk webhook.

## 11. Production redeployment and post-cutover checks

Redeploy production after the atomic key change. Keep checkout maintenance active until all checks pass.

For one mapped admin and one mapped non-admin, verify:

- Production Clerk sign-in succeeds;
- the dashboard resolves to the original internal UUID;
- the original campaign, integration, and lead counts match baseline;
- the existing subscription and customer presence remain attached to that UUID;
- Stripe Customer Portal opens for the same customer;
- workspace search returns the original data;
- Meta webhook activity continues on existing automations;
- no duplicate `User` row was created;
- admin access succeeds through the intended email and/or ID allowlist.

Re-run the baseline queries and compare totals. Only then resume new checkouts.

## 12. Monitoring

Monitor throughout the rollback window for:

- authentication and redirect errors;
- unique `clerkId` or email errors;
- unexpected `User` creation;
- stale Stripe metadata warnings (fingerprints only);
- Stripe webhook `5xx`, retries, or ownership conflicts;
- admin authorization failures;
- Checkout Sessions that cannot resolve through customer ownership;
- changes in campaign, integration, lead, or Meta webhook activity counts.

Treat any ownership conflict as an incident. Do not suppress it or acknowledge the Stripe event manually until the data is reconciled.

## 13. Rollback

Keep checkout maintenance active. Then:

1. Restore the matched Clerk Development publishable and secret key pair together.
2. Restore the old admin ID allowlist while keeping the verified `ADMIN_EMAILS` value.
3. Redeploy production.
4. Run the deterministic reverse mapping:

   ```bash
   npm run clerk:migrate-ids -- --mapping /secure/path/clerk-id-mapping.json --reverse
   ```

5. Verify every original Development Clerk binding and repeat the baseline ownership/count checks.
6. Verify mapped admin and non-admin sign-in with the Development instance.

Reverse mode requires each current binding to equal the reviewed Production Clerk ID and aborts the full transaction otherwise. Do not delete Production Clerk users. Do not delete, recreate, or move AP3K business data.

## 14. Admin allowlist cleanup

During the rollback window, a verified admin email must remain in `ADMIN_EMAILS`, and both old Development and new Production IDs may coexist in `ADMIN_CLERK_USER_IDS`. Remove old Development IDs only after the migration, monitoring window, rollback decision, and admin verification are complete. Never hard-code Production IDs in source.

## 15. Security and evidence retention

- Mapping and reverse files are never committed; `clerk-id-mapping*.json` and `.clerk-migration/` are ignored.
- Store mappings encrypted or in a secure password manager.
- Never place secrets in commands, shell history, tickets, or logs.
- Never print emails, tokens, Meta IDs, full Clerk IDs, or full Stripe customer IDs.
- Restrict database and mapping access to the migration operators.
- Delete local mapping files after the rollback window and retain only approved redacted evidence.
- This is a one-time operator-controlled binding change, not a permanent email-based account-claiming mechanism.
