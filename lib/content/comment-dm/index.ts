import type { BlogPost, BlogSection } from "@/lib/blog";
import setup from "./setup.json";
import messages from "./messages.json";
import campaignsOne from "./campaigns-1.json";
import campaignsTwo from "./campaigns-2.json";
import diagnostics from "./diagnostics.json";

export const COMMENT_DM_HUB = "/blog/instagram-comment-to-dm-automation";
export const COMMENT_DM_PUBLISHED = "2026-09-21";
export function articleWordCount(intro: string, sections: BlogSection[]): number {
  return [intro, ...sections.flatMap(section => [section.heading, ...section.paragraphs, ...(section.bullets ?? []), ...(section.steps ?? []).flatMap(step => [step.title, step.body])])].join(" ").trim().split(/\s+/).length;
}
export const COMMENT_DM_POSTS: BlogPost[] = [
  ...setup, ...messages, ...campaignsOne, ...campaignsTwo, ...diagnostics,
].map(raw => {
  const sections = raw.sections as BlogSection[];
  const wordCount = articleWordCount(raw.intro, sections);
  return {
    ...raw, sections, contentLocale: "en", wordCount,
    publishedAt: COMMENT_DM_PUBLISHED, updatedAt: "updatedAt" in raw ? String(raw.updatedAt) : COMMENT_DM_PUBLISHED,
    readingTime: `${Math.max(1, Math.ceil(wordCount / 200))} min read`,
    visual: "workflow",
    visualAlt: "AP3K workflow illustration connecting an Instagram comment to a configured reply and direct message",
    visualCaption: "The comment starts the request; your trigger and actions determine which response AP3K sends.",
  };
});
