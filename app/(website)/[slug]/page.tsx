import ComparisonPage from "@/components/website/comparison-page";
import { getComparison } from "@/lib/comparisons";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import CommercialLandingPage from "@/components/website/commercial-landing-page";
import { COMMERCIAL_PAGES, getCommercialPage } from "@/lib/commercial-pages";
import { getServerLocale } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const SITE_URL = "https://ap3k.com";
type Props = { params: Promise<{ slug: string }> };

const SEO_KEYWORDS: Record<string, string[]> = {
  "instagram-dm-automation": [
    "Instagram DM automation",
    "automated Instagram messaging",
    "auto DM Instagram",
    "automated DM Instagram",
    "Instagram automation tool",
  ],
  "instagram-comment-automation": [
    "Instagram comment automation",
    "Instagram auto reply",
    "auto responder for IG",
    "Instagram autoresponder",
    "automation tools for Instagram",
  ],
  "instagram-comment-to-dm": [
    "Instagram comment to DM automation",
    "comment to DM Instagram",
    "Instagram auto DM from comments",
    "Instagram comment automation",
  ],
  "instagram-auto-reply": [
    "Instagram auto responder",
    "Instagram auto reply",
    "quick reply message for Instagram",
    "automated Instagram messaging",
  ],
  "instagram-story-automation": [
    "Instagram Story automation",
    "Instagram automated messaging",
    "Instagram DM autoresponder",
  ],
  "manychat-alternative": [
    "ManyChat alternative",
    "ManyChat alternatives",
    "Many Chat alternatives",
    "Instagram automation tools",
    "Instagram DM automation tool",
  ],
  "instagram-automation-for-creators": [
    "Instagram automation for creators",
    "Instagram lead generation",
    "insta automations",
    "automation Instagram",
  ],
  "instagram-automation-for-coaches": [
    "Instagram automation for coaches",
    "Instagram leads",
    "Instagram lead generation",
    "automated Instagram messaging",
  ],
  "instagram-automation-for-ecommerce": [
    "Instagram automation for ecommerce",
    "Instagram auto reply",
    "automate Instagram messages",
    "Instagram lead generation",
  ],
};

export function generateStaticParams() {
  return COMMERCIAL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  if (params.slug === "manychat-alternative") {
    const comparison = getComparison("manychat")!;
    return localizedMetadata(
      {
        title: "ManyChat Alternative for Instagram | AP3K vs ManyChat",
        description: comparison.description,
        openGraph: { images: ["https://ap3k.com/opengraph-image"] },
      },
      "/manychat-alternative",
      "en",
    );
  }
  const page = getCommercialPage(params.slug);
  if (!page) return {};
  const pathname = `/${page.slug}`;
  const isEnglish = getServerLocale() === "en";
  const seoTitle =
    page.seoTitle ??
    (isEnglish && page.slug === "instagram-comment-to-dm"
      ? "Instagram Comment-to-DM Automation | AP3K"
      : `${page.title} | AP3K`);
  const seoDescription =
    isEnglish && page.slug === "instagram-comment-to-dm"
      ? "Automate Instagram comment-to-DM campaigns with keyword triggers, public replies and instant link delivery. Start free with AP3K."
      : page.description;
  return localizedMetadata(
    {
      title: seoTitle,
      description: seoDescription,
      keywords: [
        ...(page.keywords ?? SEO_KEYWORDS[page.slug] ?? [page.eyebrow]),
        "Instagram automation",
        "AP3K",
      ],
      alternates: { canonical: pathname },
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        url: `${SITE_URL}${pathname}`,
        siteName: "AP3K",
        type: "website",
        images: [
          {
            url: `${SITE_URL}${page.media}`,
            width: 1156,
            height: 2056,
            alt: page.mediaAlt,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description: seoDescription,
        images: [`${SITE_URL}${page.media}`],
      },
    },
    pathname,
  );
}

export default async function CommercialPageRoute(props: Props) {
  const params = await props.params;
  const page = getCommercialPage(params.slug);
  if (!page) notFound();
  if (params.slug === "manychat-alternative")
    return <ComparisonPage page={getComparison("manychat")!} />;
  return <CommercialLandingPage page={page} />;
}
