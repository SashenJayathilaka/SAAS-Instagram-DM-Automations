import { describe, expect, it } from "vitest";
import { getAuthenticatedLandingRedirect } from "@/lib/landing-redirect";

describe("authenticated landing redirect", () => {
  it("redirects an authenticated user with a dashboard slug to dashboard", () => {
    expect(
      getAuthenticatedLandingRedirect(
        { id: "clerk-a" },
        {
          clerkId: "workspace-a",
          integrations: [{ name: "INSTAGRAM", status: "CONNECTED", instagramId: "ig-1", reconnectRequired: false, tokenPresent: true }],
          automations: [{ id: "automation-1" }],
        }
      )
    ).toBe("/dashboard/workspace-a");
  });

  it("sends a signed-in user with no canonical Instagram connection to onboarding connect", () => {
    expect(
      getAuthenticatedLandingRedirect(
        { id: "clerk-a" },
        {
          clerkId: "workspace-a",
          integrations: [{ name: "INSTAGRAM", status: "DISCONNECTED", instagramId: "ig-1", reconnectRequired: false, tokenPresent: true }],
          automations: [{ id: "automation-1" }],
        }
      )
    ).toBe("/onboarding");
  });

  it("allows onboarding complete only for a valid Instagram connection with no campaign yet", () => {
    expect(
      getAuthenticatedLandingRedirect(
        { id: "clerk-a" },
        {
          clerkId: "workspace-a",
          integrations: [{ name: "INSTAGRAM", status: "CONNECTED", instagramId: "ig-1", reconnectRequired: false, tokenPresent: true }],
          automations: [],
        }
      )
    ).toBe("/onboarding/complete");
  });

  it("leaves logged-out users on the public landing page", () => {
    expect(getAuthenticatedLandingRedirect(null, null)).toBeNull();
  });

  it("sends authenticated users without a workspace to onboarding connect", () => {
    expect(getAuthenticatedLandingRedirect({ id: "clerk-a" }, null)).toBe("/onboarding");
  });
});
