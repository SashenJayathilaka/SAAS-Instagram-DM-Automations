import { describe, expect, it } from "vitest";
import { automationsToPause, planPauseMessage, PLAN_PAUSE_MESSAGES, usesPaidAutomationFeatures } from "./automation-plan-policy";
const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `automation-${i}`, integration: { planLocked: false } }));
describe("automation downgrade policy", () => {
  it("keeps five out of 60 without deleting configurations", () => {
    const saved = rows(60);
    const paused = automationsToPause(saved, "FREE");
    expect(paused).toEqual(saved.slice(5).map(({ id }) => ({ id, reason: "limit" })));
    expect(saved).toHaveLength(60);
  });
  it("counts only eligible automations toward the five retained slots", () => {
    const saved = [{ id: "locked", integration: { planLocked: true } }, { id: "paid", followGateRequired: true }, ...rows(6)];
    expect(automationsToPause(saved, "FREE")).toEqual([{ id: "locked", reason: "account" }, { id: "paid", reason: "features" }, { id: "automation-5", reason: "limit" }]);
  });
  it.each(["PRO", "BUSINESS"] as const)("keeps unlimited eligible automations on %s", plan => {
    expect(automationsToPause(rows(60), plan)).toEqual([]);
    expect(automationsToPause([{ id: "locked", integration: { planLocked: true } }], plan)).toEqual([{ id: "locked", reason: "account" }]);
  });
  it.each([
    { followGateRequired: true }, { triggerMode: "INTENT_MATCH" }, { storyConfig: { scope: "NEXT" } },
    ...["aiReplyEnabled", "aiDmReplyEnabled", "emailCaptureEnabled", "phoneCaptureEnabled", "followUpEnabled"].map(key => ({ listener: { [key]: true } })),
    { listener: { listener: "SMARTAI" } }, { listener: { flowDefinition: { nodes: [] } } },
  ])("pauses each paid feature, including legacy and Story modes: %j", feature => {
    expect(usesPaidAutomationFeatures({ id: "a", ...feature })).toBe(true);
    expect(automationsToPause([{ id: "a", ...feature }], "FREE")).toEqual([{ id: "a", reason: "features" }]);
  });
  it("leaves basic triggers and draft flows eligible", () => {
    expect(usesPaidAutomationFeatures({ id: "a", storyConfig: { scope: "ANY" }, listener: { flowDefinition: null, listener: "MESSAGE" } })).toBe(false);
  });
  it("distinguishes plan pauses from manual pauses and repair warnings", () => {
    expect(planPauseMessage({ active: false, reviewReason: PLAN_PAUSE_MESSAGES.limit })).toBe(PLAN_PAUSE_MESSAGES.limit);
    expect(planPauseMessage({ active: true, reviewReason: PLAN_PAUSE_MESSAGES.limit })).toBeNull();
    expect(planPauseMessage({ active: false, reviewReason: "Reconnect your account" })).toBeNull();
  });
});
