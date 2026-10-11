import { expect, it } from "vitest";
import { publicAutomation } from "./automation-public";

it("removes joined account secrets from the editor response without mutating server data", () => {
  const automation = {
    id: "campaign", listener: { prompt: "Hello" }, posts: [{ postid: "post" }],
    User: { integrations: [{ token: "private-meta-token", oauthResolutionDiagnostics: { secret: "private" } }], subscription: { customerId: "customer" } },
  };
  const result = publicAutomation(automation);
  expect(result).toEqual({ id: "campaign", listener: { prompt: "Hello" }, posts: [{ postid: "post" }] });
  expect(JSON.stringify(result)).not.toContain("private");
  expect(automation.User.integrations[0].token).toBe("private-meta-token");
});
