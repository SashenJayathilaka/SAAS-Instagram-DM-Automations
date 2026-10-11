import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { normalizeDeliveryDelay } from "./campaign-save";
it("persists the editor's seconds, minutes and hours after repairing the legacy constraint", async () => {
 const db=new PGlite();
 try {
  await db.exec(`CREATE TABLE "Automation" (id SERIAL PRIMARY KEY,"deliveryDelaySeconds" INTEGER NOT NULL DEFAULT 0,CONSTRAINT "Automation_deliveryDelaySeconds_check" CHECK ("deliveryDelaySeconds" IN (0,3,5,10,30)));`);
  await expect(db.query('INSERT INTO "Automation" ("deliveryDelaySeconds") VALUES (60)')).rejects.toMatchObject({constraint:"Automation_deliveryDelaySeconds_check"});
  await db.exec(readFileSync("prisma/migrations/20261001130000_allow_full_delivery_delay/migration.sql","utf8"));
  for(const delay of [0,1,10,15,30,45,60,120,3600,82800]) {
   const result=await db.query<{deliveryDelaySeconds:number}>('INSERT INTO "Automation" ("deliveryDelaySeconds") VALUES ($1) RETURNING "deliveryDelaySeconds"',[normalizeDeliveryDelay(delay)]);
   expect(result.rows[0].deliveryDelaySeconds).toBe(delay);
  }
  for(const bad of [-1,82801]) await expect(db.query('INSERT INTO "Automation" ("deliveryDelaySeconds") VALUES ($1)',[bad])).rejects.toMatchObject({constraint:"Automation_deliveryDelaySeconds_check"});
 } finally { await db.close(); }
},20000);
