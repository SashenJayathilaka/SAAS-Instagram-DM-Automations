import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  automationFlowSession: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  automationEngagementJob: { updateMany: vi.fn() },
  automationFlowReceipt: { createMany: vi.fn() },
  automationFlowEntry: { createMany: vi.fn(), updateMany: vi.fn() },
  automation: { findFirst: vi.fn() },
  inboxMessage: { findFirst: vi.fn() },
  automationClick: { findUnique: vi.fn() },
  lead: { upsert: vi.fn(), findUnique: vi.fn() },
}));
const send = vi.hoisted(() => vi.fn());
const webhook = vi.hoisted(() => vi.fn());
vi.mock("./webhook-request", () => ({ executeFlowWebhook: webhook }));
const profile = vi.hoisted(() => vi.fn());
const observeFollow = vi.hoisted(() => vi.fn());
vi.mock("@/lib/automation-tracking", () => ({ observeAutomationFollow: observeFollow }));
const quota = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ client: db }));
vi.mock("@/lib/send-token", () => ({
  resolveIntegrationSendToken: () => ({ ok: true, token: "test" }),
}));
vi.mock("@/lib/instagram-dm", () => ({ sendInstagramDirectResponse: send, getInstagramRecipientProfile: profile }));
vi.mock("@/actions/usage/queries", () => ({ canSendStaticReply: quota }));
vi.mock("@/actions/webhook/queries", () => ({
  createMessageLog: vi.fn(),
  createAutomationEvent: vi.fn(),
  recordOutboundInboxMessage: vi.fn(),
  trackResponse: vi.fn(),
}));
import { processAutomationFlow } from "./runtime";
import { templateFlow } from "./templates";
const now = new Date("2026-09-25T08:00:00Z");
const input = {
  integrationId: "i1",
  recipientIgId: "r1",
  text: "EBOOK",
  inboundAt: now,
  eventId: "mid1",
  automationId: "a1",
};
function automation(flow: import("./definition").Flow = configuredEmail()) {
  return {
    id: "a1",
    userId: "u1",
    integrationId: "i1",
    active: true,
    listener: { flowDefinition: flow },
    User: { status: "ACTIVE", subscription: { plan: "PRO" } },
    integration: { id: "i1", userId: "u1", status: "CONNECTED", instagramId: "ig1" },
  };
}
function session() {
  return {
    id: "s1",
    automationId: "a1",
    integrationId: "i1",
    recipientIgId: "r1",
    definition: configuredEmail(),
    values: {},
    nodeId: "email",
    status: "WAITING",
    expiresAt: new Date(now.getTime() + 3600000),
    updatedAt: new Date(now.getTime() - 1000),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  db.automationFlowSession.findUnique.mockResolvedValue(null);
  db.automation.findFirst.mockResolvedValue(automation());
  db.automationFlowSession.create.mockResolvedValue({
    ...session(),
    status: "READY",
  });
  db.automationFlowSession.updateMany.mockResolvedValue({ count: 1 });
  db.automationFlowSession.findFirst.mockResolvedValue({ id: "s1" });
  db.automationFlowReceipt.createMany.mockResolvedValue({ count: 1 });
  db.automationFlowEntry.createMany.mockResolvedValue({ count: 1 });
  db.inboxMessage.findFirst.mockResolvedValue(null);
  quota.mockResolvedValue({ ok: true });
  profile.mockResolvedValue(null);
  db.lead.findUnique.mockResolvedValue(null);
  db.automationClick.findUnique.mockResolvedValue(null);
  send.mockResolvedValue({ ok: true, messageIds: ["out1"] });
  webhook.mockResolvedValue({ status: 200 });
});
afterEach(() => vi.useRealTimers());
describe("persistent flow delivery", () => {
  it("starts email collection without delivering the resource early", async () => {
    expect(await processAutomationFlow(input)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].message).not.toContain("Reply SKIP");
    expect(db.automationFlowSession.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "WAITING", nodeId: "email" }),
      }),
    );
  });
  it("saves an explicit email and resumes the waiting step", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    await processAutomationFlow({
      ...input,
      automationId: undefined,
      text: "Person@Example.com",
    });
    expect(db.lead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ email: "person@example.com" }),
      }),
    );
    expect(send.mock.calls[0][0].message).toContain("resource you requested");
  });
  it("does not save a lead on SKIP", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    await processAutomationFlow({
      ...input,
      automationId: undefined,
      text: "SKIP",
    });
    expect(db.lead.upsert).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("leaves invalid email replies waiting without delivering links", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    await processAutomationFlow({
      ...input,
      automationId: undefined,
      text: "not an email",
    });
    expect(send).not.toHaveBeenCalled();
    expect(db.lead.upsert).not.toHaveBeenCalled();
  });
  it("cancels STOP and blocks further messages during the opt-out window", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    await processAutomationFlow({ ...input, text: "STOP" });
    expect(db.automationFlowSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "STOPPED" }),
      }),
    );
    db.automationFlowSession.findUnique.mockResolvedValue({
      ...session(),
      status: "STOPPED",
    });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("releases a stale lease without retrying its uncertain send", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue({
      ...session(),
      status: "PROCESSING:old",
      updatedAt: new Date(now.getTime() - 100000),
    });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "FAILED" } }),
    );
  });
  it("cancels an earlier email request when a new flow takes over", async () => {
    await processAutomationFlow(input);
    expect(db.automationEngagementJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipientIgId: "r1",
          automation: { integrationId: "i1" },
        }),
        data: { status: "CANCELLED" },
      }),
    );
  });
  it("does not replay a receipt from an earlier turn", async () => {
    db.automationFlowReceipt.createMany.mockResolvedValue({ count: 0 });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not restart from a duplicate opening button", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue({
      ...session(),
      startEventId: "comment1",
    });
    await processAutomationFlow({ ...input, startEventId: "comment1" });
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects concurrent turn claims", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    db.automationFlowSession.updateMany.mockResolvedValue({ count: 0 });
    await processAutomationFlow({ ...input, automationId: undefined });
    expect(send).not.toHaveBeenCalled();
  });
  it("does not retry an ambiguous crashed send", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue({
      ...session(),
      status: "PROCESSING:old",
    });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("enforces one entry per person before drawing an outcome", async () => {
    db.automation.findFirst.mockResolvedValue(
      automation(templateFlow("giveaway")),
    );
    db.automationFlowEntry.createMany.mockResolvedValue({ count: 0 });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("uses the receiving account and blocks an expired window", async () => {
    await processAutomationFlow({
      ...input,
      inboundAt: new Date(now.getTime() - 86400001),
    });
    expect(send).not.toHaveBeenCalled();
    expect(db.automation.findFirst).not.toHaveBeenCalled();
  });
  it("honors Pro publishing access at delivery time", async () => {
    const a = automation();
    a.User.subscription.plan = "FREE";
    db.automation.findFirst.mockResolvedValue(a);
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects an integration belonging to another account owner", async () => {
    const a = automation();
    a.integration.userId = "other-owner";
    db.automation.findFirst.mockResolvedValue(a);
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowReceipt.createMany).not.toHaveBeenCalled();
  });
  it("rechecks the messaging window after asynchronous delivery checks", async () => {
    quota.mockImplementation(async () => { vi.setSystemTime(new Date(now.getTime() + 86400000)); return { ok: true }; });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not consume messages for a paused custom flow", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    db.automation.findFirst.mockResolvedValue(null);
    expect(
      await processAutomationFlow({ ...input, automationId: undefined }),
    ).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it("stops when a human has replied after the bot question", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(session());
    db.inboxMessage.findFirst.mockResolvedValue({ id: "manual" });
    await processAutomationFlow({ ...input, automationId: undefined });
    expect(send).not.toHaveBeenCalled();
  });
  it("does not bypass a exhausted action budget", async () => {
    quota.mockResolvedValue({ ok: false });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });
});

function configuredEmail() {
  const flow = templateFlow("email");
  for (const node of flow.nodes)
    if (node.kind === "message")
      node.links = [
        { label: "Get resource", url: "https://ap3k.com/resource" },
      ];
  return flow;
}

const base = { x: 0, y: 0, label: "Step" };
const message = (id: string, next: string | null = null) => ({ ...base, id, kind: "message" as const, text: id, links: [], next });
function delayedFlow(seconds = 10) {
  return { version: 1 as const, entry: "wait", oncePerContact: false, nodes: [
    { ...base, id: "wait", kind: "delay" as const, seconds, next: "delivery" }, message("delivery"),
  ] };
}
function delayedSession() {
  return { ...session(), definition: delayedFlow(), nodeId: "delivery", status: "SCHEDULED", resumeAt: new Date(now.getTime() - 1000) };
}
function scheduledInput() {
  return { integrationId: "i1", recipientIgId: "r1", text: "", eventId: "delay:s1:due", scheduled: { sessionId: "s1", resumeAt: delayedSession().resumeAt } };
}
describe("flow scheduling and reference nodes", () => {
  it("starts after an entry question already answered by the opening callback", async () => {
    db.automation.findFirst.mockResolvedValue(automation(profileFlow()));
    profile.mockResolvedValue({ followsBusiness: true });
    await processAutomationFlow({ ...input, startNodeId: "condition", initialValues: { answer: "I followed" }, startEventId: "comment1" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].message).toBe("yes");
    expect(db.lead.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { customFields: { answer: "I followed" } } }));
  });
  it("does not trust an unknown opening callback destination", async () => {
    await processAutomationFlow({ ...input, startNodeId: "missing" });
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowReceipt.createMany).not.toHaveBeenCalled();
  });
  it("preserves contact custom fields for later flow entries", async () => {
    db.lead.findUnique.mockResolvedValue({ customFields: { name: "Alex" }, email: "alex@example.com" });
    db.automation.findFirst.mockResolvedValue(automation({ version: 1, entry: "greet", oncePerContact: false, nodes: [{ ...message("greet"), text: "Hi {{name}}, we have {{email}}" }] }));
    await processAutomationFlow(input);
    expect(send.mock.calls[0][0].message).toBe("Hi Alex, we have alex@example.com");
  });
  it("persists a delay without sleeping or sending early", async () => {
    db.automation.findFirst.mockResolvedValue(automation(delayedFlow()));
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SCHEDULED", nodeId: "delivery", resumeAt: new Date(now.getTime() + 10000) }) }));
  });
  it("wakes a short delay in the background only after its due date", async () => {
    const wake = vi.fn();
    db.automation.findFirst.mockResolvedValue(automation(delayedFlow()));
    await processAutomationFlow({ ...input, scheduleWake: wake });
    expect(wake).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    db.automationFlowSession.findUnique.mockResolvedValue({ ...delayedSession(), resumeAt: new Date(now.getTime() + 10000) });
    await vi.advanceTimersByTimeAsync(9999);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await wake.mock.calls[0][0];
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("keeps a second short delay durable instead of extending the request forever", async () => {
    const wake = vi.fn();
    const flow = delayedFlow();
    const wait = flow.nodes[0];
    if (wait.kind === "delay") wait.next = "wait2";
    flow.nodes.push({ ...base, id: "wait2", kind: "delay", seconds: 10, next: "delivery" });
    db.automation.findFirst.mockResolvedValue(automation(flow));
    await processAutomationFlow({ ...input, scheduleWake: wake });
    db.automationFlowSession.findUnique.mockResolvedValue({ ...delayedSession(), definition: flow, nodeId: "wait2", resumeAt: new Date(now.getTime() + 10000) });
    await vi.advanceTimersByTimeAsync(10000);
    await wake.mock.calls[0][0];
    expect(wake).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(db.automationFlowSession.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "SCHEDULED", nodeId: "delivery" }) }));
  });
  it("never creates a short wake for a long delay", async () => {
    const wake = vi.fn();
    db.automation.findFirst.mockResolvedValue(automation(delayedFlow(60)));
    await processAutomationFlow({ ...input, scheduleWake: wake });
    expect(wake).not.toHaveBeenCalled();
  });
  it("resumes a due delay without extending the original messaging window", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(delayedSession());
    await processAutomationFlow(scheduledInput());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].message).toBe("delivery");
    expect(db.automationFlowSession.updateMany.mock.calls[0][0].data.expiresAt).toEqual(delayedSession().expiresAt);
  });
  it.each(["STOPPED", "CANCELLED", "PROCESSING:other", "COMPLETED"])("does not resume a %s delay", async (status) => {
    db.automationFlowSession.findUnique.mockResolvedValue({ ...delayedSession(), status });
    await processAutomationFlow(scheduledInput());
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowReceipt.createMany).not.toHaveBeenCalled();
  });
  it("does not resume before due time or from a stale queue selection", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue({ ...delayedSession(), resumeAt: new Date(now.getTime() + 10000) });
    await processAutomationFlow(scheduledInput());
    expect(send).not.toHaveBeenCalled();
  });
  it("cancels expired delays without a send", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue({ ...delayedSession(), expiresAt: now });
    await processAutomationFlow(scheduledInput());
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "CANCELLED", resumeAt: null } }));
  });
  it("cancels a delay that would exceed the remaining window", async () => {
    db.automation.findFirst.mockResolvedValue(automation(delayedFlow(86400)));
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED", resumeAt: null }) }));
  });
  it("does not allow a casual reply to skip a delay", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(delayedSession());
    await processAutomationFlow({ ...input, automationId: undefined, text: "hello" });
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).not.toHaveBeenCalled();
  });
  it("does not double send a due delay when another worker owns its receipt", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(delayedSession());
    db.automationFlowReceipt.createMany.mockResolvedValue({ count: 0 });
    await processAutomationFlow(scheduledInput());
    expect(send).not.toHaveBeenCalled();
  });
  it("cancels a due delay after manual takeover", async () => {
    db.automationFlowSession.findUnique.mockResolvedValue(delayedSession());
    db.inboxMessage.findFirst.mockResolvedValue({ id: "human" });
    await processAutomationFlow(scheduledInput());
    expect(send).not.toHaveBeenCalled();
  });
  it("collects a phone only after an explicit valid answer", async () => {
    const flow = { version: 1 as const, entry: "phone", oncePerContact: false, nodes: [
      { ...base, id: "phone", kind: "phone" as const, text: "Your phone?", next: "delivery", skip: "delivery" }, message("delivery"),
    ] };
    db.automationFlowSession.findUnique.mockResolvedValue({ ...session(), definition: flow, nodeId: "phone" });
    await processAutomationFlow({ ...input, automationId: undefined, text: "+212 600-123456" });
    expect(db.lead.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { phone: "+212600123456" } }));
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("checks fresh profile facts and records verified follow observations", async () => {
    const flow = profileFlow();
    db.automationFlowSession.findUnique.mockResolvedValue({ ...session(), definition: flow, nodeId: "question", values: { _followsBusiness: "true" } });
    profile.mockResolvedValue({ followsBusiness: false });
    await processAutomationFlow({ ...input, automationId: undefined, text: "I followed" });
    expect(profile).toHaveBeenCalledTimes(1);
    expect(observeFollow).toHaveBeenCalledWith({ integrationId: "i1", automationId: "a1", recipientIgId: "r1", followsBusiness: false });
    expect(send.mock.calls[0][0].message).toBe("no");
  });
  it("does not fabricate a profile fact when Meta lookup fails", async () => {
    const flow = profileFlow();
    const c = flow.nodes.find(n => n.kind === "condition");
    if (c?.kind === "condition") c.operator = "neq";
    db.automationFlowSession.findUnique.mockResolvedValue({ ...session(), definition: flow, nodeId: "question", values: { _followsBusiness: "false" } });
    await processAutomationFlow({ ...input, automationId: undefined, text: "I followed" });
    expect(send.mock.calls[0][0].message).toBe("no");
    expect(observeFollow).not.toHaveBeenCalled();
  });
  it("persists custom fields before rendering messages", async () => {
    const flow = { version: 1 as const, entry: "set", oncePerContact: false, nodes: [
      { ...base, id: "set", kind: "setfield" as const, field: "coupon", value: "WELCOME", next: "delivery" }, { ...message("delivery"), text: "Code: {{coupon}}" },
    ] };
    db.automation.findFirst.mockResolvedValue(automation(flow));
    await processAutomationFlow(input);
    expect(send.mock.calls[0][0].message).toBe("Code: WELCOME");
  });
  it("merges captured custom fields without erasing existing contact data", async () => {
    const flow = { version: 1 as const, entry: "name", oncePerContact: false, nodes: [
      { ...base, id: "name", kind: "capture" as const, field: "name", text: "Name?", next: "delivery", skip: "delivery" }, message("delivery"),
    ] };
    db.automationFlowSession.findUnique.mockResolvedValue({ ...session(), definition: flow, nodeId: "name" });
    db.lead.findUnique.mockResolvedValue({ customFields: { company: "Example", name: "Old" } });
    await processAutomationFlow({ ...input, automationId: undefined, text: "Alex" });
    expect(db.lead.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { customFields: { company: "Example", name: "Alex" } } }));
  });
  it.each([true, false])("uses real recipient link attribution (clicked=%s)", async (clicked) => {
    const flow = profileFlow();
    const node = flow.nodes.find(n => n.kind === "condition");
    if (node?.kind === "condition") node.field = "_linkClicked";
    db.automationFlowSession.findUnique.mockResolvedValue({ ...session(), definition: flow, nodeId: "question" });
    db.automationClick.findUnique.mockResolvedValue(clicked ? { id: "click1" } : null);
    await processAutomationFlow({ ...input, automationId: undefined, text: "I followed" });
    expect(send.mock.calls[0][0].message).toBe(clicked ? "yes" : "no");
    expect(db.automationClick.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { automationId_recipientIgId: { automationId: "a1", recipientIgId: "r1" } } }));
    expect(profile).not.toHaveBeenCalled();
  });
  it("passes a complete carousel to the authenticated sender", async () => {
    const cards = [{ title: "Guide", subtitle: "Get it", image: "https://ap3k.com/guide.png", links: [{ label: "Open", url: "https://ap3k.com/guide" }] }];
    db.automation.findFirst.mockResolvedValue(automation({ version: 1, entry: "carousel", oncePerContact: false, nodes: [{ ...base, id: "carousel", kind: "carousel", text: "Resources", cards, next: null }] }));
    await processAutomationFlow(input);
    expect(send.mock.calls[0][0]).toMatchObject({ carouselCards: cards, responseFormat: "PRODUCT_CARD" });
  });
});
function profileFlow(): import("./definition").Flow {
  return { version: 1, entry: "question", oncePerContact: false, nodes: [
    { ...base, id: "question", kind: "question", text: "Follow us", field: "answer", options: [{ label: "I followed", next: "condition" }] },
    { ...base, id: "condition", kind: "condition", field: "_followsBusiness", equals: "true", yes: "yes", no: "no" }, message("yes"), message("no"),
  ] };
}

describe("flow external side effects", () => {
  function externalFlow(): import("./definition").Flow {
    return { version: 1, oncePerContact: false, entry: "request", nodes: [
      { ...base, id: "request", kind: "webhook", url: "https://hooks.zapier.com/hooks/catch/example/", body: '{"email":"{{email}}"}', next: "delivery" }, message("delivery"),
    ] };
  }
  it("posts once through the bounded executor then advances to the next message", async () => {
    db.automation.findFirst.mockResolvedValue(automation(externalFlow()));
    await processAutomationFlow(input);
    expect(webhook).toHaveBeenCalledTimes(1);
    expect(webhook.mock.calls[0][0]).toMatchObject({ url: "https://hooks.zapier.com/hooks/catch/example/", body: '{"email":"{{email}}"}', idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/), beforeSend: expect.any(Function) });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("does not execute after losing its lease or receiving a duplicate event", async () => {
    db.automation.findFirst.mockResolvedValue(automation(externalFlow()));
    db.automationFlowSession.findFirst.mockResolvedValue(null);
    await processAutomationFlow(input);
    expect(webhook).not.toHaveBeenCalled();
    db.automationFlowSession.findFirst.mockResolvedValue({ id: "s1" });
    db.automationFlowReceipt.createMany.mockResolvedValue({ count: 0 });
    await processAutomationFlow(input);
    expect(webhook).not.toHaveBeenCalled();
  });
  it("rechecks active state and the original messaging window after DNS", async () => {
    db.automation.findFirst.mockResolvedValue(automation(externalFlow()));
    webhook.mockImplementation(async ({ beforeSend }) => {
      vi.setSystemTime(new Date(now.getTime() + 86400000));
      expect(await beforeSend()).toBe(false);
      throw new Error("webhook_cancelled");
    });
    await processAutomationFlow(input);
    expect(send).not.toHaveBeenCalled();
  });
  it("fails closed without retrying an uncertain POST or sending downstream content", async () => {
    db.automation.findFirst.mockResolvedValue(automation(externalFlow()));
    webhook.mockRejectedValue(new Error("webhook_timeout"));
    await processAutomationFlow(input);
    expect(webhook).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationFlowSession.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", nodeId: "request" }) }));
  });
  it("removes a tag from persistent contact values before evaluating a condition", async () => {
    const flow: import("./definition").Flow = { version: 1, oncePerContact: false, entry: "remove", nodes: [
      { ...base, id: "remove", kind: "tag", tag: "vip", action: "remove", next: "check" },
      { ...base, id: "check", kind: "condition", field: "tag_vip", operator: "exists", equals: "", yes: "yes", no: "no" }, message("yes"), message("no"),
    ] };
    db.lead.findUnique.mockResolvedValueOnce({ customFields: { tag_vip: "true", name: "Alex" } }).mockResolvedValueOnce({ customFields: { tag_vip: "true", name: "Alex" } }).mockResolvedValue({ customFields: { name: "Alex" } });
    db.automation.findFirst.mockResolvedValue(automation(flow));
    await processAutomationFlow(input);
    expect(db.lead.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { customFields: { name: "Alex" } } }));
    expect(send.mock.calls[0][0].message).toBe("no");
  });
});
