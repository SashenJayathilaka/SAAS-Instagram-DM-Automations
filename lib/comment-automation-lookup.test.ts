import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIntegrationFindMany = vi.fn();
const mockIntegrationFindFirst = vi.fn();
const mockIntegrationUpdate = vi.fn();
const mockAutomationFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  client: {
    integrations: {
      findMany: (...args: any[]) => mockIntegrationFindMany(...args),
      findFirst: (...args: any[]) => mockIntegrationFindFirst(...args),
      update: (...args: any[]) => mockIntegrationUpdate(...args),
    },
    automation: {
      findMany: (...args: any[]) => mockAutomationFindMany(...args),
    },
  },
}));

import {
  findAutomationForCommentWithReason,
  normalizeInstagramMediaId,
} from "@/actions/webhook/queries";

function automation(overrides: Record<string, any> = {}) {
  return {
    id: overrides.id ?? "automation-1",
    name: overrides.name ?? "Campaign",
    active: overrides.active ?? true,
    matchingMode: overrides.matchingMode ?? "CONTAINS",
    triggerMode: overrides.triggerMode ?? "SPECIFIC_KEYWORD",
    posts: overrides.posts ?? [{ postid: "ANY" }],
    keywords: overrides.keywords ?? [{ word: "ai" }],
    listener: overrides.listener ?? { prompt: "Hello" },
    User: {
      subscription: null,
      integrations: [{ id: "integration-1", token: "token", instagramId: "ig-1", pageId: "page-1" }],
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIntegrationFindMany.mockResolvedValue([
    { id: "integration-1", userId: "user-1", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-1", businessId: null },
  ]);
  mockIntegrationFindFirst.mockResolvedValue({
    id: "integration-1",
    userId: "user-1",
    instagramId: "ig-1",
    webhookAccountId: "ig-1",
    pageId: "page-1",
    businessId: null,
  });
});

describe("normalizeInstagramMediaId", () => {
  it("keeps ANY as the wildcard and normalizes URL media ids", () => {
    expect(normalizeInstagramMediaId("ANY")).toBe("ANY");
    expect(normalizeInstagramMediaId(" https://instagram.com/p/180123/ ")).toBe("180123");
  });
});

describe("findAutomationForCommentWithReason", () => {
  it("queries integrations by incoming entry id against instagramId and webhookAccountId", async () => {
    mockAutomationFindMany.mockResolvedValue([
      automation({ id: "webhook-match", posts: [{ postid: "media-1" }] }),
    ]);

    await findAutomationForCommentWithReason("media-1", "ig-1", { object: "instagram", commentText: "ai" });

    expect(mockIntegrationFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { instagramId: { in: ["ig-1"] } },
            { webhookAccountId: { in: ["ig-1"] } },
          ]),
          status: { not: "DISCONNECTED" },
          reconnectRequired: false,
        }),
      })
    );
  });

  it("does not use pageId matching for Instagram object payloads", async () => {
    mockAutomationFindMany.mockResolvedValue([
      automation({ id: "webhook-match", posts: [{ postid: "media-1" }] }),
    ]);

    await findAutomationForCommentWithReason("media-1", "ig-1", { object: "instagram", commentText: "ai" });

    const matchCall = mockIntegrationFindMany.mock.calls[1][0];
    expect(matchCall.where.OR).not.toContainEqual({ pageId: { in: ["ig-1"] } });
  });

  it("returns ANY_COMMENT candidates with no keywords for ANY post", async () => {
    mockAutomationFindMany.mockResolvedValue([
      automation({ id: "any-comment", triggerMode: "ANY_COMMENT", keywords: [], posts: [{ postid: "ANY" }] }),
    ]);

    const result = await findAutomationForCommentWithReason("media-1", "ig-1");

    expect(result.automations.map((item) => item.id)).toEqual(["any-comment"]);
    expect(result.failureReason).toBeUndefined();
    expect((result.diagnostics as any).matchedAutomationIds).toEqual(["any-comment"]);
  });

  it("matches a specific post only when the incoming media id is the selected post", async () => {
    mockAutomationFindMany.mockResolvedValue([
      automation({ id: "specific", posts: [{ postid: "media-2" }] }),
    ]);

    const matched = await findAutomationForCommentWithReason("media-2", "ig-1");
    const missed = await findAutomationForCommentWithReason("media-1", "ig-1");

    expect(matched.automations.map((item) => item.id)).toEqual(["specific"]);
    expect(missed.automations).toEqual([]);
    expect(missed.failureReason).toBe("no_active_automation_for_media");
  });

  it("selects the best active media-scoped candidate after trigger evaluation", async () => {
    mockAutomationFindMany.mockResolvedValue([
      automation({ id: "keyword", triggerMode: "SPECIFIC_KEYWORD", keywords: [{ word: "ai" }] }),
      automation({ id: "any-comment", triggerMode: "ANY_COMMENT", keywords: [] }),
      automation({ id: "paused", active: false, triggerMode: "ANY_COMMENT", keywords: [] }),
    ]);

    const result = await findAutomationForCommentWithReason("media-1", "ig-1", { commentText: "ai" });

    expect(result.automations.map((item) => item.id)).toEqual(["keyword"]);
    expect((result.diagnostics as any).matchedAutomationIds).toEqual(["keyword", "any-comment"]);
  });

  it("checks every matching integration owner and prefers the newest matching account automation", async () => {
    mockIntegrationFindMany
      .mockResolvedValueOnce([
        { id: "old-integration", userId: "old-user", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-1", businessId: null },
        { id: "new-integration", userId: "new-user", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-1", businessId: null },
      ])
      .mockResolvedValueOnce([
        { id: "new-integration", userId: "new-user", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-1", businessId: null },
        { id: "old-integration", userId: "old-user", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-1", businessId: null },
      ]);
    mockAutomationFindMany
      .mockResolvedValueOnce([
        automation({ id: "new-user-campaign", posts: [{ postid: "media-1" }] }),
      ])
      .mockResolvedValueOnce([
        automation({ id: "old-user-campaign", posts: [{ postid: "media-2" }] }),
      ]);

    const result = await findAutomationForCommentWithReason("media-1", "ig-1", { commentText: "ai" });

    expect(mockAutomationFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: expect.objectContaining({ userId: "new-user" }) })
    );
    expect(result.automation?.id).toBe("new-user-campaign");
    expect(result.automations.map((item) => item.id)).toEqual(["new-user-campaign"]);
    expect((result.diagnostics as any).matchingIntegrationIds).toEqual(["new-integration", "old-integration"]);
    expect((result.diagnostics as any).matchedIntegrationId).toBe("new-integration");
  });

  it("returns no action when duplicate IG owners have no matching campaign", async () => {
    mockIntegrationFindMany
      .mockResolvedValueOnce([
        { id: "integration-a", userId: "user-a", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-a", businessId: null },
        { id: "integration-b", userId: "user-b", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-b", businessId: null },
      ])
      .mockResolvedValueOnce([
        { id: "integration-a", userId: "user-a", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-a", businessId: null },
        { id: "integration-b", userId: "user-b", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-b", businessId: null },
      ]);
    mockAutomationFindMany
      .mockResolvedValueOnce([automation({ id: "a", posts: [{ postid: "other-media" }] })])
      .mockResolvedValueOnce([automation({ id: "b", posts: [{ postid: "other-media" }] })]);

    const result = await findAutomationForCommentWithReason("media-1", "ig-1", { object: "instagram", commentText: "ai" });

    expect(result.automation).toBeNull();
    expect(result.failureReason).toBe("no_active_automation_for_media");
  });

  it("marks duplicate IG owners as ambiguous when both match the same media and keyword", async () => {
    mockIntegrationFindMany
      .mockResolvedValueOnce([
        { id: "integration-a", userId: "user-a", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-a", businessId: null },
        { id: "integration-b", userId: "user-b", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-b", businessId: null },
      ])
      .mockResolvedValueOnce([
        { id: "integration-a", userId: "user-a", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-a", businessId: null },
        { id: "integration-b", userId: "user-b", instagramId: "ig-1", webhookAccountId: "ig-1", pageId: "page-b", businessId: null },
      ]);
    mockAutomationFindMany
      .mockResolvedValueOnce([automation({ id: "a", posts: [{ postid: "media-1" }] })])
      .mockResolvedValueOnce([automation({ id: "b", posts: [{ postid: "media-1" }] })]);

    const result = await findAutomationForCommentWithReason("media-1", "ig-1", { object: "instagram", commentText: "ai" });

    expect(result.automation).toBeNull();
    expect(result.failureReason).toBe("ambiguous");
    expect((result.diagnostics as any).ambiguous).toBe(true);
  });
});
