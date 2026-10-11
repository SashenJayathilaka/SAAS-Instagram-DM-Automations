import { createHash } from "node:crypto";
import { client } from "@/lib/prisma";
import { getApplicationUrl } from "@/lib/app-url";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const FOLLOW_ATTRIBUTION_DAYS = 7;

export function knownFollowStatus(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function trackableDestination(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname.startsWith("/api/go/")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

// Deliberately best-effort: analytics outages must never prevent a reply.
export async function recordAutomationHit(input: {
  automationId: string;
  eventKey: string;
  recipientIgId: string;
  source: string;
}) {
  try {
    await client.automationHit.upsert({
      where: {
        automationId_eventKey: {
          automationId: input.automationId,
          eventKey: input.eventKey,
        },
      },
      create: input,
      update: {},
    });
  } catch {
    console.warn("[automation-analytics] hit persistence unavailable");
  }
}

export async function observeAutomationFollow(
  input: {
    integrationId: string;
    automationId: string;
    recipientIgId: string;
    followsBusiness: boolean | undefined;
  },
  now = new Date(),
) {
  if (typeof input.followsBusiness !== "boolean") return;
  try {
    const key = {
      integrationId: input.integrationId,
      recipientIgId: input.recipientIgId,
    };
    await client.$transaction(async (tx) => {
      // Serializes observations for this contact across automations and retries.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.integrationId}:${input.recipientIgId}`}, 0))`;
      await tx.automationFollowerState.upsert({
        where: { integrationId_recipientIgId: key },
        create: {
          ...key,
          automationId: input.automationId,
          firstFollowing: input.followsBusiness!,
          firstSeenAt: now,
          lastNotFollowingAt: input.followsBusiness ? null : now,
        },
        update: {},
      });
      if (!input.followsBusiness) {
        await tx.automationFollowerState.updateMany({
          where: { ...key, firstFollowing: false, followedAt: null },
          data: { automationId: input.automationId, lastNotFollowingAt: now },
        });
      } else {
        await tx.automationFollowerState.updateMany({
          where: {
            ...key,
            automationId: input.automationId,
            firstFollowing: false,
            followedAt: null,
            lastNotFollowingAt: {
              gte: new Date(now.getTime() - FOLLOW_ATTRIBUTION_DAYS * 86400000),
              lte: now,
            },
          },
          data: { followedAt: now },
        });
      }
    });
  } catch {
    console.warn("[automation-analytics] follow persistence unavailable");
  }
}

export async function trackedDestination(
  automationId: string,
  recipientIgId: string,
  destination: string,
) {
  const safe = trackableDestination(destination);
  if (!safe || !uuid.test(automationId)) return destination;
  try {
    const key = createHash("sha256")
      .update(JSON.stringify([automationId, recipientIgId, safe]))
      .digest("hex");
    const link = await client.automationTrackedLink.upsert({
      where: { key },
      create: { automationId, recipientIgId, destination: safe, key },
      update: {},
      select: { id: true },
    });
    return `${getApplicationUrl()}/api/go/${link.id}`;
  } catch {
    console.warn("[automation-analytics] link persistence unavailable");
    return destination;
  }
}

export async function withTrackedLinks<
  T extends {
    automationId?: string;
    recipientId?: string;
    commenterId?: string;
    ctaUrl?: string | null;
    linkButtons?: Array<{ label: string; url: string }>;
    carouselCards?: Array<{
      title: string;
      subtitle?: string;
      image: string;
      links: Array<{ label: string; url: string }>;
    }>;
    followGatePrompt?: unknown;
    postbackButton?: unknown;
  },
>(params: T): Promise<T> {
  const recipient = params.recipientId ?? params.commenterId;
  if (
    !params.automationId ||
    !recipient ||
    params.followGatePrompt ||
    params.postbackButton
  )
    return params;
  const [ctaUrl, linkButtons, carouselCards] = await Promise.all([
    params.ctaUrl
      ? trackedDestination(params.automationId, recipient, params.ctaUrl)
      : params.ctaUrl,
    params.linkButtons
      ? Promise.all(
          params.linkButtons.map(async (button) => ({
            ...button,
            url: await trackedDestination(
              params.automationId!,
              recipient,
              button.url,
            ),
          })),
        )
      : undefined,
    params.carouselCards
      ? Promise.all(
          params.carouselCards.map(async (card) => ({
            ...card,
            links: await Promise.all(
              card.links.map(async (button) => ({
                ...button,
                url: await trackedDestination(
                  params.automationId!,
                  recipient,
                  button.url,
                ),
              })),
            ),
          })),
        )
      : undefined,
  ]);
  return { ...params, ctaUrl, linkButtons, carouselCards };
}

export function isHumanLinkRequest(headers: Headers) {
  const agent = headers.get("user-agent") ?? "";
  return (
    Boolean(agent) &&
    !/bot|crawler|spider|preview|facebookexternalhit|facebot|slack|whatsapp|telegram|headless/i.test(
      agent,
    ) &&
    !/prefetch|preview/i.test(
      `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`,
    ) &&
    !headers.has("next-router-prefetch")
  );
}

export async function recordAutomationClick(
  link: { automationId: string; recipientIgId: string; id?: string },
  country?: string | null,
) {
  if (link.id) await client.automationTrackedLink.updateMany({
    where: { id: link.id, automationId: link.automationId, recipientIgId: link.recipientIgId, firstClickedAt: null },
    data: { firstClickedAt: new Date() },
  });
  const code = country?.toUpperCase();
  await client.automationClick.upsert({
    where: {
      automationId_recipientIgId: {
        automationId: link.automationId,
        recipientIgId: link.recipientIgId,
      },
    },
    create: { automationId: link.automationId, recipientIgId: link.recipientIgId, country: code && /^[A-Z]{2}$/.test(code) ? code : null },
    update: {},
  });
  await client.automationEngagementJob.updateMany({
    where: {
      automationId: link.automationId,
      recipientIgId: link.recipientIgId,
      kind: "FOLLOW_UP",
      status: { in: ["PENDING", "PROCESSING"] },
    },
    data: { clickedAt: new Date() },
  });

}
