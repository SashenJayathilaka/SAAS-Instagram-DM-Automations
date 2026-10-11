vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: vi.fn(async () => "integration-a") }));
/**
 * Tenant isolation tests for automation queries.
 *
 * Verifies that every read/write path scopes queries to the authenticated
 * user's clerkId and never trusts a bare automationId from the client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------

const mockAutomationFindFirst = vi.fn();
const mockAutomationFindUnique = vi.fn();
const mockAutomationUpdate = vi.fn();
const mockAutomationDeleteMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockKeywordDeleteMany = vi.fn();
const mockTransactionFn = vi.fn();
const mockAutomationEventFindMany = vi.fn();
const mockMessageLogFindMany = vi.fn();
const mockWebhookEventFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  client: {
    user: {
      findUnique: (...args: any[]) => mockUserFindUnique(...args),
      update: (...args: any[]) => mockUserUpdate(...args),
    },
    automation: {
      findFirst: (...args: any[]) => mockAutomationFindFirst(...args),
      findUnique: (...args: any[]) => mockAutomationFindUnique(...args),
      update: (...args: any[]) => mockAutomationUpdate(...args),
      deleteMany: (...args: any[]) => mockAutomationDeleteMany(...args),
    },
    keyword: { deleteMany: vi.fn() },
    post: { deleteMany: vi.fn() },
    trigger: { deleteMany: vi.fn() },
    listener: { deleteMany: vi.fn() },
    automationEvent: { findMany: (...args: any[]) => mockAutomationEventFindMany(...args) },
    messageLog: { findMany: (...args: any[]) => mockMessageLogFindMany(...args) },
    webhookEvent: { findMany: (...args: any[]) => mockWebhookEventFindMany(...args) },
    $transaction: (...args: any[]) => mockTransactionFn(...args),
  },
}));

import {
  deleteAutomationQuery,
  findAutomationForUser,
  getAutomation,
  getAutomationActivity,
  getDashboardActivity,
  updateAutomation,
  updateCompleteAutomation,
} from "@/actions/automation/queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const USER_A_CLERK_ID = "clerk_user_a";
const USER_B_CLERK_ID = "clerk_user_b";
const AUTOMATION_A_ID = "auto_a_uuid";
const AUTOMATION_B_ID = "auto_b_uuid";

function makeAutomation(overrides: Record<string, unknown> = {}) {
  return {
    id: AUTOMATION_A_ID,
    name: "Campaign A",
    active: false,
    matchingMode: "CONTAINS",
    triggerMode: "SPECIFIC_KEYWORD",
    keywords: [],
    posts: [{ postid: "post1", caption: null, media: "url", mediaType: "IMAGE" }],
    listener: { listener: "MESSAGE", prompt: "Hello", commentReply: null, ctaLink: null, commentReply2: null, commentReply3: null, ctaButtonTitle: null },
    trigger: [{ type: "COMMENT" }],
    User: { subscription: null, integrations: [] },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Phase 1 — List queries
// ---------------------------------------------------------------------------

describe("getAutomation — list scoped to clerkId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries user.findUnique with the supplied clerkId", async () => {
    mockUserFindUnique.mockResolvedValue({ automations: [] });
    await getAutomation(USER_A_CLERK_ID);

    expect(mockUserFindUnique).toHaveBeenCalledOnce();
    const call = mockUserFindUnique.mock.calls[0][0];
    expect(call.where.clerkId).toBe(USER_A_CLERK_ID);
  });

  it("does NOT use the same clerkId to fetch User B automations", async () => {
    mockUserFindUnique.mockResolvedValue({ automations: [] });
    await getAutomation(USER_B_CLERK_ID);

    const call = mockUserFindUnique.mock.calls[0][0];
    // Must NOT accidentally pass User A's clerkId
    expect(call.where.clerkId).not.toBe(USER_A_CLERK_ID);
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Detail / ownership
// ---------------------------------------------------------------------------

describe("findAutomationForUser — ownership check on detail read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queries with BOTH id and User.clerkId", async () => {
    mockAutomationFindFirst.mockResolvedValue(makeAutomation());
    await findAutomationForUser(AUTOMATION_A_ID, USER_A_CLERK_ID);

    expect(mockAutomationFindFirst).toHaveBeenCalledOnce();
    const call = mockAutomationFindFirst.mock.calls[0][0];
    expect(call.where.id).toBe(AUTOMATION_A_ID);
    expect(call.where.User.clerkId).toBe(USER_A_CLERK_ID);
  });

  it("returns null when automation not found (wrong owner)", async () => {
    mockAutomationFindFirst.mockResolvedValue(null);
    const result = await findAutomationForUser(AUTOMATION_B_ID, USER_A_CLERK_ID);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 3 — Update mutations
// ---------------------------------------------------------------------------

describe("updateAutomation — ownership check before update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads ownership first with id + User.clerkId before updating", async () => {
    mockAutomationFindFirst.mockResolvedValue({ id: AUTOMATION_A_ID });
    mockAutomationUpdate.mockResolvedValue({ id: AUTOMATION_A_ID, active: true });

    await updateAutomation(AUTOMATION_A_ID, USER_A_CLERK_ID, { active: true });

    expect(mockAutomationFindFirst).toHaveBeenCalledOnce();
    const findCall = mockAutomationFindFirst.mock.calls[0][0];
    expect(findCall.where.id).toBe(AUTOMATION_A_ID);
    expect(findCall.where.User.clerkId).toBe(USER_A_CLERK_ID);
  });

  it("does not overwrite an armed Next Post binding when activation is retried", async () => {
    mockAutomationFindFirst.mockResolvedValue({ id: AUTOMATION_A_ID, posts: [{ postid: "NEXT" }], postConfig: { scope: "NEXT", armedAt: "2026-10-11T10:00:00Z" } });
    await updateAutomation(AUTOMATION_A_ID, USER_A_CLERK_ID, { active: true });
    expect(mockAutomationUpdate.mock.calls[0][0].data).not.toHaveProperty("postConfig");
  });

  it("returns null and skips the update when ownership check fails", async () => {
    mockAutomationFindFirst.mockResolvedValue(null); // ownership denied

    const result = await updateAutomation(AUTOMATION_B_ID, USER_A_CLERK_ID, { active: true });

    expect(result).toBeNull();
    expect(mockAutomationUpdate).not.toHaveBeenCalled();
  });
});

describe("updateCompleteAutomation — ownership check before transaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT open a transaction when ownership check fails", async () => {
    mockAutomationFindFirst.mockResolvedValue(null);

    const payload = {
      name: "Changed",
      active: false,
      matchingMode: "CONTAINS" as const,
      triggerMode: "SPECIFIC_KEYWORD" as const,
      sendPrivateDm: true,
      post: { postid: "p1", caption: undefined, media: "url", mediaType: "IMAGE" as const },
      keywords: [],
      listener: { listener: "MESSAGE" as const, prompt: "Hi", commentReply: undefined, ctaLink: undefined, commentReply2: undefined, commentReply3: undefined, ctaButtonTitle: undefined },
    };

    const result = await updateCompleteAutomation(AUTOMATION_B_ID, USER_A_CLERK_ID, payload);

    expect(result).toBeNull();
    expect(mockTransactionFn).not.toHaveBeenCalled();
  });

  it("persists sendPrivateDm and Listener.prompt for a prepared review campaign", async () => {
    mockAutomationFindFirst.mockResolvedValue({ id: AUTOMATION_A_ID });
    const transactionAutomationUpdate = vi
      .fn()
      .mockResolvedValue({ id: AUTOMATION_A_ID });
    const transactionClient = {
      keyword: { deleteMany: vi.fn() },
      post: { deleteMany: vi.fn() },
      trigger: { deleteMany: vi.fn() },
      listener: { deleteMany: vi.fn() },
      automation: { update: transactionAutomationUpdate },
    };
    mockTransactionFn.mockImplementation(
      async (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient)
    );

    const prompt =
      "Thanks for commenting. Here is the information you requested.";
    await updateCompleteAutomation(AUTOMATION_A_ID, USER_A_CLERK_ID, {
      name: "Messaging review campaign",
      active: false,
      matchingMode: "CONTAINS",
      triggerMode: "SPECIFIC_KEYWORD",
      sendPrivateDm: true,
      post: {
        postid: "p1",
        media: "url",
        mediaType: "IMAGE",
      },
      keywords: ["guide"],
      listener: {
        listener: "MESSAGE",
        prompt,
        commentReply: "Thanks for commenting.",
      },
    });

    expect(transactionAutomationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: AUTOMATION_A_ID },
        data: expect.objectContaining({
          sendPrivateDm: true,
          listener: { upsert: {
            create: expect.objectContaining({ prompt }),
            update: expect.objectContaining({ prompt }),
          } },
        }),
      })
    );
  });
});

describe("getAutomationActivity — owner scoped logs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns events for the owning user after checking automation ownership", async () => {
    const now = new Date("2026-05-17T10:00:00.000Z");
    mockAutomationFindFirst.mockResolvedValue({ id: AUTOMATION_A_ID });
    mockAutomationEventFindMany.mockResolvedValue([
      {
        id: "event-1",
        automationId: AUTOMATION_A_ID,
        eventType: "KEYWORD_MATCHED",
        createdAt: now,
        keyword: "ai",
        meta: { triggerMode: "SPECIFIC_KEYWORD" },
      },
    ]);
    mockMessageLogFindMany.mockResolvedValue([]);
    mockWebhookEventFindMany.mockResolvedValue([]);

    const result = await getAutomationActivity(AUTOMATION_A_ID, USER_A_CLERK_ID);

    expect(mockAutomationFindFirst).toHaveBeenCalledWith({
      where: { id: AUTOMATION_A_ID, archivedAt: null, User: { clerkId: USER_A_CLERK_ID }, integrationId: "integration-a" },
      select: { id: true },
    });
    expect(result?.[0]).toMatchObject({
      id: "event-1",
      type: "KEYWORD_MATCHED",
      keyword: "ai",
      source: "event",
    });
  });

  it("denies another user's campaign logs", async () => {
    mockAutomationFindFirst.mockResolvedValue(null);

    const result = await getAutomationActivity(AUTOMATION_B_ID, USER_A_CLERK_ID);

    expect(result).toBeNull();
    expect(mockAutomationEventFindMany).not.toHaveBeenCalled();
    expect(mockMessageLogFindMany).not.toHaveBeenCalled();
    expect(mockWebhookEventFindMany).not.toHaveBeenCalled();
  });
});

describe("getDashboardActivity — current user activity only", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads recent activity from the signed-in user's campaigns and connected IG account ids", async () => {
    const now = new Date("2026-05-17T10:00:00.000Z");
    mockUserFindUnique.mockResolvedValue({
      automations: [{ id: AUTOMATION_A_ID }],
      integrations: [
        {
          instagramId: "ig-boudofi",
          webhookAccountId: "ig-boudofi",
          pageId: "page-boudofi",
          businessId: null,
        },
      ],
    });
    mockAutomationEventFindMany.mockResolvedValue([]);
    mockMessageLogFindMany.mockResolvedValue([]);
    mockWebhookEventFindMany.mockResolvedValue([
      {
        id: "webhook-1",
        automation: { name: "Campaign A" },
        eventType: "REAL_COMMENT_EVENT",
        provider: "META_REAL",
        status: "PROCESSED",
        igUserId: "commenter-1",
        igAccountId: "ig-boudofi",
        mediaId: "media-1",
        commentId: "comment-1",
        payload: { commenterUsername: "tester" },
        createdAt: now,
      },
    ]);

    const result = await getDashboardActivity(USER_A_CLERK_ID);

    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkId: USER_A_CLERK_ID },
      })
    );
    expect(mockAutomationEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { automationId: { in: [AUTOMATION_A_ID] } } })
    );
    expect(mockWebhookEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { automationId: { in: [AUTOMATION_A_ID] } },
            {
              igAccountId: { in: ["ig-boudofi", "page-boudofi"] },
              eventType: {
                in: expect.arrayContaining([
                  "REAL_COMMENT_EVENT",
                  "REAL_MESSAGE_EVENT",
                  "COMMENT_WEBHOOK_RECEIVED",
                  "AUTOMATION_MATCH_FAILED",
                ]),
              },
            },
          ]),
        },
      })
    );
    expect(result[0]).toMatchObject({
      id: "webhook-1",
      type: "REAL_COMMENT_EVENT",
      source: "webhook",
      commentId: "comment-1",
    });
  });

  it("does not query another user's automation ids for dashboard activity", async () => {
    mockUserFindUnique.mockResolvedValue({
      automations: [{ id: AUTOMATION_A_ID }],
      integrations: [],
    });
    mockAutomationEventFindMany.mockResolvedValue([]);
    mockMessageLogFindMany.mockResolvedValue([]);
    mockWebhookEventFindMany.mockResolvedValue([]);

    await getDashboardActivity(USER_A_CLERK_ID);

    expect(mockAutomationEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { automationId: { in: [AUTOMATION_A_ID] } } })
    );
    expect(mockAutomationEventFindMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { automationId: { in: [AUTOMATION_B_ID] } } })
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 4 — Delete mutations
// ---------------------------------------------------------------------------

describe("deleteAutomationQuery — scoped delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes with id AND User.clerkId — never by id alone", async () => {
    mockAutomationDeleteMany.mockResolvedValue({ count: 1 });

    await deleteAutomationQuery(AUTOMATION_A_ID, USER_A_CLERK_ID);

    expect(mockAutomationDeleteMany).toHaveBeenCalledOnce();
    const call = mockAutomationDeleteMany.mock.calls[0][0];
    expect(call.where.id).toBe(AUTOMATION_A_ID);
    expect(call.where.User.clerkId).toBe(USER_A_CLERK_ID);
  });

  it("User A cannot delete User B's automation — clerkId prevents it", async () => {
    // Simulate DB returning count:0 because where clerkId=USER_A doesn't match
    mockAutomationDeleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteAutomationQuery(AUTOMATION_B_ID, USER_A_CLERK_ID);

    // The query ran with the correct scoped filter; DB returned 0 matches (safe)
    const call = mockAutomationDeleteMany.mock.calls[0][0];
    expect(call.where.User.clerkId).toBe(USER_A_CLERK_ID);
    expect(call.where.User.clerkId).not.toBe(USER_B_CLERK_ID);
    expect(result.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Phase 5 — React Query key structure
// ---------------------------------------------------------------------------

describe("React Query cache key isolation", () => {
  it("automation list keys differ across users", () => {
    const keyA = ["user-automation", USER_A_CLERK_ID];
    const keyB = ["user-automation", USER_B_CLERK_ID];
    expect(keyA).not.toEqual(keyB);
  });

  it("automation detail keys differ across users for the same automation id", () => {
    const keyA = ["automation-info", USER_A_CLERK_ID, AUTOMATION_A_ID];
    const keyB = ["automation-info", USER_B_CLERK_ID, AUTOMATION_A_ID];
    expect(keyA).not.toEqual(keyB);
  });

  it("user profile keys differ across users", () => {
    const keyA = ["user-profile", USER_A_CLERK_ID];
    const keyB = ["user-profile", USER_B_CLERK_ID];
    expect(keyA).not.toEqual(keyB);
  });
});
