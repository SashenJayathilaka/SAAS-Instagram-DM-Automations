import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import ts from "typescript";
import {
  SUPPORTED_LOCALES,
  isEnglishOnlyArticle,
  localizePublicPath,
  type Locale,
} from "./config";
import { translateUi, hasUiTranslation } from "./translate";
import { COMMERCIAL_PAGES } from "../commercial-pages";
import { BLOG_POSTS } from "../blog";
import { AP3K_HELP_ARTICLES } from "../ap3k-help";
import { REMAINING_ROWS } from "./remaining-copy";
import { buildSitemap as sitemap } from "@/lib/sitemap";

const state = vi.hoisted(() => ({ locale: "en" as Locale }));
vi.mock("@/providers/i18n-provider", () => ({
  useI18n: () => ({ locale: state.locale }),
}));
vi.mock("./server", () => ({ getServerLocale: () => state.locale }));
// Next transforms font loaders during builds; supply their class names in Node tests.
vi.mock("next/font/google", () => ({ Inter: () => ({ className: "font-inter" }) }));
vi.mock("next/font/local", () => ({ default: () => ({ className: "font-local" }) }));
vi.mock("@/components/global/website-nav", () => ({ default: () => null }));
vi.mock("@/components/global/website-footer", () => ({ default: () => null }));
import LocalizedCopy, { UiText } from "@/components/i18n/localized-copy";
import CommercialLandingPage from "@/components/website/commercial-landing-page";
import HelpCenter from "@/components/help/help-center";
import PrivacyPage, {
  generateMetadata as privacyMetadata,
} from "@/app/(website)/privacy/page";
import TermsPage from "@/app/(website)/terms/page";
import { COMPANY_COPY } from "./company-copy";
import { generateMetadata as commercialMetadata } from "@/app/(website)/[slug]/page";

function prose(value: unknown, field = ""): string[] {
  if (
    [
      "slug",
      "href",
      "theme",
      "media",
      "video",
      "keyword",
      "visual",
      "screenshot",
      "cover",
      "contentLocale",
      "publishedAt",
      "updatedAt",
    ].includes(field)
  )
    return [];
  if (typeof value === "string")
    return ["Instagram", "AP3K", "Business", "Pro"].includes(value)
      ? []
      : [value];
  if (Array.isArray(value)) return value.flatMap((item) => prose(item, field));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => prose(item, key));
  return [];
}

describe("complete public localization and search metadata", () => {
  it("identifies AP3K LLC in terms and privacy in every language with an isolated mailing address", () => {
    for (const locale of SUPPORTED_LOCALES) {
      state.locale = locale;
      for (const Page of [TermsPage, PrivacyPage]) {
        const html = renderToStaticMarkup(<Page />);
        expect(html).toContain("AP3K LLC");
        expect(html).toContain(COMPANY_COPY[locale].mailing);
        expect(html).toContain('<bdi dir="ltr">2026-002082793</bdi>');
        expect(html).toContain(
          "30 N Gould St, Ste N, Sheridan, WY 82801, United States",
        );
        expect(html).not.toContain(
          "provider identified in the applicable checkout",
        );
        if (locale !== "en")
          expect(html).not.toContain(COMPANY_COPY.en.operator);
      }
    }
  });
  it("renders nested translation wrappers without passing arrays to the string translator", () => {
    for (const locale of SUPPORTED_LOCALES) {
      state.locale = locale;
      const html = renderToStaticMarkup(
        <LocalizedCopy>
          <div>
            <UiText>{"Privacy Policy"}</UiText>
          </div>
        </LocalizedCopy>,
      );
      expect(html).toContain(translateUi("Privacy Policy", locale));
    }
  });
  it("renders every commercial landing page in every language", () => {
    for (const locale of SUPPORTED_LOCALES) {
      state.locale = locale;
      for (const page of COMMERCIAL_PAGES) {
        const html = renderToStaticMarkup(
          <CommercialLandingPage page={page} />,
        );
        expect(html).toContain("AP3K");
        expect(html).toContain('id="pricing"');
        expect(html).not.toContain('id="example"');
        expect(html).not.toContain("Interactive example");
      }
    }
  });
  it("covers every commercial page, help article and blog content field", () => {
    for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "en")) {
      for (const source of prose([
        COMMERCIAL_PAGES.filter((page) => !page.contentLocale),
        BLOG_POSTS.filter((post) => !post.contentLocale),
        AP3K_HELP_ARTICLES.filter((article) => !article.contentLocale),
      ])) {
        expect(hasUiTranslation(source, locale), `${locale}: ${source}`).toBe(
          true,
        );
      }
    }
  });
  it("covers the policy paragraphs from their actual source", () => {
    for (const page of [
      "privacy",
      "terms",
      "cookies",
      "refund-policy",
      "data-deletion",
      "contact",
    ]) {
      const source = fs.readFileSync(`app/(website)/${page}/page.tsx`, "utf8");
      const ast = ts.createSourceFile(
        page,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const phrases: string[] = [];
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node) && /[A-Za-z]/.test(node.text))
          phrases.push(node.text);
        if (
          ts.isStringLiteral(node) &&
          ts.isPropertyAssignment(node.parent) &&
          ["title", "body", "description"].includes(
            node.parent.name.getText(ast),
          )
        )
          phrases.push(node.text);
        ts.forEachChild(node, visit);
      };
      visit(ast);
      for (const locale of SUPPORTED_LOCALES.filter((l) => l !== "en"))
        for (const phrase of phrases.filter((p) => !p.includes("@"))) {
          expect(
            hasUiTranslation(phrase, locale),
            `${locale}/${page}: ${phrase}`,
          ).toBe(true);
        }
    }
  });
  it("renders translated gaps and restores English", () => {
    for (const locale of ["de", "fr", "en", "pt", "en"] as Locale[]) {
      state.locale = locale;
      const help = renderToStaticMarkup(<HelpCenter />);
      const privacy = renderToStaticMarkup(<PrivacyPage />);
      for (const title of [
        "Reconnect or add an Instagram account",
        "AI safety and comment protection",
      ]) {
        expect(help.includes(title)).toBe(locale === "en");
      }
      expect(privacy.includes("Instagram Data We Collect")).toBe(
        locale === "en",
      );
      expect(privacy).toContain("support@ap3k.com");
    }
  });
  it("uses translated titles and self canonicals with reciprocal language alternatives", async () => {
    for (const locale of SUPPORTED_LOCALES) {
      state.locale = locale;
      for (const page of COMMERCIAL_PAGES) {
        const metadata = await commercialMetadata({ params: Promise.resolve({ slug: page.slug }) });
        expect(metadata.alternates?.canonical).toBe(
          `https://ap3k.com${localizePublicPath(`/${page.slug}`, locale)}`,
        );
        expect(Object.keys(metadata.alternates?.languages ?? {})).toHaveLength(
          isEnglishOnlyArticle(`/${page.slug}`) ? 2 : 6,
        );
        const expectedTitle =
          page.slug === "manychat-alternative"
            ? "ManyChat Alternative for Instagram | AP3K vs ManyChat"
            : (page.seoTitle ??
              (locale === "en" && page.slug === "instagram-comment-to-dm"
                ? "Instagram Comment-to-DM Automation | AP3K"
                : `${translateUi(page.title, locale)} | AP3K`));
        expect(metadata.title).toBe(expectedTitle);
        if (locale !== "en" && !isEnglishOnlyArticle(`/${page.slug}`))
          expect(metadata.description).not.toBe(page.description);
      }
      expect(privacyMetadata().alternates?.canonical).toBe(
        `https://ap3k.com${localizePublicPath("/privacy", locale)}`,
      );
    }
  });
  it("lists every public language version exactly once with the same alternatives", () => {
    const entries = sitemap();
    expect(new Set(entries.map((p) => p.url)).size).toBe(entries.length);
    for (const page of entries) {
      const alternatives = page.alternates?.languages;
      expect(Object.keys(alternatives ?? {})).toHaveLength(
        isEnglishOnlyArticle(new URL(page.url).pathname) ? 2 : 6,
      );
      for (const url of Object.values(alternatives ?? {}))
        expect(entries.some((p) => p.url === url)).toBe(true);
      expect(new URL(page.url).pathname).not.toMatch(
        /^\/(?:fr\/|es\/|de\/|pt\/)?(?:dashboard|admin|sign-in|sign-up|data-deletion-status)(?:\/|$)/,
      );
    }
  });
  it("has complete editorial rows without duplicate keys", () => {
    expect(new Set(REMAINING_ROWS.map((r) => r[0])).size).toBe(
      REMAINING_ROWS.length,
    );
    for (const row of REMAINING_ROWS)
      expect(row.length === 5 && row.every((v) => v.trim())).toBe(true);
  });
});
