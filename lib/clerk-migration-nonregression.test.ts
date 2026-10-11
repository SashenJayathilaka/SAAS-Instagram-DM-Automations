import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Clerk migration non-regression invariants", () => {
  it("keeps normal new-user provisioning keyed by the authenticated Clerk ID", () => {
    const userActions = source("actions/user/index.ts");
    expect(userActions).toContain("const foundByClerkId = await findUser(user.id)");
    expect(userActions).toContain("if (foundByClerkId)");
    expect(userActions).toContain("const created = await createUser(");
    expect(userActions).toContain("user.id,");
    expect(userActions).toContain("user.primaryEmailAddress?.emailAddress");
    expect(userActions).toContain("user.emailAddresses[0]?.emailAddress");
  });

  it("keeps dashboard ownership resolved through Clerk ID to the original User row", () => {
    const userQueries = source("actions/user/queries.ts");
    const dashboardLayout = source(
      "app/(protected)/dashboard/[slug]/layout.tsx"
    );
    expect(userQueries).toContain("where: { clerkId }");
    expect(dashboardLayout).toContain("Promise.all([onUserInfo(), getInstagramAccountMenu()])");
    expect(dashboardLayout).toContain("params.slug !== currentClerkId");
    expect(dashboardLayout).toContain("redirect(dashboardPath(currentClerkId))");
  });

  it("keeps all business ownership relations anchored to User.id UUID", () => {
    const schema = source("prisma/schema.prisma");
    expect(schema).toMatch(
      /model User \{[\s\S]*?id\s+String\s+@id @default\(dbgenerated\("gen_random_uuid\(\)"\)\) @db\.Uuid/
    );
    expect(schema.match(/@relation\(fields: \[userId\], references: \[id\]/g)).toHaveLength(
      14 // Includes the per-user policy-scan allowance ledger.
    );
    expect(schema).not.toContain("references: [clerkId]");
  });
});
