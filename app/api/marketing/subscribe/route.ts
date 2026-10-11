import { randomBytes } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";
import { CONSENT_VERSION, LAUNCH_KIT_PATH } from "@/lib/marketing/content";
import { hashToken } from "@/lib/marketing/tokens";
import { deliverMarketingEmail, marketingReady, queueMarketingEmail, takeMarketingSlot } from "@/lib/marketing/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), audience: z.enum(["creator", "ecommerce"]), consent: z.literal(true), website: z.string().max(200).optional(), source: z.enum(["launch-kit", "templates", "resources", "guide"]) });
const response = () => NextResponse.json({ ok: true, message: "If this address is eligible, a confirmation email is on its way. Check your inbox and spam folder. You can read the kit now.", resource: LAUNCH_KIT_PATH });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Please submit the form from AP3K." }, { status: 403 });
  if (!marketingReady()) return NextResponse.json({ error: "Email signup is temporarily unavailable. You can still read the full launch kit below." }, { status: 503 });
  if (Number(request.headers.get("content-length")) > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  try {
    const body = await request.text();
    if (body.length > 4096) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    let data: unknown;
    try { data = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid form." }, { status: 400 }); }
    const parsed = schema.safeParse(data);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and confirm that you want the email series." }, { status: 400 });
    if (parsed.data.website) return response();
    const { email, audience, source } = parsed.data;
    // Trust Vercel's overwritten ingress header, not a caller-supplied forwarded chain.
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (!await takeMarketingSlot("signup-ip", ip, 6, 3600000) || !await takeMarketingSlot("signup-address", email, 2)) return response();
    const suppressed = await client.emailDelivery.findFirst({ where: { recipient: email, status: { in: ["BOUNCED", "COMPLAINED", "SUPPRESSED"] } }, select: { id: true } });
    if (suppressed) return response();
    const existing = await client.marketingLead.findUnique({ where: { email } });
    // Preserve opt-outs. Re-enrollment requires explicit support review, never a form overwrite.
    if (existing && (existing.confirmedAt || existing.unsubscribedAt || existing.suppressedAt || existing.createdAt.getTime() > Date.now() - 60_000)) return response();
    const token = randomBytes(32).toString("hex");
    const values = { audience, source, consentVersion: CONSENT_VERSION, confirmationHash: hashToken(token), expiresAt: new Date(Date.now() + 48 * 3600000) };
    let lead;
    if (existing) {
      const updated = await client.marketingLead.updateMany({ where: { id: existing.id, updatedAt: existing.updatedAt, confirmedAt: null, unsubscribedAt: null, suppressedAt: null }, data: values });
      if (!updated.count) return response();
      lead = await client.marketingLead.findUniqueOrThrow({ where: { id: existing.id } });
    } else {
      try { lead = await client.marketingLead.create({ data: { email, ...values } }); }
      catch (error) { if ((error as { code?: string }).code === "P2002") return response(); throw error; }
    }
    const queued = await queueMarketingEmail(lead, "confirm", token);
    await deliverMarketingEmail(queued.id);
    return response();
  } catch {
    return NextResponse.json({ error: "Email signup is temporarily unavailable. Please try again later or read the kit now." }, { status: 503 });
  }
}
