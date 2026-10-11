import { z } from "zod";
import type { BlogPost } from "@/lib/blog";
import { TUTORIAL_SCREENSHOTS } from "@/lib/tutorial-content";

const text = (max: number) => z.string().trim().max(max);
const screenshot = z
  .string()
  .refine(
    (value) => value in TUTORIAL_SCREENSHOTS,
    "Choose an existing screenshot.",
  );
export const editorialSchema = z.object({
  importedArchive: z.boolean().optional(),
  author: text(160).optional(),
  subtitle: text(2000).optional(),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase words separated by hyphens.",
    )
    .refine(
      (value) => value !== "new",
      "Choose a different slug; new is reserved for the editor.",
    ),
  title: text(160).min(5),
  description: text(170).min(20),
  seoTitle: text(70).optional(),
  noIndex: z.boolean().optional(),
  contentLocale: z.literal("en").optional(),
  category: text(60).min(2),
  keywords: z.array(text(80).min(1)).max(12),
  intro: text(5000).min(20),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
      "Enter a valid publication date.",
    ),
  updatedAt: z.string(),
  readingTime: text(40),
  wordCount: z.number().optional(),
  cover: screenshot.optional(),
  visual: z.enum([
    "workflow",
    "connect",
    "keyword",
    "any-comment",
    "dm-link",
    "analytics",
    "troubleshoot",
  ]),
  visualAlt: text(250),
  visualCaption: text(400),
  related: z.array(text(100)).max(12).optional(),
  sections: z
    .array(
      z.object({
        heading: text(180).min(1),
        video: z.boolean().optional(),
        table: z.object({ headers: z.array(text(200)).min(1).max(6), rows: z.array(z.array(text(1000)).max(6)).max(30) }).optional(),
        paragraphs: z.array(text(10000)).max(20),
        bullets: z.array(text(2000)).max(30).optional(),
        screenshot: screenshot.optional(),
        steps: z
          .array(z.object({ title: text(180), body: text(4000) }))
          .max(20)
          .optional(),
        links: z
          .array(
            z.object({
              label: text(200).min(1),
              href: text(2000).refine(
                (v) =>
                  /^\/(?!\/)[^\\\s]*$/.test(v) ||
                  /^https:\/\/[^\s\\]+$/.test(v),
                "Use a local path or HTTPS URL.",
              ),
            }),
          )
          .max(20)
          .optional(),
      }),
    )
    .min(1)
    .max(30),
});

export function normalizeEditorial(value: unknown, now = new Date()): BlogPost {
  const post = editorialSchema.parse(value);
  const words = [
    post.intro,
    ...post.sections.flatMap((s) => [
      s.heading,
      ...s.paragraphs,
      ...(s.bullets || []),
      ...(s.table?.headers || []),
      ...(s.table?.rows || []).flat(),
      ...(s.steps || []).flatMap((t) => [t.title, t.body]),
    ]),
  ]
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    ...post,
    updatedAt: now.toISOString().slice(0, 10),
    wordCount: post.importedArchive ? post.wordCount : words,
    readingTime: post.importedArchive ? post.readingTime : `${Math.max(1, Math.ceil(words / 220))} min read`,
  } as BlogPost;
}

export function editorialChecks(post: BlogPost) {
  const title = post.seoTitle || post.title;
  return [
    {
      label: "Search title between 30 and 65 characters",
      ok: title.length >= 30 && title.length <= 65,
    },
    {
      label: "Meta description between 80 and 160 characters",
      ok: post.description.length >= 80 && post.description.length <= 160,
    },
    { label: "At least one focused keyword", ok: post.keywords.length > 0 },
    {
      label: "At least one relevant internal link",
      ok: post.sections.some((s) =>
        s.links?.some((l) => l.href.startsWith("/")),
      ),
    },
    {
      label: "A useful introduction and at least three sections",
      ok: post.intro.length >= 100 && post.sections.length >= 3,
    },
    { label: "Search indexing enabled", ok: !post.noIndex },
  ];
}

export function mergeEditorialPosts(
  base: BlogPost[],
  rows: { slug: string; published: unknown; hidden: boolean }[],
): BlogPost[] {
  const posts = new Map(base.map((p) => [p.slug, p]));
  for (const row of rows) {
    if (row.hidden) {
      posts.delete(row.slug);
      continue;
    }
    if (row.published) posts.set(row.slug, row.published as BlogPost);
  }
  return Array.from(posts.values()).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}
