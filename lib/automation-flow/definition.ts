import { z } from "zod";
import { parseWebhookUrl, parseWebhookBody, WEBHOOK_TEMPLATE_LIMIT } from "./webhook-contract";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/);
const link = z.object({
  label: z.string().trim().min(1).max(20),
  url: z
    .string()
    .trim()
    .url()
    .refine((s) => /^https:\/\//i.test(s), "Use an HTTPS link"),
});
const base = {
  id,
  label: z.string().max(80),
  x: z.number().min(0).max(6000),
  y: z.number().min(0).max(6000),
};
const next = id.nullable();
export const flowNodeSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("message"),
    text: z.string().trim().min(1).max(1000),
    links: z.array(link).max(3),
    next,
  }),
  z.object({
    ...base,
    kind: z.literal("product"),
    text: z.string().trim().min(1).max(80),
    subtitle: z.string().max(80),
    image: z.string().url(),
    links: z.array(link).min(1).max(3),
    next,
  }),
  z.object({
    ...base,
    kind: z.literal("email"),
    text: z.string().trim().min(1).max(800),
    next,
    skip: next,
  }),
  z.object({
    ...base,
    kind: z.literal("question"),
    text: z.string().trim().min(1).max(800),
    field: id,
    options: z
      .array(z.object({ label: z.string().trim().min(1).max(20), next }))
      .min(1)
      .max(3),
  }),
  z.object({
    ...base,
    kind: z.literal("random"),
    percent: z.number().int().min(1).max(99),
    yes: next,
    no: next,
  }),
  z.object({
    ...base,
    kind: z.literal("condition"),
    field: id,
    equals: z.string().max(100),
    operator: z.enum(["eq", "neq", "contains", "gt", "lt", "exists"]).optional(),
    yes: next,
    no: next,
  }),
  z.object({
    ...base, kind: z.literal("delay"), seconds: z.number().int().min(1).max(604800), next,
  }),
  z.object({ ...base, kind: z.literal("capture"), text: z.string().trim().min(1).max(800), field: id, next, skip: next }),
  z.object({ ...base, kind: z.literal("phone"), text: z.string().trim().min(1).max(800), next, skip: next }),
  z.object({ ...base, kind: z.literal("setfield"), field: id, value: z.string().max(1000), next }),
  z.object({
    ...base, kind: z.literal("carousel"), text: z.string().trim().min(1).max(1000),
    cards: z.array(z.object({
      title: z.string().trim().min(1).max(80), subtitle: z.string().max(80),
      image: z.string().url(), links: z.array(link).min(1).max(3),
    })).min(1).max(10), next,
  }),
  z.object({ ...base, kind: z.literal("tag"), tag: id, action: z.enum(["add", "remove"]).optional(), next }),
  z.object({
    ...base, kind: z.literal("webhook"),
    url: z.string().trim().max(2048).refine(value => Boolean(parseWebhookUrl(value)), "Use a public HTTPS destination on port 443."),
    body: z.string().max(WEBHOOK_TEMPLATE_LIMIT).refine(value => Boolean(parseWebhookBody(value)), "Use a JSON object; variables are allowed only in string values."),
    next,
  }),
  z.object({ ...base, kind: z.literal("end") }),
]);
export const flowSchema = z.object({
  version: z.literal(1),
  entry: id,
  oncePerContact: z.boolean(),
  triggerPosition: z.object({ x: z.number().min(0).max(6000), y: z.number().min(0).max(6000) }).optional(),
  nodes: z.array(flowNodeSchema).min(1).max(50),
});
export type Flow = z.infer<typeof flowSchema>;
export type FlowNode = Flow["nodes"][number];
export type FlowValues = Record<string, string>;
export function edges(
  node: FlowNode,
): Array<{ label: string; target: string | null }> {
  if (node.kind === "end") return [];
  if (node.kind === "random")
    return [
      { label: `${node.percent}%`, target: node.yes },
      { label: `${100 - node.percent}%`, target: node.no },
    ];
  if (node.kind === "condition")
    return [
      { label: "Yes", target: node.yes },
      { label: "No", target: node.no },
    ];
  if (node.kind === "question")
    return node.options.map((o) => ({ label: o.label, target: o.next }));
  if (node.kind === "email" || node.kind === "phone" || node.kind === "capture")
    return [
      { label: node.kind === "email" ? "Valid email" : node.kind === "phone" ? "Valid phone" : "Response", target: node.next },
      { label: "SKIP", target: node.skip },
    ];
  return [{ label: "Next", target: node.next }];
}
export function validateFlow(
  raw: unknown,
): { flow: Flow; errors: [] } | { flow: null; errors: string[] } {
  const parsed = flowSchema.safeParse(raw);
  if (!parsed.success)
    return {
      flow: null,
      errors: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .slice(0, 12),
    };
  const flow = parsed.data;
  const errors: string[] = [];
  const nodes = new Map(flow.nodes.map((n) => [n.id, n]));
  if (nodes.size !== flow.nodes.length) errors.push("Step IDs must be unique.");
  if (!nodes.has(flow.entry)) errors.push("Choose a starting step.");
  for (const n of flow.nodes) {
    for (const edge of edges(n))
      if (edge.target && !nodes.has(edge.target))
        errors.push(`${n.label}: connect ${edge.label} to an existing step.`);
    if (
      n.kind === "question" &&
      new Set(n.options.map((o) => o.label.toLowerCase())).size !==
        n.options.length
    )
      errors.push(`${n.label}: answer labels must be different.`);
  }
  // Waiting for an explicit customer response is the only legal cycle boundary.
  // Check every reachable node, then remove those boundaries for cycle detection.
  const seen = new Set<string>();
  function reach(key: string) {
    if (seen.has(key)) return;
    seen.add(key);
    const n = nodes.get(key);
    if (n) for (const edge of edges(n)) if (edge.target) reach(edge.target);
  }
  reach(flow.entry);
  for (const n of flow.nodes) {
    if (!seen.has(n.id)) errors.push(`${n.label}: this step is not connected to the starting step.`);
    if ((n.kind === "setfield" || n.kind === "question" || n.kind === "capture") && isReservedField(n.field))
      errors.push(`${n.label}: Instagram profile fields cannot be overwritten.`);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function acyclic(key: string) {
    if (visiting.has(key)) {
      errors.push("This flow contains an automatic loop. Every loop must wait for a customer response.");
      return;
    }
    if (visited.has(key)) return;
    const n = nodes.get(key);
    if (!n) return;
    visiting.add(key);
    if (!isResponseNode(n)) for (const edge of edges(n)) if (edge.target) acyclic(edge.target);
    visiting.delete(key);
    visited.add(key);
  }
  for (const n of flow.nodes) acyclic(n.id);
  const states = new Set<string>();
  function burst(key: string, sends: number, requests = 0) {
    const state = `${key}:${sends}:${requests}`;
    if (states.has(state)) return;
    states.add(state);
    const n = nodes.get(key);
    if (!n) return;
    const count = ["message", "product", "carousel", "email", "phone", "capture", "question"].includes(n.kind) ? sends + 1 : sends;
    if (count > 6) { errors.push("Use at most six messages between customer replies or delays."); return; }
    const external = requests + (n.kind === "webhook" ? 1 : 0);
    if (external > 3) { errors.push("Use at most three external requests between customer replies or delays."); return; }
    for (const edge of edges(n)) if (edge.target)
      burst(edge.target, isResponseNode(n) || n.kind === "delay" ? 0 : count, isResponseNode(n) || n.kind === "delay" ? 0 : external);
  }
  burst(flow.entry, 0);
  return errors.length
    ? { flow: null, errors: Array.from(new Set(errors)).slice(0, 12) }
    : { flow, errors: [] };
}
export function readFlow(value: unknown): Flow | null {
  return validateFlow(value).flow;
}
export function branchTarget(
  node: FlowNode,
  values: FlowValues,
  draw: number,
): string | null {
  if (node.kind === "random")
    return draw * 100 < node.percent ? node.yes : node.no;
  if (node.kind === "condition")
    return conditionMatches(values[node.field], node.equals, node.operator) ? node.yes : node.no;
  return "next" in node ? node.next : null;
}
export function resolveFlowText(text: string, values: FlowValues) {
  return text
    .replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (_, key) => values[key] ?? "")
    .slice(0, 1000);
}
export function responseTarget(
  node: FlowNode,
  text: string,
): { next: string | null; values: FlowValues } | null {
  const input = text.trim();
  if (node.kind === "email") {
    if (/^skip$/i.test(input)) return { next: node.skip, values: {} };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) && input.length <= 254)
      return { next: node.next, values: { email: input.toLowerCase() } };
  }
  if (node.kind === "capture") {
    if (/^skip$/i.test(input)) return { next: node.skip, values: {} };
    if (input.length > 0 && input.length <= 1000) return { next: node.next, values: { [node.field]: input } };
  }
  if (node.kind === "phone") {
    if (/^skip$/i.test(input)) return { next: node.skip, values: {} };
    // Accept an entire phone reply, never extract a number from incidental text.
    if (/^\+?[\d ()-]{7,25}$/.test(input)) {
      const normalized = input.replace(/[ ()-]/g, "");
      if (/^\+?\d{7,15}$/.test(normalized)) return { next: node.next, values: { phone: normalized } };
    }
  }
  if (node.kind === "question") {
    const option = node.options.find(
      (o) => o.label.toLowerCase() === input.toLowerCase(),
    );
    if (option)
      return { next: option.next, values: { [node.field]: option.label } };
  }
  return null;
}

export const PROFILE_FIELDS = ["_followsBusiness", "_businessFollows", "_verified", "_followerCount"] as const;
export function isReservedField(field: string): boolean {
  return field === "_linkClicked" || isProfileField(field);
}
export function isProfileField(field: string): boolean {
  return (PROFILE_FIELDS as readonly string[]).includes(field);
}
export function isResponseNode(node: FlowNode): boolean {
  return node.kind === "email" || node.kind === "phone" || node.kind === "capture" || node.kind === "question";
}
/** Unknown is not false: unavailable Meta fields must never pass a comparison. */
export function conditionMatches(actual: string | undefined, expected: string, operator: "eq" | "neq" | "contains" | "gt" | "lt" | "exists" = "eq"): boolean {
  if (actual === undefined) return false;
  if (operator === "exists") return actual.trim().length > 0;
  if (operator === "eq") return actual === expected;
  if (operator === "neq") return actual !== expected;
  if (operator === "contains") return actual.toLowerCase().includes(expected.toLowerCase());
  if (!actual.trim() || !expected.trim()) return false;
  const a = Number(actual), b = Number(expected);
  return Number.isFinite(a) && Number.isFinite(b) && (operator === "gt" ? a > b : a < b);
}

/** Shared by the server and preview; a removed tag is absent, not the string false. */
export function applyFlowTag(values: FlowValues, tag: string, action: "add" | "remove" = "add"): FlowValues {
  const next = { ...values };
  if (action === "remove") delete next[`tag_${tag}`];
  else next[`tag_${tag}`] = "true";
  return next;
}
