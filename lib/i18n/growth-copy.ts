import en from "../content/growth/en.json";
import fr from "../content/growth/fr.json";
import es from "../content/growth/es.json";
import de from "../content/growth/de.json";
import pt from "../content/growth/pt.json";
import type { Locale } from "./config";

// Pair authored copies by structure; routes and dates are never translated.
const stableFields = new Set(["slug", "publishedAt", "updatedAt", "visual"]);
function catalog(source: unknown, target: unknown, output: Record<string, string>) {
  if (typeof source === "string" && typeof target === "string") {
    output[source.replace(/\s+/g, " ").trim()] = target;
  } else if (Array.isArray(source) && Array.isArray(target)) {
    source.forEach((value, index) => catalog(value, target[index], output));
  } else if (source && target && typeof source === "object" && typeof target === "object") {
    Object.entries(source).forEach(([key, value]) => {
      if (!stableFields.has(key)) catalog(value, (target as Record<string, unknown>)[key], output);
    });
  }
}

export const GROWTH_COPY = Object.fromEntries(
  Object.entries({ en, fr, es, de, pt }).map(([locale, posts]) => {
    const output: Record<string, string> = {};
    catalog(en, posts, output);
    return [locale, output];
  }),
) as Record<Locale, Record<string, string>>;
