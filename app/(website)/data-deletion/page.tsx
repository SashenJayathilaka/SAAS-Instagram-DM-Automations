import CompanyDetails from "@/components/website/company-details";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import type { Metadata } from "next";

const pageMetadata: Metadata = {
  title: "Data Deletion Instructions — AP3K",
  description: "How to delete your AP3K account data, Instagram connection, campaigns, leads, and automation records.",
};
export function generateMetadata(): Metadata { return localizedMetadata(pageMetadata, "/data-deletion"); }

const cardClass = "rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-white/[0.10] dark:bg-[#111827] dark:shadow-ap3k-card";
const mutedClass = "text-sm leading-7 text-slate-600 dark:text-rf-muted";
const strongClass = "font-bold text-slate-950 dark:text-white";

export default function DataDeletionPage() {
  return (
    <LocalizedCopy><div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-950 dark:bg-[#050816] dark:text-rf-text">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(249,115,22,0.10),transparent_28rem),radial-gradient(circle_at_78%_8%,rgba(236,72,153,0.14),transparent_30rem),radial-gradient(circle_at_52%_42%,rgba(139,92,246,0.10),transparent_32rem)] dark:bg-ap3k-radial" />
      <WebsiteNav current="data-deletion" />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-8">
          <p className="ap3k-kicker">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Data Deletion Instructions</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-rf-muted">
            You can disconnect Instagram or permanently delete your AP3K account data at any time.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Option 1 — Self-service inside AP3K</h2>
            <ol className={`mt-4 list-decimal space-y-2 pl-5 ${mutedClass}`}>
              <li>Sign in to AP3K and open your Dashboard.</li>
              <li>Open <strong className={strongClass}>Instagram Account</strong>.</li>
              <li>Choose <strong className={strongClass}>Manage connection</strong>, then remove the Instagram connection.</li>
            </ol>
            <p className={`mt-4 ${mutedClass}`}>
              Disconnecting removes the stored Instagram access token and unlinks the Instagram Business or Creator account from AP3K. Campaign history remains saved unless you delete your AP3K account.
            </p>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Option 2 — Permanently delete your AP3K account</h2>
            <p className={`mt-3 ${mutedClass}`}>
              Open <strong className={strongClass}>Settings</strong> and use <strong className={strongClass}>Delete account permanently</strong>. Follow the confirmation steps shown in AP3K.
            </p>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Option 3 — Email deletion request</h2>
            <p className={`mt-3 ${mutedClass}`}>
              If you cannot access your AP3K account, email <a href="mailto:support@ap3k.com" className="font-bold text-rf-pink hover:underline">support@ap3k.com</a> from the email address associated with the account. Include your connected Instagram username when available.
            </p>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">What AP3K will delete</h2>
            <ul className={`mt-4 list-disc space-y-2 pl-5 ${mutedClass}`}>
              <li>Your AP3K user profile and workspace data</li>
              <li>Your Instagram connection record and stored access token</li>
              <li>Campaigns, keywords, Comment reply settings, DM settings, and CTA configuration</li>
              <li>Lead records and campaign activity records</li>
              <li>Comment-reply and DM delivery records associated with your campaigns</li>
              <li>Subscription metadata where deletion is permitted by applicable payment-record requirements</li>
            </ul>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Records that may be retained</h2>
            <p className={`mt-3 ${mutedClass}`}>
              AP3K may retain minimal records when required or permitted by law for security, abuse prevention, legal compliance, or payment records. Retained records are not used for unrelated product purposes.
            </p>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">Processing time</h2>
            <p className={`mt-3 ${mutedClass}`}>
              Self-service deletion begins immediately. Email requests are processed after account ownership is verified, and AP3K will confirm completion by email.
            </p>
          </section>
        </div>

        <div className="mt-8 rounded-2xl border border-rf-pink/25 bg-gradient-to-br from-pink-50 via-white to-indigo-50 p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:border-rf-pink/20 dark:bg-ap3k-gradient-soft dark:from-transparent dark:via-transparent dark:to-transparent">
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Questions</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-rf-muted">
            Contact <a href="mailto:support@ap3k.com" className="font-bold text-rf-pink hover:underline">support@ap3k.com</a> for help with account or data deletion.
          </p>
        </div>
        <CompanyDetails />
      </main>
      <WebsiteFooter />
    </div></LocalizedCopy>
  );
}
