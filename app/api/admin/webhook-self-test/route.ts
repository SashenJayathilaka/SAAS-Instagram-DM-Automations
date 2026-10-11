import { requireOwnerAdmin } from "@/lib/admin";
import { client } from "@/lib/prisma";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await requireOwnerAdmin();

  const formData = await req.formData().catch(() => new FormData());
  const customMediaId = formData.get("mediaId") as string | null;
  const customEntryId = formData.get("entryId") as string | null;
  const customCommentId = formData.get("commentId") as string | null;
  const customText = formData.get("commentText") as string | null;
  const customCommenterId = formData.get("commenterId") as string | null;
  const customCommenterUsername = formData.get("commenterUsername") as string | null;

  const appSecret = process.env.META_APP_SECRET;
  const hostUrl = process.env.NEXT_PUBLIC_HOST_URL ?? "https://ap3k.com";
  const webhookUrl = `${hostUrl}/api/webhooks/meta`;

  if (!appSecret) {
    return NextResponse.json(
      { ok: false, error: "META_APP_SECRET not configured — cannot sign self-test payload" },
      { status: 500 }
    );
  }

  // Try to find a real connected account to make the match test meaningful
  const lastIntegration = await client.integrations.findFirst({
    where: { instagramId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  const igAccountId = customEntryId || lastIntegration?.instagramId || "1234567890";

  const payload = JSON.stringify({
    source: "INTERNAL_SELF_TEST",
    smokeTest: true,
    dryRun: true,
    object: "instagram",
    entry: [
      {
        id: igAccountId,
        changes: [
          {
            field: "comments",
            value: {
              id: customCommentId || "test_comment_internal",
              media: { id: customMediaId || "test_media_internal" },
              from: {
                id: customCommenterId || "fake_external_id",
                username: customCommenterUsername || "tester",
              },
              text: customText || "ai",
            },
          },
        ],
      },
    ],
  });

  const signature = `sha256=${createHmac("sha256", appSecret)
    .update(payload, "utf8")
    .digest("hex")}`;

  let responseStatus: number;
  let responseBody: unknown;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
        "User-Agent": "AP3K-webhook-smoke-test/1.0",
      },
      body: payload,
    });
    responseStatus = res.status;
    responseBody = await res.json().catch(() => null);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        webhookUrl,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: responseStatus === 200,
    webhookUrl,
    responseStatus,
    responseBody,
    sentAt: new Date().toISOString(),
    details: {
      igAccountId,
      mediaId: customMediaId || "test_media_internal",
      commentId: customCommentId || "test_comment_internal",
      text: customText || "ai",
      commenterId: customCommenterId || "fake_external_id",
      commenterUsername: customCommenterUsername || "tester",
    },
  });
}
