import CompanyDetails from "@/components/website/company-details";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import type { Metadata } from "next";

const pageMetadata: Metadata = {
  title: "Refund Policy — AP3K",
  description: "AP3K subscription cancellation and refund policy.",
  alternates: { canonical: "/refund-policy" },
};
export function generateMetadata(): Metadata { return localizedMetadata(pageMetadata, "/refund-policy"); }

export default function RefundPolicyPage() {
  return (
    <LocalizedCopy><div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#050816] dark:text-white">
      <WebsiteNav />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <p className="ap3k-kicker">Billing</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Refund Policy</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Last updated: September 16, 2026.</p>
        <div className="mt-8 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111827]"><h2 className="text-lg font-black text-slate-950 dark:text-white">Cancel any time</h2><p className="mt-3">You can cancel through AP3K Billing. Cancellation prevents the next renewal; paid access normally remains available through the current paid period.</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111827]"><h2 className="text-lg font-black text-slate-950 dark:text-white">Refund requests</h2><p className="mt-3">Subscription charges are generally non-refundable after a billing period begins. We review duplicate charges, billing errors, unauthorized charges, and material service failures individually. Contact support@ap3k.com promptly with the billing email and invoice number, but never send payment-card details.</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111827]"><h2 className="text-lg font-black text-slate-950 dark:text-white">Mandatory rights</h2><p className="mt-3">If applicable law gives you a cancellation or refund right that cannot be excluded, AP3K will honor that right. Approved refunds are returned through Stripe to the original payment method.</p></section>
        </div>
        <CompanyDetails />
      </main>
      <WebsiteFooter />
    </div></LocalizedCopy>
  );
}
