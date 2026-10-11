import { describe, expect, it } from "vitest";
import { matchesAutomationCategory } from "./automation-category";

describe("automation library categories", () => {
  it("groups persisted visual flows separately from basic comment and DM automations", () => {
    const flow = { listener: { flowDefinition: { version: 1, nodes: [] } } };
    const basic = { listener: { flowDefinition: null } };
    expect(matchesAutomationCategory(flow, "flow")).toBe(true);
    expect(matchesAutomationCategory(flow, "basic")).toBe(false);
    expect(matchesAutomationCategory(basic, "basic")).toBe(true);
    expect(matchesAutomationCategory(basic, "flow")).toBe(false);
    expect(matchesAutomationCategory({}, "basic")).toBe(true);
    expect(matchesAutomationCategory({}, "all")).toBe(true);
    expect(matchesAutomationCategory(flow, "all")).toBe(true);
    expect(matchesAutomationCategory({ listener: { flowDraft: { nodes: [] } } }, "flow")).toBe(true);
  });
});
