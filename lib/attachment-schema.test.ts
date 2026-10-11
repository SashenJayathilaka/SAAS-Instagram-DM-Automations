import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { normalizeCampaignPayload } from "./campaign-save";
import { normalizeMessageAutomationPayload } from "./message-automation";

it("repairs the production constraint so uploaded and recorded attachments can be created and updated", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE "Listener" (
      id SERIAL PRIMARY KEY, "responseFormat" TEXT NOT NULL,
      "mediaType" TEXT, "mediaUrl" TEXT,
      CONSTRAINT "Listener_responseFormat_check" CHECK ("responseFormat" IN ('TEXT','LINK','MEDIA'))
    );`);
    await db.exec(readFileSync("prisma/migrations/20260924033000_allow_product_card_response_format/migration.sql", "utf8"));
    for (const format of ["TEXT", "LINK", "MEDIA", "PRODUCT_CARD"]) {
      await db.query('INSERT INTO "Listener" ("responseFormat") VALUES ($1)', [format]);
    }
    await expect(db.query('INSERT INTO "Listener" ("responseFormat") VALUES ($1)', ["ATTACHMENT"]))
      .rejects.toMatchObject({ constraint: "Listener_responseFormat_check" });
    await db.exec(readFileSync("prisma/migrations/20261001120000_allow_attachment_response_format/migration.sql", "utf8"));
    for (const mediaType of ["IMAGE", "VIDEO", "AUDIO", "FILE"]) {
      const mediaUrl = "https://ap3k.com/media/attachments/11111111-1111-4111-8111-111111111111";
      const listener = { responseFormat: "ATTACHMENT", mediaType, mediaUrl };
      const comment = normalizeCampaignPayload({ post: { postid: "ANY" }, sendPrivateDm: true, listener }).listener;
      const dm = normalizeMessageAutomationPayload({ source: "DM", ...listener });
      for (const payload of [comment, dm]) {
        const inserted = await db.query<{ id: number }>('INSERT INTO "Listener" ("responseFormat","mediaType","mediaUrl") VALUES ($1,$2,$3) RETURNING id', [payload.responseFormat, payload.mediaType, payload.mediaUrl]);
        expect(inserted.rows).toHaveLength(1);
        await db.query('UPDATE "Listener" SET "responseFormat"=$1,"mediaType"=$2,"mediaUrl"=$3 WHERE id=1', [payload.responseFormat, payload.mediaType, payload.mediaUrl]);
        expect((await db.query('SELECT "responseFormat","mediaType","mediaUrl" FROM "Listener" WHERE id=1')).rows[0]).toEqual(listener);
      }
    }
    await expect(db.query('INSERT INTO "Listener" ("responseFormat") VALUES ($1)', ["INVALID"]))
      .rejects.toMatchObject({ constraint: "Listener_responseFormat_check" });
  } finally { await db.close(); }
}, 20000);
