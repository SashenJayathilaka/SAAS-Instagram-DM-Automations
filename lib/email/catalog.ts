import { dashboardEntryPath } from "@/lib/dashboard";

export const EMAIL_TEMPLATE_IDS = [
  "welcome",
  "connect_instagram",
  "instagram_connected",
  "automation_activated",
  "automation_needs_attention",
  "instagram_reconnect",
  "usage_80_percent",
  "usage_limit_reached",
  "trial_ending",
  "plan_activated",
  "payment_failed",
  "subscription_canceled",
  "referral_qualified",
  "referral_reward",
  "support_received",
  "support_reply",
  "weekly_report",
  "inactive_workspace",
] as const;

export type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number];
export type EmailPreferenceKey = "transactional" | "productTips" | "weeklyReports" | "promotions";
export type EmailCategory = "onboarding" | "automation" | "account" | "usage" | "billing" | "referral" | "support" | "report";

export type EmailMetric = { label: string; value: string; detail?: string };

export type EmailTemplateContent = {
  subject: string;
  preview: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  bullets?: string[];
  callout?: { title: string; text: string; tone?: "neutral" | "success" | "warning" | "danger" };
  metrics?: EmailMetric[];
  cta?: { label: string; url: string };
  secondaryCta?: { label: string; url: string };
  closing?: string;
};

export type EmailTemplateContext = {
  firstName?: string | null;
  instagramUsername?: string | null;
  automationName?: string | null;
  planName?: string | null;
  periodEnd?: string | null;
  trialEndsAt?: string | null;
  actionUrl?: string | null;
  secondaryUrl?: string | null;
  usagePercent?: number | null;
  actionsUsed?: number | null;
  actionLimit?: number | null;
  aiRepliesUsed?: number | null;
  aiReplyLimit?: number | null;
  failureReason?: string | null;
  referredName?: string | null;
  rewardLabel?: string | null;
  supportMessage?: string | null;
  supportReply?: string | null;
  weeklyLeads?: number | null;
  weeklyReplies?: number | null;
  weeklyDms?: number | null;
  weeklyComments?: number | null;
};

export type EmailTemplateDefinition = {
  id: EmailTemplateId;
  label: string;
  description: string;
  category: EmailCategory;
  preference: EmailPreferenceKey;
  aiPersonalization: boolean;
  build: (context: EmailTemplateContext, appUrl: string) => EmailTemplateContent;
};

function firstName(context: EmailTemplateContext) {
  const value = context.firstName?.trim();
  return value ? `, ${value}` : "";
}

function username(context: EmailTemplateContext) {
  const value = context.instagramUsername?.trim().replace(/^@/, "");
  return value ? `@${value}` : "your Instagram account";
}

function automation(context: EmailTemplateContext) {
  return context.automationName?.trim() || "Your automation";
}

function plan(context: EmailTemplateContext) {
  return context.planName?.trim() || "AP3K";
}

function formatNumber(value: number | null | undefined, fallback = "—") {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value)).toLocaleString("en-US")
    : fallback;
}

function dashboard(appUrl: string) {
  return `${appUrl}/dashboard`;
}

function workspace(appUrl: string, destination: string) {
  return `${appUrl}${dashboardEntryPath(destination)}`;
}

export const EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplateDefinition> = {
  welcome: {
    id: "welcome",
    label: "Welcome to AP3K",
    description: "Sent once when a workspace is created.",
    category: "onboarding",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Turn your first Instagram comment into a customer",
      preview: "Your AP3K workspace is ready. Connect Instagram and launch your first automation.",
      eyebrow: "WELCOME TO AP3K",
      headline: `Your workspace is ready${firstName(context)}.`,
      paragraphs: [
        "AP3K turns Instagram comments into timely replies, direct messages, and trackable leads—without complicated flows or code.",
        "You can launch your first comment-to-DM automation in a few minutes.",
      ],
      bullets: ["Connect one Instagram Business or Creator account", "Choose a post and comment trigger", "Write the public reply and promised DM", "Test the complete flow before activating"],
      cta: { label: "Connect Instagram", url: context.actionUrl || `${appUrl}/onboarding` },
      secondaryCta: { label: "Open AP3K", url: dashboard(appUrl) },
      closing: "Turn attention into action.",
    }),
  },
  connect_instagram: {
    id: "connect_instagram",
    label: "Connect Instagram reminder",
    description: "A useful onboarding reminder when Instagram is not connected.",
    category: "onboarding",
    preference: "productTips",
    aiPersonalization: true,
    build: (context, appUrl) => ({
      subject: "Connect Instagram to start automating",
      preview: "AP3K needs an Instagram professional account before it can reply or send DMs.",
      eyebrow: "ONE STEP LEFT",
      headline: `Connect Instagram${firstName(context)}.`,
      paragraphs: ["Your workspace is ready, but AP3K cannot run automations until an Instagram Business or Creator account is connected through Meta's official authorization flow."],
      bullets: ["AP3K never asks for your Instagram password", "You approve permissions directly with Meta", "You can disconnect the account from AP3K Settings"],
      cta: { label: "Connect Instagram", url: context.actionUrl || `${appUrl}/onboarding` },
      closing: "Once connected, we will help you build and test the first automation.",
    }),
  },
  instagram_connected: {
    id: "instagram_connected",
    label: "Instagram connected",
    description: "Confirms a successful Instagram connection or reconnection.",
    category: "account",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `${username(context)} is connected to AP3K`,
      preview: "The account is connected. Build and test an automation before going live.",
      eyebrow: "INSTAGRAM CONNECTED",
      headline: `${username(context)} is ready.`,
      paragraphs: ["AP3K can now use the permissions you approved to monitor eligible comments and send the replies and DMs you configure."],
      callout: { title: "Connection confirmed", text: "Build an automation, run the test, then activate it when every message and link looks right.", tone: "success" },
      cta: { label: "Create automation", url: context.actionUrl || workspace(appUrl, "/automation/new") },
      secondaryCta: { label: "Manage connection", url: context.secondaryUrl || workspace(appUrl, "/integrations") },
    }),
  },
  automation_activated: {
    id: "automation_activated",
    label: "Automation activated",
    description: "Confirms that an automation is live.",
    category: "automation",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `${automation(context)} is now live`,
      preview: "AP3K is monitoring the selected Instagram trigger.",
      eyebrow: "AUTOMATION LIVE",
      headline: `${automation(context)} is active.`,
      paragraphs: [`AP3K is now monitoring the configured trigger for ${username(context)}. Replies and DMs will follow the exact steps saved in your automation.`],
      callout: { title: "Keep an eye on the first runs", text: "Open Activity after the first real comment to confirm the public reply, DM, link button, and follow gate behaved as expected.", tone: "success" },
      cta: { label: "View automation", url: context.actionUrl || workspace(appUrl, "/automation") },
    }),
  },
  automation_needs_attention: {
    id: "automation_needs_attention",
    label: "Automation needs attention",
    description: "Explains a paused or failing automation without exposing technical secrets.",
    category: "automation",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `Action needed: ${automation(context)}`,
      preview: "AP3K paused or could not complete part of this automation.",
      eyebrow: "ACTION NEEDED",
      headline: `${automation(context)} needs your attention.`,
      paragraphs: ["AP3K detected a problem that may prevent replies or DMs from being delivered."],
      callout: { title: "What AP3K found", text: context.failureReason?.trim() || "The automation could not complete a recent action. Open its Activity panel for the latest safe diagnostic.", tone: "warning" },
      cta: { label: "Review automation", url: context.actionUrl || workspace(appUrl, "/automation") },
      closing: "Do not reactivate the automation until its test completes successfully.",
    }),
  },
  instagram_reconnect: {
    id: "instagram_reconnect",
    label: "Reconnect Instagram",
    description: "Urgent account-health email when Meta authorization expires or is removed.",
    category: "account",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `Reconnect ${username(context)} to keep automations running`,
      preview: "Meta authorization needs to be refreshed before AP3K can continue sending replies.",
      eyebrow: "CONNECTION REQUIRED",
      headline: `Reconnect ${username(context)}.`,
      paragraphs: ["AP3K no longer has the valid Meta authorization required to monitor comments or send messages. Affected automations remain protected until the connection is restored."],
      bullets: ["Sign in to the correct Facebook and Instagram accounts", "Approve the requested Instagram permissions", "Return to AP3K and run an automation test"],
      callout: { title: "Your password stays with Meta", text: "Reconnect only through the official Meta window opened from AP3K. Never send passwords or access tokens by email.", tone: "warning" },
      cta: { label: "Reconnect Instagram", url: context.actionUrl || workspace(appUrl, "/integrations") },
    }),
  },
  usage_80_percent: {
    id: "usage_80_percent",
    label: "Usage at 80%",
    description: "Warns before monthly automated actions are exhausted.",
    category: "usage",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `You have used ${Math.max(0, Math.round(context.usagePercent ?? 80))}% of your monthly actions`,
      preview: "Review usage now to avoid interrupted automations.",
      eyebrow: "USAGE UPDATE",
      headline: "Your monthly action allowance is running low.",
      paragraphs: ["A public comment reply and a DM count as separate automated actions. Review your remaining allowance before a high-traffic post goes live."],
      metrics: [
        { label: "Actions used", value: formatNumber(context.actionsUsed), detail: `of ${formatNumber(context.actionLimit)}` },
        { label: "Usage", value: `${Math.max(0, Math.min(100, Math.round(context.usagePercent ?? 80)))}%` },
      ],
      cta: { label: "Review usage", url: context.actionUrl || workspace(appUrl, "/billing") },
    }),
  },
  usage_limit_reached: {
    id: "usage_limit_reached",
    label: "Usage limit reached",
    description: "Explains why automation sends stopped and how to continue.",
    category: "usage",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Your AP3K monthly action limit has been reached",
      preview: "Automated sends are paused until usage resets or your plan changes.",
      eyebrow: "LIMIT REACHED",
      headline: "Automated sends are paused.",
      paragraphs: [`You have used ${formatNumber(context.actionsUsed)} of ${formatNumber(context.actionLimit)} monthly automated actions. AP3K will not attempt additional billable sends until the allowance resets or the plan is upgraded.`],
      callout: { title: "Nothing is lost", text: "Your automations and configuration remain saved. They can resume after the monthly reset or a successful plan change.", tone: "danger" },
      cta: { label: "View plans and usage", url: context.actionUrl || workspace(appUrl, "/billing") },
    }),
  },
  trial_ending: {
    id: "trial_ending",
    label: "Trial ending",
    description: "Sent before a welcome trial or promotional allowance expires.",
    category: "billing",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Your AP3K trial allowance is ending soon",
      preview: "Review your plan before the trial ends.",
      eyebrow: "TRIAL UPDATE",
      headline: "Keep your automations moving.",
      paragraphs: [`Your AP3K trial allowance ends${context.trialEndsAt ? ` on ${context.trialEndsAt}` : " soon"}. After it ends, your workspace will use the limits included with its current plan.`],
      callout: { title: "No surprise charge", text: "AP3K does not charge a card unless you explicitly complete Stripe checkout for a paid subscription.", tone: "neutral" },
      cta: { label: "Compare plans", url: context.actionUrl || `${appUrl}/pricing` },
    }),
  },
  plan_activated: {
    id: "plan_activated",
    label: "Paid plan activated",
    description: "Confirms a real Stripe subscription after checkout.",
    category: "billing",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `Your AP3K ${plan(context)} plan is active`,
      preview: "The subscription is active and the new limits are available.",
      eyebrow: "PLAN ACTIVE",
      headline: `Welcome to AP3K ${plan(context)}.`,
      paragraphs: ["Stripe confirmed the subscription and AP3K applied the plan limits to your workspace."],
      callout: { title: "Receipts and invoices", text: "Stripe sends the official payment receipt. You can manage payment details, invoices, and cancellation from AP3K Billing.", tone: "success" },
      cta: { label: "Open billing", url: context.actionUrl || workspace(appUrl, "/billing") },
    }),
  },
  payment_failed: {
    id: "payment_failed",
    label: "Payment failed",
    description: "Notifies a subscriber when Stripe cannot collect a renewal payment.",
    category: "billing",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Update your payment method to keep AP3K active",
      preview: "Stripe could not collect the latest AP3K subscription payment.",
      eyebrow: "PAYMENT ACTION NEEDED",
      headline: "Your latest payment did not complete.",
      paragraphs: ["Stripe could not collect the latest subscription payment. Update the payment method in the secure billing portal to prevent service interruption."],
      callout: { title: "Protect your payment details", text: "AP3K support will never ask you to email card numbers, passwords, or one-time codes.", tone: "danger" },
      cta: { label: "Manage billing securely", url: context.actionUrl || workspace(appUrl, "/billing") },
    }),
  },
  subscription_canceled: {
    id: "subscription_canceled",
    label: "Subscription canceled",
    description: "Confirms cancellation and the end of paid access.",
    category: "billing",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: `Your AP3K ${plan(context)} subscription was canceled`,
      preview: "Your workspace and automations remain saved.",
      eyebrow: "SUBSCRIPTION UPDATE",
      headline: "Your cancellation is confirmed.",
      paragraphs: [`Your AP3K ${plan(context)} subscription was canceled${context.periodEnd ? ` and paid access remains available until ${context.periodEnd}` : ""}. Your workspace data and automation drafts remain saved subject to AP3K's retention policy.`],
      cta: { label: "View billing", url: context.actionUrl || workspace(appUrl, "/billing") },
      closing: "You can choose a new plan from Billing whenever you are ready.",
    }),
  },
  referral_qualified: {
    id: "referral_qualified",
    label: "Referral qualified",
    description: "Confirms that a referred user completed the qualifying step.",
    category: "referral",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Your AP3K referral qualified",
      preview: "A referred customer completed the qualifying AP3K purchase.",
      eyebrow: "REFERRAL QUALIFIED",
      headline: "Your referral converted.",
      paragraphs: [`${context.referredName?.trim() || "A referred AP3K user"} completed a qualifying paid purchase. The reward is now being processed under the referral-program rules.`],
      cta: { label: "View referrals", url: context.actionUrl || workspace(appUrl, "/referrals") },
    }),
  },
  referral_reward: {
    id: "referral_reward",
    label: "Referral reward applied",
    description: "Confirms that a referral reward was successfully applied.",
    category: "referral",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Your AP3K referral reward is ready",
      preview: "The referral reward was applied successfully.",
      eyebrow: "REWARD APPLIED",
      headline: "You earned an AP3K reward.",
      paragraphs: [`Your referral reward${context.rewardLabel ? `—${context.rewardLabel}—` : ""} was applied successfully. Open the referral dashboard for the complete status.`],
      callout: { title: "Thank you for sharing AP3K", text: "Qualified rewards are tied to real paid conversions and may be reversed if the qualifying payment is refunded or disputed.", tone: "success" },
      cta: { label: "View reward", url: context.actionUrl || workspace(appUrl, "/referrals") },
    }),
  },
  support_received: {
    id: "support_received",
    label: "Support request received",
    description: "Immediate confirmation that AP3K received a support request.",
    category: "support",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "We received your AP3K support request",
      preview: "Your request is in the AP3K support queue.",
      eyebrow: "SUPPORT REQUEST RECEIVED",
      headline: `We have your message${firstName(context)}.`,
      paragraphs: ["The AP3K support assistant has captured your request. Account-specific changes and sensitive billing actions are reviewed before anything is changed."],
      callout: context.supportMessage ? { title: "Your request", text: context.supportMessage.slice(0, 800), tone: "neutral" } : undefined,
      cta: { label: "Open Help Center", url: context.actionUrl || `${appUrl}/help` },
      closing: "Never email passwords, API keys, access tokens, card details, or one-time codes.",
    }),
  },
  support_reply: {
    id: "support_reply",
    label: "Support assistant reply",
    description: "A structured email reply generated from AP3K's verified support knowledge.",
    category: "support",
    preference: "transactional",
    aiPersonalization: false,
    build: (context, appUrl) => ({
      subject: "Your AP3K support answer",
      preview: "AP3K Support has replied to your question.",
      eyebrow: "AP3K SUPPORT",
      headline: `Here is your answer${firstName(context)}.`,
      paragraphs: [context.supportReply?.trim() || "Open the AP3K Help Center for product guides covering Instagram connections, automations, AI replies, billing, and troubleshooting."],
      cta: { label: "Open Help Center", url: context.actionUrl || `${appUrl}/help` },
      secondaryCta: { label: "Open dashboard", url: context.secondaryUrl || dashboard(appUrl) },
      closing: "AI-generated support can make mistakes. Verify account-specific or billing changes in your dashboard.",
    }),
  },
  weekly_report: {
    id: "weekly_report",
    label: "Weekly performance report",
    description: "Optional weekly results summary with direct dashboard links.",
    category: "report",
    preference: "weeklyReports",
    aiPersonalization: true,
    build: (context, appUrl) => ({
      subject: `Your AP3K week: ${formatNumber(context.weeklyLeads, "0")} leads captured`,
      preview: "See the replies, DMs, and leads generated by your Instagram automations.",
      eyebrow: "YOUR WEEK ON AP3K",
      headline: `Here is what AP3K moved forward${firstName(context)}.`,
      paragraphs: ["A clear summary of the Instagram activity handled by your active automations during the last seven days."],
      metrics: [
        { label: "Leads", value: formatNumber(context.weeklyLeads, "0") },
        { label: "Replies", value: formatNumber(context.weeklyReplies, "0") },
        { label: "DMs sent", value: formatNumber(context.weeklyDms, "0") },
        { label: "Comments", value: formatNumber(context.weeklyComments, "0") },
      ],
      cta: { label: "See full performance", url: context.actionUrl || dashboard(appUrl) },
    }),
  },
  inactive_workspace: {
    id: "inactive_workspace",
    label: "Workspace re-engagement",
    description: "Optional, low-frequency help for a workspace that has not launched an automation.",
    category: "onboarding",
    preference: "productTips",
    aiPersonalization: true,
    build: (context, appUrl) => ({
      subject: "Your first AP3K automation is still one test away",
      preview: "Finish the setup and turn the next Instagram comment into a DM.",
      eyebrow: "FINISH YOUR SETUP",
      headline: `Do not leave Instagram demand unanswered${firstName(context)}.`,
      paragraphs: ["Your AP3K workspace is ready, but no active automation is handling comments yet. Start with one post, one trigger, and one promised link."],
      bullets: ["Choose Any Comment or a specific keyword", "Preview every message on the phone mockup", "Run a real test before activating"],
      cta: { label: "Finish an automation", url: context.actionUrl || workspace(appUrl, "/automation/new") },
    }),
  },
};

export const EMAIL_TEMPLATE_LIST = EMAIL_TEMPLATE_IDS.map((id) => EMAIL_TEMPLATES[id]);

export function isEmailTemplateId(value: unknown): value is EmailTemplateId {
  return typeof value === "string" && EMAIL_TEMPLATE_IDS.includes(value as EmailTemplateId);
}

export function buildEmailTemplate(id: EmailTemplateId, context: EmailTemplateContext, appUrl: string) {
  return EMAIL_TEMPLATES[id].build(context, appUrl.replace(/\/+$/, ""));
}
