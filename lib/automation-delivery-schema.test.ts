import {PGlite} from "@electric-sql/pglite";
import {readFileSync} from "node:fs";
import {expect,it} from "vitest";
it("applies the delivery schema and rejects concurrent recipient duplicates in PostgreSQL",async()=>{
 const db=new PGlite();try{await db.exec('CREATE TABLE "Automation" ("id" UUID PRIMARY KEY);');await db.exec(readFileSync('prisma/migrations/20261001060000_editor_delivery_controls/migration.sql','utf8'));const id="11111111-1111-4111-8111-111111111111";await db.query('INSERT INTO "Automation" (id) VALUES ($1)',[id]);const claim=()=>db.query('INSERT INTO "AutomationDmRecipient" ("automationId","recipientIgId") VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *',[id,"recipient"]);const results=await Promise.all([claim(),claim()]);expect(results.map(r=>r.rows.length).sort()).toEqual([0,1]);await db.query('DELETE FROM "Automation" WHERE id=$1',[id]);expect((await db.query('SELECT * FROM "AutomationDmRecipient"')).rows).toHaveLength(0);}finally{await db.close();}
});
