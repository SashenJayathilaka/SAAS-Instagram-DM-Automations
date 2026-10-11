import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AP3K_HELP_ARTICLES } from "@/lib/ap3k-help";
import { HELP_CATEGORIES, relatedHelpArticles, searchHelpArticles } from "@/lib/help-navigation";
import { helpArticleSections } from "@/lib/help-article-content";
import { translateUi } from "@/lib/i18n/translate";
import { type Locale, localizePublicPath, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { buildSitemap as sitemap } from "@/lib/sitemap";

const state = vi.hoisted(() => ({ locale: "en" as Locale }));
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: state.locale }) }));
import HelpCenter from "./help-center";
import HelpArticleView from "./help-article";

describe("help center navigation", () => {
  it("renders every question as a localized article link without screenshots or hidden content", () => {
    for (const locale of ["en", "fr", "de", "en"] as Locale[]) {
      state.locale = locale;
      const html = renderToStaticMarkup(<HelpCenter />);
      expect(html).not.toContain("<img");
      expect(html).not.toContain("opacity:0");
      for (const article of AP3K_HELP_ARTICLES) {
        expect(html).toContain(`href="${localizePublicPath(`/help/${article.slug}`, locale)}"`);
        expect(html).toContain(renderToStaticMarkup(<>{translateUi(article.title, locale)}</>));
      }
    }
  });
  it("gives every answer relevant illustrations and three valid, distinct onward destinations", () => {
    for (const article of AP3K_HELP_ARTICLES) {
      expect(HELP_CATEGORIES.some(category => category.title === article.category)).toBe(true);
      const sections = helpArticleSections(article.slug);
      expect(sections.some(section => section.screenshot)).toBe(true);
      expect(sections.every(section => section.heading && section.paragraphs.length)).toBe(true);
      const related = relatedHelpArticles(article.slug);
      expect(related).toHaveLength(3);
      expect(new Set(related.map(item => item.slug)).size).toBe(3);
      expect(related.every(item => item && item.slug !== article.slug)).toBe(true);
    }
  });
  it("finds translated and source-language words", () => {
    const fr = (source: string) => translateUi(source, "fr");
    expect(searchHelpArticles("Connectez Instagram", fr).some(item => item.slug === "connect-instagram")).toBe(true);
    expect(searchHelpArticles("Instagram connect", fr).some(item => item.slug === "connect-instagram")).toBe(true);
    expect(searchHelpArticles("no_matching_question_xyz", fr)).toEqual([]);
    expect(searchHelpArticles("  ", fr)).toHaveLength(AP3K_HELP_ARTICLES.length);
  });
  it("renders localized article content and restores English from the source", () => {
    const article = AP3K_HELP_ARTICLES.find(item => item.slug === "connect-instagram")!;
    for (const locale of ["fr", "en", "de", "en"] as Locale[]) {
      state.locale = locale;
      const html = renderToStaticMarkup(<HelpArticleView article={article} sections={helpArticleSections(article.slug)} />);
      expect(html).toContain(renderToStaticMarkup(<>{translateUi(article.summary, locale)}</>));
      expect(html).toContain('data-tutorial-screenshot="instagram-ready"');
      expect(html).toContain(`href="${localizePublicPath("/help/create-automation", locale)}"`);
      expect(html).not.toContain("opacity:0");
    }
  });
  it("lists each article in the sitemap in every supported language", () => {
    const entries = sitemap();
    for (const article of AP3K_HELP_ARTICLES) for (const locale of SUPPORTED_LOCALES) {
      const url = `https://ap3k.com${localizePublicPath(`/help/${article.slug}`, locale)}`;
      expect(entries.filter(entry => entry.url === url)).toHaveLength(1);
    }
  });
});
