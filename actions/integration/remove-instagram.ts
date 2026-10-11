"use server";

import { getCurrentWorkspaceClerkId } from "@/actions/user";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { syncInstagramAccountEntitlements } from "@/lib/instagram-account-entitlements";
import { client } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function removeCurrentInstagramAccount(expectedIntegrationId = "") {
  const authUser = await currentUser();
  if (!authUser) {
    return { status: 401, data: "Sign in required" } as const;
  }

  const workspaceClerkId =
    (await getCurrentWorkspaceClerkId()) ?? authUser.id;

  const integrationId = await currentInstagramAccountId(workspaceClerkId);
  if (expectedIntegrationId !== integrationId) return { status: 409, data: "Your Instagram account changed. Reload this page before saving." } as const;
  const user = await client.user.findUnique({
    where: { clerkId: workspaceClerkId },
    select: {
      id: true,
      subscription: true,
      integrations: {
        where: { name: "INSTAGRAM", id: integrationId },
        select: {
          id: true,
          instagramId: true,
          pageId: true,
          webhookAccountId: true,
          businessId: true,
        },
      },
      automations: {
        where: { integrationId },
        select: { id: true },
      },
    },
  });

  if (!user || user.integrations.length === 0) {
    return { status: 404, data: "No Instagram account connected" } as const;
  }

  const automationIds = user.automations.map((automation) => automation.id);
  const accountIds = Array.from(
    new Set(
      user.integrations
        .flatMap((integration) => [
          integration.instagramId,
          integration.pageId,
          integration.webhookAccountId,
        ])
        .filter((value): value is string => Boolean(value))
    )
  );

  try {
    const result = await client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const webhookFilters: Array<Record<string, unknown>> = [];
      if (automationIds.length > 0) {
        webhookFilters.push({ automationId: { in: automationIds } });
      }
      if (accountIds.length > 0) {
        webhookFilters.push({ igAccountId: { in: accountIds } });
      }

      const deletedWebhookEvents = webhookFilters.length
        ? await tx.webhookEvent.deleteMany({ where: { OR: webhookFilters as any } })
        : { count: 0 };

      const deletedDms = automationIds.length
        ? await tx.dms.deleteMany({ where: { automationId: { in: automationIds } } })
        : { count: 0 };

      // Automation children such as triggers, posts, keywords, leads,
      // automation events and message logs are removed through Prisma cascades.
      const deletedAutomations = await tx.automation.deleteMany({
        where: { userId: user.id, integrationId },
      });

      await tx.metaOAuthSelection.deleteMany({
        where: { userId: user.id },
      });

      // InstagramAccountSnapshot rows cascade when their integration is deleted.
      const deletedIntegrations = await tx.integrations.deleteMany({
        where: { userId: user.id, name: "INSTAGRAM", id: integrationId },
      });

      const currentSubscription = await tx.subscription.findUnique({ where: { userId: user.id }, select: { plan: true } });
      await syncInstagramAccountEntitlements(tx, user.id, currentSubscription?.plan ?? "FREE");
      return {
        deletedIntegrations: deletedIntegrations.count,
        deletedAutomations: deletedAutomations.count,
        deletedWebhookEvents: deletedWebhookEvents.count,
        deletedDms: deletedDms.count,
      };
    });

    console.log("[instagram-remove] workspace Instagram data permanently removed", {
      workspaceClerkId,
      ...result,
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath(`/dashboard/${workspaceClerkId}`);
    revalidatePath(`/dashboard/${workspaceClerkId}/account`);
    revalidatePath(`/dashboard/${workspaceClerkId}/integrations`);
    revalidatePath(`/dashboard/${workspaceClerkId}/automation`);
    revalidatePath(`/dashboard/${workspaceClerkId}/automation`, "layout");
    revalidatePath("/onboarding/connect");

    return {
      status: 200,
      data: "Instagram account removed",
      removed: result,
    } as const;
  } catch (error) {
    console.error("[instagram-remove] permanent removal failed", {
      workspaceClerkId,
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 500,
      data: "Instagram account could not be removed. Please try again.",
    } as const;
  }
}
