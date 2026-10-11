import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import { resolveInstagramMediaConnection } from "@/lib/instagram-media";
import { client } from "@/lib/prisma";

const INSTAGRAM_MEDIA_PAGE_LIMIT = 100;
const INSTAGRAM_MEDIA_MAX_PAGES = 20;
const MEDIA_FIELDS = "id,media_type,media_url,thumbnail_url";
const EXPIRY_SAFETY_WINDOW_MS = 15 * 60 * 1000;

type CampaignPost = {
  postid?: string | null;
  media?: string | null;
  mediaType?: string | null;
};

type CampaignWithPosts = {
  posts?: CampaignPost[] | null;
};

type MetaMedia = {
  id?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
};

export function getInstagramCdnExpiryMs(mediaUrl?: string | null) {
  if (!mediaUrl) return null;

  try {
    const parsed = new URL(mediaUrl);
    const rawExpiry = parsed.searchParams.get("oe");
    if (!rawExpiry || !/^[0-9a-f]+$/i.test(rawExpiry)) return null;

    const seconds = Number.parseInt(rawExpiry, 16);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    const milliseconds = seconds * 1000;
    return Number.isFinite(milliseconds) ? milliseconds : null;
  } catch {
    return null;
  }
}

export function campaignMediaNeedsRefresh(post?: CampaignPost | null, now = Date.now()) {
  if (!post?.postid || ["ANY", "NEXT"].includes(post.postid)) return false;
  if (!post.media) return true;

  const expiry = getInstagramCdnExpiryMs(post.media);
  return expiry !== null && expiry <= now + EXPIRY_SAFETY_WINDOW_MS;
}

function selectPreviewUrl(media: MetaMedia) {
  const mediaType = String(media.media_type ?? "").toUpperCase();
  const candidate = mediaType === "VIDEO"
    ? media.thumbnail_url || media.media_url
    : media.media_url || media.thumbnail_url;

  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function fetchMediaCollection(
  connection: Extract<ReturnType<typeof resolveInstagramMediaConnection>, { ok: true }>,
  mediaIds: Set<string>
) {
  const resolved = new Map<string, string>();
  let after: string | undefined;

  for (let page = 0; page < INSTAGRAM_MEDIA_MAX_PAGES && resolved.size < mediaIds.size; page += 1) {
    const url = new URL(`${connection.apiBaseUrl}/${connection.instagramBusinessAccountId}/media`);
    url.searchParams.set("fields", MEDIA_FIELDS);
    url.searchParams.set("limit", String(INSTAGRAM_MEDIA_PAGE_LIMIT));
    if (after) url.searchParams.set("after", after);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${connection.token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.warn("[campaign-media] media collection refresh failed", {
        status: response.status,
        apiFamily: connection.apiFamily,
      });
      break;
    }

    const items = Array.isArray(payload?.data) ? payload.data as MetaMedia[] : [];
    for (const item of items) {
      const id = item.id ? String(item.id) : "";
      if (!mediaIds.has(id)) continue;
      const preview = selectPreviewUrl(item);
      if (preview) resolved.set(id, preview);
    }

    after = typeof payload?.paging?.cursors?.after === "string"
      ? payload.paging.cursors.after
      : undefined;
    if (!payload?.paging?.next || !after) break;
  }

  return resolved;
}

async function fetchMediaDirect(
  connection: Extract<ReturnType<typeof resolveInstagramMediaConnection>, { ok: true }>,
  mediaId: string
) {
  const url = new URL(`${connection.apiBaseUrl}/${encodeURIComponent(mediaId)}`);
  url.searchParams.set("fields", MEDIA_FIELDS);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${connection.token}` },
    cache: "no-store",
      signal: AbortSignal.timeout(8_000),
  });
  const payload = await response.json().catch(() => null) as MetaMedia | null;

  if (!response.ok) return null;
  return payload ? selectPreviewUrl(payload) : null;
}

async function refreshCampaignMediaForClerkUser(clerkId: string, campaigns: CampaignWithPosts[]) {
  const stalePosts = campaigns
    .flatMap((campaign) => campaign.posts ?? [])
    .filter((post) => campaignMediaNeedsRefresh(post));

  const mediaIds = new Set(
    stalePosts
      .map((post) => String(post.postid ?? ""))
      .filter((id) => id && !["ANY", "NEXT"].includes(id))
  );

  if (mediaIds.size === 0) return campaigns;

  const user = await client.user.findUnique({
    where: { clerkId },
    select: {
      integrations: {
        where: { id: await currentInstagramAccountId(clerkId) },
        select: {
          name: true,
          token: true,
          instagramId: true,
          igAccountSource: true,
          oauthResolutionDiagnostics: true,
          status: true,
          reconnectRequired: true,
        },
      },
    },
  });

  const canonicalIntegration = getCanonicalInstagramIntegration(user?.integrations);
  const connection = resolveInstagramMediaConnection(
    canonicalIntegration ? [canonicalIntegration] : undefined
  );

  if (!connection.ok) {
    // Do not keep rendering a URL that we already know is expired. The UI will
    // fall back to its normal post placeholder until Instagram reconnects.
    for (const post of stalePosts) post.media = "";
    return campaigns;
  }

  const resolved = await fetchMediaCollection(connection, mediaIds);

  // A specific campaign can reference media older than the paginated account
  // window. Resolve only the remaining IDs directly rather than spending quota
  // on every campaign on every page load.
  for (const mediaId of Array.from(mediaIds)) {
    if (resolved.has(mediaId)) continue;
    const preview = await fetchMediaDirect(connection, mediaId);
    if (preview) resolved.set(mediaId, preview);
  }

  if (resolved.size > 0) {
    await Promise.all(
      Array.from(resolved.entries()).map(([postid, media]) =>
        client.post.updateMany({
          where: {
            postid,
            Automation: { User: { clerkId } },
          },
          data: { media },
        })
      )
    );
  }

  for (const post of stalePosts) {
    const postid = String(post.postid ?? "");
    const refreshed = resolved.get(postid);
    post.media = refreshed ?? "";
  }

  console.info("[campaign-media] refreshed expiring preview URLs", {
    requested: mediaIds.size,
    refreshed: resolved.size,
    apiFamily: connection.apiFamily,
  });

  return campaigns;
}

export async function refreshExpiredCampaignMediaListForClerkUser<T extends CampaignWithPosts>(
  clerkId: string,
  campaigns: T[]
): Promise<T[]> {
  await refreshCampaignMediaForClerkUser(clerkId, campaigns);
  return campaigns;
}

export async function refreshExpiredCampaignMediaForClerkUser<T extends CampaignWithPosts>(
  clerkId: string,
  campaign: T
): Promise<T> {
  await refreshCampaignMediaForClerkUser(clerkId, [campaign]);
  return campaign;
}
