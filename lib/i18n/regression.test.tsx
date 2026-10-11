import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import { localizeCopyTree } from "./localize-copy-tree";
import { resolveRequestLocale, SUPPORTED_LOCALES, localizePublicPath } from "./config";
import { translateUi } from "./translate";
import { PUBLIC_COPY_ROWS } from "./public-copy";
import { PLAN_CARDS, PLAN_COMPARISON } from "../billing-plans";

describe("language-switching regressions", () => {
  it("makes public English URLs authoritative over retired locale cookies", () => {
    expect(resolveRequestLocale("/", "ar")).toBe("en");
    expect(resolveRequestLocale("/pricing", "ar")).toBe("en");
    expect(resolveRequestLocale("/fr/pricing", "ar")).toBe("fr");
    expect(resolveRequestLocale("/dashboard/user", "ar")).toBe("en");
  });
  it("keeps checkout and callback routes unprefixed", () => {
    for (const path of ["/payment", "/callback/instagram", "/api/payment", "/dashboard", "/onboarding"]) {
      expect(localizePublicPath(path, "fr")).toBe(path);
    }
  });
  it("restores original English text, markup and props after every locale", () => {
    // Raw anchors intentionally exercise HTML-tree localization.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    const source = <main><h1>Turn Instagram Comments <span>Into Customers.</span></h1><a href="/pricing">Compare plans</a><input placeholder="Search automations, keywords, or content…" /><div translate="no">Customer text: こんにちは</div></main>;
    const original = renderToStaticMarkup(source);
    for (const locale of [...SUPPORTED_LOCALES, "en", "fr", "en"] as const) {
      const markup = renderToStaticMarkup(<>{localizeCopyTree(source, locale)}</>);
      expect(markup).toContain("Customer text: こんにちは");
      if (locale === "en") expect(markup).toBe(original);
      else expect(markup).not.toContain("Turn Instagram Comments");
    }
  });
  it("preserves handlers, media, amounts and protected content", () => {
    const handler = () => {};
    const source = <button onClick={handler}><video src="/media/demo.mp4" /><span>$79</span><code>Save</code></button>;
    const result = localizeCopyTree(source, "fr") as React.ReactElement[];
    expect(result[0].props.onClick).toBe(handler);
    expect(renderToStaticMarkup(<>{result}</>)).toContain('src="/media/demo.mp4"');
    expect(renderToStaticMarkup(<>{result}</>)).toContain("<code>Save</code>");
  });
  it("has all pricing feature translations without changing commercial amounts", () => {
    const strings = [...PLAN_CARDS.flatMap(p => [p.description, ...p.features]), ...PLAN_COMPARISON.map(p => p.feature)];
    for (const locale of SUPPORTED_LOCALES.filter(l => l !== "en")) {
      for (const source of strings) expect(translateUi(source, locale), `${locale}: ${source}`).not.toBe(source);
    }
    expect(PLAN_CARDS.map(p => [p.monthlyPrice, p.annualPrice])).toEqual([[0, 0], [15, 120], [25, 216]]);
  });
  it("has complete nonempty public translation rows with no duplicate keys", () => {
    const keys = PUBLIC_COPY_ROWS.map(row => row[0]);
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of PUBLIC_COPY_ROWS) {
      expect(row).toHaveLength(5);
      expect(row.every(value => value.trim().length > 0)).toBe(true);
    }
  });
  it("uses original pages, not alternative localized designs or a DOM observer", () => {
    for (const path of ["app/(website)/page.tsx", "app/(website)/pricing/page.tsx"]) {
      const source = fs.readFileSync(path, "utf8");
      expect(source).toMatch(/<LocalizedCopy>|return localizeCopyTree\(/);
      expect(source).not.toMatch(/LocalizedLandingPage|LocalizedPricingPage/);
    }
    expect(fs.readFileSync("app/layout.tsx", "utf8")).not.toContain("PhraseTranslationBridge");
    expect(fs.readFileSync("components/global/language-switcher.tsx", "utf8")).not.toContain("LanguageFlag");
    expect(fs.readFileSync("middleware.ts", "utf8")).not.toContain("locale !== DEFAULT_LOCALE");
  });
  it("keeps the homepage copy reactive during client-side locale changes", () => {
    const homepage = fs.readFileSync("app/(website)/page.tsx", "utf8");
    expect(homepage).toContain("<LocalizedCopy>");
    expect(homepage).not.toContain("return localizeCopyTree(");
  });
});
