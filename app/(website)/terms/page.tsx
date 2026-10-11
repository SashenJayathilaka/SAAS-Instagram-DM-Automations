import { COMPANY_COPY } from "@/lib/i18n/company-copy";
import CompanyDetails from "@/components/website/company-details";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import type { Metadata } from "next";

const pageMetadata: Metadata = {
  title: "Terms of Service — AP3K",
  description: "Terms for using AP3K Instagram comment automation, comment reply, and DM workflows.",
  alternates: { canonical: "/terms" },
};
export function generateMetadata(): Metadata { return localizedMetadata(pageMetadata, "/terms"); }

const sections = [
  {
    title: "Service Operator",
    body: COMPANY_COPY.en.termsBody,
  },
  {
    title: "What AP3K Does",
    body: "AP3K is an Instagram automation service for professional accounts. It can match configured comment, story, and DM triggers, send eligible replies, track automation activity, and capture leads.",
  },
  {
    title: "Authorized Accounts Only",
    body: "You may connect only Instagram Business or Creator accounts that you own or are authorized to manage. You are responsible for maintaining the access required to operate the connected account.",
  },
  {
    title: "Your Responsibility for Automations",
    body: "You are responsible for the automations, keywords, comment reply content, DM content, CTA links, offers, and claims you configure in AP3K. AP3K executes the automation you configure, and you remain responsible for the content and intent of those actions.",
  },
  {
    title: "Supported Instagram Access",
    body: "AP3K uses the supported Instagram API flow for professional accounts. AP3K does not scrape Instagram, use undocumented private Instagram APIs, ask for your Instagram password, or rely on browser bots to imitate account activity.",
  },
  {
    title: "Platform Compliance",
    body: "You must comply with applicable Instagram and Meta platform terms, community standards, and all laws that apply to your automations, including consumer protection, anti-spam, privacy, and marketing laws.",
  },
  {
    title: "Prohibited Uses",
    body: "You may not use AP3K for spam, harassment, fake engagement, coordinated inauthentic behavior, scraping, unauthorized data collection, impersonation, illegal promotions, or any use that violates platform rules or applicable law.",
  },
  {
    title: "Suspension and Termination",
    body: "AP3K may suspend or terminate accounts that abuse the service, violate these terms, harm users or third parties, violate platform rules, or create material legal, security, or reputational risk.",
  },
  {
    title: "Service Availability",
    body: "AP3K depends on Instagram API availability, account permissions, rate limits, and platform policies. Features may pause, degrade, or change because of platform limitations or technical issues outside AP3K's control. AP3K does not guarantee uninterrupted service or delivery of every comment reply or DM.",
  },
  {
    title: "Plans, Billing, and Cancellation",
    body: "Paid plans renew for the billing interval shown at checkout until canceled. Prices, included usage, and applicable taxes are shown before purchase. You can manage or cancel a paid subscription through AP3K Billing. Cancellation stops future renewals and paid access normally continues until the end of the paid period.",
  },
  {
    title: "Refunds",
    body: "Payments are handled under the AP3K Refund Policy. Nothing in these terms limits a refund or cancellation right that cannot legally be excluded in your location.",
  },
  {
    title: "Limitation of Liability",
    body: "To the maximum extent permitted by law, AP3K and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, including loss of business, revenue, data, or goodwill, arising from your use of or inability to use AP3K.",
  },
  {
    title: "Privacy",
    body: "AP3K's Privacy Policy explains how personal information and Instagram data are processed. By using AP3K, you acknowledge that processing is necessary to provide the service you request.",
  },
  {
    title: "Changes to These Terms",
    body: "AP3K may update these terms. Continued use of the service after an update constitutes acceptance of the revised terms. Material changes will be communicated where reasonably practicable.",
  },
];

export default function TermsPage() {
  return (
    <LocalizedCopy><div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050816] dark:text-rf-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(249,115,22,0.10),transparent_28rem),radial-gradient(circle_at_78%_8%,rgba(236,72,153,0.14),transparent_30rem),radial-gradient(circle_at_52%_42%,rgba(139,92,246,0.10),transparent_32rem)] dark:bg-ap3k-radial" />
      <WebsiteNav current="terms" />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-8">
          <p className="ap3k-kicker">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-rf-muted">
            {COMPANY_COPY.en.termsIntro}
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
            For questions about these terms, contact{" "}
            <a href="mailto:support@ap3k.com" className="font-bold text-rf-pink hover:underline">support@ap3k.com</a>.
          </p>
        </div>
        <CompanyDetails />
      </main>
      <WebsiteFooter />
    </div></LocalizedCopy>
  );
}
