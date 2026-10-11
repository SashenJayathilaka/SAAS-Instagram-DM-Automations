import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMessageLogFindFirst = vi.fn();
const mockMessageLogFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  client: {
    messageLog: {
      findMany: (...args: unknown[]) => mockMessageLogFindMany(...args),
      findFirst: (...args: unknown[]) => mockMessageLogFindFirst(...args),
    },
  },
}));

import { hasDeliveredFinalPayload, findPendingCommentDmActionForText } from "./queries";

describe("hasDeliveredFinalPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks the protected-payload marker for one explicit comment journey", async () => {
    mockMessageLogFindFirst.mockResolvedValue({ id: "message-log-1" });

    await expect(hasDeliveredFinalPayload("automation-1", "recipient-1", "comment-2")).resolves.toBe(true);
    expect(mockMessageLogFindFirst).toHaveBeenCalledWith({
      where: {
        automationId: "automation-1",
        recipientIgId: "recipient-1",
        messageType: "DM",
        status: "SENT",
        commentId: "comment-2",
        errorMessage: { in: ["final_dm_payload_sent", "follow_gate_payload_sent"] },
      },
      select: { id: true },
    });
  });

  it("allows a legacy callback when a newer opening was sent after the prior final payload", async () => {
    mockMessageLogFindFirst
      .mockResolvedValueOnce({ id: "final-1", createdAt: new Date("2026-09-05T11:37:22Z") })
      .mockResolvedValueOnce({ id: "opening-2", createdAt: new Date("2026-09-05T11:41:38Z") });

    await expect(hasDeliveredFinalPayload("automation-1", "recipient-1")).resolves.toBe(false);
  });

  it("blocks a repeated legacy callback when the final payload followed the latest opening", async () => {
    mockMessageLogFindFirst
      .mockResolvedValueOnce({ id: "final-2", createdAt: new Date("2026-09-05T11:42:00Z") })
      .mockResolvedValueOnce({ id: "opening-2", createdAt: new Date("2026-09-05T11:41:38Z") });

    await expect(hasDeliveredFinalPayload("automation-1", "recipient-1")).resolves.toBe(true);
  });
});


describe("pending button text fallback", () => {
  it("resolves the configured label only within the matching account and recipient", async () => {
    const automation = { id: "automation-1", listener: { openingDmButtonText: "Send me the guide" } };
    mockMessageLogFindMany.mockResolvedValue([{ automationId: "automation-1", errorMessage: "opening_dm_sent", automation }]);
    expect(await findPendingCommentDmActionForText("account-1", "recipient-1", "Send me the guide")).toEqual({
      automation, action: { type: "OPENING_CONTINUE", automationId: "automation-1" },
    });
    const query = mockMessageLogFindMany.mock.calls.at(-1)![0];
    expect(query.where.recipientIgId).toBe("recipient-1");
    expect(query.where.automation.User.integrations.some.OR).toContainEqual({ instagramId: "account-1" });
    expect(query.where.createdAt.gte).toBeInstanceOf(Date);
    expect(query.where.automation.active).toBe(true);
    expect(await findPendingCommentDmActionForText("account-1", "recipient-1", "please send me the guide now")).toBeNull();
  });

  it("requires a prior prompt and resolves follow text to verification, never directly to delivery", async () => {
    mockMessageLogFindMany.mockResolvedValue([]);
    expect(await findPendingCommentDmActionForText("account-1", "recipient-1", "Send me the link")).toBeNull();
    const automation = { id: "automation-1", listener: { followRequestButtonText: "Following" } };
    mockMessageLogFindMany.mockResolvedValue([{ automationId: "automation-1", errorMessage: "follow_request_dm_sent", automation }]);
    expect(await findPendingCommentDmActionForText("account-1", "recipient-1", "Following")).toEqual({
      automation, action: { type: "FOLLOW_CHECK", automationId: "automation-1" },
    });
  });
});
