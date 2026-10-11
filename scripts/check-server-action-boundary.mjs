import { readFileSync } from "node:fs";

// Query modules accept identities supplied by trusted, authenticated callers.
// They must never be registered as browser-callable Server Actions.
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const exposed = Object.values({ ...manifest.node, ...manifest.edge }).filter(
  (entry) => /(?:^|\/)queries\.[cm]?[jt]sx?$/.test(entry.filename ?? "")
);
if (exposed.length) {
  console.error("Internal query helpers were exposed as Server Actions:");
  for (const entry of exposed) console.error(`${entry.filename}: ${entry.exportedName}`);
  process.exit(1);
}
console.log("Server Action boundary verified: no internal query helpers exposed.");
