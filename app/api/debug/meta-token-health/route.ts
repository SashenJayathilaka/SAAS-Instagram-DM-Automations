import { requireOwnerAdmin } from "@/lib/admin";
import { getMetaTokenHealth } from "@/lib/meta-auth-diagnostics";
import { client } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  await requireOwnerAdmin();

  const integration = await client.integrations.findFirst({
    where: { pageId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      instagramId: true,
      instagramUsername: true,
      webhookAccountId: true,
      pageId: true,
      businessId: true,
      token: true,
      webhookSubscriptionSubscribed: true,
      webhookSubscriptionStatusCode: true,
      webhookSubscriptionError: true,
      webhookSubscriptionLastAttemptedAt: true,
      User: { select: { email: true } },
    },
  });

  const health = await getMetaTokenHealth({
    pageAccessToken: integration?.token,
    pageId: integration?.pageId,
    instagramBusinessAccountId: integration?.instagramId,
  });

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    integration: integration
      ? {
          id: integration.id,
          instagramId: integration.instagramId,
          pageId: integration.pageId,
          businessId: integration.businessId,
          webhookAccountId: integration.webhookAccountId,
          instagramUsername: integration.instagramUsername,
          userEmail: integration.User?.email,
          webhookSubscriptionSubscribed: integration.webhookSubscriptionSubscribed,
          webhookSubscriptionStatusCode: integration.webhookSubscriptionStatusCode,
          webhookSubscriptionError: integration.webhookSubscriptionError,
          webhookSubscriptionLastAttemptedAt: integration.webhookSubscriptionLastAttemptedAt,
        }
      : null,
    health,
  });
}
