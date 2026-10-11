import { AP3K_PRICING } from "@/lib/billing-plans";
import HomeSetup from "@/components/website/home-setup";
import HomeShowcase from "@/components/website/home-showcase";
import HomeHero from "@/components/website/home-hero";
import LocalizedCopy from "@/components/i18n/server-localized-copy";
import { HOME_FAQ } from "@/lib/i18n/home-faq";
import HomeFaq from "@/components/website/home-faq";
import HomeAutomationChoices from "@/components/website/home-automation-choices";
import { localizePublicPath } from "@/lib/i18n/config";
import { SITE_METADATA } from "@/lib/i18n/metadata";
import { COMPANY_SCHEMA } from "@/lib/company";
import {
  FadeIn,
} from "@/components/global/motion/fade-in";
import HomeUniqueResponses from "@/components/website/home-unique-responses";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import HomeFeatures from "@/components/website/home-features";
import HomeScrollProgress from "@/components/website/home-scroll-progress";
import { getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AP3K",
  publisher: COMPANY_SCHEMA,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://ap3k.com",
  description:
    "Instagram comment and DM automation for Business and Creator accounts.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro Monthly", price: String(AP3K_PRICING.PRO_MONTHLY), priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro Annual", price: String(AP3K_PRICING.PRO_ANNUAL), priceCurrency: "USD" },
    {
      "@type": "Offer",
      name: "Business Monthly",
      price: String(AP3K_PRICING.BUSINESS_MONTHLY),
      priceCurrency: "USD",
    },
    {
      "@type": "Offer",
      name: "Business Annual",
      price: String(AP3K_PRICING.BUSINESS_ANNUAL),
      priceCurrency: "USD",
    },
  ],
};

export default async function LandingPage() {
  const locale = getServerLocale();
  const localizedSoftware = {
    ...softwareSchema,
    inLanguage: locale,
    url: `https://ap3k.com${localizePublicPath("/", locale)}`,
    description: SITE_METADATA[locale].description,
  };
  const localizedFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: HOME_FAQ[locale].items.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://ap3k.com/#website",
    url: "https://ap3k.com/",
    name: "AP3K",
    alternateName: "AP3K DM Automation",
    publisher: COMPANY_SCHEMA,
  };

  return (
    <LocalizedCopy>
      <div className="ap3k-home min-h-screen overflow-hidden bg-[#f7f7fb] text-slate-950 transition-colors dark:bg-[#080911] dark:text-white">
        <HomeScrollProgress />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localizedSoftware).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localizedFaq).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema).replace(/</g, "\\u003c"),
          }}
        />
        <WebsiteNav current="home" />

        <main>
          <HomeHero />
          <HomeShowcase />

          <HomeSetup />

          <HomeFeatures />

          <HomeUniqueResponses />

          <HomeAutomationChoices />

          <HomeFaq />

          <section className="relative overflow-hidden bg-[linear-gradient(135deg,#5420ca,#7331e5_50%,#963be5)] px-4 py-20 text-center text-white sm:px-8 lg:py-24">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,114,182,0.32),transparent_32rem)]" />
            <FadeIn className="relative mx-auto max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-200">
                Your next comment can become a customer
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.055em] sm:text-6xl">
                Start automating Instagram today.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/78">
                Create your first automation, test it from another Instagram
                account, and let AP3K handle the repetitive follow-up.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-black text-[#6128c8] shadow-xl transition motion-safe:hover:-translate-y-px"
                >
                  GET STARTED <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
                >
                  View pricing
                </Link>
              </div>
            </FadeIn>
          </section>
        </main>

        <WebsiteFooter />
      </div>
    </LocalizedCopy>
  );
}
