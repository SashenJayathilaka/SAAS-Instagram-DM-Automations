import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import type { Prisma } from "@prisma/client";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ client: { $queryRaw: query } }));
import { getUserFacingMetrics, getUserFacingStats } from "@/lib/user-facing-metrics";

// Prisma treats timestamp-without-time-zone values as UTC. Match that decoder
// even when a developer runs these integration tests in a different time zone.
const db = new PGlite({ parsers: { 1114: (value: string) => new Date(`${value}Z`) } });
const user = "10000000-0000-0000-0000-000000000001";
const other = "10000000-0000-0000-0000-000000000002";
const account = "20000000-0000-0000-0000-000000000001";
const secondAccount = "20000000-0000-0000-0000-000000000002";
const campaign = "30000000-0000-0000-0000-000000000001";
const secondCampaign = "30000000-0000-0000-0000-000000000002";
const foreignCampaign = "30000000-0000-0000-0000-000000000003";
const now = new Date("2026-09-29T12:00:00Z");
const current = "2026-09-28T12:00:00Z";

beforeAll(async () => {
  await db.exec(`
    CREATE TABLE "Automation" (id uuid PRIMARY KEY, "userId" uuid, "integrationId" uuid, active boolean);
    CREATE TABLE "Integrations" (id uuid PRIMARY KEY, "userId" uuid);
    CREATE TABLE "WebhookEvent" ("automationId" uuid, "eventType" text, "commentId" text, "createdAt" timestamp);
    CREATE TABLE "AutomationEvent" ("automationId" uuid, "eventType" text, "commentId" text, meta jsonb, "createdAt" timestamp);
    CREATE TABLE "MessageLog" ("automationId" uuid, "messageType" text, status text, "commentId" text, "createdAt" timestamp);
    CREATE TABLE "Lead" ("automationId" uuid, "createdAt" timestamp);
    INSERT INTO "Automation" VALUES ('${campaign}','${user}','${account}',true), ('${secondCampaign}','${user}','${secondAccount}',false), ('${foreignCampaign}','${other}','${account}',true);
    INSERT INTO "Integrations" VALUES ('${account}','${user}'), ('${secondAccount}','${user}');
  `);
}, 20_000);
afterAll(() => db.close());
beforeEach(async () => {
  await db.exec('TRUNCATE "WebhookEvent", "AutomationEvent", "MessageLog", "Lead"');
  query.mockReset().mockImplementation(async (sql: Prisma.Sql) => (await db.query(sql.text, sql.values)).rows);
});

async function webhook(commentId: string | null, type = "REAL_COMMENT_EVENT", automationId = campaign, date = current) {
  await db.query('INSERT INTO "WebhookEvent" VALUES ($1,$2,$3,$4)', [automationId, type, commentId, date]);
}
async function event(type: string, commentId: string | null = null, meta: unknown = null, automationId = campaign, date = current) {
  await db.query('INSERT INTO "AutomationEvent" VALUES ($1,$2,$3,$4,$5)', [automationId,type,commentId,JSON.stringify(meta),date]);
}
async function message(type: string, status: string, commentId: string | null = null, automationId = campaign, date = current) {
  await db.query('INSERT INTO "MessageLog" VALUES ($1,$2,$3,$4,$5)', [automationId,type,status,commentId,date]);
}

describe("user-facing metrics PostgreSQL aggregation", () => {
  it("returns zero totals for an empty account with one bound query", async () => {
    const result = await getUserFacingMetrics(user, undefined, account);
    expect(result).toMatchObject({ commentsReceived: 0, commentsMatched: 0, dmsSent: 0, dmsFailed: 0, dmsSkipped: 0, publicRepliesSent: 0, staticRepliesUsed: 0, leadsCaptured: 0, activeCampaigns: 1, connectedAccounts: 1, lastRealCommentAt: null, lastPublicReplyAt: null, lastDmAt: null });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("deduplicates real comments and ignores guard events and null IDs", async () => {
    for (const id of ["c1","c1","c2","","",null]) await webhook(id);
    await webhook("guard", "LOOP_GUARD_TRIGGERED");
    expect((await getUserFacingMetrics(user)).commentsReceived).toBe(4);
  });
  it("deduplicates matches using trimmed source metadata and preserves missing-ID events", async () => {
    await event("KEYWORD_MATCHED", "c1");
    await event("KEYWORD_MATCHED", "different", {sourceCommentId:" \tc1\u00a0"});
    await event("KEYWORD_MATCHED", "c2", {sourceCommentId:42});
    await event("KEYWORD_MATCHED", "c2", {sourceCommentId:" "});
    await event("KEYWORD_MATCHED", null);
    await event("KEYWORD_MATCHED", " ", []);
    expect((await getUserFacingMetrics(user)).commentsMatched).toBe(4);
  });
  it("counts only confirmed public event IDs when sent logs are absent", async () => {
    await event("PUBLIC_REPLY_SENT", "c1", {publicReplyCommentId:"reply-1"});
    await event("PUBLIC_REPLY_SENT", "c2", {publicReplyCommentId:" reply-1 "});
    await event("PUBLIC_REPLY_SENT", "c3", {publicReplyCommentId:123});
    await event("PUBLIC_REPLY_SENT", "c4", {});
    expect((await getUserFacingMetrics(user)).publicRepliesSent).toBe(1);
  });
  it("prefers sent reply logs, deduplicates IDs and counts anonymous logs separately", async () => {
    await event("PUBLIC_REPLY_SENT", "c", {publicReplyCommentId:"event-reply"});
    for (const id of ["c1","c1",null,null,"",""]) await message("COMMENT_REPLY", "SENT", id);
    await message("COMMENT_REPLY", "FAILED", "failure");
    expect((await getUserFacingMetrics(user)).publicRepliesSent).toBe(5);
  });
  it("counts sent, failed and skipped DMs independently with legacy skip fallback", async () => {
    await event("DM_SKIPPED", "c1"); await event("DM_SKIPPED", "c1"); await event("DM_SKIPPED", null);
    expect((await getUserFacingMetrics(user)).dmsSkipped).toBe(2);
    await message("DM", "SKIPPED"); await message("DM", "SENT"); await message("DM", "FAILED");
    await event("DM_SENT", "ignored");
    expect(await getUserFacingMetrics(user)).toMatchObject({dmsSent:1,dmsFailed:1,dmsSkipped:1,staticRepliesUsed:1});
  });
  it("uses confirmed replies for reply rate and adds sent DMs for usage", async () => {
    await event("KEYWORD_MATCHED", "c1"); await event("KEYWORD_MATCHED", "c2");
    await message("COMMENT_REPLY", "SENT", "c1");
    await message("DM", "SENT"); await message("DM", "SENT");
    expect(await getUserFacingMetrics(user)).toMatchObject({replyRate:50,staticRepliesUsed:3});
  });
  it("isolates every fact by owner and selected Instagram account", async () => {
    for (const id of [campaign, secondCampaign, foreignCampaign]) {
      await webhook(id, "REAL_COMMENT_EVENT", id); await event("KEYWORD_MATCHED", id, null, id);
      await message("DM", "SENT", null, id);
      await db.query('INSERT INTO "Lead" VALUES ($1,$2)', [id,current]);
    }
    expect(await getUserFacingMetrics(user, undefined, account)).toMatchObject({commentsReceived:1,commentsMatched:1,dmsSent:1,leadsCaptured:1,activeCampaigns:1,connectedAccounts:1});
    expect((await getUserFacingMetrics(user)).commentsReceived).toBe(2);
    expect((await getUserFacingMetrics(other, undefined, secondAccount)).commentsReceived).toBe(0);
  });
  it("uses half-open periods, two queries for comparison, and all-time last comment", async () => {
    await webhook("current", "REAL_COMMENT_EVENT", campaign, "2026-09-22T12:00:00Z");
    await webhook("previous", "REAL_COMMENT_EVENT", campaign, "2026-09-15T12:00:00Z");
    await webhook("upper-bound", "REAL_COMMENT_EVENT", campaign, now.toISOString());
    const result = await getUserFacingStats(user, "7d", now, account);
    expect(result.current.commentsReceived).toBe(1); expect(result.previous.commentsReceived).toBe(1);
    expect(new Date(result.current.lastRealCommentAt!).toISOString()).toBe(now.toISOString());
    expect(query).toHaveBeenCalledTimes(2);
  });
  it("uses the newest reply event or log and restricts message timestamps to the period", async () => {
    await message("COMMENT_REPLY", "SENT", "c1", campaign, "2026-09-23T12:00:00Z");
    await event("PUBLIC_REPLY_SENT", "c2", {}, campaign, current);
    await message("DM", "SENT", null, campaign, "2026-08-01T00:00:00Z");
    const result = await getUserFacingMetrics(user, {gte:new Date("2026-09-22T12:00:00Z"),lt:now});
    expect(new Date(result.lastPublicReplyAt!).toISOString()).toBe(new Date(current).toISOString());
    expect(result.lastDmAt).toBeNull();
  });
});
