import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const INSTAGRAM_REFRESH_URL = "https://graph.instagram.com/refresh_access_token";

function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  // Schedule headers are client-controlled, not proof of a Vercel cron call.
  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

type RefreshResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: { message?: string; type?: string; code?: number };
};

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const now = new Date();
  const refreshBefore = new Date(now.getTime() + REFRESH_WINDOW_MS);

  try {
    const integrations = await client.integrations.findMany({
      where: {
        name: "INSTAGRAM",
        igAccountSource: "instagram_login",
        status: "CONNECTED",
        reconnectRequired: false,
        expiresAt: {
          gt: now,
          lte: refreshBefore,
        },
      },
      select: {
        id: true,
        token: true,
        expiresAt: true,
      },
      take: 200,
    });

    let refreshed = 0;
    let failed = 0;

    for (const integration of integrations) {
      const token = integration.token.trim();
      if (!token) continue;

      try {
        const url = new URL(INSTAGRAM_REFRESH_URL);
        url.searchParams.set("grant_type", "ig_refresh_token");
        url.searchParams.set("access_token", token);

        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as RefreshResponse;

        if (!response.ok || !payload.access_token || !payload.expires_in) {
          failed += 1;
          if (payload.error?.code === 190) {
            await client.integrations.update({
              where: { id: integration.id },
              data: {
                reconnectRequired: true,
                oauthLastError: "instagram_token_invalidated",
                oauthLastErrorAt: new Date(),
                oauthLastErrorSource: "token_refresh",
                lastAdminNote: "instagram_token_invalidated",
                lastAdminActionAt: new Date(),
              },
            }).catch(() => undefined);
            await client.automation.updateMany({
              where: { integrationId: integration.id, active: true, archivedAt: null },
              data: {
                active: false,
                needsReview: true,
                reviewReason: "Instagram authorization expired. Reconnect Instagram before reactivating this automation.",
              },
            }).catch(() => undefined);
          }
          console.warn("[cron] Instagram token refresh rejected", {
            integrationId: integration.id,
            status: response.status,
            code: payload.error?.code,
            type: payload.error?.type,
          });
          continue;
        }

        const expiresAt = new Date(Date.now() + payload.expires_in * 1000);
        await client.integrations.update({
          where: { id: integration.id },
          data: {
            token: payload.access_token,
            expiresAt,
            oauthLastError: null,
            oauthLastErrorAt: null,
            oauthLastErrorSource: null,
          },
        });
        refreshed += 1;
      } catch (error) {
        failed += 1;
        console.warn("[cron] Instagram token refresh failed", {
          integrationId: integration.id,
          message: error instanceof Error ? error.message : "Unknown refresh error",
        });
      }
    }

    console.info("[cron] Instagram token refresh completed", {
      eligible: integrations.length,
      refreshed,
      failed,
    });

    return NextResponse.json(
      {
        ok: failed === 0,
        eligible: integrations.length,
        refreshed,
        failed,
        checkedAt: new Date().toISOString(),
      },
      { status: failed === 0 ? 200 : 207, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[cron] Instagram token refresh job failed", {
      message: error instanceof Error ? error.message : "Unknown token refresh error",
    });
    return NextResponse.json(
      { ok: false, error: "Instagram token refresh job failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
