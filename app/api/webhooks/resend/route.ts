import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { EMAIL_DELIVERY_STATUS } from "@prisma/client";
import { client } from "@/lib/prisma";
import { getEmailConfiguration } from "@/lib/email/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusForEvent = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
  "email.suppressed": "SUPPRESSED",
  "email.failed": "FAILED",
} as const;

// Provider callbacks can arrive out of order. An older sent/delivered event
// must not erase stronger delivery evidence or a terminal suppression.
const previousStatuses: Partial<Record<EMAIL_DELIVERY_STATUS, EMAIL_DELIVERY_STATUS[]>> = {
  SENT: ["PENDING", "SENT"],
  DELIVERED: ["PENDING", "SENT", "FAILED", "DELIVERED"],
  OPENED: ["PENDING", "SENT", "FAILED", "DELIVERED", "OPENED"],
  CLICKED: ["PENDING", "SENT", "FAILED", "DELIVERED", "OPENED", "CLICKED"],
  FAILED: ["PENDING", "SENT", "FAILED"],
};

export async function POST(request: Request) {
  const configuration = getEmailConfiguration();
  if (!configuration.apiKey || !configuration.webhookSecret) {
    return NextResponse.json({ error: "email_webhook_not_configured" }, { status: 503 });
  }

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  try {
    const event = new Resend(configuration.apiKey).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: configuration.webhookSecret,
    });
    const status = statusForEvent[event.type as keyof typeof statusForEvent];
    if (!status || !("email_id" in event.data)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const occurredAt = new Date(event.created_at);
    const terminal = ["BOUNCED", "COMPLAINED", "SUPPRESSED"] as const;
    const suppress = terminal.some(value => value === status);
    // Signed recipient events can arrive before the send response persists its ID.
    // Preserve opt-out state on the lead independently of delivery-event ordering.
    if (suppress && "to" in event.data && Array.isArray(event.data.to)) {
      const recipients = event.data.to.filter((value): value is string => typeof value === "string").map(value => value.trim().toLowerCase());
      if (recipients.length) await client.marketingLead.updateMany({ where: { email: { in: recipients }, suppressedAt: null }, data: { suppressedAt: occurredAt } });
    }
    // Keep individual milestones even when a stronger event arrived first.
    const milestone = status === "DELIVERED" ? "deliveredAt" : status === "OPENED" ? "openedAt" : status === "CLICKED" ? "clickedAt" : null;
    if (milestone) await client.emailDelivery.updateMany({
      where: { providerMessageId: event.data.email_id, [milestone]: null },
      data: { [milestone]: occurredAt },
    });
    await client.emailDelivery.updateMany({
      where: { providerMessageId: event.data.email_id, ...(!suppress ? { status: { in: previousStatuses[status] } } : {}) },
      data: {
        status,
        ...(["BOUNCED", "COMPLAINED", "SUPPRESSED", "FAILED"].includes(status)
          ? { errorCode: event.type, errorMessage: `Resend reported ${event.type}.` }
          : {}),
      },
    });
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
}
