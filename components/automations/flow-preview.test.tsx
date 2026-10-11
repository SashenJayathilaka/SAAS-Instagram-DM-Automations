import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FlowPreview, {
  advanceFlowPreview,
  needsSeparateFlowOpening,
} from "./flow-preview";
import {
  responseTarget,
  type Flow,
  type FlowNode,
} from "@/lib/automation-flow/definition";

vi.mock("@/components/i18n/use-ui", () => ({
  useUi: () => (text: string) => text,
}));

import { TEMPLATES, templateFlow } from "@/lib/automation-flow/templates";

const base = { label: "Step", x: 0, y: 0 };
const message = (id: string, text: string): FlowNode => ({
  ...base,
  id,
  kind: "message",
  text,
  links: [],
  next: null,
});
const flow = (nodes: FlowNode[]): Flow => ({
  version: 1,
  oncePerContact: false,
  entry: nodes[0].id,
  nodes,
});
describe("flow preview simulation", () => {
  it("previews every catalog graph before destinations and images are configured", () => {
    for (const template of TEMPLATES) {
      const graph = templateFlow(template.id);
      const preview = advanceFlowPreview(
        graph,
        graph.entry,
        { _followsBusiness: "false", _followerCount: "0" },
        [],
      );
      expect(preview.error, template.id).toBe("");
      expect(preview.messages.length, template.id).toBeGreaterThan(0);
    }
  });
  it("matches the published comment opener without duplicating a single-choice entry", () => {
    expect(
      needsSeparateFlowOpening(templateFlow("comment-links"), "COMMENT"),
    ).toBe(true);
    expect(
      needsSeparateFlowOpening(templateFlow("comment-opener"), "COMMENT"),
    ).toBe(true);
    expect(
      needsSeparateFlowOpening(templateFlow("comment-delay"), "COMMENT"),
    ).toBe(false);
    expect(needsSeparateFlowOpening(templateFlow("dm-leads"), "DM")).toBe(
      false,
    );
    expect(
      needsSeparateFlowOpening(templateFlow("story-mentions"), "STORY"),
    ).toBe(false);
  });
  it("pauses a delay before producing the downstream message and resumes without timers", () => {
    const sample = flow([
      { ...base, id: "wait", kind: "delay", seconds: 86400, next: "send" },
      message("send", "Your guide"),
    ]);
    const paused = advanceFlowPreview(sample, sample.entry, {}, []);
    expect(paused.waiting?.kind).toBe("delay");
    expect(paused.messages).toEqual([
      { text: expect.stringContaining("1 day"), notice: true },
    ]);
    expect(paused.ended).toBe(false);
    const resumed = advanceFlowPreview(
      sample,
      "send",
      paused.values,
      paused.messages,
    );
    expect(resumed.messages.at(-1)?.text).toBe("Your guide");
    expect(resumed.ended).toBe(true);
  });
  it("uses numeric comparison, following and link-click simulation values for real branch rules", () => {
    for (const [field, operator, equals, good] of [
      ["_followerCount", "gt", "1000", "1001"],
      ["_followsBusiness", "eq", "true", "true"],
      ["_verified", "eq", "true", "true"],
      ["_linkClicked", "eq", "true", "true"],
    ] as const) {
      const sample = flow([
        {
          ...base,
          id: "condition",
          kind: "condition",
          field,
          operator,
          equals,
          yes: "yes",
          no: "no",
        },
        message("yes", "Qualified"),
        message("no", "Not qualified"),
      ]);
      expect(
        advanceFlowPreview(sample, sample.entry, { [field]: good }, [])
          .messages[0].text,
      ).toBe("Qualified");
      expect(
        advanceFlowPreview(sample, sample.entry, {}, []).messages[0].text,
      ).toBe("Not qualified");
    }
  });
  it("sets fields before branching and resolving downstream text", () => {
    const sample = flow([
      {
        ...base,
        id: "set",
        kind: "setfield",
        field: "segment",
        value: "{{answer}}",
        next: "condition",
      },
      {
        ...base,
        id: "condition",
        kind: "condition",
        field: "segment",
        operator: "contains",
        equals: "creator",
        yes: "yes",
        no: "no",
      },
      message("yes", "Hi {{segment}}"),
      message("no", "Other"),
    ]);
    const result = advanceFlowPreview(
      sample,
      sample.entry,
      { answer: "Creator" },
      [],
    );
    expect(result.values.segment).toBe("Creator");
    expect(result.messages[0].text).toBe("Hi Creator");
  });
  it("pauses for phone and free-text capture and continues with validated responses", () => {
    const sample = flow([
      {
        ...base,
        id: "phone",
        kind: "phone",
        text: "Your phone?",
        next: "name",
        skip: "name",
      },
      {
        ...base,
        id: "name",
        kind: "capture",
        field: "first_name",
        text: "Your name?",
        next: "send",
        skip: "send",
      },
      message("send", "Thanks {{first_name}}, phone {{phone}}"),
    ]);
    const first = advanceFlowPreview(sample, sample.entry, {}, []);
    expect(first.waiting?.kind).toBe("phone");
    const phone = responseTarget(first.waiting!, "+212 600 123 456")!;
    const second = advanceFlowPreview(
      sample,
      phone.next,
      phone.values,
      first.messages,
    );
    expect(second.waiting?.kind).toBe("capture");
    const name = responseTarget(second.waiting!, "Abde")!;
    const last = advanceFlowPreview(
      sample,
      name.next,
      { ...second.values, ...name.values },
      second.messages,
    );
    expect(last.messages.at(-1)?.text).toBe("Thanks Abde, phone +212600123456");
    expect(last.ended).toBe(true);
  });
  it("prepares carousel cards without navigating or sending and resolves their text", () => {
    const sample = flow([
      {
        ...base,
        id: "cards",
        kind: "carousel",
        text: "Pick a guide",
        cards: [
          {
            title: "Hello {{name}}",
            subtitle: "Creator guide",
            image: "https://example.com/guide.webp",
            links: [{ label: "Open", url: "https://example.com/guide" }],
          },
        ],
        next: null,
      },
    ]);
    const result = advanceFlowPreview(
      sample,
      sample.entry,
      { name: "Abde" },
      [],
    );
    expect(result.messages[0].cards?.[0]).toMatchObject({
      title: "Hello Abde",
      links: [{ label: "Open", url: "https://example.com/guide" }],
    });
    expect(result.ended).toBe(true);
  });
  it("bounds malformed draft loops rather than freezing the browser", () => {
    const sample = flow([
      {
        ...base,
        id: "loop",
        kind: "setfield",
        field: "test",
        value: "1",
        next: "loop",
      },
    ]);
    expect(advanceFlowPreview(sample, sample.entry, {}, []).error).toContain(
      "60 steps",
    );
  });
  it("removes the unused contact simulator and states nothing is sent", () => {
    const html = renderToStaticMarkup(
      <FlowPreview flow={flow([message("send", "Hello")])} />,
    );
    expect(html).not.toContain("Simulated contact");
    expect(html).toContain("nothing is sent");
    expect(html).not.toContain("Follower count");
    expect(html).not.toContain("<a ");
  });
});
