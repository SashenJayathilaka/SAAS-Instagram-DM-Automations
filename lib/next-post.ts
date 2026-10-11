export type NextPostConfig = { scope: "NEXT"; armedAt?: string; boundPostId?: string };
export function readNextPost(value: unknown): NextPostConfig | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (item.scope !== "NEXT") return null;
  return { scope: "NEXT", ...(typeof item.armedAt === "string" && Number.isFinite(Date.parse(item.armedAt)) ? { armedAt: item.armedAt } : {}), ...(typeof item.boundPostId === "string" && /^\d+$/.test(item.boundPostId) ? { boundPostId: item.boundPostId } : {}) };
}
/** Arming and binding are server-owned. Editing or pausing never retargets a published rule. */
export function prepareNextPost(postId: string, active: boolean, previous: unknown, now = new Date()): NextPostConfig | null {
  if (postId !== "NEXT") return null;
  const before = readNextPost(previous);
  return before?.armedAt ? before : { scope: "NEXT", ...(active ? { armedAt: now.toISOString() } : {}) };
}
