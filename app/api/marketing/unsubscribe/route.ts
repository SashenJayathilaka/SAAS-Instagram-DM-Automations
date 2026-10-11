import { client } from "@/lib/prisma";
import { validUnsubscribeToken } from "@/lib/marketing/tokens";
import { marketingResponse } from "@/lib/marketing/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function leadId(request: Request) {
  const p = new URL(request.url).searchParams, id = p.get("id") || "";
  return /^[0-9a-f-]{36}$/.test(id) && validUnsubscribeToken(id, p.get("token") || "") ? id : null;
}
export async function GET(request: Request) {
  if (!leadId(request)) return marketingResponse("Link unavailable", "Contact support@ap3k.com if you need help unsubscribing.", undefined, 400);
  const url = new URL(request.url);
  return marketingResponse("Unsubscribe from the launch kit", "Stop the AP3K launch-kit email series. Your account and essential service emails are unaffected.", { label: "Unsubscribe", url: `${url.pathname}${url.search}` });
}
export async function POST(request: Request) {
  const id = leadId(request);
  if (!id) return marketingResponse("Link unavailable", "Contact support@ap3k.com if you need help unsubscribing.", undefined, 400);
  // RFC 8058 mailbox one-click requests do not have browser Origin headers.
  await client.marketingLead.updateMany({ where: { id, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
  return marketingResponse("You’re unsubscribed", "You will receive no further launch-kit lessons or offers. An email already in transit may still arrive.");
}
