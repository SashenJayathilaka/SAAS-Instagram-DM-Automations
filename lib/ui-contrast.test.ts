import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import path from "path";

const root = path.resolve(__dirname, "../");

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf-8");
}

function literalClassTokens(source: string) {
  return Array.from(source.matchAll(/className="([^"]*)"/g)).flatMap((match) =>
    match[1].split(/\s+/).filter(Boolean)
  );
}

function literalHeadingClassTokens(source: string) {
  return Array.from(source.matchAll(/<h[12][^>]*className="([^"]*)"/g)).flatMap(
    (match) => match[1].split(/\s+/).filter(Boolean)
  );
}

describe("light-mode contrast invariants", () => {
  it("onboarding layout uses an opaque dark surface with readable inherited text", () => {
    const src = read("app/(protected)/onboarding/layout.tsx");
    expect(src).toContain("dark:text-slate-50");
    expect(src).toContain("dark:bg-[#050816]");
    expect(src).toContain("dark:bg-[#0f172a]");
    expect(src).not.toContain("dark:bg-[#0f172a]/78");
    expect(src).not.toContain("dark:bg-rf-surface");
  });

  it("ap3k-kicker uses a light-mode pink override", () => {
    const src = read("app/globals.css");
    expect(src).toContain("text-pink-700 dark:text-rf-pink");
  });

  it("onboarding pages do not use exact unguarded rf text utilities", () => {
    const pages = [
      "app/(protected)/onboarding/page.tsx",
      "app/(protected)/onboarding/connect/page.tsx",
      "app/(protected)/onboarding/complete/page.tsx",
    ];

    for (const page of pages) {
      const tokens = literalClassTokens(read(page));
      expect(tokens, `${page} contains unguarded text-rf-muted`).not.toContain(
        "text-rf-muted"
      );
      expect(tokens, `${page} contains unguarded text-rf-text`).not.toContain(
        "text-rf-text"
      );
    }
  });

  it("ap3k-logo uses a light color with a dark-mode guard", () => {
    const src = read("components/global/ap3k-logo/index.tsx");
    expect(src).toContain("text-slate-950 dark:text-rf-text");
  });

  it("dashboard page headings do not use exact bare text-white", () => {
    const pages = [
      "app/(protected)/dashboard/[slug]/page.tsx",
      "app/(protected)/dashboard/[slug]/billing/page.tsx",
      "app/(protected)/dashboard/[slug]/settings/page.tsx",
      "app/(protected)/dashboard/[slug]/integrations/page.tsx",
    ];

    for (const page of pages) {
      const tokens = literalHeadingClassTokens(read(page));
      expect(tokens, `${page} contains a bare text-white heading`).not.toContain(
        "text-white"
      );
    }
  });
});
