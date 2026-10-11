import { describe, expect, it } from "vitest";
import {
  instagramMediaFetchError,
  resolveInstagramMediaConnection,
} from "./instagram-media";

describe("resolveInstagramMediaConnection", () => {
  it("rejects missing token safely", () => {
    expect(resolveInstagramMediaConnection([{ instagramId: "1789", token: null }])).toEqual({
      ok: false,
      error: "Reconnect Instagram to load posts.",
    });
  });

  it("returns only the fields needed to fetch Instagram media", () => {
    expect(resolveInstagramMediaConnection([{ instagramId: "1789", token: "token" }])).toEqual({
      ok: true,
      token: "token",
      instagramBusinessAccountId: "1789",
      apiBaseUrl: "https://graph.facebook.com/v25.0",
      apiFamily: "facebook_graph_instagram_business",
    });
  });
});

describe("instagramMediaFetchError", () => {
  it("uses a permission-specific message for auth errors", () => {
    expect(instagramMediaFetchError(403)).toBe(
      "AP3K could not load posts. Reconnect Instagram and confirm media permissions are granted."
    );
  });
});
