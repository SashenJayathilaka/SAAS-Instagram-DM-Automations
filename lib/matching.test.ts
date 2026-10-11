import { describe, it, expect } from "vitest";
import { ANY_COMMENT_KEYWORD, matchKeywordWithMode, resolveCommentTriggerMatch } from "./matching";

const keywords = [
  { word: "GUIDE" },
  { word: "price" },
  { word: "FREE" },
];

describe("matchKeywordWithMode — EXACT", () => {
  it("matches exact keyword case-insensitively", () => {
    expect(matchKeywordWithMode("guide", keywords, "EXACT")).toBe("GUIDE");
    expect(matchKeywordWithMode("GUIDE", keywords, "EXACT")).toBe("GUIDE");
    expect(matchKeywordWithMode("Guide", keywords, "EXACT")).toBe("GUIDE");
  });

  it("does not match a substring in EXACT mode", () => {
    expect(matchKeywordWithMode("I want the GUIDE please", keywords, "EXACT")).toBeNull();
  });

  it("returns null for no match", () => {
    expect(matchKeywordWithMode("hello world", keywords, "EXACT")).toBeNull();
  });

  it("matches after trimming and collapsing whitespace", () => {
    expect(matchKeywordWithMode(" ai ", [{ word: "ai" }], "EXACT")).toBe("ai");
    expect(matchKeywordWithMode("send   ai", [{ word: "send ai" }], "EXACT")).toBe("send ai");
  });
});

describe("matchKeywordWithMode — CONTAINS", () => {
  it("matches when comment contains the keyword", () => {
    expect(matchKeywordWithMode("I want the GUIDE please", keywords, "CONTAINS")).toBe("GUIDE");
    expect(matchKeywordWithMode("send me the guide!", keywords, "CONTAINS")).toBe("GUIDE");
  });

  it("still matches exact in CONTAINS mode", () => {
    expect(matchKeywordWithMode("GUIDE", keywords, "CONTAINS")).toBe("GUIDE");
  });

  it("returns null when keyword not present", () => {
    expect(matchKeywordWithMode("hello world", keywords, "CONTAINS")).toBeNull();
  });

  it("matches short keywords case-insensitively inside phrases", () => {
    const ai = [{ word: "ai" }];
    expect(matchKeywordWithMode("ai", ai, "CONTAINS")).toBe("ai");
    expect(matchKeywordWithMode("AI", ai, "CONTAINS")).toBe("ai");
    expect(matchKeywordWithMode("send ai please", ai, "CONTAINS")).toBe("ai");
    expect(matchKeywordWithMode("send ai!", ai, "CONTAINS")).toBe("ai");
  });

  it("handles non-Latin text without changing matching semantics", () => {
    expect(matchKeywordWithMode("ガイドを送る", [{ word: "ガイド" }], "CONTAINS")).toBe("ガイド");
  });
});

describe("matchKeywordWithMode — SMART_AI", () => {
  it("falls back to CONTAINS behaviour", () => {
    expect(matchKeywordWithMode("Can I get the guide?", keywords, "SMART_AI")).toBe("GUIDE");
  });
});

describe("matchKeywordWithMode — edge cases", () => {
  it("returns null for empty comment text", () => {
    expect(matchKeywordWithMode("", keywords, "EXACT")).toBeNull();
  });

  it("returns null for empty keyword list", () => {
    expect(matchKeywordWithMode("GUIDE", [], "EXACT")).toBeNull();
  });

  it("returns first matched keyword when multiple could match", () => {
    const multi = [{ word: "FREE" }, { word: "free guide" }];
    const result = matchKeywordWithMode("get free guide now", multi, "CONTAINS");
    expect(result).toBe("FREE");
  });
});

describe("resolveCommentTriggerMatch", () => {
  it("matches any-comment trigger without keywords", () => {
    expect(
      resolveCommentTriggerMatch({
        text: "anything at all",
        keywords: [],
        mode: "CONTAINS",
        triggerMode: "ANY_COMMENT",
      })
    ).toBe(ANY_COMMENT_KEYWORD);
  });

  it("keeps specific keyword contains and exact behavior", () => {
    expect(
      resolveCommentTriggerMatch({
        text: "please send guide",
        keywords,
        mode: "CONTAINS",
        triggerMode: "SPECIFIC_KEYWORD",
      })
    ).toBe("GUIDE");
    expect(
      resolveCommentTriggerMatch({
        text: "please send guide",
        keywords,
        mode: "EXACT",
        triggerMode: "SPECIFIC_KEYWORD",
      })
    ).toBeNull();
  });

  it("does not make legacy empty-keyword campaigns match every comment", () => {
    expect(
      resolveCommentTriggerMatch({
        text: "anything",
        keywords: [],
        mode: "CONTAINS",
        triggerMode: "SPECIFIC_KEYWORD",
      })
    ).toBeNull();
  });
});
