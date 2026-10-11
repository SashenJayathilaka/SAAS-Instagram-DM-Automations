import { resolveInstagramMediaConnection, type InstagramMediaIntegration } from "@/lib/instagram-media";
import { readInstagramStory, storyIsLive, type InstagramStory } from "@/lib/story-automation";

export type StoryFetchResult = { ok: true; stories: InstagramStory[]; complete: boolean; fetchedAt: string } | { ok:false; stories:InstagramStory[]; complete:false; error:string; reconnectRequired:boolean };
const fields = "id,media_url,thumbnail_url,media_type,timestamp,permalink";
const failure = (error:string, reconnectRequired=false, stories:InstagramStory[]=[]): StoryFetchResult => ({ok:false,stories,complete:false,error,reconnectRequired});

/** Stories are not included in /media. Use the token's API family and the
 * dedicated /stories edge. Only follow cursor values, never an API-supplied URL. */
export async function fetchActiveInstagramStories(integration: InstagramMediaIntegration, options: {now?:number; fetcher?:typeof fetch; maxPages?:number} = {}): Promise<StoryFetchResult> {
  const connection = resolveInstagramMediaConnection([integration]);
  if (!connection.ok) return failure("Reconnect Instagram to load your active stories.",true);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now();
  const found = new Map<string,InstagramStory>();
  const cursors = new Set<string>();
  // Instagram Login accepts /me, which avoids confusing a messaging-scoped ID
  // with a media user ID. Facebook Login requires the Instagram business ID.
  const account = connection.apiFamily === "instagram_graph" ? "me" : connection.instagramBusinessAccountId;
  let after: string | undefined;
  try {
    for (let page=0;page<(options.maxPages ?? 10);page++) {
      const url = new URL(`${connection.apiBaseUrl}/${encodeURIComponent(account)}/stories`);
      url.searchParams.set("fields",fields); url.searchParams.set("limit","100");
      if (after) url.searchParams.set("after",after);
      const response = await fetcher(url.toString(),{headers:{Authorization:`Bearer ${connection.token}`},cache:"no-store",signal:AbortSignal.timeout(8000)});
      const json = await response.json().catch(()=>null) as any;
      if (!response.ok || json?.error) {
        const code = json?.error?.code;
        const reconnect = response.status === 401 || response.status === 403 || code === 190 || code === 10 || code === 200;
        return failure(reconnect ? "Instagram could not authorize story access. Reconnect this account and allow media and message permissions." : response.status === 429 || code === 4 || code === 32 ? "Instagram is limiting requests. Wait a moment and refresh stories." : "Instagram could not load stories. Refresh to try again.",reconnect,Array.from(found.values()));
      }
      if (!Array.isArray(json?.data)) return failure("Instagram returned an incomplete story list. Refresh to try again.",false,Array.from(found.values()));
      let malformed = false;
      for (const item of json.data) {
        const story = readInstagramStory(item);
        if (!story) { malformed=true; continue; }
        if (storyIsLive(story,now)) found.set(story.id,story);
      }
      if (malformed) return failure("Instagram returned incomplete story details. Refresh to try again.",false,Array.from(found.values()));
      if (!json.paging?.next) return {ok:true,stories:Array.from(found.values()).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)),complete:true,fetchedAt:new Date(now).toISOString()};
      after = typeof json.paging?.cursors?.after === "string" ? json.paging.cursors.after : undefined;
      if (!after || cursors.has(after)) return failure("Instagram returned an incomplete story list. Refresh to try again.",false,Array.from(found.values()));
      cursors.add(after);
    }
    return failure("Not all stories could be loaded. Refresh to try again.",false,Array.from(found.values()));
  } catch {
    return failure("Story loading timed out or the connection failed. Refresh to try again.",false,Array.from(found.values()));
  }
}
