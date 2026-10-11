import { NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/admin";
import { getMetaAdminDiagnostics } from "@/lib/meta-admin-diagnostics";

const WEBHOOK_ROUTE_VERSION = "2026-05-tenant-diagnostics-v2";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireOwnerAdmin();

  const hostUrl = process.env.NEXT_PUBLIC_HOST_URL ?? "https://ap3k.com";
  const diagnostics = await getMetaAdminDiagnostics();
  const lastRawPostAt = diagnostics.lastRawPost?.createdAt;
  const isMetaDelivering = lastRawPostAt
    ? new Date(lastRawPostAt).getTime() > Date.now() - 24 * 60 * 60 * 1000
    : false;

  return NextResponse.json({
    ok: true,
    route: "/api/webhooks/meta",
    webhookUrl: `${hostUrl}/api/webhooks/meta`,
    routeVersion: WEBHOOK_ROUTE_VERSION,
    hasMetaVerifyToken: Boolean(process.env.META_VERIFY_TOKEN),
    hasMetaAppSecret: Boolean(process.env.META_APP_SECRET),
    isMetaDelivering,
    lastRawPostAt,
    lastRealCommentAt: diagnostics.lastRealComment?.createdAt,
    lastSignatureFailedAt: diagnostics.lastSignatureFailed?.createdAt,
    lastRouteErrorAt: diagnostics.lastRouteError?.createdAt,
    lastIntegrationMatchFailedAt: diagnostics.lastIntegrationMatchFailed?.createdAt,
    lastAutomationMatchFailedAt: diagnostics.lastAutomationMatchFailed?.createdAt,
    timestamp: new Date().toISOString(),
  });
}
