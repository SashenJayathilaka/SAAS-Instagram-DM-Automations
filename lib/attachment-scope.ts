import { createHash } from "node:crypto";
/** A cloned preview database must never grant access to production bucket objects. */
export function attachmentScopePrefix() {
  if (process.env.VERCEL_ENV === "production") return "ap3k/production/";
  if (process.env.VERCEL_ENV === "preview") {
    const branch = process.env.VERCEL_GIT_COMMIT_REF || process.env.VERCEL_URL;
    if (!branch) throw new Error("Attachment preview scope is unavailable.");
    const project = process.env.VERCEL_PROJECT_ID || "ap3k";
    return `ap3k/preview/${createHash("sha256").update(`${project}:${branch}`).digest("hex").slice(0, 32)}/`;
  }
  return "ap3k/development/";
}
export function attachmentOwnerPrefix(userId: string) {
  return `${attachmentScopePrefix()}attachments/${userId}/`;
}
export function attachmentScopeFilter() {
  return {
    storageKey: { startsWith: `${attachmentScopePrefix()}attachments/` },
  };
}
export function attachmentKeyInScope(key: string) {
  return key.startsWith(`${attachmentScopePrefix()}attachments/`);
}
