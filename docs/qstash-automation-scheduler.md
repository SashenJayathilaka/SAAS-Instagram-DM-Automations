# QStash automation scheduler

QStash wakes AP3K's existing follow-up, delayed-message, and flow queues without Vercel Pro. The signed POST handler is the recurring scheduler. The existing authenticated GET handler and GitHub `workflow_dispatch` remain available for manual recovery.

## Configuration

1. In the intended Upstash account, select QStash's Free plan and one region. Connect that QStash resource to the AP3K Vercel project with Production variables `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY`. `QSTASH_URL` can select the EU or US regional API; its default is `https://qstash.upstash.io`. Do not expose credentials in chat, commits, screenshots, or logs.
2. Redeploy. After a successful production app build, `scripts/qstash-schedule.mjs` checks that the API's signing keys match the deployment, checks existing schedules, and creates the schedule only if no schedule targets this endpoint. It never modifies or resumes an existing schedule. Preview builds make no QStash API calls. Missing partial configuration or failed API checks stop the new deployment; projects with no QStash credentials skip setup. Each request has a 15-second timeout and redirects are rejected.
3. The automatically created schedule uses:
   - Name/ID: `ap3k-automation-follow-ups`
   - Destination: `https://ap3k.com/api/cron/automation-follow-ups`
   - Method: POST
   - Body: empty
   - Cron: `*/5 * * * *` (UTC)
   - Retries: 1
   - Timeout: 60 seconds
   - No custom Authorization header and no contact data in the request.

The token is used only for build-time setup. Runtime verifies signatures with the signing keys. The POST handler rejects preview deployments, unsigned requests, wrong keys, expired tokens, a different issuer/destination, or a changed request body. A schedule can fire before Vercel promotes the deployment with the new signing keys; that first attempt can return 401. Verify later executions after promotion.

At five-minute intervals this creates 288 initial requests/day, up to 576 attempts/day if every request retries once. Keep other QStash traffic within the account's shared 1,000/day free allowance. Normal Vercel function and Neon database usage still applies.

## Verify scheduler health

Confirm a signed request succeeds, then observe at least two automatic executions approximately five minutes apart. Responses must be HTTP 200 with `ok: true`; inspect `flowFailed` and worker logs as well. Confirm a fresh `AutomationSchedulerHeartbeat` and that the editor no longer reports an unavailable scheduler. Any actual DM delivery test must use controlled test accounts.

Workers retain database claims, messaging-window enforcement, plan/account checks, and cancellation when a conversation moves on. QStash can redeliver a request, so those claims remain essential. Five minutes is a polling interval, not a strict delivery guarantee. Ambiguous provider failures are not automatically replayed.

The recurring GitHub schedule has been retired. Use `.github/workflows/automation-follow-ups.yml` with `workflow_dispatch` for manual recovery if needed.

## Rollback

Pause the QStash schedule and use the GitHub manual recovery workflow. If needed, restore the previous GitHub `schedule` event, accounting for GitHub's potentially delayed execution. If rolling back to code without POST support, pause QStash first to avoid repeated 405 errors. When rotating signing keys, update both production values and deploy before retiring the old key.

Official references: https://upstash.com/docs/qstash/howto/signature, https://upstash.com/docs/qstash/features/security, https://upstash.com/docs/qstash/features/schedules, and https://upstash.com/pricing/qstash.
