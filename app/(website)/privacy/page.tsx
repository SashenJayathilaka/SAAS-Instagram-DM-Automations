import { COMPANY_COPY } from "@/lib/i18n/company-copy";
import CompanyDetails from "@/components/website/company-details";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import type { Metadata } from "next";

const pageMetadata: Metadata = {
  title: "Privacy Policy — AP3K",
  description: "How AP3K handles Instagram account, campaign, Comment reply, DM, lead, activity, and billing data.",
  alternates: { canonical: "/privacy" },
};
export function generateMetadata(): Metadata { return localizedMetadata(pageMetadata, "/privacy"); }

const sections = [
  { title: "Service Operator", body: COMPANY_COPY.en.privacyBody },
  { title: "Optional Launch-Kit Emails", body: "When you request our launch-kit email series, we store your email address, selected audience, signup page, consent version, confirmation time, and subscription status. We use this information to send the requested kit and two follow-up lessons through Resend, including an invitation to try AP3K. We also retain delivery records and unsubscribe or suppression records to honor your choices. Confirming this series does not subscribe you to an ongoing newsletter. Every email includes an unsubscribe link requiring no login. Contact support@ap3k.com to request access or deletion. Rate-limit identifiers are hashed to help prevent abuse." },
  {
    title: "Instagram Data We Collect",
    body: "AP3K collects account and profile information only after you authorize an Instagram Business or Creator account. This may include the Instagram account ID, username, profile information made available by the Instagram API, media identifiers used for campaigns, comment identifiers used to match campaign triggers, and connection status.",
  },
  {
    title: "Product Data We Store",
    body: "AP3K stores campaign settings, keywords, selected post or media identifiers, Comment reply configuration, DM configuration, CTA links, lead records, activity and delivery records, account information, and subscription data needed to operate the service.",
  },
  {
    title: "Account, Billing, and Support Data",
    body: "We process account identifiers, email addresses, subscription status, invoice references, support correspondence, and security or audit records needed to provide and protect AP3K. Payment-card details are handled by Stripe and are not stored by AP3K.",
  },
  {
    title: "How We Use Instagram Data",
    body: "AP3K uses Instagram data only to provide comment automation, the Comment replies and DMs you configure, campaign analytics, lead tracking, account management, and related product features requested by the account owner.",
  },
  {
    title: "What We Do Not Do",
    body: "AP3K does not sell Instagram data, scrape Instagram, request your Instagram password, or use browser bots to imitate user activity. Connections are authorized through supported Instagram API flows for professional accounts.",
  },
  {
    title: "Service Providers",
    body: "AP3K uses service providers including Meta for Instagram access, Clerk for authentication, Stripe for billing, Neon for database hosting, Vercel for application hosting, Resend for service emails and requested marketing emails, and configured AI providers when AI features are enabled. Each provider processes only the information needed for its role.",
  },
  {
    title: "Cookies and Measurement",
    body: "Necessary browser storage supports essential site functions. Optional analytics and marketing tools load only after you accept them through AP3K's cookie controls. You can withdraw that choice from Cookie preferences in the website footer.",
  },
  {
    title: "Retention and Security",
    body: "AP3K retains information while an account is active and for limited periods afterward when needed for billing, fraud prevention, legal obligations, dispute handling, backups, and security. We use access controls, encryption in transit, signed webhooks, and operational logging, but no online service can guarantee absolute security.",
  },
  {
    title: "Your Choices and Rights",
    body: "Depending on your location, you may have rights to access, correct, export, restrict, object to, or delete personal information. You may also disconnect Instagram, delete your AP3K account, manage email preferences, and withdraw optional tracking consent.",
  },
  {
    title: "Disconnect And Delete",
    body: "You can disconnect Instagram from AP3K or request deletion of your AP3K account data, campaigns, leads, Comment reply and DM delivery records, and activity records. Self-service account deletion is also available from Settings.",
  },
];

export default function PrivacyPage() {
  return (
    <LocalizedCopy><div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050816] dark:text-rf-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(249,115,22,0.10),transparent_28rem),radial-gradient(circle_at_78%_8%,rgba(236,72,153,0.14),transparent_30rem),radial-gradient(circle_at_52%_42%,rgba(139,92,246,0.10),transparent_32rem)] dark:bg-ap3k-radial" />
      <WebsiteNav current="privacy" />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-8">
          <p className="ap3k-kicker">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-rf-muted">
            {COMPANY_COPY.en.privacyIntro}
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-white/[0.10] dark:bg-[#111827] dark:shadow-ap3k-card">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-rf-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-rf-pink/25 bg-gradient-to-br from-pink-50 via-white to-indigo-50 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-rf-pink/20 dark:bg-ap3k-gradient-soft dark:from-transparent dark:via-transparent dark:to-transparent">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-rf-muted">
            For privacy questions or data requests, contact{" "}
            <a href="mailto:support@ap3k.com" className="font-bold text-rf-pink hover:underline">support@ap3k.com</a>.
          </p>
        </div>
        <CompanyDetails />
      </main>
      <WebsiteFooter />
    </div></LocalizedCopy>
  );
}
