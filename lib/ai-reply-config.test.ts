import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PROTECTION_RULES,
  normalizeAiProtectionRules,
  normalizeAiReplyTone,
} from "@/lib/ai-reply-config";

describe("AI reply configuration", () => {
  it("normalizes tones and falls back to friendly", () => {
    expect(normalizeAiReplyTone("FUN")).toBe("FUN");
    expect(normalizeAiReplyTone("PROFESSIONAL")).toBe("PROFESSIONAL");
    expect(normalizeAiReplyTone("unknown")).toBe("FRIENDLY");
  });

  it("keeps unanswerable questions fail-closed", () => {
    expect(normalizeAiProtectionRules({
      INSULTS_HATE: "DELETE",
      CRITIQUE_NEGATIVE: "DELETE",
      UNANSWERABLE: "DELETE",
      BEGGING_SOLICITATION: "DELETE",
    })).toEqual({
      INSULTS_HATE: "DELETE",
      CRITIQUE_NEGATIVE: "DELETE",
      UNANSWERABLE: "SKIP",
      BEGGING_SOLICITATION: "DELETE",
    });
  });

  it("uses safe defaults for malformed stored JSON", () => {
    expect(normalizeAiProtectionRules(null)).toEqual(DEFAULT_AI_PROTECTION_RULES);
    expect(normalizeAiProtectionRules([])).toEqual(DEFAULT_AI_PROTECTION_RULES);
  });
});
