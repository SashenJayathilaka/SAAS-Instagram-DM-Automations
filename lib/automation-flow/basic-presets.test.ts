import { describe, expect, it } from "vitest";
import { commentTemplateDefaults, messageTemplateDefaults } from "./basic-presets";
import { TEMPLATES, templateEditorType, templateFlow } from "./templates";
import { matchFlowTrigger } from "./triggers";
import { templatePreset } from "./templates";
import { responseTarget, branchTarget } from "./definition";
import { validateEngagementSettings } from "@/lib/automation-engagement-settings";

describe("ready-to-edit templates", () => {
  it("routes simple presets to their real editors and retains special flow trigger semantics", () => {
    for (const id of ["comment-links", "all-posts", "followers", "comment-leads", "follow-up", "comment-opener"]) expect(templateEditorType(id)).toBe("comment");
    expect(templateEditorType("story-mentions")).toBe("story");
    expect(templateEditorType("all-dms")).toBe("dm");
    for (const id of ["shared-post", "next-post", "dm-sales", "dm-leads", "product-carousel"]) expect(templateEditorType(id)).toBe("flow");
  });
  it("uses a real mention trigger and a text-only thank you without requiring a fake link", () => {
    expect(messageTemplateDefaults("story-mentions")).toMatchObject({ storyTriggerType: "MENTION", triggerMode: "ANY_MESSAGE", messageFormat: "TEXT", linkButtons: [] });
    const trigger = { id: "primary", ...templatePreset("story-mentions") };
    expect(matchFlowTrigger([trigger], { source: "STORY", storyTrigger: "REPLY", text: "Hello" })).toBeNull();
    expect(matchFlowTrigger([trigger], { source: "STORY", storyTrigger: "MENTION", text: "" })?.id).toBe("primary");
    expect(messageTemplateDefaults("all-dms")).toMatchObject({ triggerMode: "ANY_MESSAGE", keywords: [], messageFormat: "TEXT" });
  });
  it("prepares all-post scope, capture prerequisites and conditional follow-up settings", () => {
    expect(commentTemplateDefaults("all-posts")).toMatchObject({ post: { postid: "ANY" }, triggerMode: "ANY_COMMENT", keywords: [] });
    expect(commentTemplateDefaults("comment-links").openingDmEnabled).toBe(false);
    expect(commentTemplateDefaults("comment-opener").openingDmEnabled).toBe(true);
    expect(commentTemplateDefaults("comment-leads")).toMatchObject({ openingDmEnabled: true, emailCaptureEnabled: true, phoneCaptureEnabled: true });
    expect(commentTemplateDefaults("follow-up")).toMatchObject({ openingDmEnabled: true, followUpEnabled: true, followUpCondition: "NOT_CLICKED", followUpDelayMinutes: 30 });
    for (const id of ["comment-leads", "follow-up"]) {
      const preset = commentTemplateDefaults(id);
      expect(validateEngagementSettings(preset, true, preset.openingDmEnabled!)).toBeNull();
    }
  });
  it("uses complete customer-facing copy without placeholder messages or false email promises", () => {
    for (const template of TEMPLATES) {
      for (const node of templateFlow(template.id).nodes) {
        if ("text" in node) expect(node.text, template.id).not.toMatch(/\[Add |check (your )?email|straight to your inbox/i);
      }
    }
  });
  it("captures a consultation goal then a validated email before confirming", () => {
    const graph = templateFlow("consultation-flow");
    expect(responseTarget(graph.nodes[0], "Launch my online store")).toEqual({ next: "email", values: { consultation_goal: "Launch my online store" } });
    expect(responseTarget(graph.nodes[1], "not an email")).toBeNull();
    expect(responseTarget(graph.nodes[1], "person@example.com")?.next).toBe("tag");
    expect(graph.nodes[2]).toMatchObject({ kind: "tag", tag: "consultation_requested", next: "done" });
  });
  it("routes feedback and support separately and suppresses a reminder after a click", () => {
    const feedback = templateFlow("story-feedback-flow");
    expect(responseTarget(feedback.nodes[0], "I need help")?.next).toBe("help");
    expect(responseTarget(feedback.nodes[0], "Share feedback")?.next).toBe("feedback");
    const guide = templateFlow("resource-flow");
    expect(responseTarget(guide.nodes[0], "skip")?.next).toBe("guide");
    const clicked = guide.nodes.find(n => n.id === "clicked")!;
    expect(branchTarget(clicked, { _linkClicked: "true" }, 0)).toBe("end");
    expect(branchTarget(clicked, { _linkClicked: "false" }, 0)).toBe("reminder");
  });
});
