import { client } from "@/lib/prisma";
import { validConfirmation } from "@/lib/marketing/tokens";
import { deliverMarketingEmail, queueMarketingEmail } from "@/lib/marketing/delivery";
import { marketingResponse } from "@/lib/marketing/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function readLead(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "", token = params.get("token") || "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const lead = await client.marketingLead.findUnique({ where: { id } });
  return lead && !lead.unsubscribedAt && !lead.suppressedAt && validConfirmation(lead.confirmationHash, token, lead.expiresAt) ? lead : null;
}
export async function GET(request: Request) {
  const lead = await readLead(request);
  if (!lead) return marketingResponse("Link unavailable", "This confirmation link expired or is no longer valid. The launch kit is still free to read.", undefined, 400);
  if (lead.confirmedAt) return marketingResponse("You’re confirmed", "Your launch-kit request is already confirmed.");
  // Link scanners can visit GET without silently subscribing a recipient.
  const url = new URL(request.url);
  return marketingResponse("Confirm your email series", "Receive the launch kit and two lessons over the next week, including an invitation to try AP3K. Unsubscribe at any time.", { label: "Confirm my subscription", url: `${url.pathname}${url.search}` });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return marketingResponse("Request unavailable", "Open the link in your email again.", undefined, 403);
  const lead = await readLead(request);
  if (!lead) return marketingResponse("Link unavailable", "The link expired or this subscription is no longer eligible.", undefined, 400);
  await client.marketingLead.updateMany({ where: { id: lead.id, confirmedAt: null, unsubscribedAt: null, suppressedAt: null }, data: { confirmedAt: new Date() } });
  const current = await client.marketingLead.findUniqueOrThrow({ where: { id: lead.id } });
  const row = await queueMarketingEmail(current, "kit");
  await deliverMarketingEmail(row.id);
  return marketingResponse("You’re confirmed", "Your kit email is queued. You can open the complete kit below right now. Two more lessons will follow over the next week.");
}
