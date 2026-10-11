import type { BlogSection } from "./blog-catalog";

/** Count visible editorial text, including examples in tables and step cards. */
export function articleMetrics(intro: string, sections: BlogSection[]) {
  const text = [intro, ...sections.flatMap(section => [
    section.heading,
    ...section.paragraphs,
    ...(section.bullets || []),
    ...(section.table?.headers || []),
    ...(section.table?.rows || []).flat(),
    ...(section.steps || []).flatMap(step => [step.title, step.body]),
  ])].join(" ").trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  return { wordCount, readingTime: `${Math.max(1, Math.ceil(wordCount / 220))} min read` };
}
