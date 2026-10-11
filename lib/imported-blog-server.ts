import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cache } from "react";
import slugs from "./content/imported-blog/slugs.json";

const allowed = new Set(slugs);
/** Files are sanitized at import time; never render request-supplied HTML. */
export const getImportedArticleHtml = cache(async (slug: string) => {
  if (!allowed.has(slug)) throw new Error("Unknown imported article");
  return readFile(join(process.cwd(), "lib/content/imported-blog", `${slug}.html`), "utf8");
});
