import { describe, it, expect } from "vitest";
import { prepareNextPost, readNextPost } from "./next-post";
const now = new Date("2026-10-11T12:00:00Z");
describe("next post lifecycle", () => {
  it("arms only when publishing, not while drafting", () => {
    expect(prepareNextPost("NEXT", false, null, now)).toEqual({ scope: "NEXT" });
    expect(prepareNextPost("NEXT", true, null, now)).toEqual({ scope: "NEXT", armedAt: now.toISOString() });
    expect(prepareNextPost("123", true, { scope: "NEXT" }, now)).toBeNull();
  });
  it("retains the original boundary and binding across edits and pauses", () => {
    const saved = { scope: "NEXT", armedAt: "2026-10-10T12:00:00Z", boundPostId: "123" };
    for (const active of [true, false]) expect(prepareNextPost("NEXT", active, saved, now)).toEqual(saved);
  });
  it("rejects malformed internal state", () => {
    expect(readNextPost({ scope: "ALL" })).toBeNull();
    expect(readNextPost({ scope: "NEXT", armedAt: "invalid", boundPostId: "https://evil.test" })).toEqual({ scope: "NEXT" });
  });
});
