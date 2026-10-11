import { NextResponse } from "next/server";
import { requireOwnerAdmin } from "@/lib/admin";
import { getApplicationUrl } from "@/lib/app-url";
import { dashboardEntryPath } from "@/lib/dashboard";
import { isEmailTemplateId } from "@/lib/email/catalog";
import { renderAp3kEmail } from "@/lib/email/render";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireOwnerAdmin();
  const id = new URL(request.url).searchParams.get("template");
  const templateId = isEmailTemplateId(id) ? id : "welcome";
  const appUrl = getApplicationUrl();
  const rendered = await renderAp3kEmail({
    templateId,
    appUrl,
    preferenceUrl: `${appUrl}${dashboardEntryPath("/settings#email-preferences")}`,
    recipientHint: "customer@example.com",
    context: {
      firstName: "Alex",
      instagramUsername: "yourbrand",
      automationName: "New launch comments",
      planName: "Pro",
      periodEnd: "October 11, 2026",
      trialEndsAt: "September 14, 2026",
      usagePercent: 80,
      actionsUsed: 400,
      actionLimit: 500,
      aiRepliesUsed: 125,
      aiReplyLimit: 500,
      failureReason: "Instagram authorization needs to be refreshed before this automation can continue.",
      referredName: "A new customer",
      rewardLabel: "one month of Pro",
      supportMessage: "How do I reconnect Instagram without losing my automations?",
      supportReply: "Open Settings, choose Instagram connection, and select Reconnect. Approve the requested permissions in Meta, then run one automation test. Your saved automations remain in AP3K during reconnection.",
      weeklyLeads: 42,
      weeklyReplies: 186,
      weeklyDms: 124,
      weeklyComments: 211,
    },
  });

  return new NextResponse(rendered.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
