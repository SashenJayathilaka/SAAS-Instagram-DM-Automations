import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect,it } from "vitest";
it("migrates existing follow-ups and stores every supported time and opener format",async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE TABLE "Automation" (id SERIAL PRIMARY KEY);CREATE TABLE "Listener" (id SERIAL PRIMARY KEY,"followUpDelayMinutes" INTEGER NOT NULL DEFAULT 30,CONSTRAINT "Listener_followUpDelayMinutes_check" CHECK ("followUpDelayMinutes" IN(15,30,60,180,720)));INSERT INTO "Listener" ("followUpDelayMinutes") VALUES (30);`);
 await db.exec(readFileSync("prisma/migrations/20261005051500_engagement_editor_parity/migration.sql","utf8"));
 expect((await db.query('SELECT * FROM "Listener"')).rows[0]).toMatchObject({followUpDelayMinutes:30,openingDmFormat:"BUTTON"});
 for(const minutes of [0.5,1,5,10,15,30,60,180,360,720])expect((await db.query('INSERT INTO "Listener" ("followUpDelayMinutes","openingDmFormat") VALUES ($1,$2) RETURNING "followUpDelayMinutes"',[minutes,"QUICK_REPLY"])).rows[0]).toEqual({followUpDelayMinutes:minutes});
 await expect(db.query('INSERT INTO "Listener" ("followUpDelayMinutes") VALUES (1440)')).rejects.toMatchObject({constraint:"Listener_followUpDelayMinutes_check"});
 await expect(db.query('INSERT INTO "Listener" ("openingDmFormat") VALUES ($1)',["INVALID"])).rejects.toMatchObject({constraint:"Listener_openingDmFormat_check"});
 }finally{await db.close();}
},20000);
