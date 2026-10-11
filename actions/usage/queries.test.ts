import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindUnique = vi.fn();
const mockDeletedReplyUsageCount = vi.fn();
const mockMessageLogCount = vi.fn();
const mockAutomationEventCount = vi.fn();
const mockAutomationCount = vi.fn();
const mockIntegrationCount = vi.fn();
const mockAutomationFindFirst = vi.fn();
const mockQueryRaw = vi.fn();
const mockAutomationEventCreate = vi.fn();
const mockAutomationEventUpdateMany = vi.fn();
const mockAutomationEventDeleteMany = vi.fn();
const mockAiUsageFindUnique = vi.fn();
const mockTransaction = vi.fn(async (callback: (tx: any) => unknown) => callback({
  $queryRaw: (...args: any[]) => mockQueryRaw(...args),
  user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
  automationEvent: {
    create: (...args: any[]) => mockAutomationEventCreate(...args),
  },
  aiUsageEvent: {
    count: (...args: any[]) => mockAutomationEventCount(...args),
    create: (...args: any[]) => mockAutomationEventCreate(...args),
  },
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
    conversationStarterReceipt: { count: vi.fn().mockResolvedValue(0) },
    deletedReplyUsage: { count: (...args: any[]) => mockDeletedReplyUsageCount(...args) },
    messageLog: { count: (...args: any[]) => mockMessageLogCount(...args) },
    automationEvent: {
      count: (...args: any[]) => mockAutomationEventCount(...args),
      create: (...args: any[]) => mockAutomationEventCreate(...args),
    },
    aiUsageEvent: {
      count: (...args: any[]) => mockAutomationEventCount(...args),
      updateMany: (...args: any[]) => mockAutomationEventUpdateMany(...args),
      deleteMany: (...args: any[]) => mockAutomationEventDeleteMany(...args),
      findUnique: (...args: any[]) => mockAiUsageFindUnique(...args),
    },
    automation: {
      count: (...args: any[]) => mockAutomationCount(...args),
      findFirst: (...args: any[]) => mockAutomationFindFirst(...args),
    },
    integrations: { count: (...args: any[]) => mockIntegrationCount(...args) },
    $transaction: (callback: (tx: any) => unknown) => mockTransaction(callback),
  },
}));

import {
  canActivateCampaign,
  canSendStaticReply,
  completeAiReplyReservation,
  getUserMonthlyUsage,
  releaseAiReplyReservation,
  reserveAiReplyQuota,
} from "@/actions/usage/queries";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  mockUserFindUnique.mockResolvedValue({ subscription: { plan: "FREE" } });
  mockMessageLogCount.mockResolvedValue(0);
  mockDeletedReplyUsageCount.mockResolvedValue(0);
  mockAutomationEventCount.mockResolvedValue(0);
  mockAutomationCount.mockResolvedValue(0);
  mockIntegrationCount.mockResolvedValue(0);
  mockAutomationFindFirst.mockResolvedValue(null);
  mockQueryRaw.mockResolvedValue(undefined);
  mockAutomationEventCreate.mockResolvedValue({ id: "reservation-1" });
  mockAutomationEventUpdateMany.mockResolvedValue({ count: 1 });
  mockAutomationEventDeleteMany.mockResolvedValue({ count: 1 });
  mockAiUsageFindUnique.mockResolvedValue({ automationId: null, channel: "COMMENT" });
});

describe("usage query helpers", () => {
  it("excludes locked-account automations from the active-plan allowance", async () => {
    await getUserMonthlyUsage("user-1");
    expect(mockAutomationCount).toHaveBeenCalledWith({ where: { userId: "user-1", active: true, archivedAt: null, OR: [{ integration: { planLocked: false } }, { integrationId: null }] } });
  });
  it("counts sent comment replies and DMs as static monthly replies", async () => {
    mockMessageLogCount.mockResolvedValueOnce(4).mockResolvedValueOnce(3);

    const usage = await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(usage.staticReplies.used).toBe(7);
    expect(mockMessageLogCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "SENT",
        messageType: "COMMENT_REPLY",
        automation: { userId: "user-1" },
      }),
    });
    expect(mockMessageLogCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "SENT",
        messageType: "DM",
        automation: { userId: "user-1" },
      }),
    });
  });

  it("does not count failed or skipped messages", async () => {
    await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(mockMessageLogCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: { in: ["FAILED", "SKIPPED"] } }),
      })
    );
  });

  it("respects the current usage period and enforcement start", async () => {
    vi.stubEnv("USAGE_LIMITS_ENFORCED_FROM", "2026-05-23T00:00:00Z");

    await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(mockMessageLogCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        createdAt: {
          gte: new Date("2026-05-23T00:00:00Z"),
          lt: new Date("2026-06-01T00:00:00Z"),
        },
      }),
    });
  });

  it("blocks static replies when the monthly limit is reached", async () => {
    mockMessageLogCount.mockResolvedValueOnce(500).mockResolvedValueOnce(0);

    const result = await canSendStaticReply("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("static_reply_limit_reached");
  });

  it("hard-blocks AI on Free before creating a provider reservation", async () => {
    const result = await reserveAiReplyQuota({
      userId: "user-1",
      automationId: "automation-1",
      commentId: "comment-1",
      date: new Date("2026-05-24T12:00:00Z"),
    });

    expect(result).toMatchObject({ ok: false, reason: "ai_reply_limit_reached", limit: 0 });
    expect(mockQueryRaw).toHaveBeenCalledOnce();
    expect(mockAutomationEventCreate).not.toHaveBeenCalled();
  });

  it("casts the PostgreSQL advisory lock result to a Prisma-supported type", async () => {
    await reserveAiReplyQuota({
      userId: "user-1",
      channel: "PLAYGROUND",
      date: new Date("2026-05-24T12:00:00Z"),
    });

    const sqlTemplate = mockQueryRaw.mock.calls[0]?.[0] as readonly string[];
    expect(sqlTemplate.join("?")).toContain("pg_advisory_xact_lock");
    expect(sqlTemplate.join("?")).toContain('::text AS "lockResult"');
  });

  it("atomically reserves the last available Pro AI decision", async () => {
    mockUserFindUnique.mockResolvedValue({ subscription: { plan: "PRO" } });
    mockAutomationEventCount.mockResolvedValue(499);

    const result = await reserveAiReplyQuota({
      userId: "user-1",
      automationId: "automation-1",
      igUserId: "ig-user-1",
      commentId: "comment-1",
      date: new Date("2026-05-24T12:00:00Z"),
    });

    expect(result).toMatchObject({ ok: true, used: 500, limit: 500, reservationId: "reservation-1" });
    expect(mockQueryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockAutomationEventCount.mock.invocationCallOrder[0]);
    expect(mockAutomationEventCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        automationId: "automation-1",
        userId: "user-1",
        channel: "COMMENT",
      }),
    }));
  });

  it("completes successful reservations and releases provider failures", async () => {
    await completeAiReplyReservation("reservation-1", { action: "REPLY", category: "SAFE" });
    await releaseAiReplyReservation("reservation-2");

    expect(mockAutomationEventUpdateMany).toHaveBeenCalledWith({
      where: { id: "reservation-1" },
      data: { status: "COMPLETED", meta: { status: "completed", action: "REPLY", category: "SAFE" } },
    });
    expect(mockAutomationEventDeleteMany).toHaveBeenCalledWith({
      where: { id: "reservation-2" },
    });
  });

  it("ignores legacy launch-trial fields and uses the monthly Free entitlement", async () => {
    const startsAt = new Date("2026-05-20T12:00:00Z");
    const endsAt = new Date("2026-06-03T12:00:00Z");
    mockUserFindUnique.mockResolvedValue({
      subscription: {
        plan: "FREE",
        welcomeTrialStartedAt: startsAt,
        welcomeTrialEndsAt: endsAt,
        welcomeTrialReplyLimit: 50,
      },
    });
    mockMessageLogCount.mockResolvedValueOnce(30).mockResolvedValueOnce(12);

    const usage = await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(usage.staticReplies).toMatchObject({ used: 42, limit: 500, remaining: 458, blocked: false });
    expect(usage.periodStart).toEqual(new Date("2026-05-01T00:00:00Z"));
    expect(usage.periodEnd).toEqual(new Date("2026-06-01T00:00:00Z"));
    expect(usage.periodLabel).toBe("May 2026");
    expect("welcomeTrial" in usage).toBe(false);
  });

  it("falls back to sent automation events when message logs are missing", async () => {
    mockMessageLogCount.mockResolvedValue(0);
  mockDeletedReplyUsageCount.mockResolvedValue(0);
    mockAutomationEventCount.mockResolvedValueOnce(0).mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    const usage = await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(usage.staticReplies.used).toBe(5);
    expect(mockAutomationEventCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        eventType: "PUBLIC_REPLY_SENT",
        automation: { userId: "user-1" },
      }),
    });
    expect(mockAutomationEventCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        eventType: "DM_SENT",
        automation: { userId: "user-1" },
      }),
    });
  });

  it("allows Free campaign activation while fewer than five are active", async () => {
    mockAutomationCount.mockResolvedValue(4);

    const result = await canActivateCampaign("user-1");

    expect(result.ok).toBe(true);
  });

  it("allows saving an already-active campaign on Free", async () => {
    mockAutomationCount.mockResolvedValue(5);
    mockAutomationFindFirst.mockResolvedValue({ id: "automation-1" });

    const result = await canActivateCampaign("user-1", "automation-1");

    expect(result.ok).toBe(true);
  });

  it("blocks a sixth active campaign on Free", async () => {
    mockAutomationCount.mockResolvedValue(5);

    const result = await canActivateCampaign("user-1");

    expect(result).toMatchObject({ ok: false, reason: "active_campaign_limit_reached" });
  });

  it("allows Creator active campaigns", async () => {
    mockUserFindUnique.mockResolvedValue({ subscription: { plan: "PRO" } });
    mockAutomationCount.mockResolvedValue(12);

    const result = await canActivateCampaign("user-1");

    expect(result.ok).toBe(true);
  });

  it.each(["true", "false"])(
    "keeps the shared Creator campaign limit in App Review mode=%s",
    async (appReviewMode) => {
      vi.stubEnv("NEXT_PUBLIC_APP_REVIEW_MODE", appReviewMode);
      mockUserFindUnique.mockResolvedValue({ subscription: { plan: "PRO" } });
      mockAutomationCount.mockResolvedValue(12);

      const usage = await getUserMonthlyUsage("user-1");

      expect(usage.activeCampaigns).toMatchObject({
        used: 12,
        limit: "unlimited",
        remaining: null,
        blocked: false,
      });
    }
  );

  it("respects usageResetAt if it is after enforcementStart", async () => {
    vi.stubEnv("USAGE_LIMITS_ENFORCED_FROM", "2026-05-23T00:00:00Z");
    const resetAt = new Date("2026-05-24T00:00:00Z");
    mockUserFindUnique.mockResolvedValue({
      subscription: { plan: "FREE", usageResetAt: resetAt },
    });

    await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(mockMessageLogCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: resetAt,
            lt: new Date("2026-06-01T00:00:00Z"),
          },
        }),
      })
    );
  });

  it("keeps published plan limits authoritative over legacy internal overrides", async () => {
    mockUserFindUnique.mockResolvedValue({
      subscription: {
        plan: "FREE",
        monthlyReplyLimitOverride: 500,
        activeCampaignLimitOverride: 10,
        connectedAccountLimitOverride: 5,
        overrideReason: "Test",
        overrideExpiresAt: null,
      },
    });

    const usage = await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(usage.staticReplies.limit).toBe(500);
    expect(usage.activeCampaigns.limit).toBe(5);
    expect(usage.connectedAccounts.limit).toBe(1);
  });

  it("ignores expired billing overrides", async () => {
    mockUserFindUnique.mockResolvedValue({
      subscription: {
        plan: "FREE",
        monthlyReplyLimitOverride: 500,
        overrideReason: "Test",
        overrideExpiresAt: new Date("2026-05-20T00:00:00Z"), // Expired
      },
    });

    const usage = await getUserMonthlyUsage("user-1", new Date("2026-05-24T12:00:00Z"));

    expect(usage.staticReplies.limit).toBe(500); // Plan default
  });
});


describe("shared multi-account usage", () => {
  it("reports all connected accounts rather than clamping the count to one", async () => {
    mockUserFindUnique.mockResolvedValue({ subscription: { plan: "BUSINESS" } });
    mockIntegrationCount.mockResolvedValue(7);
    const usage = await getUserMonthlyUsage("user-1");
    expect(usage.connectedAccounts).toMatchObject({ used: 7, limit: 6, remaining: 0, blocked: true });
    expect(usage.staticReplies.limit).toBe(20000);
  });
  it("does not refund already consumed replies when an account or campaign is deleted", async () => {
    mockDeletedReplyUsageCount.mockResolvedValue(500);
    const result = await canSendStaticReply("user-1");
    expect(result.ok).toBe(false);
    expect(result.usage.staticReplies.used).toBe(500);
  });
});


describe("AI reservations for unavailable accounts", () => {
  it("rejects a suspended paid user before reading usage or creating a reservation", async () => {
    mockUserFindUnique.mockResolvedValue({ status: "SUSPENDED", subscription: { plan: "BUSINESS" } });
    await expect(reserveAiReplyQuota({ userId: "user-a", channel: "PLAYGROUND" })).rejects.toThrow("Account unavailable");
    expect(mockAutomationEventCount).not.toHaveBeenCalled();
    expect(mockAutomationEventCreate).not.toHaveBeenCalled();
  });
  it("rejects a missing user", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    await expect(reserveAiReplyQuota({ userId: "missing", channel: "PLAYGROUND" })).rejects.toThrow("Account unavailable");
    expect(mockAutomationEventCount).not.toHaveBeenCalled();
    expect(mockAutomationEventCreate).not.toHaveBeenCalled();
  });
});
