import { createHash } from "node:crypto";

export type ClerkIdMapping = {
  internalUserId: string;
  oldClerkId: string;
  newClerkId: string;
};

export type ClerkIdMigrationMode = "dry-run" | "apply" | "reverse";

type UserBinding = {
  id: string;
  clerkId: string;
};

type MigrationTransaction = {
  user: {
    findMany(args: {
      where: {
        OR: Array<
          | { id: { in: string[] } }
          | { clerkId: { in: string[] } }
        >;
      };
      select: { id: true; clerkId: true };
    }): Promise<UserBinding[]>;
    updateMany(args: {
      where: { id: string; clerkId: string };
      data: { clerkId: string };
    }): Promise<{ count: number }>;
  };
};

export type ClerkIdMigrationClient = {
  $transaction<T>(
    operation: (transaction: MigrationTransaction) => Promise<T>,
    options: { isolationLevel: "Serializable" }
  ): Promise<T>;
};

export type ClerkIdMigrationResult = {
  mode: ClerkIdMigrationMode;
  mappingCount: number;
  validatedCount: number;
  updatedCount: number;
  skippedCount: number;
  entries: Array<{
    internalUserId: string;
    oldClerkIdFingerprint: string;
    newClerkIdFingerprint: string;
    status: "validated" | "updated" | "already-migrated" | "reversed";
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = new Set([
  "internalUserId",
  "oldClerkId",
  "newClerkId",
]);

export class ClerkIdMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClerkIdMigrationError";
  }
}

export function fingerprintClerkId(clerkId: string) {
  return createHash("sha256").update(clerkId).digest("hex").slice(0, 12);
}

export function parseClerkIdMapping(raw: string): ClerkIdMapping[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ClerkIdMigrationError("Mapping file is not valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new ClerkIdMigrationError(
      "Mapping file must contain a non-empty JSON array."
    );
  }

  const mappings = parsed.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new ClerkIdMigrationError(
        `Mapping entry ${index + 1} must be an object.`
      );
    }

    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((field) => !ALLOWED_FIELDS.has(field))) {
      throw new ClerkIdMigrationError(
        `Mapping entry ${index + 1} contains fields outside the approved schema.`
      );
    }

    const internalUserId = record.internalUserId;
    const oldClerkId = record.oldClerkId;
    const newClerkId = record.newClerkId;
    if (
      typeof internalUserId !== "string" ||
      internalUserId.trim() === "" ||
      typeof oldClerkId !== "string" ||
      oldClerkId.trim() === "" ||
      typeof newClerkId !== "string" ||
      newClerkId.trim() === ""
    ) {
      throw new ClerkIdMigrationError(
        `Mapping entry ${index + 1} requires three non-empty string fields.`
      );
    }

    if (!UUID_PATTERN.test(internalUserId)) {
      throw new ClerkIdMigrationError(
        `Mapping entry ${index + 1} has an invalid internal user UUID.`
      );
    }
    if (oldClerkId === newClerkId) {
      throw new ClerkIdMigrationError(
        `Mapping entry ${index + 1} must use different old and new Clerk IDs.`
      );
    }

    return { internalUserId, oldClerkId, newClerkId };
  });

  rejectDuplicates(mappings, "internalUserId", "internal user UUID");
  rejectDuplicates(mappings, "oldClerkId", "old Clerk ID");
  rejectDuplicates(mappings, "newClerkId", "new Clerk ID");
  return mappings;
}

function rejectDuplicates(
  mappings: ClerkIdMapping[],
  field: keyof ClerkIdMapping,
  label: string
) {
  const seen = new Set<string>();
  for (const mapping of mappings) {
    if (seen.has(mapping[field])) {
      throw new ClerkIdMigrationError(`Duplicate ${label} entries are not allowed.`);
    }
    seen.add(mapping[field]);
  }
}

function bindingQuery(mappings: ClerkIdMapping[]) {
  return {
    where: {
      OR: [
        { id: { in: mappings.map((mapping) => mapping.internalUserId) } },
        { clerkId: { in: mappings.flatMap((mapping) => [mapping.oldClerkId, mapping.newClerkId]) } },
      ],
    },
    select: { id: true as const, clerkId: true as const },
  };
}

function safeEntry(
  mapping: ClerkIdMapping,
  status: ClerkIdMigrationResult["entries"][number]["status"]
) {
  return {
    internalUserId: mapping.internalUserId,
    oldClerkIdFingerprint: fingerprintClerkId(mapping.oldClerkId),
    newClerkIdFingerprint: fingerprintClerkId(mapping.newClerkId),
    status,
  };
}

export async function runClerkIdMigration(
  database: ClerkIdMigrationClient,
  mappings: ClerkIdMapping[],
  mode: ClerkIdMigrationMode
): Promise<ClerkIdMigrationResult> {
  if (mappings.length === 0) {
    throw new ClerkIdMigrationError("At least one mapping is required.");
  }

  return database.$transaction(async (transaction) => {
    const bindings = await transaction.user.findMany(bindingQuery(mappings));
    const byInternalId = new Map(bindings.map((binding) => [binding.id, binding]));
    const byClerkId = new Map(bindings.map((binding) => [binding.clerkId, binding]));
    const pending: ClerkIdMapping[] = [];
    const alreadyMigrated: ClerkIdMapping[] = [];

    for (const mapping of mappings) {
      const internalUser = byInternalId.get(mapping.internalUserId);
      if (!internalUser) {
        throw new ClerkIdMigrationError(
          `Internal user ${mapping.internalUserId} does not exist.`
        );
      }

      const oldOwner = byClerkId.get(mapping.oldClerkId);
      if (oldOwner && oldOwner.id !== mapping.internalUserId) {
        throw new ClerkIdMigrationError(
          `Old Clerk ID ${fingerprintClerkId(mapping.oldClerkId)} belongs to another user.`
        );
      }
      const newOwner = byClerkId.get(mapping.newClerkId);
      if (newOwner && newOwner.id !== mapping.internalUserId) {
        throw new ClerkIdMigrationError(
          `New Clerk ID ${fingerprintClerkId(mapping.newClerkId)} belongs to another user.`
        );
      }

      if (mode === "reverse") {
        if (internalUser.clerkId !== mapping.newClerkId) {
          throw new ClerkIdMigrationError(
            `Internal user ${mapping.internalUserId} does not have the expected current Clerk ID for reverse mode.`
          );
        }
        pending.push(mapping);
        continue;
      }

      if (internalUser.clerkId === mapping.newClerkId) {
        alreadyMigrated.push(mapping);
      } else if (internalUser.clerkId === mapping.oldClerkId) {
        pending.push(mapping);
      } else {
        throw new ClerkIdMigrationError(
          `Internal user ${mapping.internalUserId} does not have the expected current Clerk ID.`
        );
      }
    }

    if (mode === "dry-run") {
      return {
        mode,
        mappingCount: mappings.length,
        validatedCount: mappings.length,
        updatedCount: 0,
        skippedCount: alreadyMigrated.length,
        entries: mappings.map((mapping) =>
          safeEntry(
            mapping,
            alreadyMigrated.includes(mapping) ? "already-migrated" : "validated"
          )
        ),
      };
    }

    let updatedCount = 0;
    for (const mapping of pending) {
      const sourceClerkId = mode === "reverse" ? mapping.newClerkId : mapping.oldClerkId;
      const targetClerkId = mode === "reverse" ? mapping.oldClerkId : mapping.newClerkId;
      const update = await transaction.user.updateMany({
        where: { id: mapping.internalUserId, clerkId: sourceClerkId },
        data: { clerkId: targetClerkId },
      });
      if (update.count !== 1) {
        throw new ClerkIdMigrationError(
          `Concurrent Clerk binding change detected for internal user ${mapping.internalUserId}.`
        );
      }
      updatedCount += update.count;
    }

    if (updatedCount !== pending.length) {
      throw new ClerkIdMigrationError("Updated row count did not match the validated batch.");
    }

    const verifiedBindings = await transaction.user.findMany(bindingQuery(mappings));
    const verifiedByInternalId = new Map(
      verifiedBindings.map((binding) => [binding.id, binding.clerkId])
    );
    for (const mapping of mappings) {
      const expected = mode === "reverse" ? mapping.oldClerkId : mapping.newClerkId;
      if (verifiedByInternalId.get(mapping.internalUserId) !== expected) {
        throw new ClerkIdMigrationError(
          `Post-update verification failed for internal user ${mapping.internalUserId}.`
        );
      }
    }

    if (updatedCount + alreadyMigrated.length !== mappings.length) {
      throw new ClerkIdMigrationError("Final batch accounting did not match the mapping count.");
    }

    return {
      mode,
      mappingCount: mappings.length,
      validatedCount: mappings.length,
      updatedCount,
      skippedCount: alreadyMigrated.length,
      entries: mappings.map((mapping) =>
        safeEntry(
          mapping,
          alreadyMigrated.includes(mapping)
            ? "already-migrated"
            : mode === "reverse"
              ? "reversed"
              : "updated"
        )
      ),
    };
  }, { isolationLevel: "Serializable" });
}

export function formatClerkIdMigrationResult(result: ClerkIdMigrationResult) {
  const lines = [
    `mode=${result.mode}`,
    `mappingCount=${result.mappingCount}`,
    `validatedCount=${result.validatedCount}`,
    `updatedCount=${result.updatedCount}`,
    `skippedCount=${result.skippedCount}`,
  ];
  for (const entry of result.entries) {
    lines.push(
      `internalUserId=${entry.internalUserId} old=${entry.oldClerkIdFingerprint} new=${entry.newClerkIdFingerprint} status=${entry.status}`
    );
  }
  return lines.join("\n");
}
