# AP3K customer email system

AP3K owns its product email experience while Clerk and Stripe remain the source
of truth for authentication messages and official payment receipts.

## What is included

- 18 branded transactional and lifecycle templates.
- Automatic sends for workspace creation, Instagram connection, first
  automation activation, plan activation, payment failure, and subscription
  cancellation.
- Customer controls for setup tips, weekly reports, and promotions.
- Signed Resend webhooks for sent, delivered, opened, clicked, bounced,
  complained, suppressed, and failed states.
- An owner-only Email Center at `/admin/emails` with real previews, delivery
  health, recent failures, and protected test sends to the owner inbox.
- Optional AI personalization for low-risk lifecycle messages only. Billing,
  account, usage, and automation facts always come from AP3K data and cannot be
  invented or changed by the model.

## Production connection

1. In Resend, add and verify `ap3k.com` as the sending domain. Add only the DNS
   records Resend supplies. Do not replace the MX records used by the existing
   AP3K support inbox.
2. Create a production sending key restricted to the AP3K domain.
3. Add these production variables in Vercel:

   - `RESEND_API_KEY`
   - `AP3K_EMAIL_FROM=AP3K <updates@ap3k.com>`
   - `AP3K_EMAIL_REPLY_TO=support@ap3k.com`

4. In Resend, create a webhook pointing to
   `https://ap3k.com/api/webhooks/resend`. Subscribe to all email delivery
   events, then add its signing secret as `RESEND_WEBHOOK_SECRET` in Vercel.
5. Deploy the database migration and application together.
6. Open `/admin/emails`, confirm **Delivery connected** and **Webhook Ready**,
   preview every template, and send one owner test.
7. Confirm the test shows `SENT`, then `DELIVERED`. Test a CTA, a reply to
   support, and both desktop and mobile rendering before enabling campaigns.

## Mailbox and AI operating rules

Connecting the support mailbox later can let AP3K AI classify and draft replies,
but production auto-send should remain off until the mailbox identity, approved
knowledge, escalation rules, and audit trail are verified. The safe rollout is:

1. Read-only classification and suggested drafts.
2. Human approval for billing, privacy, account access, refunds, complaints,
   and deliverability problems.
3. Automatic replies only for a small allowlist of low-risk questions with
   deterministic AP3K links.
4. Escalate anything uncertain to `support@ap3k.com`; never request passwords,
   access tokens, one-time codes, API keys, or card details.

## Deliverability checklist

- Use one stable From address and a monitored Reply-To inbox.
- Keep SPF, DKIM, and DMARC valid; start DMARC in monitoring mode if the domain
  already sends mail from other providers.
- Never send lifecycle or promotional email to opted-out recipients.
- Suppress bounced and complained addresses using Resend delivery events.
- Keep transactional facts deterministic and links on `https://ap3k.com`.
- Review failed and suppressed deliveries in `/admin/emails` each week.

## Important owner alerts

Owner alerts are independent of customer email preferences. They send only in
Vercel production, to `AP3K_OWNER_ALERT_EMAIL`, falling back to the first
`ADMIN_EMAILS` address and then the existing AP3K owner inbox.

- One notification per new AP3K user profile, saved in the registration transaction.
- One per nonzero paid subscription invoice (first payment, renewal, or paid plan adjustment).
- One failed-payment alert per invoice, regardless of Stripe retry count.
- One when a subscription ends, plus refunds and payment disputes that belong to AP3K customers.
- No routine login, comment, DM, automation-run, preview, or Stripe test-mode alerts.

Emails contain the customer identity, available amount/currency and plan, event
time, and a direct `/admin/users/:id` link. Amounts use the currency's minor units;
invoices marked paid outside Stripe are explicitly identified.

The `EmailDelivery` table is the owner outbox; no new migration is needed. Unique
business keys deduplicate repeats permanently. A conditional row claim prevents
concurrent sends; Resend retries reuse an identical saved payload and key. The
protected `/api/cron/owner-alerts` worker runs daily at 04:47 UTC (within the hosting plan’s scheduling window) and requires
`CRON_SECRET`. Transient errors back off and stop after six attempts or 23 hours
from the first send attempt, before Resend's idempotency window expires. Ambiguous
expired attempts require checking Resend before resending. Bounced/complained/
suppressed recipients are not retried.

`/admin/emails` displays the recipient and enabled state, offers one test per
minute, and allows an owner to process eligible queued retries. Set
`AP3K_OWNER_ALERTS_ENABLED=false` to stop sending. No historical users or payments
are backfilled automatically.
