import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  automationEngagementJob: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  automationSchedulerHeartbeat: { findUnique: vi.fn(), upsert: vi.fn() },
  automation: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
  lead: { findUnique: vi.fn(), upsert: vi.fn() },
  conversation: { findUnique: vi.fn() },
  inboxMessage: { findFirst: vi.fn() },
}));
const wake=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/qstash-delivery-wake",()=>({scheduleDeliveryWake:wake}));
const profile = vi.hoisted(() => vi.fn());
const send = vi.hoisted(() => vi.fn());
const quota = vi.hoisted(() => vi.fn());
vi.mock("./automation-tracking", () => ({ observeAutomationFollow: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: db }));
vi.mock("@/actions/webhook/queries", () => ({
  createMessageLog: vi.fn(),
  trackResponse: vi.fn(),
  recordOutboundInboxMessage: vi.fn(),
}));
vi.mock("@/actions/usage/queries", () => ({ canSendStaticReply: quota }));
vi.mock("@/lib/instagram-dm", () => ({
  getInstagramRecipientProfile: profile,
  sendInstagramDirectResponse: send,
}));
vi.mock("@/lib/send-token", () => ({
  resolveIntegrationSendToken: () => ({ ok: true, token: "test" }),
}));
import {
  beginEmailRequest,
  followUpSchedulerReady,
  processAutomationFollowUps,
  scheduleFollowUp,
  takeEmailReply,
  recordEngagementReceipt,
} from "./automation-engagement";
const now = new Date("2026-09-24T05:30:00Z");
const inboundAt = new Date("2026-09-24T05:00:00Z");
const job = {
  id: "job-1",
  automationId: "a1",
  recipientIgId: "r1",
  flowId: "comment-1",
  kind: "FOLLOW_UP",
  inboundAt,
  dueAt: now,
  expiresAt: new Date("2026-09-25T05:00:00Z"),
  createdAt: new Date("2026-09-24T05:00:01Z"),
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  db.automationEngagementJob.updateMany.mockResolvedValue({ count: 1 });
  db.automationEngagementJob.findMany.mockResolvedValue([job]);
  db.automationEngagementJob.findUnique.mockResolvedValue({
    status: "PROCESSING",
  });
  db.automation.findUnique.mockResolvedValue({
    id: "a1",
    userId: "u1",
    active: true,
    sendPrivateDm: true,
    User: { status: "ACTIVE", subscription: { plan: "PRO" } },
    integration: { id: "i1", instagramId: "ig1", status: "CONNECTED" },
    listener: {
      followUpEnabled: true,
      followUpMessage: "Your link",
      ctaLink: "https://ap3k.com",
      ctaButtonTitle: "Open",
    },
  });
  db.conversation.findUnique.mockResolvedValue({ lastInboundAt: inboundAt });
  db.inboxMessage.findFirst.mockResolvedValue(null);
  quota.mockResolvedValue({ ok: true });
  send.mockResolvedValue({ ok: true, messageIds: ["meta1"] });
});
afterEach(() => vi.useRealTimers());
describe("durable engagement delivery", () => {
  it("cancels scheduled follow-ups after a downgrade to Free", async () => {
    const automation = await db.automation.findUnique();
    db.automation.findUnique.mockResolvedValue({
      ...automation,
      User: { status: "ACTIVE", subscription: { plan: "FREE" } },
    });
    await processAutomationFollowUps(now);
    expect(send).not.toHaveBeenCalled();
    expect(db.automationEngagementJob.update).toHaveBeenCalledWith({
      where: { id: job.id },
      data: { status: "CANCELLED" },
    });
  });
  it("does not advertise a scheduler with an expired or missing heartbeat", async () => {
    db.automationSchedulerHeartbeat.findUnique.mockResolvedValue(null);
    expect(await followUpSchedulerReady()).toBe(false);
    await scheduleFollowUp("a1", "r1", "flow", inboundAt, 30);
    expect(db.automationEngagementJob.upsert).not.toHaveBeenCalled();
    db.automationSchedulerHeartbeat.findUnique.mockResolvedValue({
      lastRunAt: new Date(now.getTime() - 21 * 60_000),
    });
    expect(await followUpSchedulerReady()).toBe(false);
  });
  it("scopes email collection to a live request on the receiving account", async () => {
    db.automationEngagementJob.findFirst.mockResolvedValue({
      ...job,
      kind: "EMAIL",
    });
    expect(
      await takeEmailReply("i1", "r1", "Person@Example.com", now),
    ).toMatchObject({ kind: "continue", jobId: "job-1" });
    expect(db.automationEngagementJob.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          recipientIgId: "r1",
          status: "WAITING",
          automation: expect.objectContaining({
            integrationId: "i1",
            active: true,
          }),
        }),
      }),
    );
    expect(db.lead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { email: "person@example.com", emailCollectedAt: now },
      }),
    );
  });
  it("consumes a replayed email webhook before another automation can match", async () => {
    db.automationEngagementJob.findFirst.mockResolvedValue({
      id: "already-handled",
    });
    expect(
      await takeEmailReply(
        "i1",
        "r1",
        "person@example.com",
        now,
        "meta-email-1",
      ),
    ).toEqual({ kind: "waiting" });
    expect(db.lead.upsert).not.toHaveBeenCalled();
    expect(db.automationEngagementJob.updateMany).not.toHaveBeenCalled();
  });
  it("allows skip without creating an email or a marketing subscription", async () => {
    db.automationEngagementJob.findFirst.mockResolvedValue(job);
    expect(await takeEmailReply("i1", "r1", "SKIP", now)).toMatchObject({
      kind: "continue",
    });
    expect(db.lead.upsert).not.toHaveBeenCalled();
  });
  it("does not process an email when another webhook owns the claim", async () => {
    db.automationEngagementJob.findFirst.mockResolvedValue(job);
    db.automationEngagementJob.updateMany.mockResolvedValue({ count: 0 });
    expect(await takeEmailReply("i1", "r1", "person@example.com", now)).toEqual(
      { kind: "waiting" },
    );
    expect(db.lead.upsert).not.toHaveBeenCalled();
  });
  it("does not issue a duplicate email request after a claim collision", async () => {
    db.lead.findUnique.mockResolvedValue(null);
    db.automationEngagementJob.findUnique.mockResolvedValue(null);
    db.automationEngagementJob.create.mockRejectedValue({ code: "P2002" });
    expect(await beginEmailRequest("a1", "r1", "flow", now)).toEqual({
      kind: "waiting",
    });
  });
  it("claims a reminder once, sends text without reattaching the main buttons, then records terminal state", async () => {
    expect(await processAutomationFollowUps(now)).toEqual({
      checked: 1,
      sent: 1,
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: "TEXT",
        message: "Your link",
        recipientId: "r1",
      }),
    );
    expect(send.mock.calls[0][0]).not.toHaveProperty("linkButtons");
    expect(db.automationEngagementJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "COMPLETED" } }),
    );
  });
  it.each([
    "replied",
    "human",
    "quota",
    "paused",
    "disconnected",
    "claimed",
    "cancelled-during-checks",
  ])("cancels delivery when %s", async (reason) => {
    if (reason === "cancelled-during-checks")
      db.automationEngagementJob.findUnique.mockResolvedValue({
        status: "CANCELLED",
      });
    if (reason === "replied")
      db.conversation.findUnique.mockResolvedValue({
        lastInboundAt: new Date(now.getTime() - 1000),
      });
    if (reason === "human")
      db.inboxMessage.findFirst.mockResolvedValue({ id: "manual" });
    if (reason === "quota") quota.mockResolvedValue({ ok: false });
    if (reason === "paused")
      db.automation.findUnique.mockResolvedValue({ active: false });
    if (reason === "disconnected")
      db.automation.findUnique.mockResolvedValue({
        active: true,
        integration: { status: "DISCONNECTED" },
      });
    if (reason === "claimed")
      db.automationEngagementJob.updateMany.mockResolvedValue({ count: 0 });
    expect((await processAutomationFollowUps(now)).sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not retry an ambiguous Meta failure", async () => {
    send.mockRejectedValue(new Error("timeout"));
    await processAutomationFollowUps(now);
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.automationEngagementJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "job-1" }),
        data: { status: "FAILED" },
      }),
    );
  });
});

describe("phone and behavior delivery", () => {
  it("stores valid phone in Contacts, without inventing email consent", async () => {
    db.automationEngagementJob.findFirst.mockResolvedValue({
      ...job,
      kind: "PHONE",
    });
    expect(
      await takeEmailReply("i1", "r1", "+1 (415) 555-0123", now),
    ).toMatchObject({ kind: "continue", captureKind: "PHONE" });
    expect(db.lead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { phone: "+14155550123" } }),
    );
  });
  it("keeps invalid phone pending without delivering the link", async () => {
    db.automationEngagementJob.findFirst.mockResolvedValue({
      ...job,
      kind: "PHONE",
    });
    expect(await takeEmailReply("i1", "r1", "hello", now)).toEqual({
      kind: "waiting",
    });
    expect(db.lead.upsert).not.toHaveBeenCalled();
    expect(db.automationEngagementJob.updateMany).not.toHaveBeenCalled();
  });
  it("skips phone already stored", async () => {
    db.lead.findUnique.mockResolvedValue({ phone: "+14155550123" });
    expect(await beginEmailRequest("a1", "r1", "f", now, "PHONE")).toEqual({
      kind: "complete",
    });
    expect(db.automationEngagementJob.create).not.toHaveBeenCalled();
  });
  it("scopes read and reaction receipts to the original outbound message", async () => {
    await recordEngagementReceipt("i1", "r1", {
      read: { mid: "m1" },
      timestamp: now.getTime(),
    });
    expect(db.automationEngagementJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          automation: { integrationId: "i1" },
          recipientIgId: "r1",
          sentMessageId: "m1",
        }),
        data: { seenAt: now },
      }),
    );
    await recordEngagementReceipt("i1", "r1", {
      reaction: { mid: "m1", action: "unreact" },
      timestamp: now.getTime(),
    });
    expect(db.automationEngagementJob.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { reactedAt: null } }),
    );
  });
  it.each(["SEEN", "REACTED", "CLICKED", "FOLLOWED", "UNFOLLOWED"])(
    "does not send %s without matching evidence",
    async (condition) => {
      db.automationEngagementJob.findMany.mockResolvedValue([
        { ...job, condition },
      ]);
      profile.mockResolvedValue({});
      expect((await processAutomationFollowUps(now)).sent).toBe(0);
      expect(send).not.toHaveBeenCalled();
    },
  );
  it.each(["SEEN", "REACTED", "CLICKED"])(
    "sends %s only with recorded evidence",
    async (condition) => {
      db.automationEngagementJob.findMany.mockResolvedValue([
        { ...job, condition },
      ]);
      db.automationEngagementJob.findUnique.mockResolvedValue({
        status: "PROCESSING",
        seenAt: now,
        reactedAt: now,
        clickedAt: now,
      });
      expect((await processAutomationFollowUps(now)).sent).toBe(1);
    },
  );
});

it("uses the original deadline to wake a 30-second follow-up and never wakes completed jobs",async()=>{
 db.automationSchedulerHeartbeat.findUnique.mockResolvedValue({lastRunAt:now});
 const dueAt=new Date(now.getTime()+30000);
 db.automationEngagementJob.upsert.mockResolvedValue({id:"reminder",status:"PENDING",dueAt});
 await scheduleFollowUp("a1","r1","flow",now,0.5);
 expect(db.automationEngagementJob.upsert).toHaveBeenCalledWith(expect.objectContaining({create:expect.objectContaining({dueAt}),update:{}}));
 expect(wake).toHaveBeenCalledWith({id:"reminder",status:"PENDING",dueAt});
 wake.mockClear();db.automationEngagementJob.upsert.mockResolvedValue({id:"reminder",status:"COMPLETED",dueAt});
 await scheduleFollowUp("a1","r1","flow",now,0.5);expect(wake).not.toHaveBeenCalled();
});
it("personalizes the follow-up that actually gets delivered",async()=>{
 const automation=await db.automation.findUnique();automation.listener.followUpMessage="Hey {{username}}, did you see my message?";profile.mockResolvedValue({username:"creator"});
 await processAutomationFollowUps(now);
 expect(send).toHaveBeenCalledWith(expect.objectContaining({message:"Hey @creator, did you see my message?",responseFormat:"TEXT"}));
});

describe('capture retry messages',()=>{
 async function prepare(kind:'EMAIL'|'PHONE',plan='PRO') {
  db.automationEngagementJob.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({...job,kind});
  const a=await db.automation.findUnique();db.automation.findUnique.mockResolvedValue({...a,User:{status:'ACTIVE',subscription:{plan}},listener:{emailCaptureEnabled:true,phoneCaptureEnabled:true,emailCaptureRetryMessage:'{{username}}, please enter a valid email.',phoneCaptureRetryMessage:'Please include your country code.'}});
  db.conversation.findUnique.mockResolvedValue({recipientUsername:'creator'});
 }
 it.each(['EMAIL','PHONE'] as const)('sends the configured %s retry exactly once for an invalid inbound and keeps waiting',async kind=>{
  await prepare(kind);expect(await takeEmailReply('i1','r1','not valid',now,'invalid-1')).toEqual({kind:'waiting'});
  expect(send).toHaveBeenCalledOnce();expect(send).toHaveBeenCalledWith(expect.objectContaining({message:kind==='EMAIL'?'@creator, please enter a valid email.':'Please include your country code.',responseFormat:'TEXT'}));
  expect(db.lead.upsert).not.toHaveBeenCalled();expect(db.automationEngagementJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{replyMessageId:'invalid-1'}}));
  db.automationEngagementJob.findFirst.mockResolvedValue({id:job.id});await takeEmailReply('i1','r1','not valid',now,'invalid-1');expect(send).toHaveBeenCalledOnce();
 });
 it('does not send retries after a paid account downgrades',async()=>{await prepare('EMAIL','FREE');await takeEmailReply('i1','r1','not valid',now,'invalid-1');expect(send).not.toHaveBeenCalled();});
 it('does not send a retry when another webhook already claimed the inbound',async()=>{await prepare('EMAIL');db.automationEngagementJob.updateMany.mockResolvedValue({count:0});await takeEmailReply('i1','r1','bad',now,'invalid-1');expect(send).not.toHaveBeenCalled();});
});
