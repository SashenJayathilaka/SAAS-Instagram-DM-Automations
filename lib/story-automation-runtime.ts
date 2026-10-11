import { Prisma } from "@prisma/client";
import { client } from "@/lib/prisma";
import { fetchActiveInstagramStories, type StoryFetchResult } from "@/lib/instagram-stories";
import type { InstagramMediaIntegration } from "@/lib/instagram-media";
import { normalizeStoryConfig, readStoryConfig, nextStoryCandidate, STORY_LIFETIME_MS, type StoryConfig } from "@/lib/story-automation";
import type { NormalizedMessageAutomationPayload } from "@/lib/message-automation";

type StoryOwner = {id:string;storyConfig?:unknown;active?:boolean;integrationId?:string|null};
/** Rebuild selected media from the owning account. Client-supplied URLs, arming
 * timestamps and binding IDs never establish ownership or next-story state. */
export async function prepareStoryPublication(payload:NormalizedMessageAutomationPayload, previous:StoryOwner|null, integration:InstagramMediaIntegration):Promise<{ok:true;config:StoryConfig}|{ok:false;error:string}> {
  const requested = normalizeStoryConfig(payload.storyConfig,payload.storyTriggerType);
  const {armedAt:_,baselineIds:__,boundStoryId:___,observedThrough:____,...editable} = requested;
  let config:StoryConfig = {...editable};
  const before = readStoryConfig(previous?.storyConfig);
  if (config.scope === "NEXT" && before?.scope === "NEXT" && before.armedAt) {
    config = {...config,armedAt:before.armedAt,baselineIds:before.baselineIds,boundStoryId:before.boundStoryId,observedThrough:before.observedThrough,stories:before.stories};
  }
  if (!payload.active) return {ok:true,config};
  if (config.scope === "MENTION" || config.scope === "ALL") return {ok:true,config};
  if (config.scope === "NEXT" && config.armedAt) {
    if(!config.boundStoryId && Date.now()-Date.parse(config.observedThrough || config.armedAt)>=STORY_LIFETIME_MS) return {ok:false,error:"This next-story rule could not be monitored for 24 hours. Choose a specific live story or create a new next-story automation."};
    return {ok:true,config};
  }
  const live = await fetchActiveInstagramStories(integration);
  if (!live.ok || !live.complete) return {ok:false,error:live.ok ? "Refresh stories before publishing." : live.error};
  if (config.scope === "SPECIFIC") {
    const owned = config.stories.map(story=>live.stories.find(item=>item.id===story.id));
    if (!owned.length || owned.some(story=>!story)) return {ok:false,error:"A selected story expired or does not belong to this Instagram account. Refresh and select a live story."};
    return {ok:true,config:{...config,stories:owned as StoryConfig["stories"]}};
  }
  const now = new Date().toISOString();
  return {ok:true,config:{...config,stories:[],armedAt:now,observedThrough:now,boundStoryId:"",baselineIds:live.stories.map(story=>story.id)}};
}

/** Compare-and-swap prevents two webhooks from binding different stories, and
 * prevents a slow API response overwriting an owner's concurrent editor save. */
export async function bindNextStoryAutomation(automation:StoryOwner, integration:InstagramMediaIntegration, snapshot?:StoryFetchResult):Promise<StoryConfig|null> {
  const config = readStoryConfig(automation.storyConfig);
  if (!config || config.scope !== "NEXT" || config.boundStoryId || !config.armedAt) return config;
  const now=Date.now();
  if (now-Date.parse(config.observedThrough || config.armedAt)>=STORY_LIFETIME_MS) {
    await client.automation.updateMany({where:{id:automation.id,active:true,storyConfig:{equals:automation.storyConfig as Prisma.InputJsonValue}},data:{needsReview:true,reviewReason:"Story monitoring was unavailable for 24 hours. Choose a live story or set up a new next-story automation."}});
    return null;
  }
  const live = snapshot ?? await fetchActiveInstagramStories(integration,{maxPages:3});
  if (!live.ok || !live.complete) return null;
  const first=nextStoryCandidate(config,live.stories,live.complete,now);
  const next:StoryConfig={...config,observedThrough:new Date(now).toISOString(),...(first?{boundStoryId:first.id,stories:[first]}:{})};
  const updated=await client.automation.updateMany({where:{id:automation.id,active:true,storyConfig:{equals:automation.storyConfig as Prisma.InputJsonValue}},data:{storyConfig:next as unknown as Prisma.InputJsonValue}});
  if (updated.count) return next;
  const fresh=await client.automation.findFirst({where:{id:automation.id,active:true,archivedAt:null,integrationId:automation.integrationId},select:{storyConfig:true}});
  return readStoryConfig(fresh?.storyConfig);
}

/** Existing scheduler observes publication, not the first person to reply. */
export async function bindPendingNextStories() {
  const pending=await client.automation.findMany({where:{active:true,archivedAt:null,needsReview:false,source:"STORY",AND:[{storyConfig:{path:["scope"],equals:"NEXT"}},{storyConfig:{path:["boundStoryId"],equals:""}}],integration:{status:"CONNECTED",reconnectRequired:false,planLocked:false},User:{status:{not:"SUSPENDED"}}},select:{id:true,integrationId:true,storyConfig:true,integration:{select:{token:true,instagramId:true,igAccountSource:true,oauthResolutionDiagnostics:true}}},orderBy:{createdAt:"asc"},take:100});
  const groups=new Map<string,typeof pending>();
  for(const item of pending) {
    const config=readStoryConfig(item.storyConfig);
    if(!item.integrationId||!item.integration||!config?.armedAt||config.boundStoryId)continue;
    groups.set(item.integrationId,[...(groups.get(item.integrationId)||[]),item]);
  }
  let storiesBound=0;
  const started=Date.now();
  for(const group of Array.from(groups.values())) {
    if(Date.now()-started>20000)break;
    const snapshot=await fetchActiveInstagramStories(group[0].integration!,{maxPages:3});
    for(const item of group) {const bound=await bindNextStoryAutomation(item,item.integration!,snapshot);if(bound?.boundStoryId)storiesBound++;}
  }
  return {storiesBound};
}
