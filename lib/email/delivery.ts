import { Resend } from "resend";
import { Prisma } from "@prisma/client";
import { client } from "@/lib/prisma";
import { getApplicationUrl } from "@/lib/app-url";
import { dashboardEntryPath } from "@/lib/dashboard";
import { generateAiEmailPersonalization } from "@/lib/ai-reply";
import { buildEmailTemplate, EMAIL_TEMPLATES, type EmailPreferenceKey, type EmailTemplateContext, type EmailTemplateId } from "@/lib/email/catalog";
import { renderAp3kEmail } from "@/lib/email/render";

const DEFAULT_FROM = "AP3K <updates@ap3k.com>";
const DEFAULT_REPLY_TO = "support@ap3k.com";

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid recipient email is required.");
  }
  return email;
}

function cleanError(value: unknown) {
  const raw = value instanceof Error ? value.message : String(value ?? "Unknown email error");
  return raw.replace(/re_[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 600);
}

export function getEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  return {
    configured: Boolean(apiKey),
    webhookConfigured: Boolean(webhookSecret),
    from: process.env.AP3K_EMAIL_FROM?.trim() || DEFAULT_FROM,
    replyTo: process.env.AP3K_EMAIL_REPLY_TO?.trim() || DEFAULT_REPLY_TO,
    apiKey,
    webhookSecret,
  };
}

export async function getEmailPreferences(userId: string) {
  const stored = await client.emailPreference.findUnique({ where: { userId } });
  return {
    productTips: stored?.productTips ?? true,
    weeklyReports: stored?.weeklyReports ?? true,
    promotions: stored?.promotions ?? false,
  };
}

async function preferenceAllows(userId: string | undefined, key: EmailPreferenceKey) {
  if (!userId || key === "transactional") return true;
  const preferences = await getEmailPreferences(userId);
  return preferences[key];
}

export type SendAp3kEmailResult =
  | { ok: true; status: "sent" | "duplicate"; deliveryId: string; providerMessageId?: string }
  | { ok: false; status: "disabled" | "opted_out" | "failed"; deliveryId?: string; error: string };

export async function sendAp3kEmail(input: {
  templateId: EmailTemplateId;
  to: string;
  idempotencyKey: string;
  userId?: string;
  context?: EmailTemplateContext;
  metadata?: Record<string, string | number | boolean | null>;
  personalizeWithAi?: boolean;
}): Promise<SendAp3kEmailResult> {
  const configuration = getEmailConfiguration();
  if (!configuration.apiKey) {
    return { ok: false, status: "disabled", error: "Email delivery is not configured." };
  }

  const definition = EMAIL_TEMPLATES[input.templateId];
  const recipient = normalizeEmail(input.to);
  const idempotencyKey = `ap3k:${input.idempotencyKey.trim()}`.slice(0, 240);
  if (idempotencyKey === "ap3k:") throw new Error("An email idempotency key is required.");

  const existing = await client.emailDelivery.findUnique({ where: { idempotencyKey } });
  if (existing) {
    return {
      ok: existing.status !== "FAILED",
      status: existing.status === "FAILED" ? "failed" : "duplicate",
      deliveryId: existing.id,
      ...(existing.providerMessageId ? { providerMessageId: existing.providerMessageId } : {}),
      ...(existing.status === "FAILED" ? { error: existing.errorMessage || "The previous delivery attempt failed." } : {}),
    } as SendAp3kEmailResult;
  }

  const appUrl = getApplicationUrl();
  const preferenceUrl = `${appUrl}${dashboardEntryPath("/settings#email-preferences")}`;
  const context = input.context ?? {};
  let content = buildEmailTemplate(input.templateId, context, appUrl);
  const allowed = await preferenceAllows(input.userId, definition.preference);
  if (!allowed) {
    const delivery = await client.emailDelivery.create({
      data: {
        userId: input.userId,
        templateId: input.templateId,
        category: definition.category,
        recipient,
        subject: content.subject,
        idempotencyKey,
        status: "SKIPPED",
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        errorCode: "recipient_opted_out",
        errorMessage: `Recipient disabled ${definition.preference} emails.`,
      },
    });
    return { ok: false, status: "opted_out", deliveryId: delivery.id, error: "Recipient opted out of this email category." };
  }

  if (input.personalizeWithAi && definition.aiPersonalization) {
    const personalized = await generateAiEmailPersonalization({
      templateLabel: definition.label,
      fallback: {
        subject: content.subject,
        preview: content.preview,
        headline: content.headline,
        introduction: content.paragraphs[0] || "",
      },
      safeContext: {
        firstName: context.firstName,
        instagramUsername: context.instagramUsername,
        automationName: context.automationName,
      },
    });
    if (personalized.ok) {
      content = {
        ...content,
        subject: personalized.subject,
        preview: personalized.preview,
        headline: personalized.headline,
        paragraphs: [personalized.introduction, ...content.paragraphs.slice(1)],
      };
    }
  }
  const rendered = await renderAp3kEmail({
    templateId: input.templateId,
    context: input.context,
    appUrl,
    preferenceUrl,
    recipientHint: recipient,
    contentOverride: content,
  });

  const delivery = await client.emailDelivery.create({
    data: {
      userId: input.userId,
      templateId: input.templateId,
      category: definition.category,
      recipient,
      subject: rendered.subject,
      idempotencyKey,
      status: "PENDING",
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  try {
    const resend = new Resend(configuration.apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: configuration.from,
        to: recipient,
        replyTo: configuration.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: [
          { name: "template", value: input.templateId },
          { name: "category", value: definition.category },
        ],
      },
      { idempotencyKey }
    );

    if (error || !data?.id) {
      const message = cleanError(error?.message || "Resend did not return a message ID.");
      await client.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", errorCode: error?.name || "provider_error", errorMessage: message },
      });
      return { ok: false, status: "failed", deliveryId: delivery.id, error: message };
    }

    await client.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", providerMessageId: data.id, sentAt: new Date(), errorCode: null, errorMessage: null },
    });
    return { ok: true, status: "sent", deliveryId: delivery.id, providerMessageId: data.id };
  } catch (error) {
    const message = cleanError(error);
    await client.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", errorCode: "provider_exception", errorMessage: message },
    });
    return { ok: false, status: "failed", deliveryId: delivery.id, error: message };
  }
}
