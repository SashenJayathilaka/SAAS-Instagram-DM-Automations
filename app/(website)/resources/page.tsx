import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import { SEO_RESOURCES } from "@/lib/seo-resources";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Instagram Comment Automation Resources | AP3K",
  description: "Use free Instagram comment-to-DM templates, launch checklists and a funnel calculator to plan clearer automation campaigns with AP3K.",
  alternates: { canonical: "/resources", languages: { en: "https://ap3k.com/resources", "x-default": "https://ap3k.com/resources" } },
  openGraph: { title: "Free Instagram Comment Automation Resources", description: "Templates, checklists and planning tools for Instagram comment-to-DM campaigns.", url: "https://ap3k.com/resources", type: "website", images: ["https://ap3k.com/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Free Instagram Comment Automation Resources", description: "Templates, checklists and planning tools for Instagram comment-to-DM campaigns.", images: ["https://ap3k.com/opengraph-image"] },
};

const ESSENTIAL_GUIDES = [
  ["Browse Instagram automation articles", "/blog"],
  ["Compare Instagram DM automation tools", "/blog/compare-instagram-dm-automation-tools"],
  ["Is Instagram DM automation safe?", "/blog/is-instagram-dm-automation-safe"],
  ["Instagram automation for professional accounts", "/blog/instagram-automation-business-creator-accounts"],
  ["Troubleshoot comment automation", "/blog/instagram-comment-automation-not-working"],
] as const;

export default function ResourcesPage() {
  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070808] dark:text-white">
    <WebsiteNav />
    <main>
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-20 text-center sm:px-8">
        <p className="ap3k-kicker">Free practical resources</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">Build better comment-to-DM campaigns.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">Use the templates and checklists as a starting point, then adapt every promise, keyword, and destination to your actual campaign.</p>
      </section>
      <section className="mx-auto grid max-w-5xl gap-5 px-4 pb-24 sm:px-8 md:grid-cols-2">
        {SEO_RESOURCES.filter(resource => resource.slug !== "instagram-comment-to-dm-templates").map(resource => <Link key={resource.slug} href={`/resources/${resource.slug}`} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">{resource.eyebrow}</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight">{resource.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{resource.description}</p>
          <span className="mt-6 inline-flex text-sm font-black text-violet-700 dark:text-violet-300">Open resource →</span>
        </Link>)}
        <Link href="/tools/instagram-comment-to-dm-calculator" className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-orange-500/20 dark:from-orange-500/10 dark:to-pink-500/10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">Planning calculator</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight">Comment-to-DM Funnel Calculator</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">Model comments, delivered DMs, destination visits, conversions, and estimated value without pretending projections are real results.</p>
          <span className="mt-6 inline-flex text-sm font-black text-orange-700 dark:text-orange-300">Open calculator →</span>
        </Link>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-8">
        <h2 className="text-3xl font-black tracking-tight">Essential Instagram automation guides</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">Use these decision and safety guides before choosing a tool or launching a campaign.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ESSENTIAL_GUIDES.map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:hover:text-violet-300">{label} →</Link>)}
        </div>
      </section>
    </main>
    <WebsiteFooter />
  </div>;
}
