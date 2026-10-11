import { describe, expect, it } from "vitest";
import { getAuthenticatedHomeRedirect } from "@/lib/authenticated-home-redirect";

describe("authenticated home redirect", () => {
  it("sends a signed-in visitor from the homepage to the owned dashboard directly", () => {
    expect(getAuthenticatedHomeRedirect("/", "user_123")).toBe("/dashboard/user_123");
  });

  it("keeps a signed-out visitor on the public homepage", () => {
    expect(getAuthenticatedHomeRedirect("/", null)).toBeNull();
  });

  it("does not redirect authenticated visitors away from other public pages", () => {
    expect(getAuthenticatedHomeRedirect("/pricing", "user_123")).toBeNull();
  });
});
