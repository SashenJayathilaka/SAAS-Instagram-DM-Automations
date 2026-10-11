import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/prisma";
import { isHumanLinkRequest, recordAutomationClick, trackableDestination } from "@/lib/automation-tracking";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
async function redirect(request: NextRequest, token: string, count: boolean) {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(token)) return new NextResponse("Link not found", { status: 404, headers });
  const link = await client.automationTrackedLink.findUnique({ where: { id: token }, select: { automationId: true, recipientIgId: true, destination: true } });
  if (!link || !trackableDestination(link.destination)) return new NextResponse("Link not found", { status: 404, headers });
  if (count && isHumanLinkRequest(request.headers)) {
    // Vercel supplies this header at the edge. Never accept a query-string country.
    const country = process.env.VERCEL ? request.headers.get("x-vercel-ip-country") : null;
    try { await recordAutomationClick({ id: token, automationId: link.automationId, recipientIgId: link.recipientIgId }, country); }
    catch { console.warn("[automation-analytics] click persistence unavailable"); }
  }
  return NextResponse.redirect(link.destination, { status: 302, headers });
}
export async function GET(request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return redirect(request, params.token, true);
}
export async function HEAD(request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  return redirect(request, params.token, false);
}
