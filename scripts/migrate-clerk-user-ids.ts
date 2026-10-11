import { readFile } from "node:fs/promises";
import {
  ClerkIdMigrationError,
  type ClerkIdMigrationClient,
  type ClerkIdMigrationMode,
  formatClerkIdMigrationResult,
  parseClerkIdMapping,
  runClerkIdMigration,
} from "../lib/clerk-id-migration";

const USAGE = `Usage:
  npm run clerk:migrate-ids -- --mapping <local-json-path> --dry-run
  npm run clerk:migrate-ids -- --mapping <local-json-path> --apply
  npm run clerk:migrate-ids -- --mapping <local-json-path> --reverse

Exactly one mode is required. The mapping must be a local JSON file.`;

function parseArguments(argv: string[]) {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true as const };
  }

  const mappingIndexes = argv.reduce<number[]>((indexes, value, index) => {
    if (value === "--mapping") indexes.push(index);
    return indexes;
  }, []);
  const mappingPath =
    mappingIndexes.length === 1 ? argv[mappingIndexes[0] + 1] : undefined;
  const selectedModes = ["--dry-run", "--apply", "--reverse"].filter((flag) =>
    argv.includes(flag)
  );

  if (mappingIndexes.length !== 1) {
    throw new ClerkIdMigrationError("Specify exactly one mapping file with --mapping.");
  }
  if (!mappingPath || mappingPath.startsWith("--")) {
    throw new ClerkIdMigrationError("A mapping file path is required with --mapping.");
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(mappingPath)) {
    throw new ClerkIdMigrationError("The mapping must use a local file path, not a URL.");
  }
  if (selectedModes.length !== 1) {
    throw new ClerkIdMigrationError(
      "Select exactly one mode: --dry-run, --apply, or --reverse."
    );
  }

  const modeByFlag: Record<string, ClerkIdMigrationMode> = {
    "--dry-run": "dry-run",
    "--apply": "apply",
    "--reverse": "reverse",
  };
  return {
    help: false as const,
    mappingPath,
    mode: modeByFlag[selectedModes[0]],
  };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.help) {
    console.log(USAGE);
    return;
  }

  let raw: string;
  try {
    raw = await readFile(arguments_.mappingPath, "utf8");
  } catch {
    throw new ClerkIdMigrationError("Mapping file could not be read.");
  }

  const mappings = parseClerkIdMapping(raw);
  const { client } = await import("../lib/prisma");
  try {
    const result = await runClerkIdMigration(
      client as unknown as ClerkIdMigrationClient,
      mappings,
      arguments_.mode
    );
    console.log(formatClerkIdMigrationResult(result));
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  const message =
    error instanceof ClerkIdMigrationError
      ? error.message
      : "Migration failed because of a database or runtime error.";
  console.error(`[clerk-id-migration] ${message}`);
  process.exitCode = 1;
});
