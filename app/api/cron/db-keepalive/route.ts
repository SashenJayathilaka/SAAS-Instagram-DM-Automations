import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  // Schedule headers are client-controlled, not proof of a Vercel cron call.
  return Boolean(cronSecret) && request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const startedAt = Date.now();

  try {
    await client.$queryRaw`SELECT 1`;

    const durationMs = Date.now() - startedAt;
    console.info("[cron] database keepalive succeeded", { durationMs });

    return NextResponse.json(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        durationMs,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("[cron] database keepalive failed", {
      message: error instanceof Error ? error.message : "Unknown database error",
    });

    return NextResponse.json(
      { ok: false, error: "Database keepalive failed" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
