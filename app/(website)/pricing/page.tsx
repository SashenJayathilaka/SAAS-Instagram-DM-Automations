import PublicPricing from "@/components/website/public-pricing";
import pricing from "@/components/website/public-pricing.module.css";
import { Inter } from "next/font/google";
import styles from "@/components/website/public-pages.module.css";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import type { Metadata } from "next";
import LocalizedCopy from "@/components/i18n/localized-copy";
import { getServerLocale } from "@/lib/i18n/server";
import { localeAlternates, localizePublicPath } from "@/lib/i18n/config";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--pricing-font" });

const PRICING_METADATA = {
  en: [
    "AP3K Pricing — Free, Pro & Business Plans",
    "Compare AP3K Free, Pro and Business plans for Instagram comment replies, DMs, AI, lead tracking and automation analytics.",
  ],
  fr: [
    "Tarifs AP3K — Offres Instagram Gratuit, Pro et Business",
    "Comparez les offres AP3K Gratuit, Pro et Business pour les réponses, DM, fonctions d’IA et le suivi des prospects Instagram.",
  ],
  es: [
    "Precios de AP3K — Planes Gratis, Pro y Business",
    "Compara los planes Gratis, Pro y Business de AP3K para respuestas, DM, IA y seguimiento de contactos de Instagram.",
  ],
  de: [
    "AP3K Preise — Instagram-Tarife Kostenlos, Pro und Business",
    "Vergleiche die AP3K-Tarife Kostenlos, Pro und Business für Antworten, DMs, KI und Instagram-Lead-Erfassung.",
  ],
  pt: [
    "Preços do AP3K — Planos Grátis, Pro e Business",
    "Compare os planos Grátis, Pro e Business do AP3K para respostas, DMs, IA e acompanhamento de contactos do Instagram.",
  ],
} as const;

export function generateMetadata(): Metadata {
  const locale = getServerLocale();
  const [title, description] = PRICING_METADATA[locale];
  return {
    title,
    description,
    alternates: {
      canonical: localizePublicPath("/pricing", locale),
      languages: localeAlternates("/pricing"),
    },
    openGraph: {
      title,
      description,
      url: `https://ap3k.com${localizePublicPath("/pricing", locale)}`,
      type: "website",
      images: ["https://ap3k.com/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://ap3k.com/opengraph-image"],
    },
  };
}

const FAQ = [
  {
    q: "What counts toward my automated-reply allowance?",
    a: "Each successfully sent Comment reply and each successfully sent DM counts as one automated action. Failed or skipped actions do not count.",
  },
  {
    q: "Do annual plans still reset usage every month?",
    a: "Yes. Annual billing only changes how you pay. Your automated-action allowance resets every month just like a monthly subscription.",
  },
  {
    q: "Which Instagram accounts are supported?",
    a: "AP3K supports Instagram Business and Creator accounts through Instagram authorization.",
  },
  {
    q: "How many Instagram accounts can I connect?",
    a: "Free includes 1 Instagram account, Pro includes 3, and Business includes 6. Each account has separate automations, contacts, inbox, analytics, and AI knowledge. Monthly reply and AI allowances are shared across your subscription.",
  },
  {
    q: "How many automations can I create?",
    a: "Free includes up to five active automations. Pro and Business include unlimited active automations. You can keep drafts without activating them until you have room.",
  },
  {
    q: "What is the difference between a Comment reply and a DM?",
    a: "A comment reply appears under the Instagram post. A DM is sent to the commenter in their Instagram inbox. A post automation can use either action or both.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Paid subscribers can manage billing or cancellation through the secure Stripe billing portal from inside AP3K.",
  },
] as const;

export default function PricingPage() {
  return (
    <LocalizedCopy>
      <div className={`${styles.page} ${pricing.pricingPage} ${inter.variable}`}>
        <WebsiteNav current="pricing" />
        <main>
          <header className={pricing.hero}>
            <div className={pricing.proVisual} aria-hidden="true">
              <video autoPlay loop muted playsInline disablePictureInPicture preload="metadata" poster="/media/pricing/pro-poster.svg">
                <source src="/media/pricing/pro-animation.mp4" type="video/mp4" />
              </video>
              {/* Static alternative for visitors who prefer reduced motion. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/pricing/pro-poster.svg" alt="" width="161" height="100" />
            </div>
            <h1>Start free. Grow at your pace.</h1>
            <p>
              Turn Instagram comments into conversations. Choose the capacity
              and AI tools that fit your business.
            </p>
          </header>
          <div className={pricing.container}>
            <PublicPricing />
          </div>
          <section className={styles.faq}>
            <h2>Frequently asked questions</h2>
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </section>
        </main>
        <WebsiteFooter />
      </div>
    </LocalizedCopy>
  );
}
