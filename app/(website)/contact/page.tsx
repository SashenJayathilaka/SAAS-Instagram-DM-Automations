import { COMPANY_SCHEMA } from "@/lib/company";
import CompanyDetails from "@/components/website/company-details";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import { CircleHelp, CreditCard, Instagram, Mail, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

const pageMetadata: Metadata = {
  title: "Contact AP3K Support",
  description:
    "Contact AP3K support for Instagram connections, automations, Inbox, billing, account access, privacy, and data requests.",
  alternates: { canonical: "/contact" },
};
export function generateMetadata(): Metadata { return localizedMetadata(pageMetadata, "/contact"); }

const supportTopics = [
  {
    title: "Instagram connection",
    description: "Connection, permissions, posts, comments, replies, or DMs.",
    subject: "AP3K Instagram connection support",
    icon: Instagram,
  },
  {
    title: "Automation help",
    description: "Keywords, any-comment triggers, public replies, links, or activity.",
    subject: "AP3K automation support",
    icon: CircleHelp,
  },
  {
    title: "Billing and plans",
    description: "Subscriptions, invoices, upgrades, downgrades, or cancellation.",
    subject: "AP3K billing support",
    icon: CreditCard,
  },
  {
    title: "Privacy and data",
    description: "Account deletion, privacy questions, or data requests.",
    subject: "AP3K privacy or data request",
    icon: ShieldCheck,
  },
];

export default function ContactPage() {
  return (
    <LocalizedCopy><div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050816] dark:text-rf-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(109,40,217,0.16),transparent_28rem),radial-gradient(circle_at_82%_12%,rgba(236,72,153,0.14),transparent_30rem),radial-gradient(circle_at_50%_48%,rgba(255,107,53,0.08),transparent_32rem)] dark:bg-ap3k-radial" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(COMPANY_SCHEMA).replace(/</g, "\\u003c") }} />
      <WebsiteNav current="contact" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-8 sm:py-20">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-10">
          <p className="ap3k-kicker">AP3K Support</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-6xl">
                Tell us what is blocking you.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-rf-muted">
                Choose the closest topic below. Include the email on your AP3K account and the relevant Instagram username so we can investigate without wasting a reply.
              </p>
            </div>
            <a
              href="mailto:support@ap3k.com?subject=AP3K%20support%20request"
              className="ap3k-gradient-button flex items-center justify-center gap-2 px-6 py-4 text-center text-sm"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email AP3K Support
            </a>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {supportTopics.map(({ title, description, subject, icon: Icon }) => (
            <a
              key={title}
              href={`mailto:support@ap3k.com?subject=${encodeURIComponent(subject)}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_20px_50px_rgba(109,40,217,0.12)] dark:border-white/[0.10] dark:bg-[#111827] dark:hover:border-violet-400/40"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-500/15 dark:text-violet-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-lg font-black text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-rf-muted">{description}</p>
              <span className="mt-5 inline-flex text-sm font-black text-violet-700 dark:text-violet-300">
                Start email →
              </span>
            </a>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white/80 p-6 dark:border-white/[0.10] dark:bg-[#111827]/90 sm:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">Send the useful details</h2>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-rf-muted">
                <li>• Email address used for your AP3K account</li>
                <li>• Instagram username and automation name</li>
                <li>• What you expected and what happened instead</li>
                <li>• Screenshot of the error, with passwords and tokens hidden</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/[0.08]">
              <h2 className="font-black text-slate-950 dark:text-white">Never email credentials</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-rf-muted">
                AP3K support will never ask for your Instagram password, Stripe card details, one-time verification codes, or API access tokens.
              </p>
            </div>
          </div>
        </section>
        <CompanyDetails />
      </main>

      <WebsiteFooter />
    </div></LocalizedCopy>
  );
}
