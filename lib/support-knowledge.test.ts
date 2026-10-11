import { describe, expect, it } from "vitest";
import { SUPPORT_RESOURCES, selectSupportResources } from "./support-resources";
import { supportKnowledgeFor } from "./support-knowledge";
import { DOCS_ARTICLES } from "./docs";
import { AP3K_HELP_ARTICLES } from "./ap3k-help";
import { BLOG_POSTS } from "./blog";

describe("grounded support", () => {
  it("tells the model about the tutorial and screenshot cards attached to its answer", () => {
    const knowledge = supportKnowledgeFor("How do I add link buttons and watch the tutorial?");
    expect(knowledge).toContain("a current example product screenshot");
    expect(knowledge).toContain("plus the AP3K setup tutorial video");
    expect(knowledge).toContain("SSOYGbfwLUQ");
    expect(knowledge).toContain("expand Watch the AP3K setup tutorial");
  });
  it("keeps every attached documentation destination real and internal", () => {
    const paths = new Set(["/pricing", ...DOCS_ARTICLES.map(a=>`/docs/${a.slug}`), ...AP3K_HELP_ARTICLES.map(a=>`/help/${a.slug}`)]);
    for (const resource of SUPPORT_RESOURCES) expect(paths.has(resource.href), resource.href).toBe(true);
  });
  it("retrieves current backtracking rules rather than the obsolete unsupported claim", () => {
    const knowledge=supportKnowledgeFor("How do I backtrack old comments?");
    expect(knowledge).toContain("seven days");
    expect(knowledge).not.toContain("does not currently backtrack");
    expect(knowledge).toContain("Support is read-only");
  });
  it("selects capture and CSV documentation and shares configured plan limits", () => {
    expect(selectSupportResources("collect email and phone").map(r=>r.id)).toContain("capture");
    expect(selectSupportResources("Download CSV export").map(r=>r.id)).toContain("contacts");
    expect(supportKnowledgeFor("plan prices")).toContain('"connectedInstagramAccounts":6');
    expect(supportKnowledgeFor("plan prices")).toContain('"PRO_ANNUAL":120');
  });
  it("keeps follow-up context without matching short aliases inside other words", () => {
    expect(selectSupportResources("email").map(r => r.id)).not.toContain("ai");
    expect(selectSupportResources("Explain the second step", "How do I backtrack?").map(r => r.id)).toContain("backtrack");
    expect(supportKnowledgeFor("Explain the second step", "How do I backtrack?")).toContain("seven days");
  });
  it("preserves publication date and resolves the revised article's related links", () => {
    const post=BLOG_POSTS.find(p=>p.slug==="comment-to-dm-button-labels")!;
    expect(post.publishedAt).toBe("2026-09-21");
    for (const section of post.sections) for (const link of section.links||[]) {
      if(link.href.startsWith("/blog/")) expect(BLOG_POSTS.some(p=>`/blog/${p.slug}`===link.href)).toBe(true);
      if(link.href.startsWith("/docs/")) expect(DOCS_ARTICLES.some(p=>`/docs/${p.slug}`===link.href)).toBe(true);
    }
  });
});
