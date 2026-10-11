import { Prisma, type MarketingLead } from "@prisma/client";
import { Resend } from "resend";
import { client } from "@/lib/prisma";
import { FOLLOW_UPS, marketingEmail, type MarketingStage } from "./content";
import { hashToken, unsubscribeToken } from "./tokens";

type Payload = { from: string; to: string; replyTo: string; subject: string; html: string; text: string; headers: Record<string, string> };
type QueueMetadata = { leadId: string; stage: MarketingStage; payload: Payload; attempts: number; firstAttemptAt?: string };
const terminal = ["BOUNCED", "COMPLAINED", "SUPPRESSED"] as const;
const accepted = ["SENT", "DELIVERED", "OPENED", "CLICKED"] as const;
export function marketingReady() {
  return process.env.VERCEL_ENV === "production" && process.env.AP3K_MARKETING_ENABLED !== "false"
    && Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_WEBHOOK_SECRET?.trim());
}

/** Atomic, database-backed caps; identifiers are hashed and never logged. */
export async function takeMarketingSlot(scope: string, identity: string, maximum: number, windowMs = 86400000) {
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const key = hashToken(`ap3k-marketing:${scope}:${identity}`);
  const row = await client.marketingRateLimit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 }, update: { count: { increment: 1 } }, select: { count: true },
  });
  return row.count <= maximum;
}

export async function queueMarketingEmail(lead: MarketingLead, stage: MarketingStage, confirmationToken = "") {
  const unsubscribeUrl = `https://ap3k.com/api/marketing/unsubscribe?id=${lead.id}&token=${unsubscribeToken(lead.id)}`;
  const confirmationUrl = `https://ap3k.com/api/marketing/confirm?id=${lead.id}&token=${confirmationToken}`;
  const payload: Payload = {
    from: process.env.AP3K_EMAIL_FROM?.trim() || "AP3K <updates@ap3k.com>",
    replyTo: process.env.AP3K_EMAIL_REPLY_TO?.trim() || "support@ap3k.com",
    to: lead.email, ...marketingEmail(stage, lead.audience, confirmationUrl, unsubscribeUrl),
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
  // Confirmation key changes only on an explicit, rate-limited resend request.
  const idempotencyKey = `ap3k:marketing:${lead.id}:${stage}${stage === "confirm" ? `:${lead.confirmationHash}` : ""}`;
  return client.emailDelivery.upsert({
    where: { idempotencyKey }, update: {}, create: {
      category: "lead_nurture", templateId: `marketing_${stage}`, recipient: lead.email,
      subject: payload.subject, idempotencyKey, status: "PENDING",
      metadata: { leadId: lead.id, stage, payload, attempts: 0 } as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function deliverMarketingEmail(id: string): Promise<"sent" | "skipped" | "queued"> {
  if (!marketingReady()) return "skipped";
  const row = await client.emailDelivery.findUnique({ where: { id } });
  if (!row || row.category !== "lead_nurture" || row.providerMessageId || !["PENDING", "FAILED"].includes(row.status)) return "skipped";
  const metadata = row.metadata as unknown as QueueMetadata;
  if (!metadata?.payload || metadata.attempts >= 3 || (row.errorCode && !["marketing_sending", "marketing_retry"].includes(row.errorCode))) return "skipped";
  if (row.errorCode === "marketing_sending" && Date.now() - row.updatedAt.getTime() < 5 * 60_000) return "skipped";
  if (metadata.firstAttemptAt && Date.now() - new Date(metadata.firstAttemptAt).getTime() >= 23 * 3600000) {
    await client.emailDelivery.updateMany({ where: { id, providerMessageId: null, updatedAt: row.updatedAt }, data: { status: "FAILED", errorCode: "marketing_retry_expired", errorMessage: "Check Resend before retrying: the safe idempotency retry window expired." } });
    return "skipped";
  }
  const lead = await client.marketingLead.findUnique({ where: { id: metadata.leadId } });
  const suppressed = await client.emailDelivery.findFirst({ where: { recipient: row.recipient, status: { in: [...terminal] } }, select: { id: true } });
  const invalid = !lead || lead.unsubscribedAt || lead.suppressedAt || suppressed
    || (metadata.stage !== "confirm" && !lead.confirmedAt)
    || (metadata.stage === "confirm" && (lead.confirmedAt || lead.expiresAt.getTime() <= Date.now() || !row.idempotencyKey.endsWith(lead.confirmationHash)));
  if (invalid) {
    await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "SKIPPED", errorCode: "marketing_ineligible" } });
    return "skipped";
  }
  // Deliver the requested kit even to customers; stop prospect sales follow-ups.
  if (["test", "launch"].includes(metadata.stage)) {
    const customer = await client.user.findFirst({ where: { email: { equals: lead!.email, mode: "insensitive" } }, select: { id: true } });
    if (customer || lead!.completedAt) {
      await client.marketingLead.update({ where: { id: lead!.id }, data: { completedAt: new Date() } });
      await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "SKIPPED", errorCode: "marketing_customer_exit" } });
      return "skipped";
    }
  }
  // Reserve at most 30 attempts/day for marketing, leaving transactional headroom
  // on the currently observed 100/day plan. Other projects share the provider cap.
  if (!await takeMarketingSlot("send", "all", 30)) return "queued";
  const now = new Date();
  const next = { ...metadata, attempts: metadata.attempts + 1, firstAttemptAt: metadata.firstAttemptAt || now.toISOString() };
  const claim = await client.emailDelivery.updateMany({
    where: { id, updatedAt: row.updatedAt, providerMessageId: null, status: row.status, errorCode: row.errorCode },
    data: { status: "PENDING", errorCode: "marketing_sending", updatedAt: now, metadata: next as unknown as Prisma.InputJsonValue },
  });
  if (!claim.count) return "skipped";
  try {
    // Recheck opt-out immediately before contacting the provider.
    const current = await client.marketingLead.findUnique({ where: { id: lead!.id } });
    if (!current || current.unsubscribedAt || current.suppressedAt) {
      await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "SKIPPED", errorCode: "marketing_ineligible" } });
      return "skipped";
    }
    const { data, error } = await new Resend(process.env.RESEND_API_KEY!.trim()).emails.send(metadata.payload, { idempotencyKey: row.idempotencyKey });
    if (error || !data?.id) {
      const code = (error as { statusCode?: number } | null)?.statusCode;
      const retry = !code || code === 429 || code >= 500 || (code === 409 && error?.name === "concurrent_idempotent_requests");
      await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "FAILED", errorCode: retry ? "marketing_retry" : "marketing_rejected", errorMessage: "Provider did not accept the marketing delivery; review Email Center." } });
      return "queued";
    }
    await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "SENT", providerMessageId: data.id, sentAt: new Date(), errorCode: null } });
    if (metadata.stage === "launch") await client.marketingLead.update({ where: { id: lead!.id }, data: { completedAt: new Date() } });
    return "sent";
  } catch {
    await client.emailDelivery.updateMany({ where: { id, providerMessageId: null }, data: { status: "FAILED", errorCode: "marketing_retry", errorMessage: "Delivery interrupted; retry only with the saved payload and key." } });
    return "queued";
  }
}

export async function processMarketingQueue() {
  if (!marketingReady()) return { enabled: false, sent: 0, attempted: 0 };
  // This table also holds monthly, cross-partner referral invitation caps.
  // An idle counter must survive its whole window, not just two idle days.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  await client.marketingRateLimit.deleteMany({ where: {
    windowStart: { lt: monthStart },
    updatedAt: { lt: new Date(now.getTime() - 2 * 86400000) },
  } });
  const leads = await client.marketingLead.findMany({
    where: { confirmedAt: { not: null }, unsubscribedAt: null, suppressedAt: null, completedAt: null },
    orderBy: { confirmedAt: "asc" }, take: 50,
  });
  for (const lead of leads) {
    const history = await client.emailDelivery.findMany({ where: { recipient: lead.email, category: "lead_nurture", status: { in: [...accepted] } }, select: { templateId: true, sentAt: true } });
    // Recover confirmation->queue interruption without duplicating the first email.
    if (!history.some(e => e.templateId === "marketing_kit")) { await queueMarketingEmail(lead, "kit"); continue; }
    if (history.some(e => e.sentAt && Date.now() - e.sentAt.getTime() < 24 * 3600000)) continue;
    const next = FOLLOW_UPS.find(s => !history.some(e => e.templateId === `marketing_${s.stage}`));
    if (next && Date.now() - lead.confirmedAt!.getTime() >= next.days * 86400000) await queueMarketingEmail(lead, next.stage);
  }
  const pending = await client.emailDelivery.findMany({ where: { category: "lead_nurture", providerMessageId: null, status: { in: ["PENDING", "FAILED"] }, OR: [{ errorCode: null }, { errorCode: { in: ["marketing_retry", "marketing_sending"] } }] }, orderBy: { createdAt: "asc" }, take: 15 });
  let sent = 0;
  for (const row of pending) {
    if (await deliverMarketingEmail(row.id) === "sent") sent++;
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { enabled: true, sent, attempted: pending.length };
}
