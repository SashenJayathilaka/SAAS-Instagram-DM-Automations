# Automation engagement

Comment, chat and story editors share expandable follow requests, email/phone capture, and one conditional follow-up. Free accounts see PRO badges and the shared pricing dialog; server-side save and activation checks enforce Pro or Business access. Billing and the upgrade dialog reuse the public pricing component and plan catalog. Existing automations default to the old behavior.

## Delivery order

Comment → opening DM → user taps → optional verified follow → optional email request → optional phone request → final text/product card → optional reminder. Chat and story triggers start within their inbound messaging window.

Enabling an engagement step in a comment automation enables Opening DM. Turning Opening DM off turns off its dependent steps. Capture accepts a whole email address or phone number, SKIP (continue without that field), or STOP (cancel). Phone numbers accept common separators and normalize to 7–15 digits with an optional leading plus. Captured values appear in account-scoped Contacts, including phone search; this does not create a marketing subscription. Existing values for the campaign skip repeat collection. Pending capture queries require a paid plan.

Follow-ups are one reminder after at least the configured delay, if there has been no new reply or other outbound inbox message. They reuse saved link buttons. The eight conditions are Always, Seen, Not seen, Reacted, Clicked, Not clicked, Followed and Unfollowed. Views/reactions use verified, account-scoped Instagram receipts for the delivered message; clicks use the tracking endpoint. Follow changes require a known before/after recipient status. Unknown status never counts as a follow conversion. Receipt-dependent jobs require successful webhook subscription setup. Timing is approximate. Checks include active campaign, connected account, account suspension, paid plan, plan lock, message allowance, and the original 24-hour inbound messaging window. Paused, downgraded or expired jobs are cancelled. An ambiguous send is never automatically retried.

The ad template selects an existing published Instagram post. Its comment trigger includes comments on that post whether organic or promoted; it cannot distinguish ad placement. AP3K does not yet connect an ad account or discover ads without a published Instagram post. The editor states this limitation. This is not full LinktoDM ad-editor parity.

## Deployment

Production `scripts/vercel-build.mjs` runs Prisma migrations before building, including the additive `20260928070000_engagement_conditions`. Ten new columns store phone settings, follow-up evidence/conditions, and the ad-template flag. The migration was applied successfully to an ephemeral PostgreSQL instance initialized from the previous production schema. No production data was used in that test.

`.github/workflows/automation-follow-ups.yml` calls the production queue every five minutes (offset from the start of the hour). It uses GitHub OIDC, not a stored app credential. The endpoint validates RS256 signature, issuer, exact audience, expiry, immutable repository/owner IDs, main branch, workflow path, and schedule/manual event. It also accepts the existing CRON_SECRET for an alternative scheduler. It does not accept pull-request identities or identities from forks. No checkout or third-party action runs in the job.

After deployment, confirm a successful scheduled or manual workflow run. The editor enables new follow-ups only after a recent scheduler heartbeat (20 minutes). GitHub schedules can be delayed, and GitHub can disable schedules after prolonged repository inactivity; monitor the workflow. If reminders require a strict timing SLA, use a dedicated scheduler calling the same endpoint with CRON_SECRET. Existing pending jobs still fail closed outside the Instagram window.

## Verification

Run `npm test` and `npx tsc --noEmit`; Vercel validates the production build. Tests cover email/phone/skip behavior, all condition predicates, receipt account scope, plan downgrade, claim races, closed messaging windows, scheduler trust, quota and human-takeover cancellation, and webhook payload separation. Browser checks cover free upgrade buttons, billing intervals, phone preview, the eight-condition picker, mobile light/dark pricing, and the reusable flow navigation.

The sample-only UI fixture can be built outside public/ with `node scripts/automation-ui-preview/build.mjs /tmp/ap3k-engagement-preview`. It has no server actions and sends no DMs. It is not an application route.

## Sources

- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/private-replies
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/overview
- https://docs.github.com/en/actions/reference/security/oidc
- https://docs.github.com/en/actions/how-tos/troubleshoot-workflows
