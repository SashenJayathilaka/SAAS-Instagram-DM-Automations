import { randomUUID } from "node:crypto";
import { client } from "@/lib/prisma";

export async function reservePolicyScan(userId: string) {
  return client.$transaction(async tx => {
    // Serialize allowance decisions for this user, including concurrent requests.
    const owners = await tx.$queryRaw<{ status: string; plan: string | null }[]>`
      SELECT u."status", s."plan"::text AS "plan" FROM "User" u
      LEFT JOIN "Subscription" s ON s."userId" = u."id"
      WHERE u."id" = ${userId}::uuid FOR UPDATE OF u`;
    const owner = owners[0];
    if (!owner || owner.status === "SUSPENDED") throw new Error("Account unavailable");
    // A crashed worker must not permanently consume one of the three attempts.
    await tx.$executeRaw`UPDATE "AutomationPolicyScan" SET "status" = 'FAILED', "completedAt" = NOW()
      WHERE "userId" = ${userId}::uuid AND "status" = 'PENDING' AND "createdAt" < NOW() - INTERVAL '5 minutes'`;
    const counts = await tx.$queryRaw<{ used: number }[]>`SELECT COUNT(*)::int AS "used" FROM "AutomationPolicyScan"
      WHERE "userId" = ${userId}::uuid AND "status" IN ('PENDING','COMPLETE')`;
    const used = counts[0]?.used ?? 0;
    const limit = ["PRO", "BUSINESS"].includes(owner.plan ?? "FREE") ? null : 3 as const;
    if (limit !== null && used >= limit) return { ok: false as const, used, limit };
    const id = randomUUID();
    await tx.$executeRaw`INSERT INTO "AutomationPolicyScan" ("id", "userId") VALUES (${id}::uuid, ${userId}::uuid)`;
    return { ok: true as const, id, used: used + 1, limit };
  });
}
export async function finishPolicyScan(id: string, success: boolean) {
  const updated = await client.$executeRaw`UPDATE "AutomationPolicyScan" SET "status" = ${success ? "COMPLETE" : "FAILED"}, "completedAt" = NOW()
    WHERE "id" = ${id}::uuid AND "status" = 'PENDING'`;
  if (success && updated !== 1) throw new Error("Policy scan reservation expired");
}
