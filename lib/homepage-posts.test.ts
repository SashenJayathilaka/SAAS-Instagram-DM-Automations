import { afterEach, expect, it, vi } from "vitest";
import { loadHomepagePosts } from "./homepage-posts";
import { BLOG_POSTS } from "./blog";
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("returns only the published result provided by the editor", async () => {
  const published = BLOG_POSTS.slice(1, 3);
  expect(await loadHomepagePosts(async () => published)).toBe(published);
});
it("does not wait indefinitely for an optional feed or restore hidden static posts", async () => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  let reject!: (reason: Error) => void;
  const pending = new Promise<typeof BLOG_POSTS>((_, r) => {
    reject = r;
  });
  const result = loadHomepagePosts(() => pending, 100);
  await vi.advanceTimersByTimeAsync(100);
  expect(await result).toEqual([]);
  // A late provider rejection is already handled by Promise.race.
  reject(new Error("late database rejection"));
  await Promise.resolve();
  expect(vi.getTimerCount()).toBe(0);
});
