import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("preserves captured details without mixing recipients, accounts or owners", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE "Conversation" (id TEXT PRIMARY KEY, "integrationId" TEXT, "userId" TEXT, "recipientIgId" TEXT);
      CREATE TABLE "Automation" (id TEXT PRIMARY KEY, "integrationId" TEXT, "userId" TEXT);
      CREATE TABLE "Lead" (id TEXT PRIMARY KEY, "automationId" TEXT, "igUserId" TEXT, email TEXT, phone TEXT, "emailCollectedAt" TIMESTAMP, "createdAt" TIMESTAMP);
      INSERT INTO "Automation" VALUES ('a1','ig1','u1'),('a2','ig2','u1');
      INSERT INTO "Conversation" VALUES ('c1','ig1','u1','r1'),('c2','ig2','u1','r1'),('c3','ig1','u1','r2'),('c4','ig1','u2','r1');
      INSERT INTO "Lead" VALUES
        ('l1','a1','r1','old@example.com',NULL,'2026-09-01','2026-09-01'),
        ('l2','a1','r1','new@example.com','+14155550123','2026-10-01','2026-10-01'),
        ('l3','a2','r1','other@example.com','+442012345678','2026-10-01','2026-10-01');
    `);
    await db.exec(readFileSync("prisma/migrations/20261001140000_conversation_contact_details/migration.sql", "utf8"));
    const result = await db.query('SELECT id,email,phone FROM "Conversation" ORDER BY id');
    expect(result.rows).toEqual([
      { id: "c1", email: "new@example.com", phone: "+14155550123" },
      { id: "c2", email: "other@example.com", phone: "+442012345678" },
      { id: "c3", email: null, phone: null },
      { id: "c4", email: null, phone: null },
    ]);
  } finally { await db.close(); }
}, 20000);
