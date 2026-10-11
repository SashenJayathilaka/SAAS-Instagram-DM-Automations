import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("preserves routing state and opts only verified saved providers into the additive migration", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE "AiProviderConfig" (id TEXT PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT false, "lastTestStatus" TEXT, "encryptedApiKey" TEXT);
      INSERT INTO "AiProviderConfig" VALUES ('google', false, 'CONNECTED', 'encrypted'), ('groq', true, 'CONNECTED', 'encrypted'), ('openrouter', false, 'FAILED', 'encrypted'), ('other', false, 'CONNECTED', 'encrypted');`);
    await db.exec(
      readFileSync(
        "prisma/migrations/20261008133000_ai_failover/migration.sql",
        "utf8",
      ),
    );
    expect(
      (
        await db.query(
          'SELECT id, enabled, "fallbackEnabled", "consecutiveFailures" FROM "AiProviderConfig" ORDER BY id',
        )
      ).rows,
    ).toEqual([
      {
        id: "google",
        enabled: false,
        fallbackEnabled: true,
        consecutiveFailures: 0,
      },
      {
        id: "groq",
        enabled: true,
        fallbackEnabled: true,
        consecutiveFailures: 0,
      },
      {
        id: "openrouter",
        enabled: false,
        fallbackEnabled: false,
        consecutiveFailures: 0,
      },
      {
        id: "other",
        enabled: false,
        fallbackEnabled: false,
        consecutiveFailures: 0,
      },
    ]);
  } finally {
    await db.close();
  }
});
