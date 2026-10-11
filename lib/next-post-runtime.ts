import { Prisma } from "@prisma/client";
import { client } from "./prisma";
import { readNextPost } from "./next-post";
import { resolveInstagramMediaConnection, type InstagramMediaIntegration } from "./instagram-media";
import { resolveIntegrationSendToken } from "./send-token";

/** Resolve from the owner's timeline, never from whichever post gets a comment first. */
export async function bindNextCommentPost(automation: { id: string; integrationId: string | null; postConfig?: unknown }, integration: InstagramMediaIntegration) {
  const config = readNextPost(automation.postConfig);
  if (!config?.armedAt || config.boundPostId) return config;
  const connection = resolveInstagramMediaConnection([integration]);
  const token = resolveIntegrationSendToken(integration);
  if (!connection.ok || !token.ok) return null;
  const boundary = Date.parse(config.armedAt);
  const posts: { id: string; at: number }[] = [];
  let after: string | undefined;
  let complete = false;
  try {
    for (let page = 0; page < 5; page++) {
      const url = new URL(`${connection.apiBaseUrl}/${connection.instagramBusinessAccountId}/media`);
      url.searchParams.set("fields", "id,timestamp");
      url.searchParams.set("limit", "100");
      if (after) url.searchParams.set("after", after);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` }, signal: AbortSignal.timeout(2000), cache: "no-store" });
      if (!response.ok) return null;
      const body = await response.json() as { data?: { id?: string; timestamp?: string }[]; paging?: { next?: string; cursors?: { after?: string } } };
      if (!Array.isArray(body.data)) return null;
      let reached = false;
      for (const post of body.data) {
        const at = Date.parse(post.timestamp ?? "");
        // A missing date could hide the true next post. Fail closed.
        if (!post.id || !Number.isFinite(at)) return null;
        if (at <= boundary) reached = true;
        else posts.push({ id: post.id, at });
      }
      if (reached || !body.paging?.next) { complete = true; break; }
      after = body.paging.cursors?.after;
      if (!after) return null;
    }
  } catch { return null; }
  if (!complete) return null;
  const first = posts.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))[0];
  if (!first) return config;
  const next = { ...config, boundPostId: first.id };
  const saved = await client.automation.updateMany({ where: { id: automation.id, integrationId: automation.integrationId, active: true, archivedAt: null, postConfig: { equals: automation.postConfig as Prisma.InputJsonValue } }, data: { postConfig: next } });
  if (saved.count) return next;
  const fresh = await client.automation.findFirst({ where: { id: automation.id, integrationId: automation.integrationId, active: true, archivedAt: null }, select: { postConfig: true } });
  return readNextPost(fresh?.postConfig);
}
