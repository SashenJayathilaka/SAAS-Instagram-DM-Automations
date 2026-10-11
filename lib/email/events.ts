import { client } from "@/lib/prisma";
import { dashboardPath } from "@/lib/dashboard";
import { getApplicationUrl } from "@/lib/app-url";
import type { EmailTemplateContext, EmailTemplateId } from "@/lib/email/catalog";

type UserEmailProfile = {
  id: string;
  clerkId: string;
  email: string;
  firstname: string | null;
  subscription: { plan: string } | null;
  integrations: Array<{ instagramUsername: string | null }>;
};

function workspaceUrl(clerkId: string, suffix = "") {
  return `${getApplicationUrl()}${dashboardPath(clerkId)}${suffix}`;
}

async function loadUserEmailProfile(userId: string): Promise<UserEmailProfile | null> {
  try {
    return await client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstname: true,
        subscription: { select: { plan: true } },
        integrations: {
          where: { name: "INSTAGRAM", status: "CONNECTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { instagramUsername: true },
        },
      },
    });
  } catch (error) {
    console.warn("[email-event] profile lookup skipped", {
      userId,
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return null;
  }
}

async function loadUserEmailProfileByClerkId(clerkId: string): Promise<UserEmailProfile | null> {
  try {
    return await client.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstname: true,
        subscription: { select: { plan: true } },
        integrations: {
          where: { name: "INSTAGRAM", status: "CONNECTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { instagramUsername: true },
        },
      },
    });
  } catch (error) {
    console.warn("[email-event] workspace lookup skipped", {
      workspaceIdPresent: Boolean(clerkId),
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return null;
  }
}

async function safelySendEvent(input: {
  templateId: EmailTemplateId;
  user: UserEmailProfile;
  idempotencyKey: string;
  context?: EmailTemplateContext;
  metadata?: Record<string, string | number | boolean | null>;
  personalizeWithAi?: boolean;
}) {
  try {
    const { sendAp3kEmail } = await import("@/lib/email/delivery");
    const result = await sendAp3kEmail({
      templateId: input.templateId,
      to: input.user.email,
      userId: input.user.id,
      idempotencyKey: input.idempotencyKey,
      context: {
        firstName: input.user.firstname,
        instagramUsername: input.user.integrations[0]?.instagramUsername,
        ...input.context,
      },
      metadata: input.metadata,
      personalizeWithAi: input.personalizeWithAi,
    });

    if (!result.ok && result.status !== "disabled" && result.status !== "opted_out") {
      console.warn("[email-event] delivery did not complete", {
        templateId: input.templateId,
        status: result.status,
        userId: input.user.id,
      });
    }
  } catch (error) {
    // Product actions must never fail because an email provider, template, or
    // delivery log is temporarily unavailable.
    console.warn("[email-event] non-blocking delivery failure", {
      templateId: input.templateId,
      userId: input.user.id,
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
  }
}

export async function notifyWelcomeEmail(input: {
  id: string;
  clerkId: string;
  email: string;
  firstname?: string | null;
}) {
  const user: UserEmailProfile = {
    id: input.id,
    clerkId: input.clerkId,
    email: input.email,
    firstname: input.firstname ?? null,
    subscription: { plan: "FREE" },
    integrations: [],
  };
  return safelySendEvent({
    templateId: "welcome",
    user,
    idempotencyKey: `welcome:${input.id}`,
    context: {
      actionUrl: `${getApplicationUrl()}/onboarding`,
      secondaryUrl: workspaceUrl(input.clerkId),
    },
  });
}

export async function notifyInstagramConnectedEmail(input: {
  clerkId: string;
  instagramId: string;
  instagramUsername?: string | null;
}) {
  const user = await loadUserEmailProfileByClerkId(input.clerkId);
  if (!user) return;

  return safelySendEvent({
    templateId: "instagram_connected",
    user,
    idempotencyKey: `instagram-connected:${user.id}:${input.instagramId}`,
    context: {
      instagramUsername: input.instagramUsername,
      actionUrl: workspaceUrl(user.clerkId, "/automation"),
      secondaryUrl: workspaceUrl(user.clerkId, "/settings"),
    },
    metadata: { instagramId: input.instagramId },
  });
}

export async function notifyAutomationActivatedEmail(input: {
  userId: string;
  automationId: string;
  automationName: string;
}) {
  const user = await loadUserEmailProfile(input.userId);
  if (!user) return;
  return safelySendEvent({
    templateId: "automation_activated",
    user,
    idempotencyKey: `automation-activated:${input.automationId}`,
    context: {
      automationName: input.automationName,
      actionUrl: workspaceUrl(user.clerkId, `/automation/${encodeURIComponent(input.automationId)}/analytics`),
    },
    metadata: { automationId: input.automationId },
  });
}

export async function notifyBillingEmail(input: {
  userId: string;
  templateId: "plan_activated" | "payment_failed" | "subscription_canceled";
  stripeEventId: string;
  planName?: string | null;
  periodEnd?: string | null;
  failureReason?: string | null;
}) {
  const user = await loadUserEmailProfile(input.userId);
  if (!user) return;
  return safelySendEvent({
    templateId: input.templateId,
    user,
    idempotencyKey: `stripe:${input.stripeEventId}:${input.templateId}`,
    context: {
      planName: input.planName || user.subscription?.plan,
      periodEnd: input.periodEnd,
      failureReason: input.failureReason,
      actionUrl: workspaceUrl(user.clerkId, "/billing"),
    },
    metadata: { stripeEventId: input.stripeEventId },
  });
}
