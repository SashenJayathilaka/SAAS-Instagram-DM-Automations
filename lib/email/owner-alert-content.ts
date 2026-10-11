import type { EmailTemplateContent } from "./catalog";

export type OwnerAlertKind = "signup" | "payment" | "payment_failed" | "cancellation" | "refund" | "dispute" | "system" | "test";
export type OwnerAlert = {
  kind: OwnerAlertKind;
  key: string;
  userId?: string;
  email?: string;
  name?: string;
  plan?: string;
  amount?: number;
  currency?: string;
  detail?: string;
  occurredAt: string;
  reference?: string;
};
export const OWNER_ALERT_LABELS: Record<OwnerAlertKind, string> = {
  signup: "New registration", payment: "Payment received", payment_failed: "Payment needs attention",
  cancellation: "Subscription canceled", refund: "Payment refunded", dispute: "Payment disputed", system: "System health needs attention", test: "Owner alerts are ready",
};
export function ownerAlertConfiguration() {
  const recipient = (process.env.AP3K_OWNER_ALERT_EMAIL || process.env.ADMIN_EMAILS?.split(",")[0] || "boudofi@gmail.com").trim().toLowerCase();
  return {
    recipient,
    enabled: process.env.VERCEL_ENV === "production" && process.env.AP3K_OWNER_ALERTS_ENABLED !== "false" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient),
    retryConfigured: Boolean(process.env.CRON_SECRET?.trim()),
  };
}
export function ownerAlertContent(alert: OwnerAlert): EmailTemplateContent {
  const label = OWNER_ALERT_LABELS[alert.kind];
  let amount: string | undefined;
  if (typeof alert.amount === "number" && Number.isFinite(alert.amount) && /^[a-z]{3}$/i.test(alert.currency || "")) {
    const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: alert.currency!.toUpperCase() });
    const decimals = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    amount = formatter.format(alert.amount / 10 ** decimals);
  }
  const customer = [alert.name?.trim(), alert.email].filter(Boolean).join(" · ");
  const detail = alert.detail || ({
    signup: "A new user has created an AP3K account.",
    payment: "Stripe confirmed a paid subscription invoice.",
    payment_failed: "The subscription payment failed. Review the invoice and recovery status in Stripe.",
    cancellation: "This subscription has ended. Review the customer's account if follow-up is needed.",
    refund: "Stripe reported a refund. The amount below is the total refunded on this charge.",
    dispute: "A customer disputed a payment. Review the evidence deadline in Stripe promptly.",
    system: "AP3K detected an operational health condition that needs review.",
    test: "Your owner inbox is ready for important AP3K updates. This is a test; no customer registration or payment was created.",
  } satisfies Record<OwnerAlertKind, string>)[alert.kind];
  return {
    subject: `[AP3K] ${label}${amount ? ` — ${amount}` : ""}`,
    preview: customer ? `${customer}. ${detail}` : detail,
    eyebrow: "AP3K · Owner update", headline: label,
    paragraphs: [detail, ...(customer ? [customer] : [])],
    metrics: [
      ...(amount ? [{ label: alert.kind === "payment_failed" ? "Amount due" : alert.kind === "refund" ? "Total refunded" : "Amount", value: amount }] : []),
      ...(alert.plan ? [{ label: "Plan", value: alert.plan }] : []),
    ],
    bullets: [
      `When: ${new Date(alert.occurredAt).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC`,
      ...(alert.reference ? [`Reference: ${alert.reference}`] : []),
    ],
    ...(alert.kind === "test" ? { callout: { title: "Important updates only", text: "Registrations, paid invoices, payment failures, cancellations, refunds, and disputes. No emails for routine logins, comments, DMs, or automation activity.", tone: "success" as const } } : {}),
    cta: { label: alert.userId ? "View customer" : "Open Email Center", url: alert.userId ? `https://ap3k.com/admin/users/${encodeURIComponent(alert.userId)}` : "https://ap3k.com/admin/emails" },
    secondaryCta: !["signup", "system", "test"].includes(alert.kind) ? { label: "Open Stripe", url: "https://dashboard.stripe.com" } : undefined,
    closing: "Owner notification · AP3K",
  };
}
