import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { BLOG_POSTS } from "./blog";
import { AP3K_HELP_ARTICLES } from "./ap3k-help";
import { HELP_TUTORIALS, ILLUSTRATED_POSTS, INSTAGRAM_CONNECTION_SECTIONS, TUTORIAL_SCREENSHOTS, tutorialImageSrc } from "./tutorial-content";
import { translateUi } from "./i18n/translate";

describe("illustrated tutorials", () => {
  it("uses all current product screenshots in blog sections and matching help entries", () => {
    const ids = Object.keys(TUTORIAL_SCREENSHOTS).sort();
    expect(ids).toContain("dm-message");
    expect(Array.from(new Set(BLOG_POSTS.flatMap(post => post.sections.flatMap(section => section.screenshot ?? [])))).sort()).toEqual(ids);
    for (const id of Object.values(HELP_TUTORIALS).flatMap(entry => entry.screenshots)) expect(ids).toContain(id);
    for (const [slug, entry] of Object.entries(HELP_TUTORIALS)) {
      expect(AP3K_HELP_ARTICLES.some(article => article.slug === slug)).toBe(true);
      expect(BLOG_POSTS.some(post => post.slug === entry.guide)).toBe(true);
    }
  });

  it("preserves the real image dimensions to prevent layout shifts or cropping", async () => {
    for (const [id, shot] of Object.entries(TUTORIAL_SCREENSHOTS)) {
      const data = readFileSync(`public${tutorialImageSrc(id as keyof typeof TUTORIAL_SCREENSHOTS)}`);
      const image = await sharp(data).metadata();
      expect(image.width).toBe(shot.width);
      expect(image.height).toBe(shot.height);
    }
  });

  it("keeps tutorial English authoritative after locale removal", () => {
    for (const section of INSTAGRAM_CONNECTION_SECTIONS) {
      for (const source of [section.heading, ...section.paragraphs]) {
        expect(translateUi(source, "en")).toBe(source);
      }
    }
    for (const post of ILLUSTRATED_POSTS) {
      const strings = [post.title, post.description, post.intro, ...post.sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])])];
      for (const source of strings) {
        expect(translateUi(source, "en")).toBe(source);
      }
    }
  });
});
