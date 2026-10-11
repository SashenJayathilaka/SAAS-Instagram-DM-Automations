"use server";

import { onCurrentUser } from "../user";
import { findUser } from "../user/queries";
import { instagramMediaFetchError, resolveInstagramMediaConnection } from "@/lib/instagram-media";

const INSTAGRAM_MEDIA_PAGE_LIMIT = 100;
const INSTAGRAM_MEDIA_MAX_PAGES = 20;
const MEDIA_FIELDS = "id,caption,media_url,thumbnail_url,media_type,timestamp,permalink";

export const getProfilePostsPaginated = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    const connection = resolveInstagramMediaConnection(profile?.integrations);
    if (!connection.ok) {
      console.log("[instagram-media] paginated fetch skipped: missing connected Instagram token or business account");
      return {
        status: 401,
        data: { data: [], error: connection.error, pageSize: 14, totalLoaded: 0, hasMore: false },
      };
    }

    const allMedia: any[] = [];
    let after: string | undefined;
    let lastStatus = 200;
    let lastError: string | undefined;
    let hasMore = false;

    for (let page = 0; page < INSTAGRAM_MEDIA_MAX_PAGES; page += 1) {
      const url = new URL(`${connection.apiBaseUrl}/${connection.instagramBusinessAccountId}/media`);
      url.searchParams.set("fields", MEDIA_FIELDS);
      url.searchParams.set("limit", String(INSTAGRAM_MEDIA_PAGE_LIMIT));
      if (after) url.searchParams.set("after", after);

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${connection.token}` },
        cache: "no-store",
      });

      const parsed = await response.json();
      lastStatus = response.status;

      if (!response.ok) {
        lastError = parsed?.error?.message ?? "unknown error";
        console.log("[instagram-media] paginated fetch failed", {
          status: response.status,
          apiFamily: connection.apiFamily,
          loadedBeforeFailure: allMedia.length,
          message: lastError,
        });
        break;
      }

      if (Array.isArray(parsed?.data)) {
        allMedia.push(...parsed.data);
      }

      after = typeof parsed?.paging?.cursors?.after === "string"
        ? parsed.paging.cursors.after
        : undefined;
      hasMore = Boolean(parsed?.paging?.next && after);
      if (!hasMore) break;
    }

    if (lastStatus >= 200 && lastStatus < 300) {
      console.log("[instagram-media] paginated fetch success", {
        apiFamily: connection.apiFamily,
        totalLoaded: allMedia.length,
        maxPagesReached: hasMore,
      });
      return {
        status: 200,
        data: {
          data: allMedia,
          pageSize: 14,
          totalLoaded: allMedia.length,
          hasMore,
        },
      };
    }

    return {
      status: lastStatus,
      data: {
        data: allMedia,
        pageSize: 14,
        totalLoaded: allMedia.length,
        hasMore,
        error: instagramMediaFetchError(lastStatus),
        metaError: lastError,
      },
    };
  } catch (error: any) {
    console.log("[instagram-media] paginated fetch error", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 500,
      data: { data: [], pageSize: 14, totalLoaded: 0, hasMore: false, error: "AP3K could not load posts right now." },
    };
  }
};
