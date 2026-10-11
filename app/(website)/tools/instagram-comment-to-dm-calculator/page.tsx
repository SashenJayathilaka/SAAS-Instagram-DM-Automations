import Breadcrumbs from "@/components/seo/breadcrumbs";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import CommentDmCalculator from "@/components/website/comment-dm-calculator";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Instagram Comment-to-DM Funnel Calculator | AP3K",
  description: "Estimate delivered Instagram DMs, destination visits, conversions and campaign value with a free comment-to-DM funnel calculator.",
  alternates: { canonical: "/tools/instagram-comment-to-dm-calculator", languages: { en: "https://ap3k.com/tools/instagram-comment-to-dm-calculator", "x-default": "https://ap3k.com/tools/instagram-comment-to-dm-calculator" } },
  openGraph: { title: "Instagram Comment-to-DM Funnel Calculator", description: "Estimate each stage of an Instagram comment-to-DM campaign with transparent assumptions.", url: "https://ap3k.com/tools/instagram-comment-to-dm-calculator", type: "website", images: ["https://ap3k.com/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Instagram Comment-to-DM Funnel Calculator", description: "Estimate each stage of an Instagram comment-to-DM campaign with transparent assumptions.", images: ["https://ap3k.com/opengraph-image"] },
};

export default function CalculatorPage() {
  const schema = { "@context": "https://schema.org", "@type": "WebApplication", name: "Instagram Comment-to-DM Funnel Calculator", url: "https://ap3k.com/tools/instagram-comment-to-dm-calculator", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: metadata.description, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@type": "Organization", "@id": "https://ap3k.com/#organization", name: "AP3K" } };
  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070808] dark:text-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <WebsiteNav />
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-8">
      <Breadcrumbs items={[{ name: "Resources", path: "/resources" }, { name: "Comment-to-DM calculator", path: "/tools/instagram-comment-to-dm-calculator" }]} />
      <p className="ap3k-kicker">Free planning tool</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Instagram Comment-to-DM Funnel Calculator</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">Model the full path from a qualifying comment to a conversion. Keep each rate separate so a delivery problem does not get confused with a weak landing page.</p>
      <div className="mt-12"><CommentDmCalculator /></div>
      <p className="mt-8 text-sm leading-7 text-slate-600 dark:text-slate-300">Need the setup process first? Read the <Link href="/blog/instagram-comment-to-dm-automation" className="font-bold text-violet-700 underline underline-offset-4 dark:text-violet-300">Instagram comment to DM automation guide</Link> or see the <Link href="/instagram-comment-to-dm" className="font-bold text-violet-700 underline underline-offset-4 dark:text-violet-300">AP3K workflow</Link>.</p>
    </main>
    <WebsiteFooter />
  </div>;
}
