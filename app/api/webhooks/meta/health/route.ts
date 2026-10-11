import { NextResponse } from "next/server";

const WEBHOOK_ROUTE_VERSION = "2026-05-tenant-diagnostics-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/webhooks/meta",
    routeVersion: WEBHOOK_ROUTE_VERSION,
    timestamp: new Date().toISOString(),
  });
}
