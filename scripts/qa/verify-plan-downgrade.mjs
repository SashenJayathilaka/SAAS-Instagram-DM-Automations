// Runs the actual data migration in isolated PostgreSQL (PGlite), never production.
// npm install --prefix /tmp/ap3k-db-qa @electric-sql/pglite@0.3.14
// AP3K_PGLITE_MODULE=/tmp/ap3k-db-qa/node_modules/@electric-sql/pglite/dist/index.js node scripts/qa/verify-plan-downgrade.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.AP3K_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
CREATE TABLE "User" (id text PRIMARY KEY);
CREATE TABLE "Subscription" ("userId" text, plan text);
CREATE TABLE "Integrations" (id text PRIMARY KEY, "planLocked" boolean);
CREATE TABLE "Automation" (id text PRIMARY KEY, "userId" text, "createdAt" timestamptz DEFAULT now(), "integrationId" text, active boolean DEFAULT true, "archivedAt" timestamptz, "needsReview" boolean DEFAULT false, "reviewReason" text, "followGateRequired" boolean DEFAULT false, "triggerMode" text DEFAULT 'ANY_COMMENT', "storyConfig" jsonb);
CREATE TABLE "Listener" ("automationId" text, listener text, "aiReplyEnabled" boolean DEFAULT false, "aiDmReplyEnabled" boolean DEFAULT false, "emailCaptureEnabled" boolean DEFAULT false, "phoneCaptureEnabled" boolean DEFAULT false, "followUpEnabled" boolean DEFAULT false, "flowDefinition" jsonb);
CREATE TABLE "AutomationDeliveryJob" ("automationId" text, status text, payload jsonb);
CREATE TABLE "AutomationEngagementJob" ("automationId" text, status text);
CREATE TABLE "AutomationFlowSession" ("automationId" text, status text, "resumeAt" timestamptz);
CREATE TABLE "AiConversationSession" ("automationId" text, status text);
INSERT INTO "User" VALUES ('free'), ('pro'), ('business'), ('mixed');
INSERT INTO "Subscription" VALUES ('free', 'FREE'), ('pro', 'PRO'), ('business', 'BUSINESS'), ('mixed', 'FREE');
INSERT INTO "Integrations" VALUES ('allowed', false), ('locked', true);
INSERT INTO "Automation" (id, "userId", "integrationId") SELECT 'f' || lpad(i::text, 2, '0'), 'free', 'allowed' FROM generate_series(1,60) i;
INSERT INTO "Automation" (id, "userId", "integrationId") SELECT 'b' || i, 'business', 'allowed' FROM generate_series(1,60) i;
INSERT INTO "Automation" (id, "userId", "integrationId") VALUES ('locked', 'pro', 'locked'), ('pro-paid', 'pro', 'allowed');
INSERT INTO "Listener" ("automationId", "aiDmReplyEnabled") VALUES ('pro-paid', true);
INSERT INTO "Automation" (id, "userId", "integrationId") SELECT 'm' || lpad(i::text, 2, '0'), 'mixed', 'allowed' FROM generate_series(1,15) i;
INSERT INTO "Listener" ("automationId", "aiReplyEnabled") VALUES ('m01', true);
INSERT INTO "Listener" ("automationId", "aiDmReplyEnabled") VALUES ('m02', true);
INSERT INTO "Listener" ("automationId", "phoneCaptureEnabled") VALUES ('m03', true);
INSERT INTO "Listener" ("automationId", "emailCaptureEnabled") VALUES ('m04', true);
INSERT INTO "Listener" ("automationId", "followUpEnabled") VALUES ('m05', true);
INSERT INTO "Listener" ("automationId", "flowDefinition") VALUES ('m06', '{"nodes":[]}');
INSERT INTO "Listener" ("automationId", listener) VALUES ('m07', 'SMARTAI');
UPDATE "Automation" SET "followGateRequired" = true WHERE id = 'm08';
UPDATE "Automation" SET "triggerMode" = 'INTENT_MATCH' WHERE id = 'm09';
UPDATE "Automation" SET "storyConfig" = '{"scope":"NEXT"}' WHERE id = 'm10';
UPDATE "Automation" SET "needsReview" = true, "reviewReason" = 'Reconnect required' WHERE id = 'f60';
INSERT INTO "AutomationDeliveryJob" SELECT id, 'PENDING', '{"entry":"saved"}'::jsonb FROM "Automation";
INSERT INTO "AutomationEngagementJob" SELECT id, 'WAITING' FROM "Automation";
INSERT INTO "AutomationFlowSession" SELECT id, 'SCHEDULED', now() FROM "Automation";
INSERT INTO "AiConversationSession" SELECT id, 'ACTIVE' FROM "Automation";
`);
const sql = await readFile(new URL('../../prisma/migrations/20261011193000_reconcile_automation_plan_limits/migration.sql', import.meta.url), 'utf8');
await db.exec(sql);
const rows = (await db.query('SELECT * FROM "Automation" ORDER BY id')).rows;
assert.equal(rows.filter(r => r.userId === 'free' && r.active).length, 5);
assert.deepEqual(rows.filter(r => r.userId === 'free' && r.active).map(r => r.id), ['f01','f02','f03','f04','f05']);
assert.equal(rows.filter(r => r.userId === 'mixed' && r.active).length, 5);
assert.equal(rows.filter(r => r.userId === 'business' && r.active).length, 60);
assert.equal(rows.find(r => r.id === 'locked').active, false);
assert.equal(rows.find(r => r.id === 'pro-paid').active, true);
assert.equal(rows.find(r => r.id === 'f60').reviewReason, 'Reconnect required');
assert.equal(rows.length, 137);
for (const table of ['AutomationDeliveryJob', 'AutomationEngagementJob', 'AutomationFlowSession', 'AiConversationSession']) {
  const leaked = await db.query(`SELECT COUNT(*)::int AS count FROM "${table}" j JOIN "Automation" a ON a.id = j."automationId" WHERE NOT a.active AND j.status <> 'CANCELLED'`);
  assert.equal(leaked.rows[0].count, 0, table);
}
// Retry and a later upgrade never reactivate saved campaigns.
await db.exec(sql);
assert.deepEqual((await db.query('SELECT * FROM "Automation" ORDER BY id')).rows, rows);
await db.exec(`UPDATE "Subscription" SET plan = 'BUSINESS' WHERE "userId" = 'free'`);
await db.exec(sql);
assert.equal((await db.query(`SELECT count(*)::int AS count FROM "Automation" WHERE "userId"='free' AND active`)).rows[0].count, 5);
await db.close();
console.log('PASS: actual PostgreSQL migration — 60→5, all paid features, locked accounts, queues, data preservation, retries, upgrade does not restart.');
