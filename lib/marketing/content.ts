import { COMPANY } from "@/lib/company";

export const CONSENT_VERSION = "launch-kit-v1-2026-09-29";
export const CONSENT_TEXT = "Email me the AP3K launch kit and two follow-up lessons over the next week, including an invitation to try AP3K. I can unsubscribe at any time.";
export const LAUNCH_KIT_PATH = "/resources/instagram-comment-to-dm-launch-kit";
export type MarketingStage = "confirm" | "kit" | "test" | "launch";
export const MARKETING_STAGES: MarketingStage[] = ["confirm", "kit", "test", "launch"];
export const FOLLOW_UPS = [{ stage: "test", days: 2 }, { stage: "launch", days: 5 }] as const;

function campaignUrl(path: string, stage: string) {
  const url = new URL(path, "https://ap3k.com");
  url.searchParams.set("utm_source", "ap3k_email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", "comment_dm_launch_kit");
  url.searchParams.set("utm_content", stage);
  return url.toString();
}
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

export function marketingEmail(stage: MarketingStage, audience: string, confirmationUrl: string, unsubscribeUrl: string) {
  const ecommerce = audience === "ecommerce";
  const content = {
    confirm: {
      subject: "Confirm your AP3K launch-kit request",
      paragraphs: ["You requested the comment-to-DM launch kit and two follow-up lessons from AP3K.", "Confirm below to receive the series. This link expires in 48 hours. If you did not request it, ignore this email; you will not receive the lessons."],
      label: "Confirm my email", url: confirmationUrl,
    },
    kit: {
      subject: "Your comment-to-DM launch kit",
      paragraphs: ["Start with one post, one keyword, and one useful link.", ecommerce ? "Pick one product your audience already asks about. Use PRODUCT as the keyword and link directly to that product, with accurate pricing and availability." : "Pick one checklist or resource your audience already asks for. Use GUIDE as the keyword and send that exact resource.", "The kit contains matching caption, public-reply, and DM copy, plus a pre-launch test. Read it first, then replace the placeholders with your own offer."],
      label: "Open my launch kit", url: campaignUrl(LAUNCH_KIT_PATH, "kit"),
    },
    test: {
      subject: "Test your Instagram DM before promoting the post",
      paragraphs: ["Before sending people to your campaign, run a real test from a second Instagram account.", "Comment the exact keyword, check the inbox and message requests, then open the destination inside Instagram. Next, leave an unrelated comment and check that your keyword automation ignores it.", "If delivery fails, fix the connection, trigger, or permissions before changing your offer. A sent DM is not a product sale; check the destination separately."],
      label: "Use the launch checklist", url: campaignUrl("/resources/instagram-comment-automation-checklist", "test"),
    },
    launch: {
      subject: "Ready to launch one comment-to-DM campaign?",
      paragraphs: ["You have the copy and the test checklist. The next step is one working campaign.", "Create your AP3K account, connect an Instagram Business or Creator account, choose a post and keyword, and add the link you promised. Test it before you promote it.", "Start with the free plan and review the current limits on the pricing page before upgrading. This is the last email in your launch-kit series. If you get stuck, reply and tell us which step blocked you."],
      label: "Create my AP3K account", url: campaignUrl("/sign-up", "launch"),
    },
  }[stage];
  const footer = `${COMPANY.legalName} · ${COMPANY.mailingAddress}`;
  const reason = stage === "confirm" ? "You requested this confirmation on ap3k.com." : "You confirmed the AP3K launch-kit email series. This email includes AP3K product education and offers.";
  const text = [content.subject, ...content.paragraphs, `${content.label}: ${content.url}`, reason, `Unsubscribe: ${unsubscribeUrl}`, footer, "Questions? Reply to support@ap3k.com."].join("\n\n");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f8fafc;color:#0f172a;font:16px/1.6 Arial,sans-serif"><div style="max-width:560px;margin:24px auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:16px"><p style="font-weight:800;color:#6d28d9">AP3K</p><h1 style="font-size:24px;line-height:1.3">${escape(content.subject)}</h1>${content.paragraphs.map(p => `<p>${escape(p)}</p>`).join("")}<p style="margin:28px 0"><a href="${escape(content.url)}" style="display:inline-block;background:#6d28d9;color:white;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:700">${escape(content.label)}</a></p><hr style="border:0;border-top:1px solid #e2e8f0"><p style="font-size:13px;color:#475569">${escape(reason)} <a href="${escape(unsubscribeUrl)}">Unsubscribe</a>.</p><p style="font-size:13px;color:#475569">${escape(footer)}<br>Questions? Reply to support@ap3k.com.</p></div></body></html>`;
  return { subject: content.subject, html, text };
}
