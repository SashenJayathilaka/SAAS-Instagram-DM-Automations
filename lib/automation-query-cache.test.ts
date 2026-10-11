import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { refreshSavedAutomation } from "./automation-query-cache";

it("removes the saved editor's stale snapshot before the next hydration", async () => {
  const cache = new QueryClient();
  cache.setQueryData(["automation-info", "owner", "edited"], { aiReplyEnabled: true, commentReplies: [] });
  cache.setQueryData(["automation-info", "owner", "other"], { name: "Keep me" });
  cache.setQueryData(["user-automation", "owner"], []);
  await refreshSavedAutomation(cache, "edited");
  expect(cache.getQueryData(["automation-info", "owner", "edited"])).toBeUndefined();
  expect(cache.getQueryData(["automation-info", "owner", "other"])).toEqual({ name: "Keep me" });
  expect(cache.getQueryState(["user-automation", "owner"])?.isInvalidated).toBe(true);
  cache.clear();
});
