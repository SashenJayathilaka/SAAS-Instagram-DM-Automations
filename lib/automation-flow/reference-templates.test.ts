import { describe, expect, it } from "vitest";
import { branchTarget, responseTarget, validateFlow, type Flow } from "./definition";
import { TEMPLATES, templateById, templateFlow, templatePreset } from "./templates";

/** Explicit test-only assets stand in for the owner's required setup inputs. */
function configured(id: string): Flow {
  const flow = templateFlow(id);
  for (const node of flow.nodes) {
    if ("links" in node) node.links.forEach((link) => { if (!link.url) link.url = "https://example.com/resource"; });
    if (node.kind === "carousel") for (const card of node.cards) {
      if (!card.image) card.image = "https://example.com/product.jpg";
      card.links.forEach((link) => { if (!link.url) link.url = "https://example.com/product"; });
    }
  }
  return flow;
}

describe("observed automation templates", () => {
  it("exposes nineteen unique cards including three practical new flows", () => {
    expect(TEMPLATES.map((template) => template.id)).toEqual([
      "comment-links", "all-dms", "followers", "all-posts", "next-post",
      "comment-leads", "shared-post", "story-mentions", "dm-leads", "dm-sales",
      "follow-up", "comment-opener", "product-carousel", "comment-delay",
      "ask-to-follow", "dm-qualifier", "consultation-flow", "story-feedback-flow", "resource-flow",
    ]);
    expect(new Set(TEMPLATES.map((template) => template.id)).size).toBe(19);
    expect(TEMPLATES.filter((template) => template.popular).map((template) => template.id)).toEqual(["comment-links", "all-dms", "followers"]);
    expect(TEMPLATES.filter((template) => template.group === "flow").map((template) => template.id)).toEqual(["comment-delay", "ask-to-follow", "dm-qualifier", "consultation-flow", "story-feedback-flow", "resource-flow"]);
  });

  it("distinguishes catalog grouping from the multi-step execution engine", () => {
    expect(templateById("dm-leads")).toMatchObject({ group: "basic", type: "flow" });
    expect(templateById("comment-links")).toMatchObject({ group: "basic", type: "comment" });
  });

  it("keeps historical URLs and executable legacy graphs", () => {
    for (const id of ["story-leads", "affiliate", "ai", "product", "dm-links", "follow-freebie", "email", "giveaway", "youtube", "ai-questions", "collabs", "coupons", "whatsapp", "sell-reels", "rsvp", "quiz", "course", "story-faq", "live-0", "live-1", "live-2", "sms"]) {
      expect(templateById(id)?.id, id).toBe(id);
    }
    expect(templateFlow("giveaway")).toMatchObject({ oncePerContact: true, entry: "split" });
    expect(templateFlow("email").nodes[0]).toMatchObject({ kind: "email", skip: "delivery" });
    expect(templateFlow("quiz").nodes[0]).toMatchObject({ kind: "question", field: "interest" });
  });

  it("validates every configured graph but rejects unconfigured destinations", () => {
    for (const template of TEMPLATES) expect(validateFlow(configured(template.id)).errors, template.id).toEqual([]);
    expect(validateFlow(templateFlow("product-carousel")).flow).toBeNull();
    expect(validateFlow(templateFlow("comment-links")).flow).toBeNull();
    expect(validateFlow(templateFlow("follow-up")).flow).toBeNull();
  });

  it("applies the actual trigger, scope, keyword and follow settings", () => {
    expect(templatePreset("all-dms")).toMatchObject({ source: "DM", keyword: "", anyMessage: true });
    expect(templatePreset("all-posts")).toMatchObject({ source: "COMMENT", postScope: "all", anyMessage: true });
    expect(templatePreset("next-post")).toMatchObject({ source: "COMMENT", postScope: "next", anyMessage: true });
    expect(templatePreset("shared-post")).toMatchObject({ source: "DM", sharedPost: true });
    expect(templatePreset("story-mentions")).toMatchObject({ source: "STORY", storyTrigger: "MENTION" });
    expect(templatePreset("followers").followGateRequired).toBe(true);
    expect(templatePreset("ask-to-follow").followGateRequired).toBeUndefined(); // The graph owns verification.
    expect(templatePreset("comment-opener").openingButton).toBe("Get info");
  });

  it("gates the basic follower template on a verified follow and rechecks after each reply", () => {
    const graph = templateFlow("followers");
    const check = graph.nodes.find(n=>n.id===graph.entry)!;
    expect(branchTarget(check, {_followsBusiness:"true"}, 0)).toBe("delivery");
    for (const status of ["false", ""]) expect(branchTarget(check, {_followsBusiness:status}, 0)).toBe("askFollow");
    expect(branchTarget(check, {}, 0)).toBe("askFollow");
    const ask = graph.nodes.find(n=>n.id==="askFollow")!;
    expect(responseTarget(ask, "I followed")?.next).toBe(graph.entry);
    expect(validateFlow(configured("followers")).errors).toEqual([]);
  });

  it("reproduces the comment-to-DM reply boundary before the ten-second delay", () => {
    const flow = templateFlow("comment-delay");
    expect(flow.entry).toBe("opener");
    expect(flow.nodes[0]).toMatchObject({ kind: "question", text: "Thanks for your comment! Tap below and I’ll send the details." });
    expect(responseTarget(flow.nodes[0], "Get info")).toMatchObject({ next: "delay" });
    expect(responseTarget(flow.nodes[0], "anything else")).toBeNull();
    expect(flow.nodes.find((node) => node.id === "delay")).toMatchObject({ kind: "delay", seconds: 10, next: "details" });
  });

  it("rechecks follow status after 30 seconds and loops only after a customer reply", () => {
    const flow = templateFlow("ask-to-follow");
    const check = flow.nodes.find((node) => node.id === "checkFollow")!;
    const retry = flow.nodes.find((node) => node.id === "retryFollow")!;
    expect(branchTarget(check, { _followsBusiness: "true" }, 0)).toBe("details");
    expect(branchTarget(check, { _followsBusiness: "false" }, 0)).toBe("retryFollow");
    expect(branchTarget(check, {}, 0)).toBe("retryFollow");
    expect(responseTarget(retry, "Yes, I followed")?.next).toBe("delay");
    expect(flow.nodes.find((node) => node.id === "delay")).toMatchObject({ seconds: 30 });
    expect(validateFlow(flow).errors).toEqual([]);
  });

  it("qualifies creators and brands using different strict follower thresholds", () => {
    const flow = templateFlow("dm-qualifier");
    const creator = flow.nodes.find((node) => node.id === "creatorCount")!;
    const brand = flow.nodes.find((node) => node.id === "brandCount")!;
    expect(responseTarget(flow.nodes[0], "Creator")?.next).toBe("creatorCount");
    expect(responseTarget(flow.nodes[0], "Brand")?.next).toBe("brandCount");
    expect(branchTarget(creator, { _followerCount: "1000" }, 0)).toBe("creatorDeclined");
    expect(branchTarget(creator, { _followerCount: "1001" }, 0)).toBe("creatorAccepted");
    expect(branchTarget(brand, { _followerCount: "500" }, 0)).toBe("brandDeclined");
    expect(branchTarget(brand, { _followerCount: "501" }, 0)).toBe("brandAccepted");
    expect(branchTarget(brand, {}, 0)).toBe("brandDeclined");
  });

  it("collects email, phone and name in order before confirming DM leads", () => {
    const flow = templateFlow("dm-leads");
    expect(templatePreset("dm-leads").keyword).toBe("connect");
    expect(responseTarget(flow.nodes[0], "PERSON@EXAMPLE.COM")).toEqual({ next: "phone", values: { email: "person@example.com" } });
    expect(responseTarget(flow.nodes[1], "+212 600 123 456")).toEqual({ next: "name", values: { phone: "+212600123456" } });
    expect(responseTarget(flow.nodes[2], "Sam")).toEqual({ next: "delivery", values: { name: "Sam" } });
    expect(templateFlow("comment-leads").nodes.map((node) => node.kind)).toEqual(["email", "phone", "message"]);
  });

  it("ends follow-up when a tracked link has been opened", () => {
    const flow = templateFlow("follow-up");
    const condition = flow.nodes.find((node) => node.kind === "condition")!;
    expect(branchTarget(condition, { _linkClicked: "true" }, 0)).toBe("end");
    expect(branchTarget(condition, { _linkClicked: "false" }, 0)).toBe("reminder");
    expect(flow.nodes.find((node) => node.kind === "delay")).toMatchObject({ next: condition.id });
  });

  it("returns fresh graph and preset objects for independent drafts", () => {
    const first = templateFlow("dm-qualifier");
    first.nodes[0].label = "Changed";
    expect(templateFlow("dm-qualifier").nodes[0].label).toBe("Creator or brand");
    const preset = templatePreset("all-dms");
    preset.keyword = "changed";
    expect(templatePreset("all-dms").keyword).toBe("");
  });
});
