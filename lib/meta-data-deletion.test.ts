import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  processMetaDataDeletion,
  redactJsonExactMatch,
  verifyMetaSignedRequest,
} from "./meta-data-deletion";

const SECRET = "meta_app_secret_for_tests";
const USER_ID = "app_scoped_user_123";

function base64Url(input: Buffer | string): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signedRequest(payload: Record<string, unknown>, secret = SECRET): string {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const encodedSignature = base64Url(createHmac("sha256", secret).update(encodedPayload).digest());
  return `${encodedSignature}.${encodedPayload}`;
}

describe("verifyMetaSignedRequest", () => {
  it("verifies a valid Meta signed_request and extracts user_id", () => {
    const result = verifyMetaSignedRequest(
      signedRequest({ algorithm: "HMAC-SHA256", user_id: USER_ID }),
      SECRET
    );

    expect(result).toEqual({ ok: true, userId: USER_ID });
  });

  it("rejects a signed_request with the wrong app secret", () => {
    const result = verifyMetaSignedRequest(
      signedRequest({ algorithm: "HMAC-SHA256", user_id: USER_ID }, "wrong_secret"),
      SECRET
    );

    expect(result).toEqual({ ok: false, reason: "signature_mismatch" });
  });

  it("rejects missing user_id", () => {
    const result = verifyMetaSignedRequest(signedRequest({ algorithm: "HMAC-SHA256" }), SECRET);

    expect(result).toEqual({ ok: false, reason: "missing_user_id" });
  });

  it("rejects a malformed signed_request", () => {
    const result = verifyMetaSignedRequest("not-a-valid-request", SECRET);

    expect(result).toEqual({ ok: false, reason: "missing_or_invalid_signed_request" });
  });
});

describe("redactJsonExactMatch", () => {
  it("redacts exact string matches in nested JSON", () => {
    const result = redactJsonExactMatch(
      {
        id: USER_ID,
        nested: [{ sender: USER_ID }, { sender: "other_user" }],
        similar: `${USER_ID}_suffix`,
      },
      USER_ID
    );

    expect(result.changed).toBe(true);
    expect(result.value).toEqual({
      id: "[deleted_by_meta_data_deletion]",
      nested: [{ sender: "[deleted_by_meta_data_deletion]" }, { sender: "other_user" }],
      similar: `${USER_ID}_suffix`,
    });
  });

  it("does not redact substring matches", () => {
    const result = redactJsonExactMatch({ id: `${USER_ID}_suffix` }, USER_ID);

    expect(result.changed).toBe(false);
    expect(result.value).toEqual({ id: `${USER_ID}_suffix` });
  });
});

function countMatches<T>(rows: T[], predicate: (row: T) => boolean) {
  return rows.filter(predicate).length;
}

function fakeDeleteMany<T>(rows: T[], predicate: (row: T) => boolean) {
  const count = countMatches(rows, predicate);
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (predicate(rows[index])) rows.splice(index, 1);
  }
  return { count };
}

function createFakePrisma() {
  const state = {
    integrations: [
      {
        id: "integration-1",
        userId: "user-1",
        token: "x".repeat(24),
        instagramId: "ig-business-1",
        metaAppScopedUserId: USER_ID,
        webhookAccountId: "page-1",
        pageId: "page-1",
        pageName: "Page",
        businessId: "business-1",
        instagramUsername: "creator",
        profilePictureUrl: "https://example.com/avatar.jpg",
        igAccountSource: "instagram_business_account",
        oauthResolutionDiagnostics: { selectedBy: USER_ID },
        status: "CONNECTED",
      },
      {
        id: "integration-2",
        userId: "user-2",
        token: "y".repeat(24),
        instagramId: "ig-business-2",
        metaAppScopedUserId: "other-app-user",
        webhookAccountId: USER_ID,
        pageId: USER_ID,
        pageName: "Other Page",
        businessId: "business-2",
        instagramUsername: "other",
        profilePictureUrl: null,
        igAccountSource: "instagram_business_account",
        oauthResolutionDiagnostics: null,
        status: "CONNECTED",
      },
    ],
    automation: [
      { id: "automation-1", userId: "user-1", active: true, needsReview: false, reviewReason: null },
      { id: "automation-other", userId: "user-2", active: true, needsReview: false, reviewReason: null },
    ],
    instagramAccountSnapshot: [{ id: "snapshot-1", integrationId: "integration-1" }],
    metaOAuthSelection: [
      { id: "selection-1", userId: "user-1", accounts: [{ id: USER_ID }] },
      { id: "selection-substring", userId: "user-1", accounts: [{ id: `${USER_ID}_suffix` }] },
      { id: "selection-unrelated", userId: "user-2", accounts: [{ id: "other-app-user" }] },
      { id: "selection-pending-only", userId: "user-3", accounts: [{ user: "pending-only-user" }] },
    ],
    lead: [{ id: "lead-1", automationId: "automation-1", igUserId: "commenter-1" }],
    automationEvent: [
      { id: "event-1", automationId: "automation-1", igUserId: "commenter-1", meta: { id: USER_ID } },
    ],
    webhookEvent: [
      {
        id: "webhook-1",
        automationId: "automation-1",
        igAccountId: "page-1",
        igUserId: "commenter-1",
        payload: { account: "page-1" },
      },
    ],
    messageLog: [{ id: "message-1", automationId: "automation-1", recipientIgId: "commenter-1" }],
    post: [
      { id: "post-1", automationId: "automation-1", postid: "media-1" },
      { id: "post-unrelated", automationId: "automation-other", postid: USER_ID },
    ],
    dms: [{ id: "dm-1", automationId: "automation-1", senderId: "sender-1", reciever: "receiver-1", message: "hi" }],
    adminAuditLog: [
      { id: "audit-1", targetId: "integration-1", before: { id: USER_ID }, after: null, metadata: null },
    ],
  };

  const tx = {
    integrations: {
      findMany: async ({ where, select }: any = {}) => {
        let rows = state.integrations;
        if (where?.metaAppScopedUserId) {
          rows = rows.filter((row) => row.metaAppScopedUserId === where.metaAppScopedUserId);
        }
        if (where?.id?.in) {
          rows = rows.filter((row) => where.id.in.includes(row.id));
        }
        if (where?.oauthResolutionDiagnostics?.not !== undefined) {
          rows = rows.filter((row) => row.oauthResolutionDiagnostics !== null);
        }
        return rows.map((row) =>
          select
            ? Object.fromEntries(Object.keys(select).map((key) => [key, (row as any)[key]]))
            : row
        );
      },
      update: async ({ where, data }: any) => {
        const row = state.integrations.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    automation: {
      findMany: async ({ where }: any) =>
        state.automation.filter((row) => where.userId.in.includes(row.userId)),
      updateMany: async ({ where, data }: any) => {
        const rows = state.automation.filter((row) =>
          where.userId.in.includes(row.userId) &&
          (where.active === undefined || row.active === where.active)
        );
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
    },
    instagramAccountSnapshot: {
      deleteMany: async ({ where }: any) =>
        fakeDeleteMany(state.instagramAccountSnapshot, (row) =>
          where.integrationId.in.includes(row.integrationId)
        ),
    },
    metaOAuthSelection: {
      deleteMany: async ({ where }: any) =>
        fakeDeleteMany(state.metaOAuthSelection, (row) => where.id.in.includes(row.id)),
      findMany: async () => state.metaOAuthSelection,
      update: async () => null,
    },
    lead: {
      deleteMany: async ({ where }: any) =>
        fakeDeleteMany(state.lead, (row) => where.automationId.in.includes(row.automationId)),
    },
    automationEvent: {
      updateMany: async ({ where, data }: any) => {
        const rows = state.automationEvent.filter((row) => where.automationId.in.includes(row.automationId));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
      findMany: async () => state.automationEvent.filter((row) => row.meta !== null),
      update: async ({ where, data }: any) => {
        const row = state.automationEvent.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    webhookEvent: {
      updateMany: async ({ where, data }: any) => {
        const rows = state.webhookEvent.filter((row) =>
          where.OR.some((clause: any) =>
            clause.automationId?.in?.includes(row.automationId) ||
            clause.igAccountId?.in?.includes(row.igAccountId)
          )
        );
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
      findMany: async () => state.webhookEvent.filter((row) => row.payload !== null),
      update: async ({ where, data }: any) => {
        const row = state.webhookEvent.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
    messageLog: {
      deleteMany: async ({ where }: any) =>
        fakeDeleteMany(state.messageLog, (row) => where.automationId.in.includes(row.automationId)),
    },
    post: {
      deleteMany: async ({ where }: any) =>
        fakeDeleteMany(state.post, (row) => where.automationId.in.includes(row.automationId)),
    },
    dms: {
      updateMany: async ({ where, data }: any) => {
        const rows = state.dms.filter((row) => where.automationId.in.includes(row.automationId));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
    },
    adminAuditLog: {
      findMany: async ({ select }: any) => {
        const field = Object.keys(select).find((key) => key !== "id") as "before" | "after" | "metadata";
        return state.adminAuditLog
          .filter((row) => row[field] !== null)
          .map((row) => ({ id: row.id, [field]: row[field] }));
      },
      update: async ({ where, data }: any) => {
        const row = state.adminAuditLog.find((item) => item.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      },
    },
  };

  return {
    state,
    prisma: {
      $transaction: async (callback: any) => callback(tx),
    } as any,
  };
}

describe("processMetaDataDeletion", () => {
  it("processes a valid matching app-scoped user ID", async () => {
    const { prisma, state } = createFakePrisma();

    const summary = await processMetaDataDeletion(prisma, USER_ID);

    expect(summary.matchedRecords).toBeGreaterThan(0);
    expect(state.integrations[0].metaAppScopedUserId).toBeNull();
    expect(state.integrations[0].instagramId).toBeNull();
    expect(state.integrations[0].status).toBe("DISCONNECTED");
    expect(state.lead).toHaveLength(0);
    expect(state.messageLog).toHaveLength(0);
    expect(state.post).toEqual([
      { id: "post-unrelated", automationId: "automation-other", postid: USER_ID },
    ]);
    expect(state.metaOAuthSelection.map((selection) => selection.id)).toEqual([
      "selection-substring",
      "selection-unrelated",
      "selection-pending-only",
    ]);
    expect(state.automation[0]).toMatchObject({
      active: false,
      needsReview: true,
      reviewReason: "Meta data deletion request processed.",
    });
    expect(state.automation[1]).toMatchObject({
      active: true,
      needsReview: false,
      reviewReason: null,
    });
  });

  it("succeeds with no stored match", async () => {
    const { prisma, state } = createFakePrisma();

    const summary = await processMetaDataDeletion(prisma, "missing-app-user");

    expect(summary).toEqual({
      matchedRecords: 0,
      deletedRecords: 0,
      anonymizedRecords: 0,
      pausedAutomations: 0,
    });
    expect(state.integrations[0].metaAppScopedUserId).toBe(USER_ID);
  });

  it("deletes a pending OAuth selection containing the exact app-scoped ID without an integration match", async () => {
    const { prisma, state } = createFakePrisma();

    const summary = await processMetaDataDeletion(prisma, "pending-only-user");

    expect(summary).toEqual({
      matchedRecords: 1,
      deletedRecords: 1,
      anonymizedRecords: 0,
      pausedAutomations: 0,
    });
    expect(state.metaOAuthSelection.map((selection) => selection.id)).toEqual([
      "selection-1",
      "selection-substring",
      "selection-unrelated",
    ]);
    expect(state.integrations[0].metaAppScopedUserId).toBe(USER_ID);
    expect(state.automation[0].active).toBe(true);
    expect(state.lead).toHaveLength(1);
  });

  it("does not match similar or substring pending OAuth selection IDs", async () => {
    const { prisma, state } = createFakePrisma();

    const summary = await processMetaDataDeletion(prisma, "app_scoped_user");

    expect(summary).toEqual({
      matchedRecords: 0,
      deletedRecords: 0,
      anonymizedRecords: 0,
      pausedAutomations: 0,
    });
    expect(state.metaOAuthSelection.map((selection) => selection.id)).toEqual([
      "selection-1",
      "selection-substring",
      "selection-unrelated",
      "selection-pending-only",
    ]);
  });

  it("is idempotent for repeated requests", async () => {
    const { prisma } = createFakePrisma();

    const first = await processMetaDataDeletion(prisma, USER_ID);
    const second = await processMetaDataDeletion(prisma, USER_ID);

    expect(first.matchedRecords).toBeGreaterThan(0);
    expect(first.pausedAutomations).toBe(1);
    expect(second).toEqual({
      matchedRecords: 0,
      deletedRecords: 0,
      anonymizedRecords: 0,
      pausedAutomations: 0,
    });
  });

  it("does not treat Page, Instagram, media, comment, business, or webhook IDs as app-scoped user IDs", async () => {
    const { prisma, state } = createFakePrisma();

    const summary = await processMetaDataDeletion(prisma, "page-1");

    expect(summary).toEqual({
      matchedRecords: 0,
      deletedRecords: 0,
      anonymizedRecords: 0,
      pausedAutomations: 0,
    });
    expect(state.integrations[0].metaAppScopedUserId).toBe(USER_ID);
    expect(state.integrations[0].pageId).toBe("page-1");
    expect(state.integrations[0].instagramId).toBe("ig-business-1");
    expect(state.integrations[0].businessId).toBe("business-1");
    expect(state.integrations[0].webhookAccountId).toBe("page-1");
    expect(state.post).toHaveLength(2);
    expect(state.metaOAuthSelection).toHaveLength(4);
  });
});
