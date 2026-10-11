import { describe, expect, it } from "vitest";
import { normalizeAiWorkspace, normalizeKnowledge } from "./ai-workspace";

describe("AP3K AI workspace", () => {
  it("starts safely with both AI skills disabled", () => {
    const workspace = normalizeAiWorkspace(null);
    expect(workspace.aiRepliesEnabled).toBe(false);
    expect(workspace.aiCommentsEnabled).toBe(false);
    expect(workspace.defaultTone).toBe("FRIENDLY");
    expect(workspace.protectionRules.UNANSWERABLE).toBe("SKIP");
  });

  it("keeps only complete, bounded knowledge notes", () => {
    const knowledge = normalizeKnowledge([
      { id: "one", title: " Pricing ", content: " $9 monthly " },
      { title: "", content: "ignored" },
    ]);
    expect(knowledge).toEqual([{ id: "one", title: "Pricing", content: "$9 monthly" }]);
  });
});
