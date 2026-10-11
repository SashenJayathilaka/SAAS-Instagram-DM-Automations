import { createHash } from "node:crypto";
import { Resend } from "resend";
import { Prisma, type EmailDelivery } from "@prisma/client";
import { client } from "@/lib/prisma";
import { renderAp3kEmail } from "./render";
import { ownerAlertConfiguration, ownerAlertContent, type OwnerAlert } from "./owner-alert-content";
import type { EmailTemplateContent } from "./catalog";

type QueueDb = Pick<Prisma.TransactionClient, "emailDelivery">;
type Payload = { from: string; to: string; replyTo: string; subject: string; html: string; text: string };
type AlertMetadata = { version: 1; content: EmailTemplateContent; attempts: number; firstAttemptAt?: string; nextAttemptAt?: string; payload?: Payload };
const RETRY_DELAYS = [1, 5, 15, 60, 180, 360];
const MAX_RETRY_AGE = 23 * 60 * 60 * 1000;

// The unique business key outlives Stripe retries and Resend's 24-hour key window.
export function ownerAlertKey(alert: Pick<OwnerAlert, "kind" | "key">, recipient: string) {
  return `ap3k:owner:${alert.kind}:${createHash("sha256").update(`${recipient}:${alert.key}`).digest("hex")}`;
}
export async function enqueueOwnerAlert(alert: OwnerAlert, db: QueueDb = client) {
  const config = ownerAlertConfiguration();
  if (!config.enabled) return null;
  const content = ownerAlertContent(alert);
  const idempotencyKey = ownerAlertKey(alert, config.recipient);
  return db.emailDelivery.upsert({
    where: { idempotencyKey }, update: {},
    create: {
      templateId: `owner_${alert.kind}`, category: "owner_alert", recipient: config.recipient,
      userId: alert.userId, subject: content.subject, idempotencyKey, status: "PENDING",
      metadata: { version: 1, content, attempts: 0 } as unknown as Prisma.InputJsonValue,
    },
  });
}
export function canAttemptOwnerAlert(row: Pick<EmailDelivery, "status" | "providerMessageId" | "errorCode" | "updatedAt" | "metadata">, now = Date.now()) {
  if (row.providerMessageId || !["PENDING", "FAILED"].includes(row.status)) return false;
  const metadata = row.metadata as unknown as AlertMetadata;
  if (metadata?.version !== 1 || metadata.attempts >= RETRY_DELAYS.length) return false;
  if (row.errorCode && !["owner_retry", "owner_sending"].includes(row.errorCode)) return false;
  if (row.errorCode === "owner_sending" && now - row.updatedAt.getTime() < 5 * 60 * 1000) return false;
  if (metadata.nextAttemptAt && new Date(metadata.nextAttemptAt).getTime() > now) return false;
  if (metadata.firstAttemptAt && now - new Date(metadata.firstAttemptAt).getTime() >= MAX_RETRY_AGE) return false;
  return true;
}
export async function deliverOwnerAlert(id: string): Promise<"sent" | "queued" | "skipped"> {
  if (!ownerAlertConfiguration().enabled || !process.env.RESEND_API_KEY?.trim()) return "skipped";
  const row = await client.emailDelivery.findUnique({ where: { id } });
  if (!row || row.category !== "owner_alert" || !canAttemptOwnerAlert(row)) return "skipped";
  const previous = row.metadata as unknown as AlertMetadata;
  const suppressed = await client.emailDelivery.findFirst({ where: { recipient: row.recipient, status: { in: ["BOUNCED", "COMPLAINED", "SUPPRESSED"] } }, select: { id: true } });
  if (suppressed) {
    await client.emailDelivery.update({ where: { id }, data: { status: "SKIPPED", errorCode: "owner_recipient_suppressed", errorMessage: "Owner address has a bounce, complaint, or suppression. Review delivery before enabling again." } });
    return "skipped";
  }
  let payload = previous.payload;
  if (!payload) {
    const rendered = await renderAp3kEmail({ templateId: "welcome", appUrl: "https://ap3k.com", recipientHint: row.recipient, contentOverride: previous.content });
    payload = { from: process.env.AP3K_EMAIL_FROM?.trim() || "AP3K <updates@ap3k.com>", to: row.recipient, replyTo: process.env.AP3K_EMAIL_REPLY_TO?.trim() || "support@ap3k.com", subject: rendered.subject, html: rendered.html, text: rendered.text };
  }
  const now = new Date();
  const metadata: AlertMetadata = { ...previous, payload, attempts: previous.attempts + 1, firstAttemptAt: previous.firstAttemptAt || now.toISOString(), nextAttemptAt: new Date(now.getTime() + RETRY_DELAYS[previous.attempts] * 60_000).toISOString() };
  const claim = await client.emailDelivery.updateMany({
    where: { id, updatedAt: row.updatedAt, status: row.status, errorCode: row.errorCode, providerMessageId: null },
    data: { status: "PENDING", errorCode: "owner_sending", updatedAt: now, metadata: metadata as unknown as Prisma.InputJsonValue },
  });
  if (!claim.count) return "skipped";
  try {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY!.trim()).emails.send(payload, { idempotencyKey: row.idempotencyKey });
    if (error || !data?.id) {
      const code = (error as { statusCode?: number } | null)?.statusCode;
      const retry = !code || code === 429 || code >= 500 || (code === 409 && error?.name === "concurrent_idempotent_requests");
      await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "FAILED", errorCode: retry ? metadata.attempts >= RETRY_DELAYS.length ? "owner_retry_exhausted" : "owner_retry" : "owner_provider_rejected", errorMessage: `Owner email ${retry ? "queued for retry" : "rejected"} (${error?.name || "provider_error"}).` } });
      return "queued";
    }
    await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "SENT", providerMessageId: data.id, sentAt: new Date(), errorCode: null, errorMessage: null } });
    return "sent";
  } catch {
    // Keep the identical payload and provider key: a timeout may have sent the email.
    await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "FAILED", errorCode: metadata.attempts >= RETRY_DELAYS.length ? "owner_retry_exhausted" : "owner_retry", errorMessage: "Owner delivery interrupted; check retry status in Email Center." } });
    return "queued";
  }
}
export async function deliverOwnerAlertSafely(id?: string | null) {
  if (!id) return;
  try { return await deliverOwnerAlert(id); }
  catch { console.warn("[owner-alert] delivery pending; check Email Center", { deliveryId: id }); }
}
export async function notifyOwnerAlert(alert: OwnerAlert) {
  // Queue persistence errors intentionally propagate for Stripe to retry the webhook.
  // Provider failures do not: the saved outbox item can be retried independently.
  const delivery = await enqueueOwnerAlert(alert);
  return deliverOwnerAlertSafely(delivery?.id);
}
export async function processOwnerAlertQueue() {
  if (!ownerAlertConfiguration().enabled) return { attempted: 0, sent: 0 };
  const pending = await client.emailDelivery.findMany({ where: { category: "owner_alert", providerMessageId: null, status: { in: ["PENDING", "FAILED"] }, OR: [{ errorCode: null }, { errorCode: { in: ["owner_retry", "owner_sending"] } }] }, orderBy: { createdAt: "desc" }, take: 100 });
  let attempted = 0, sent = 0;
  for (const row of pending) {
    const meta = row.metadata as unknown as AlertMetadata;
    if (meta.firstAttemptAt && Date.now() - new Date(meta.firstAttemptAt).getTime() >= MAX_RETRY_AGE) {
      await client.emailDelivery.updateMany({ where: { id: row.id, providerMessageId: null, updatedAt: row.updatedAt }, data: { status: "FAILED", errorCode: "owner_retry_expired", errorMessage: "Automatic retry window expired. Check Resend delivery before retrying to avoid a duplicate." } });
      continue;
    }
    if (!canAttemptOwnerAlert(row)) continue;
    if (attempted >= 15) break;
    attempted++;
    if (await deliverOwnerAlertSafely(row.id) === "sent") sent++;
    // Stay below Resend's default 2 requests/second budget.
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { attempted, sent };
}
export async function notifyOwnerBillingAlert(input: OwnerAlert & { live: boolean }) {
  if (!input.live || !ownerAlertConfiguration().enabled) return;
  const user = input.userId ? await client.user.findUnique({ where: { id: input.userId }, select: { email: true, firstname: true, lastname: true } }) : null;
  return notifyOwnerAlert({ ...input, email: user?.email, name: user ? [user.firstname, user.lastname].filter(Boolean).join(" ") : undefined });
}
