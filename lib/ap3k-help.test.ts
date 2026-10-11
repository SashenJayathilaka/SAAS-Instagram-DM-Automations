import { describe, expect, it } from "vitest";
import { AP3K_HELP_ARTICLES, ap3kSupportKnowledge } from "@/lib/ap3k-help";

describe("AP3K help knowledge", () => {
  it("keeps article slugs unique and covers the core product workflows", () => {
    const slugs = AP3K_HELP_ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const knowledge = ap3kSupportKnowledge();
    expect(knowledge).toContain("Connect Instagram");
    expect(knowledge).toContain("Create a comment automation");
    expect(knowledge).toContain("Set up AP3K AI");
    expect(knowledge).toContain("Billing and subscription help");
  });

  it("does not copy irrelevant competitor help destinations", () => {
    const knowledge = ap3kSupportKnowledge();
    expect(knowledge).not.toContain("Ask the Community");
    expect(knowledge).not.toContain("Hire an Agency");
    expect(knowledge).not.toContain("Manychat Changelog");
  });
});
