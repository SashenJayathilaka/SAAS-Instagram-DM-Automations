import { client } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();

  try {
    await client.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { ok: true, service: "ap3k", database: "ready", durationMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "AP3K health check failed",
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    }));
    return NextResponse.json(
      { ok: false, service: "ap3k", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
