import { describe, expect, it } from "vitest";
import { validateFlow, branchTarget, responseTarget } from "./definition";
import { TEMPLATES, templateFlow } from "./templates";
describe("custom flow graph validation", () => {
  it("accepts every executable flow template", () => {
    for (const t of TEMPLATES.filter(
      (t) => t.type === "flow" && !t.unavailable,
    )) {
      const flow = templateFlow(t.id);
      for (const node of flow.nodes) {
        if (node.kind === "carousel") node.cards = node.cards.map(card => ({ ...card, image: card.image || "https://ap3k.com/resource.webp", links: card.links.map(link => ({ ...link, url: link.url || "https://ap3k.com/resource" })) }));
        if ("links" in node)
          node.links = node.links.map((link) => ({
            ...link,
            url: link.url || "https://ap3k.com/resource",
          }));
      }
      expect(validateFlow(flow).errors, t.id).toEqual([]);
    }
  });
  it("requires an actual destination for the free resource", () => {
    expect(validateFlow(templateFlow("email")).flow).toBeNull();
  });
  it("keeps comment automation first and popular", () =>
    expect(TEMPLATES[0]).toMatchObject({ type: "comment", popular: true }));
  it("does not advertise unsupported live triggers as publishable", () => {
    for (const t of TEMPLATES.filter((t) => t.trigger === "live"))
      expect(t.unavailable).toBeTruthy();
  });
  it("rejects cycles, disconnected steps and broken destinations", () => {
    const f = templateFlow();
    const n = f.nodes[0];
    if (n.kind !== "message") throw Error();
    n.next = n.id;
    expect(validateFlow(f).errors.join()).toContain("loop");
    n.next = "missing";
    expect(validateFlow(f).flow).toBeNull();
    n.next = null;
    f.nodes.push({ ...n, id: "unreachable" });
    expect(validateFlow(f).errors.join()).toContain("not connected");
  });
  it("rejects unsafe link schemes", () => {
    const f = templateFlow();
    const n = f.nodes[0];
    if (n.kind === "message")
      n.links = [{ label: "Open", url: "javascript:alert(1)" }];
    expect(validateFlow(f).flow).toBeNull();
  });
  it("bounds automatic message bursts", () => {
    const f = templateFlow();
    f.nodes = Array.from({ length: 7 }, (_, i) => ({
      id: `n${i}`,
      kind: "message" as const,
      label: `M${i}`,
      x: 0,
      y: 0,
      text: "Hi",
      links: [],
      next: i === 6 ? null : `n${i + 1}`,
    }));
    f.entry = "n0";
    expect(validateFlow(f).errors.join()).toContain("six messages");
  });
  it("collects only a complete email and supports skip", () => {
    const n = templateFlow("email").nodes[0];
    expect(responseTarget(n, "send it to me")).toBeNull();
    expect(responseTarget(n, "Person@Example.com")).toEqual({
      next: "delivery",
      values: { email: "person@example.com" },
    });
    expect(responseTarget(n, "SKIP")).toEqual({ next: "delivery", values: {} });
  });
  it("matches a choice without treating unknown text as an answer", () => {
    const n = templateFlow("quiz").nodes[0];
    expect(responseTarget(n, "GETTING STARTED")).toMatchObject({
      next: "beginner",
      values: { interest: "Getting started" },
    });
    expect(responseTarget(n, "something else")).toBeNull();
  });
  it("uses probabilities, with a testable boundary", () => {
    const n = templateFlow("giveaway").nodes[0];
    expect(branchTarget(n, {}, 0.049)).toBe("winner");
    expect(branchTarget(n, {}, 0.05)).toBe("thanks");
  });
});

describe("reference flow graph boundaries", () => {
  const base = { x: 0, y: 0, label: "Step" };
  const message = (id: string, next: string | null = null) => ({ ...base, id, kind: "message" as const, text: "Hello", links: [], next });
  const flow = (nodes: import("./definition").FlowNode[]): import("./definition").Flow => ({ version: 1, entry: nodes[0].id, oncePerContact: false, nodes });
  it("round-trips a dragged trigger position without requiring it on older definitions", () => {
    const draft = { ...flow([message("hello")]), triggerPosition: { x: 120, y: 310 } };
    expect(validateFlow(draft).flow?.triggerPosition).toEqual({ x: 120, y: 310 });
    expect(validateFlow({ ...draft, triggerPosition: { x: -1, y: 310 } }).flow).toBeNull();
    expect(validateFlow(flow([message("hello")])).errors).toEqual([]);
  });
  it("allows a customer-response loop with one callback option", () => {
    const f = flow([
      { ...base, id: "follow", kind: "question", text: "Follow us", field: "response", options: [{ label: "I followed", next: "wait" }] },
      { ...base, id: "wait", kind: "delay", seconds: 30, next: "check" },
      { ...base, id: "check", kind: "condition", field: "_followsBusiness", equals: "true", yes: "delivery", no: "follow" },
      message("delivery"),
    ]);
    expect(validateFlow(f).errors).toEqual([]);
  });
  it("rejects an autonomous loop even when a delay interrupts execution", () => {
    expect(validateFlow(flow([{ ...base, id: "wait", kind: "delay", seconds: 10, next: "wait" }])).errors.join()).toContain("loop");
  });
  it("finds autonomous loops reached after a customer response", () => {
    const f = flow([
      { ...base, id: "name", kind: "capture", text: "Name?", field: "name", next: "wait", skip: "wait" },
      { ...base, id: "wait", kind: "delay", seconds: 1, next: "loop" },
      message("loop", "wait"),
    ]);
    expect(validateFlow(f).errors.join()).toContain("loop");
  });
  it("permits a fresh burst after a delayed turn", () => {
    const nodes: import("./definition").FlowNode[] = Array.from({ length: 6 }, (_, i) => message(`n${i}`, i === 5 ? "wait" : `n${i + 1}`));
    nodes.push({ ...base, id: "wait", kind: "delay", seconds: 10, next: "last" }, message("last"));
    expect(validateFlow(flow(nodes)).errors).toEqual([]);
  });
  it("disallows counterfeit profile fields in response and action steps", () => {
    expect(validateFlow(flow([{ ...base, id: "set", kind: "setfield", field: "_followsBusiness", value: "true", next: null }])).errors.join()).toContain("cannot be overwritten");
    expect(validateFlow(flow([{ ...base, id: "capture", kind: "capture", field: "_verified", text: "verified?", next: null, skip: null }])).errors.join()).toContain("cannot be overwritten");
  });
  it("only accepts complete phone replies and bounds their length", () => {
    const node: import("./definition").FlowNode = { ...base, id: "phone", kind: "phone", text: "Phone?", next: null, skip: null };
    expect(responseTarget(node, "+212 (600) 123-456")?.values).toEqual({ phone: "+212600123456" });
    for (const value of ["Call me at 0600123456", "123", "1234567890123456", "++212600123456"])
      expect(responseTarget(node, value)).toBeNull();
    expect(responseTarget(node, "skip")?.values).toEqual({});
  });
  it("saves complete free-text answers while supporting SKIP", () => {
    const node: import("./definition").FlowNode = { ...base, id: "name", kind: "capture", text: "Name?", field: "name", next: null, skip: null };
    expect(responseTarget(node, "  Alex Jones  ")?.values).toEqual({ name: "Alex Jones" });
    expect(responseTarget(node, " ")).toBeNull();
    expect(responseTarget(node, "a".repeat(1001))).toBeNull();
    expect(responseTarget(node, "skip")?.values).toEqual({});
  });
  it("rejects empty or oversize carousels", () => {
    const node = { ...base, id: "cards", kind: "carousel" as const, text: "Products", next: null, cards: [] };
    expect(validateFlow(flow([node])).flow).toBeNull();
    const card = { title: "Guide", subtitle: "Read it", image: "https://ap3k.com/image.png", links: [{ label: "Read", url: "https://ap3k.com" }] };
    expect(validateFlow(flow([{ ...node, cards: Array(10).fill(card) }])).errors).toEqual([]);
    expect(validateFlow(flow([{ ...node, cards: Array(11).fill(card) }])).flow).toBeNull();
  });
  it("compares numeric profile values without lexicographic mistakes", () => {
    const node: import("./definition").FlowNode = { ...base, id: "check", kind: "condition", field: "_followerCount", operator: "gt", equals: "1000", yes: "yes", no: "no" };
    expect(branchTarget(node, { _followerCount: "999" }, 0)).toBe("no");
    expect(branchTarget(node, { _followerCount: "1001" }, 0)).toBe("yes");
    expect(branchTarget(node, { _followerCount: "" }, 0)).toBe("no");
    expect(branchTarget(node, {}, 0)).toBe("no");
    expect(branchTarget({ ...node, operator: "neq" }, {}, 0)).toBe("no");
    expect(branchTarget({ ...node, operator: "exists" }, {}, 0)).toBe("no");
  });
});
