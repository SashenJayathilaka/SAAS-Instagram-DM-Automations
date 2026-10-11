import { describe, expect, it } from "vitest";
import {
  ClerkIdMigrationError,
  type ClerkIdMigrationClient,
  type ClerkIdMapping,
  formatClerkIdMigrationResult,
  parseClerkIdMapping,
  runClerkIdMigration,
} from "./clerk-id-migration";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const OLD_A = "user_dev_old_alpha";
const NEW_A = "user_prod_new_alpha";
const OLD_B = "user_dev_old_beta";
const NEW_B = "user_prod_new_beta";

type StoredUser = {
  id: string;
  clerkId: string;
  email: string;
  relationSnapshot: { subscriptionId: string; automationIds: string[] };
};

function mapping(overrides: Partial<ClerkIdMapping> = {}): ClerkIdMapping {
  return {
    internalUserId: USER_A,
    oldClerkId: OLD_A,
    newClerkId: NEW_A,
    ...overrides,
  };
}

function storedUser(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: USER_A,
    clerkId: OLD_A,
    email: "private@example.invalid",
    relationSnapshot: {
      subscriptionId: "subscription-stable",
      automationIds: ["automation-stable"],
    },
    ...overrides,
  };
}

function migrationDatabase(
  initialUsers: StoredUser[],
  options: { failUpdateForId?: string } = {}
) {
  let users = structuredClone(initialUsers);
  let updateCalls = 0;

  const database: ClerkIdMigrationClient = {
    async $transaction(operation) {
      const working = structuredClone(users);
      const result = await operation({
        user: {
          async findMany(args) {
            const ids = new Set<string>();
            const clerkIds = new Set<string>();
            for (const condition of args.where.OR) {
              if ("id" in condition) {
                condition.id.in.forEach((id) => ids.add(id));
              } else {
                condition.clerkId.in.forEach((id) => clerkIds.add(id));
              }
            }
            return working
              .filter((user) => ids.has(user.id) || clerkIds.has(user.clerkId))
              .map(({ id, clerkId }) => ({ id, clerkId }));
          },
          async updateMany(args) {
            updateCalls += 1;
            if (args.where.id === options.failUpdateForId) return { count: 0 };
            const user = working.find(
              (candidate) =>
                candidate.id === args.where.id &&
                candidate.clerkId === args.where.clerkId
            );
            if (!user) return { count: 0 };
            user.clerkId = args.data.clerkId;
            return { count: 1 };
          },
        },
      });
      users = working;
      return result;
    },
  };

  return {
    database,
    getUsers: () => structuredClone(users),
    getUpdateCalls: () => updateCalls,
  };
}

describe("parseClerkIdMapping", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseClerkIdMapping("not-json")).toThrow("not valid JSON");
  });

  it("rejects missing fields", () => {
    expect(() =>
      parseClerkIdMapping(JSON.stringify([{ internalUserId: USER_A }]))
    ).toThrow("three non-empty string fields");
  });

  it("rejects fields outside the non-sensitive schema", () => {
    expect(() =>
      parseClerkIdMapping(
        JSON.stringify([{ ...mapping(), email: "must-not-be-present" }])
      )
    ).toThrow("outside the approved schema");
  });

  it("rejects an invalid UUID", () => {
    expect(() =>
      parseClerkIdMapping(
        JSON.stringify([mapping({ internalUserId: "not-a-uuid" })])
      )
    ).toThrow("invalid internal user UUID");
  });

  it.each([
    ["internalUserId", USER_A, "internal user UUID"],
    ["oldClerkId", OLD_A, "old Clerk ID"],
    ["newClerkId", NEW_A, "new Clerk ID"],
  ] as const)("rejects duplicate %s entries", (field, value, label) => {
    const second = mapping({
      internalUserId: USER_B,
      oldClerkId: OLD_B,
      newClerkId: NEW_B,
      [field]: value,
    });
    expect(() => parseClerkIdMapping(JSON.stringify([mapping(), second]))).toThrow(
      `Duplicate ${label}`
    );
  });
});

describe("runClerkIdMigration", () => {
  it("rejects a missing internal user", async () => {
    const { database } = migrationDatabase([]);
    await expect(runClerkIdMigration(database, [mapping()], "dry-run")).rejects.toThrow(
      `Internal user ${USER_A} does not exist`
    );
  });

  it("rejects an old Clerk ID mismatch", async () => {
    const { database } = migrationDatabase([
      storedUser({ clerkId: "unexpected_current_binding" }),
    ]);
    await expect(runClerkIdMigration(database, [mapping()], "apply")).rejects.toThrow(
      "does not have the expected current Clerk ID"
    );
  });

  it("rejects a new Clerk ID collision", async () => {
    const { database } = migrationDatabase([
      storedUser(),
      storedUser({ id: USER_B, clerkId: NEW_A }),
    ]);
    await expect(runClerkIdMigration(database, [mapping()], "apply")).rejects.toThrow(
      "belongs to another user"
    );
  });

  it("performs zero updates in dry-run mode", async () => {
    const state = migrationDatabase([storedUser()]);
    const result = await runClerkIdMigration(state.database, [mapping()], "dry-run");
    expect(result).toMatchObject({ updatedCount: 0, validatedCount: 1 });
    expect(state.getUpdateCalls()).toBe(0);
    expect(state.getUsers()[0].clerkId).toBe(OLD_A);
  });

  it("updates only clerkId and leaves ownership relations on the same UUID", async () => {
    const original = storedUser();
    const state = migrationDatabase([original]);
    const result = await runClerkIdMigration(state.database, [mapping()], "apply");
    const migrated = state.getUsers()[0];
    expect(result.updatedCount).toBe(1);
    expect(migrated).toEqual({ ...original, clerkId: NEW_A });
    expect(migrated.id).toBe(USER_A);
    expect(migrated.relationSnapshot).toEqual(original.relationSnapshot);
  });

  it("rolls back the entire batch when a conditional update fails", async () => {
    const secondMapping = mapping({
      internalUserId: USER_B,
      oldClerkId: OLD_B,
      newClerkId: NEW_B,
    });
    const state = migrationDatabase(
      [storedUser(), storedUser({ id: USER_B, clerkId: OLD_B })],
      { failUpdateForId: USER_B }
    );
    await expect(
      runClerkIdMigration(state.database, [mapping(), secondMapping], "apply")
    ).rejects.toThrow("Concurrent Clerk binding change detected");
    expect(state.getUsers().map((user) => user.clerkId)).toEqual([OLD_A, OLD_B]);
  });

  it("reports an already-migrated apply as an idempotent skip", async () => {
    const state = migrationDatabase([storedUser({ clerkId: NEW_A })]);
    const result = await runClerkIdMigration(state.database, [mapping()], "apply");
    expect(result).toMatchObject({ updatedCount: 0, skippedCount: 1 });
    expect(result.entries[0].status).toBe("already-migrated");
    expect(state.getUpdateCalls()).toBe(0);
  });

  it("reverses the binding to the expected old Clerk ID", async () => {
    const state = migrationDatabase([storedUser({ clerkId: NEW_A })]);
    const result = await runClerkIdMigration(state.database, [mapping()], "reverse");
    expect(result.entries[0].status).toBe("reversed");
    expect(state.getUsers()[0].clerkId).toBe(OLD_A);
  });

  it("refuses reverse mode when the current Clerk ID is unexpected", async () => {
    const state = migrationDatabase([storedUser()]);
    await expect(
      runClerkIdMigration(state.database, [mapping()], "reverse")
    ).rejects.toThrow("expected current Clerk ID for reverse mode");
    expect(state.getUsers()[0].clerkId).toBe(OLD_A);
  });

  it("formats output without full Clerk IDs or private user fields", async () => {
    const state = migrationDatabase([storedUser()]);
    const result = await runClerkIdMigration(state.database, [mapping()], "dry-run");
    const output = formatClerkIdMigrationResult(result);
    expect(output).toContain(USER_A);
    expect(output).not.toContain(OLD_A);
    expect(output).not.toContain(NEW_A);
    expect(output).not.toContain("private@example.invalid");
  });

  it("uses the migration error type for safe operator failures", () => {
    expect(new ClerkIdMigrationError("safe")).toBeInstanceOf(Error);
  });
});
