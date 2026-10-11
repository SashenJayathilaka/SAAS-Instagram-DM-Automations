import { bindNextCommentPost } from "@/lib/next-post-runtime";
import { readStoryConfig, storyScopeMatches } from "@/lib/story-automation";
import { bindNextStoryAutomation } from "@/lib/story-automation-runtime";
import { storyIntentMatches } from "@/lib/story-intent";
import { parseEmailReply, parsePhoneReply } from "@/lib/automation-engagement-settings";
import { readFlowTriggers, matchFlowTrigger, type FlowTrigger } from "@/lib/automation-flow/triggers";
import { resolveInstagramMediaConnection } from "@/lib/instagram-media";
import { resolveIntegrationSendToken } from "@/lib/send-token";
import { conversationStopIntent, readAiConversation } from "@/lib/ai-conversation";
import { client } from "@/lib/prisma";
import { matchKeywordWithMode, normalizeMatchText, resolveCommentTriggerMatch } from "@/lib/matching";
import {
  resolveFollowRequestButtonText,
  resolveOpeningDmButtonText,
  type CommentDmAction,
} from "@/lib/comment-dm-flow";
import type {
  Automation,
  Keyword,
  Listener,
  Integrations,
  Subscription,
  EVENT_TYPE,
  MESSAGE_TYPE,
  SEND_STATUS,
  Prisma,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

type AutomationWithRelations = Automation & {
  keywords: Keyword[];
  listener: Listener | null;
  posts?: { postid: string; media?: string | null; caption?: string | null; mediaType?: string | null }[];
  User: {
    subscription: Pick<Subscription, "plan"> | null;
    integrations: Pick<
      Integrations,
      "id" | "token" | "igAccountSource" | "oauthResolutionDiagnostics" | "instagramId" | "pageId" | "webhookAccountId" | "businessId" | "instagramUsername" | "status" | "reconnectRequired" | "planLocked"
    >[];
  } | null;
};

/** Select this event's trigger before legacy routing, so keywords never leak across sources. */
export function flowTriggerForEvent(automation: Pick<AutomationWithRelations, "listener">, event: Parameters<typeof matchFlowTrigger>[1]) {
  const triggers = readFlowTriggers(automation.listener?.flowTriggers);
  return triggers === null ? undefined : matchFlowTrigger(triggers, event);
}
function commentMatch(automation: AutomationWithRelations, mediaId: string, text: string) {
  const trigger = flowTriggerForEvent(automation,{source:"COMMENT",text,mediaId});
  if (trigger !== undefined) return trigger ? trigger.anyMessage ? "any comment" : trigger.keyword : null;
  return resolveCommentTriggerMatch({text,keywords:automation.keywords,mode:automation.matchingMode,triggerMode:automation.triggerMode});
}
export async function bindNextPostTriggers(automation: AutomationWithRelations) {
  const triggers = readFlowTriggers(automation.listener?.flowTriggers);
  if (!triggers?.some(t=>t.source === "COMMENT" && t.postScope === "next" && !t.boundPostId)) return;
  const integration = automation.User?.integrations.find(i=>i.id===automation.integrationId);
  const token = resolveIntegrationSendToken(integration);
  const connection = resolveInstagramMediaConnection(integration ? [integration] : []);
  if (!integration?.instagramId || !token.ok || !connection.ok) return;
  const pending = triggers.filter(t=>t.source === "COMMENT" && t.postScope === "next" && !t.boundPostId && t.publishedAt);
  if (!pending.length) return;
  const boundary = Math.min(...pending.map(t=>Date.parse(t.publishedAt!)));
  const publications: Array<{id:string;at:number}> = [];
  let after: string | undefined; let complete=false;
  try {
    // Read the owning account's timeline once for all pending triggers. A bounded,
    // incomplete history never falls back to whichever post happened to get a comment.
    for(let page=0;page<5;page++) {
      const url = new URL(`${connection.apiBaseUrl}/${encodeURIComponent(integration.instagramId)}/media`);
      url.searchParams.set("fields","id,timestamp");url.searchParams.set("limit","100");if(after)url.searchParams.set("after",after);
      const response = await fetch(url,{headers:{Authorization:`Bearer ${token.token}`},signal:AbortSignal.timeout(2000),cache:"no-store"});
      if(!response.ok) break;
      const data = await response.json() as {data?:Array<{id?:string;timestamp?:string}>;paging?:{next?:string;cursors?:{after?:string}}};
      if(!Array.isArray(data.data)) break;
      let reachedBoundary=false;
      for(const post of data.data){const at=Date.parse(post.timestamp ?? "");if(!Number.isFinite(at)||!post.id)continue;if(at<=boundary)reachedBoundary=true;else publications.push({id:post.id,at});}
      if(reachedBoundary||!data.paging?.next){complete=true;break;}
      after=data.paging.cursors?.after;if(!after)break;
    }
  } catch { return; }
  if (!complete) return;
  publications.sort((a,b)=>a.at-b.at || a.id.localeCompare(b.id));
  let changed=false;
  const updated = triggers.map(trigger=> {
    if (!pending.includes(trigger)) return trigger;
    const first=publications.find(post=>post.at>Date.parse(trigger.publishedAt!));
    if (!first) return trigger;
    changed=true;
    return {...trigger,boundPostId:first.id};
  });
  if(changed&&automation.listener) {
    const claimed=await client.listener.updateMany({where:{automationId:automation.id,flowRevision:automation.listener.flowRevision,flowTriggers:{equals:automation.listener.flowTriggers!}},data:{flowTriggers:updated as Prisma.InputJsonValue}});
    if(claimed.count) automation.listener.flowTriggers=updated as unknown as Prisma.JsonValue;
  }
}

export async function isCurrentFlowOpening(automation: Pick<AutomationWithRelations,"id"|"listener">, recipientIgId: string, commentId?: string) {
  if (!automation.listener?.flowDefinition || automation.listener.flowTriggers == null) return true;
  if (!commentId) return false;
  const event = await client.automationEvent.findFirst({where:{automationId:automation.id,igUserId:recipientIgId,commentId,eventType:"DM_SENT",meta:{path:["flowRevision"],equals:automation.listener.flowRevision}},select:{id:true}});
  return Boolean(event);
}

export function normalizeInstagramMediaId(value?: string | null) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (trimmed === "ANY") return "ANY";

  try {
    const parsed = new URL(trimmed);
    const lastSegment = parsed.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .at(-1);
    return lastSegment ?? trimmed;
  } catch {
    return trimmed;
  }
}

// ---------------------------------------------------------------------------
// Automation lookup — COMMENT trigger
// ---------------------------------------------------------------------------

/**
 * Finds an active automation that:
 * - has a COMMENT trigger
 * - has a Post with postid matching the commented media
 * - belongs to a user whose connected Page ID matches the webhook entry.id
 */
export const findAutomationForComment = async (
  mediaId: string,
  pageId: string
): Promise<AutomationWithRelations | null> => {
  return await client.automation.findFirst({
    where: {
      active: true,
      archivedAt: null,
      integration: { pageId, status: "CONNECTED", reconnectRequired: false, planLocked: false },
      trigger: { some: { type: "COMMENT" } },
      posts: { some: { postid: { in: [mediaId, "ANY"] } } },
      User: {
        status: { not: "SUSPENDED" },
        integrations: { some: { pageId, status: { not: "DISCONNECTED" }, reconnectRequired: false, planLocked: false } },
      },
    },
    include: {
      posts: true,
      keywords: true,
      listener: true,
      User: {
        select: {
          subscription: { select: { plan: true } },
          integrations: {
            select: {
              id: true,
              token: true,
              igAccountSource: true,
              oauthResolutionDiagnostics: true,
              instagramId: true,
              pageId: true,
              webhookAccountId: true,
              businessId: true,
              instagramUsername: true,
              status: true,
              reconnectRequired: true,
              planLocked: true,
            },
          },
        },
      },
    },
  });
};

export const findAutomationForCommentWithReason = async (
  mediaId: string,
  pageId: string,
  options: {
    object?: string;
    igAccountId?: string | null;
    commentText?: string;
  } = {}
): Promise<{
  automation: AutomationWithRelations | null;
  automations: AutomationWithRelations[];
  failureReason?: "no_matching_integration" | "no_active_automation_for_media" | "keyword_mismatch" | "ambiguous";
  diagnostics: Prisma.InputJsonObject;
}> => {
  const normalizedIncomingMediaId = normalizeInstagramMediaId(mediaId);
  const incomingAccountIds = Array.from(new Set(
    [pageId, options.igAccountId]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
  ));
  const allowPageIdMatch = options.object !== "instagram";
  const candidateFieldChecks = [
    "instagramId",
    "webhookAccountId",
    "valueIgAccountId",
    ...(allowPageIdMatch ? ["pageId"] : []),
    "businessId",
  ];
  const activeIntegrations = await client.integrations.findMany({
    where: {
      User: {
        status: { not: "SUSPENDED" },
        automations: { some: { active: true, archivedAt: null } },
      },
      status: { not: "DISCONNECTED" },
      reconnectRequired: false, planLocked: false,
    },
    select: {
      id: true,
      instagramId: true,
      webhookAccountId: true,
      pageId: true,
      businessId: true,
      instagramUsername: true,
      status: true,
      reconnectRequired: true,
              planLocked: true,
    },
  });
  // Match by any known ID field — entry.id is IG Business ID for object=instagram,
  // or Page ID for object=page. Try all stored ID fields to handle both shapes.
  const matchingIntegrations = await client.integrations.findMany({
    where: {
      OR: [
        { instagramId: { in: incomingAccountIds } },
        { webhookAccountId: { in: incomingAccountIds } },
        { businessId: { in: incomingAccountIds } },
        ...(allowPageIdMatch ? [{ pageId: { in: incomingAccountIds } }] : []),
      ],
      status: { not: "DISCONNECTED" },
      reconnectRequired: false, planLocked: false,
      User: { status: { not: "SUSPENDED" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      instagramId: true,
      webhookAccountId: true,
      pageId: true,
      businessId: true,
      instagramUsername: true,
      status: true,
      reconnectRequired: true,
              planLocked: true,
    },
  });

  if (matchingIntegrations.length === 0 || !matchingIntegrations.some((item) => item.userId)) {
    return {
      automation: null,
      automations: [],
      failureReason: "no_matching_integration",
      diagnostics: {
        incomingMediaId: mediaId,
        normalizedIncomingMediaId,
        incomingPageId: pageId,
        incomingAccountIds,
        object: options.object,
        candidateIntegrationCount: 0,
        candidateFieldsChecked: candidateFieldChecks,
        allActiveIntegrationInstagramIds: activeIntegrations.map((item) => item.instagramId).filter(Boolean),
        allActiveIntegrationWebhookAccountIds: activeIntegrations.map((item) => item.webhookAccountId).filter(Boolean),
        allActiveIntegrationPageIds: activeIntegrations.map((item) => item.pageId).filter(Boolean),
        maskedStoredIntegrationIds: activeIntegrations.map((item) => ({
          id: maskId(item.id),
          instagramId: maskId(item.instagramId),
          webhookAccountId: maskId(item.webhookAccountId),
          pageId: maskId(item.pageId),
        })),
        reason: "no_integration_for_incoming_account_ids",
        matchingIntegrationFound: false,
        matchedAutomationIds: [],
        storedPostIds: [],
        comparisons: [],
      },
    };
  }

  await Promise.all(
    matchingIntegrations
      .filter((integration) => !integration.webhookAccountId || integration.webhookAccountId !== pageId)
      .map((integration) =>
        client.integrations.update({
          where: { id: integration.id },
          data: { webhookAccountId: pageId },
        })
      )
  );

  const ownerIntegrations = Array.from(
    matchingIntegrations
      .filter((integration) => integration.userId)
      .reduce((map, integration) => {
        if (integration.userId && !map.has(integration.id)) map.set(integration.id, integration);
        return map;
      }, new Map<string, (typeof matchingIntegrations)[number]>())
      .values()
  );

  const accountAutomationsByIntegration = await Promise.all(
    ownerIntegrations
      .map(async (integration) => ({
        integration,
        automations: await client.automation.findMany({
          where: {
            userId: integration.userId,
            integrationId: integration.id,
            archivedAt: null,
            trigger: { some: { type: "COMMENT" } },
          },
          orderBy: { createdAt: "desc" },
          include: {
            posts: true,
            keywords: true,
            listener: true,
            User: {
              select: {
                subscription: { select: { plan: true } },
                integrations: {
                  select: {
                    id: true,
                    token: true,
              igAccountSource: true,
              oauthResolutionDiagnostics: true,
                    instagramId: true,
                    pageId: true,
                    webhookAccountId: true,
                    businessId: true,
                    instagramUsername: true,
                    status: true,
                    reconnectRequired: true,
              planLocked: true,
                  },
                },
              },
            },
          },
        }),
      }))
  );

  await Promise.all(accountAutomationsByIntegration.flatMap(item=>item.automations.filter(a=>a.active).map(bindNextPostTriggers)));
  await Promise.all(accountAutomationsByIntegration.flatMap(item => item.automations.filter(a => a.active && a.posts.some(p => p.postid === "NEXT")).map(async automation => {
    const owner = automation.User?.integrations.find(i => i.id === automation.integrationId);
    const next = owner ? await bindNextCommentPost(automation, owner).catch(() => null) : null;
    // Only the verified bound post can enter existing keyword/priority routing.
    automation.posts = next?.boundPostId ? automation.posts.map(p => p.postid === "NEXT" ? { ...p, postid: next.boundPostId! } : p) : [];
  })));
  const accountAutomations = accountAutomationsByIntegration.flatMap((item) =>
    item.automations.map((automation) => ({ automation, integration: item.integration }))
  );

  const activeAutomations = accountAutomations.filter((item) => item.automation.active);
  const comparisons = accountAutomations.flatMap(({ automation, integration }) => {
    const posts = automation.posts.length > 0 ? automation.posts : [{ postid: "" }];
    return posts.map((post) => {
      const normalizedStoredPostId = normalizeInstagramMediaId(post.postid);
      const isAnyPost = post.postid === "ANY" || normalizedStoredPostId === "ANY";
      const postMatched = isAnyPost || normalizedStoredPostId === normalizedIncomingMediaId;
      const triggerMatched = options.commentText
        ? resolveCommentTriggerMatch({
            text: options.commentText,
            keywords: automation.keywords,
            mode: automation.matchingMode,
            triggerMode: automation.triggerMode,
          })
        : "not_evaluated";
      return {
        integrationId: integration.id,
        integrationUserId: integration.userId,
        automationId: automation.id,
        automationName: automation.name,
        automationActive: automation.active,
        triggerMode: automation.triggerMode,
        matchingMode: automation.matchingMode,
        storedKeywords: automation.keywords.map((keyword) => keyword.word),
        normalizedKeywords: automation.keywords.map((keyword) => normalizeMatchText(keyword.word)),
        storedPostId: post.postid,
        normalizedStoredPostId,
        incomingMediaId: mediaId,
        normalizedIncomingMediaId,
        isAnyPost,
        postMatched,
        triggerMatched,
        normalizedMatch: postMatched,
      };
    });
  });
  const rankedMatches = activeAutomations.flatMap((item) => {
    const triggerMatched = options.commentText !== undefined ? commentMatch(item.automation,normalizedIncomingMediaId,options.commentText) : "not_evaluated";
    const flowTriggers = readFlowTriggers(item.automation.listener?.flowTriggers);
    const flowMatch = flowTriggers === null ? undefined : matchFlowTrigger(flowTriggers,{source:"COMMENT",mediaId:normalizedIncomingMediaId,text:options.commentText ?? ""});
    const candidatePosts = flowTriggers === null ? item.automation.posts : flowMatch ? [{postid:flowMatch.postScope === "all" ? "ANY" : flowMatch.boundPostId ?? flowMatch.post?.postid ?? ""}] : [];
    return candidatePosts
      .map((post) => {
        const normalizedStoredPostId = normalizeInstagramMediaId(post.postid);
        const exactPost = normalizedStoredPostId === normalizedIncomingMediaId;
        const anyPost = post.postid === "ANY" || normalizedStoredPostId === "ANY";
        const postMatched = exactPost || anyPost;
        const anyComment = flowMatch ? flowMatch.anyMessage : item.automation.triggerMode === "ANY_COMMENT";
        const triggerOk = options.commentText ? Boolean(triggerMatched) : true;
        if (!postMatched || !triggerOk) return null;
        const score =
          exactPost && !anyComment ? 40 :
          exactPost && anyComment ? 30 :
          anyPost && !anyComment ? 20 :
          10;
        return {
          ...item,
          post,
          exactPost,
          anyPost,
          triggerMatched,
          score,
        };
      })
      .filter(Boolean);
  }) as Array<{
    automation: AutomationWithRelations;
    integration: (typeof matchingIntegrations)[number];
    post: { postid: string };
    exactPost: boolean;
    anyPost: boolean;
    triggerMatched: string;
    score: number;
  }>;

  const bestScore = rankedMatches[0]
    ? Math.max(...rankedMatches.map((item) => item.score))
    : 0;
  const bestMatches = rankedMatches.filter((item) => item.score === bestScore);
  const selectedMatch = bestMatches.length === 1 ? bestMatches[0] : null;
  const matchedAutomations = selectedMatch
    ? [selectedMatch.automation]
    : rankedMatches.map((item) => item.automation);
  const matchedIntegration = selectedMatch?.integration ?? matchingIntegrations[0];

  const diagnostics = {
    incomingMediaId: mediaId,
    normalizedIncomingMediaId,
    incomingPageId: pageId,
    incomingAccountIds,
    object: options.object,
    candidateIntegrationCount: matchingIntegrations.length,
    candidateFieldsChecked: candidateFieldChecks,
    allActiveIntegrationInstagramIds: activeIntegrations.map((item) => item.instagramId).filter(Boolean),
    allActiveIntegrationWebhookAccountIds: activeIntegrations.map((item) => item.webhookAccountId).filter(Boolean),
    matchingIntegrationIds: matchingIntegrations.map((item) => item.id),
    matchingIntegrationFound: true,
    matchedIntegrationId: matchedIntegration?.id,
    matchedIntegrationInstagramId: matchedIntegration?.instagramId,
    matchedIntegrationWebhookAccountId: matchedIntegration?.webhookAccountId ?? pageId,
    matchedIntegrationUsername: matchedIntegration?.instagramUsername,
    matchedIntegrationOwnerUserId: matchedIntegration?.userId,
    matchedAutomationIds: comparisons
      .filter((item) => item.automationActive && item.postMatched && item.triggerMatched)
      .map((item) => item.automationId),
    matchedAutomationCount: matchedAutomations.length,
    selectedAutomationId: selectedMatch?.automation.id,
    selectedIntegrationId: selectedMatch?.integration.id,
    ambiguous: bestMatches.length > 1,
    activeAutomationCount: activeAutomations.length,
    postMatchDiagnostics: comparisons.map((item) => ({
      integrationId: item.integrationId,
      ownerUserId: item.integrationUserId,
      automationId: item.automationId,
      storedPostId: item.storedPostId,
      normalizedStoredPostId: item.normalizedStoredPostId,
      isAnyPost: item.isAnyPost,
      postMatched: item.postMatched,
    })),
    triggerMatchDiagnostics: comparisons.map((item) => ({
      integrationId: item.integrationId,
      ownerUserId: item.integrationUserId,
      automationId: item.automationId,
      triggerMode: item.triggerMode,
      matchingMode: item.matchingMode,
      matchedKeyword: item.triggerMatched,
    })),
    storedPostIds: comparisons.map((item) => item.storedPostId),
    comparisons,
  };

  if (activeAutomations.length === 0) {
    return {
      automation: null,
      automations: [],
      failureReason: "no_active_automation_for_media",
      diagnostics,
    };
  }

  if (bestMatches.length > 1) {
    return {
      automation: null,
      automations: [],
      failureReason: "ambiguous",
      diagnostics,
    };
  }

  if (!selectedMatch) {
    const anyPostMatched = comparisons.some((item) => item.automationActive && item.postMatched);
    const reason = anyPostMatched ? "keyword_mismatch" : "no_active_automation_for_media";
    return {
      automation: null,
      automations: [],
      failureReason: reason,
      diagnostics,
    };
  }

  return { automation: selectedMatch.automation, automations: [selectedMatch.automation], diagnostics };
};

function maskId(value?: string | null) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return text;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Automation lookup — DM trigger
// ---------------------------------------------------------------------------

/**
 * Finds the first active automation with a DM trigger that has a keyword
 * matching the DM text, for the given Instagram account.
 */
async function sharedPostBelongsToAccount(automation: AutomationWithRelations, mediaId: string) {
  const integration = automation.User?.integrations.find(i => i.id === automation.integrationId);
  const connection = resolveInstagramMediaConnection(integration ? [integration] : []);
  const token = resolveIntegrationSendToken(integration);
  if (!integration?.instagramId || !connection.ok || !token.ok) return false;
  try {
    const url = new URL(`${connection.apiBaseUrl}/${encodeURIComponent(mediaId)}`);
    url.searchParams.set("fields", "id,owner");
    const response = await fetch(url, {headers:{Authorization:`Bearer ${token.token}`},signal:AbortSignal.timeout(4000),cache:"no-store"});
    if (!response.ok) return false;
    const media = await response.json() as {id?:string;owner?:{id?:string}};
    return media.id === mediaId && media.owner?.id === integration.instagramId;
  } catch { return false; }
}

export const findAutomationForDM = async (
  dmText: string,
  pageId: string,
  recipientIgId?: string,
  sharedPost = false,
  sharedMediaId?: string
): Promise<{ automation: AutomationWithRelations; matchedKeyword: string } | null> => {
  const automations = await client.automation.findMany({
    where: {
      active: true,
      archivedAt: null,
      integration: { ...webhookAccountFilter(pageId), status: "CONNECTED", reconnectRequired: false, planLocked: false },
      OR: [
        { trigger: { some: { type: "DM" } } },
        ...(sharedPost && sharedMediaId ? [{source:"COMMENT",triggerOnShares:true,sendPrivateDm:true,posts:{some:{postid:{in:[sharedMediaId,"ANY"]}}}}] : []),
      ],
      User: {
        status: { not: "SUSPENDED" },
        integrations: { some: { ...webhookAccountFilter(pageId), status: { not: "DISCONNECTED" }, reconnectRequired: false, planLocked: false } },
      },
    },
    include: {
      posts: true,
      keywords: true,
      listener: true,
      User: {
        select: {
          subscription: { select: { plan: true } },
          integrations: {
            select: {
              id: true,
              token: true,
              igAccountSource: true,
              oauthResolutionDiagnostics: true,
              instagramId: true,
              pageId: true,
              webhookAccountId: true,
              businessId: true,
              instagramUsername: true,
              status: true,
              reconnectRequired: true,
              planLocked: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const aiAutomations = automations.filter((item) => readAiConversation(item.listener?.aiConversation));
  let stopped = false;
  if (recipientIgId && aiAutomations.length) {
    const integrations = aiAutomations.flatMap((item) => item.integrationId ? [item.integrationId] : []);
    const session = await client.aiConversationSession.findFirst({ where: { recipientIgId, integrationId: { in: integrations }, expiresAt: { gt: new Date() } } });
    if (conversationStopIntent(dmText)) {
      // Remember opt-out even before the first AI message. No outbound message is needed.
      const owner = session ? aiAutomations.find((item) => item.id === session.automationId) : aiAutomations[0];
      if (owner?.integrationId) await client.aiConversationSession.upsert({
        where: { integrationId_recipientIgId: { integrationId: owner.integrationId, recipientIgId } },
        create: { integrationId: owner.integrationId, recipientIgId, automationId: owner.id, status: "STOPPED", expiresAt: new Date(Date.now() + 86400000) },
        update: { status: "STOPPED", expiresAt: new Date(Date.now() + 86400000) },
      });
      return null;
    }
    stopped = session?.status === "STOPPED";
    if (session && !stopped) {
      const continued = aiAutomations.find((item) => item.id === session.automationId);
      if (continued) return { automation: continued, matchedKeyword: "AI conversation" };
    }
  }
  // Explicit keyword flows take precedence over catch-all flows.
  const ordered = [...automations.filter((item) => item.triggerMode !== "ANY_MESSAGE"), ...automations.filter((item) => item.triggerMode === "ANY_MESSAGE")];
  for (const automation of ordered) {
    if (automation.source === "COMMENT" && automation.listener?.flowTriggers == null) {
      if (sharedPost && sharedMediaId && automation.triggerOnShares && automation.sendPrivateDm) {
        const specific = automation.posts?.some(post=>post.postid===sharedMediaId);
        const anyOwned = automation.posts?.some(post=>post.postid==="ANY") && await sharedPostBelongsToAccount(automation,sharedMediaId);
        if (specific || anyOwned) return {automation,matchedKeyword:"shared post"};
      }
      continue;
    }
    if (stopped && readAiConversation(automation.listener?.aiConversation)) continue;
    const flowTrigger = flowTriggerForEvent(automation,{source:"DM",text:dmText,sharedPost});
    if (flowTrigger !== undefined) {
      if (flowTrigger) return {automation,matchedKeyword:flowTrigger.anyMessage ? sharedPost ? "shared post" : "any message" : flowTrigger.keyword};
      continue;
    }
    if (automation.triggerMode === "ANY_MESSAGE") {
      return { automation, matchedKeyword: "any message" };
    }
    const matched = matchKeywordWithMode(
      dmText,
      automation.keywords,
      automation.matchingMode
    );
    if (matched) return { automation, matchedKeyword: matched };
  }

  return null;
};

export const findAutomationForStory = async (
  interaction: "MENTION" | "REACTION" | "REPLY",
  accountId: string,
  text = "",
  storyId?: string,
  occurredAt?: number
): Promise<AutomationWithRelations | null> => {
  const automations = await client.automation.findMany({
    where: {
      active: true,
      archivedAt: null,
      integration: { ...webhookAccountFilter(accountId), status: "CONNECTED", reconnectRequired: false, planLocked: false },
      trigger: { some: { type: `STORY_${interaction}` } },
      User: {
        status: { not: "SUSPENDED" },
        integrations: { some: { ...webhookAccountFilter(accountId), status: { not: "DISCONNECTED" }, reconnectRequired: false, planLocked: false } },
      },
    },
    include: {
      keywords: true,
      listener: true,
      User: {
        select: {
          subscription: { select: { plan: true } },
          integrations: {
            select: {
              id: true,
              token: true,
              igAccountSource: true,
              oauthResolutionDiagnostics: true,
              instagramId: true,
              pageId: true,
              webhookAccountId: true,
              businessId: true,
              instagramUsername: true,
              status: true,
              reconnectRequired: true,
              planLocked: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  // Specific media/keyword rules win over broad catch-alls, consistently.
  const specificity=(item:AutomationWithRelations)=>{const config=readStoryConfig(item.storyConfig);return (config?.scope === "SPECIFIC" || config?.scope === "NEXT" ? 0 : 10)+(item.triggerMode === "ANY_MESSAGE" ? 1:0);};
  for (const automation of [...automations].sort((a,b)=>specificity(a)-specificity(b))) {
    const flowTrigger=flowTriggerForEvent(automation,{source:"STORY",text,storyTrigger:interaction});
    if (flowTrigger !== undefined) {if(flowTrigger)return automation;continue;}
    if(automation.source !== "STORY")continue;
    let config=readStoryConfig(automation.storyConfig);
    if(config) {
      if(config.scope === "NEXT" && !["PRO","BUSINESS"].includes(automation.User?.subscription?.plan ?? "FREE"))continue;
      if(config.scope === "NEXT" && !config.boundStoryId) {
        const integration=automation.User?.integrations.find(item=>item.id===automation.integrationId);
        if(!integration)continue;
        config=await bindNextStoryAutomation(automation,integration);
        if(!config)continue;
      }
      if(!storyScopeMatches(config,interaction,storyId,occurredAt))continue;
    } else if(automation.storyTriggerType !== interaction) continue;
    if(interaction !== "MENTION" && automation.triggerMode === "SPECIFIC_KEYWORD" && !matchKeywordWithMode(text,automation.keywords,automation.matchingMode))continue;
    if(interaction !== "MENTION" && automation.triggerMode === "INTENT_MATCH") {
      if(!automation.userId || !["PRO","BUSINESS"].includes(automation.User?.subscription?.plan ?? "FREE") || !await storyIntentMatches(config?.intentPrompt||"",text,{userId:automation.userId,automationId:automation.id}))continue;
    }
    return automation;
  }
  return null;
};

function webhookAccountFilter(accountId: string) {
  return {
    OR: [
      { pageId: accountId },
      { instagramId: accountId },
      { webhookAccountId: accountId },
      { businessId: accountId },
    ],
  };
}

export const findIntegrationForWebhookAccount = async (accountId: string) => {
  return client.integrations.findFirst({
    where: {
      ...webhookAccountFilter(accountId),
      userId: { not: null },
      status: { not: "DISCONNECTED" },
      reconnectRequired: false, planLocked: false,
    },
    select: {
      id: true,
      userId: true,
      token: true,
      instagramId: true,
      instagramUsername: true,
      pageId: true,
      webhookAccountId: true,
      businessId: true,
    },
  });
};

export const upsertInboundInboxMessage = async (data: {
  integrationId: string;
  userId: string;
  senderIgId: string;
  content: string;
  metaMessageId?: string;
  automationId?: string;
  username?: string;
  profilePictureUrl?: string;
  messageType?: string;
  mediaUrl?: string;
  occurredAt?: Date;
}) => {
  const occurredAt = data.occurredAt ?? new Date();
  if (data.metaMessageId) {
    const existing = await client.inboxMessage.findUnique({
      where: { metaMessageId: data.metaMessageId },
      select: { conversationId: true },
    });
    if (existing) return existing.conversationId;
  }
  // Only explicit, whole-message contact values are captured. The account and
  // sender form the contact key; display names are never used for identity.
  const emailReply = parseEmailReply(data.content);
  const phoneReply = parsePhoneReply(data.content);
  const contactFields = !data.messageType || data.messageType === "TEXT"
    ? {
        ...(emailReply.kind === "email" ? { email: emailReply.email, emailCollectedAt: occurredAt } : {}),
        ...(phoneReply.kind === "phone" ? { phone: phoneReply.phone } : {}),
      }
    : {};
  const conversation = await client.conversation.upsert({
    where: { integrationId_recipientIgId: { integrationId: data.integrationId, recipientIgId: data.senderIgId } },
    create: {
      ...contactFields,
      userId: data.userId,
      integrationId: data.integrationId,
      recipientIgId: data.senderIgId,
      automationId: data.automationId,
      recipientUsername: data.username,
      profilePictureUrl: data.profilePictureUrl,
      lastMessageAt: occurredAt,
      lastInboundAt: occurredAt,
      unreadCount: 1,
    },
    update: {
      ...contactFields,
      automationId: data.automationId,
      recipientUsername: data.username,
      profilePictureUrl: data.profilePictureUrl,
      lastMessageAt: occurredAt,
      lastInboundAt: occurredAt,
      unreadCount: { increment: 1 },
    },
    select: { id: true },
  });

  try {
    await client.inboxMessage.create({
      data: {
        conversationId: conversation.id,
        metaMessageId: data.metaMessageId,
        senderIgId: data.senderIgId,
        direction: "INBOUND",
        content: data.content,
        messageType: data.messageType ?? "TEXT",
        mediaUrl: data.mediaUrl,
        status: "RECEIVED",
        createdAt: occurredAt,
      },
    });
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002")) throw error;
  }
  return conversation.id;
};

export const recordOutboundInboxMessage = async (data: {
  integrationId: string;
  userId: string;
  recipientIgId: string;
  content: string;
  metaMessageId?: string;
  automationId?: string;
  status?: string;
}) => {
  const conversation = await client.conversation.upsert({
    where: { integrationId_recipientIgId: { integrationId: data.integrationId, recipientIgId: data.recipientIgId } },
    create: { userId: data.userId, integrationId: data.integrationId, recipientIgId: data.recipientIgId, automationId: data.automationId, lastMessageAt: new Date() },
    update: { automationId: data.automationId, lastMessageAt: new Date() },
    select: { id: true },
  });
  return client.inboxMessage.create({
    data: {
      conversationId: conversation.id,
      metaMessageId: data.metaMessageId,
      senderIgId: data.recipientIgId,
      direction: "OUTBOUND",
      content: data.content,
      status: data.status ?? "SENT",
    },
  });
};

// ---------------------------------------------------------------------------
// Automation lookup by ID — used for SMARTAI conversation continuation
// ---------------------------------------------------------------------------

export const findAutomationById = async (id: string, accountId?: string) => {
  return await client.automation.findFirst({
    where: { id, archivedAt: null, integration: { ...webhookAccountFilter(accountId ?? ""), status: "CONNECTED", reconnectRequired: false, planLocked: false } },
    include: {
      listener: true,
      User: {
        select: {
          subscription: { select: { plan: true } },
          integrations: {
            select: {
              id: true,
              token: true,
              igAccountSource: true,
              oauthResolutionDiagnostics: true,
              instagramId: true,
              pageId: true,
              webhookAccountId: true,
              businessId: true,
              instagramUsername: true,
              status: true,
              reconnectRequired: true,
              planLocked: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Instagram can surface a template button tap as ordinary inbound text on
 * some clients instead of including the postback payload. Resolve that text
 * only against the latest still-pending comment DM flow for this account and
 * recipient, so a generic DM with the same words cannot unlock content.
 */
export const findPendingCommentDmActionForText = async (
  pageId: string,
  recipientIgId: string,
  inboundText: string
): Promise<{ automation: AutomationWithRelations; action: CommentDmAction } | null> => {
  const normalizedInbound = normalizeMatchText(inboundText);
  if (!normalizedInbound) return null;

  const pending = await client.messageLog.findMany({
    where: {
      recipientIgId,
      messageType: "DM",
      status: "SENT",
      errorMessage: { in: ["opening_dm_sent", "follow_request_dm_sent"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      automation: {
        active: true,
        archivedAt: null,
        integration: { ...webhookAccountFilter(pageId), status: "CONNECTED", reconnectRequired: false, planLocked: false },
        source: {in:["COMMENT","STORY"]},
        User: {
          status: { not: "SUSPENDED" },
          integrations: {
            some: {
              ...webhookAccountFilter(pageId),
              status: { not: "DISCONNECTED" },
              reconnectRequired: false, planLocked: false,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      automation: {
        include: {
          keywords: true,
          listener: true,
          User: {
            select: {
              subscription: { select: { plan: true } },
              integrations: {
                select: {
                  id: true,
                  token: true,
              igAccountSource: true,
              oauthResolutionDiagnostics: true,
                  instagramId: true,
                  pageId: true,
                  webhookAccountId: true,
                  businessId: true,
                  instagramUsername: true,
                  status: true,
                  reconnectRequired: true,
              planLocked: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const item of pending) {
    const listener = item.automation.listener;
    if (!listener) continue;
    const action: CommentDmAction = item.errorMessage === "follow_request_dm_sent"
      ? { type: "FOLLOW_CHECK", automationId: item.automationId }
      : { type: "OPENING_CONTINUE", automationId: item.automationId };
    const expectedButton = action.type === "FOLLOW_CHECK"
      ? resolveFollowRequestButtonText(listener.followRequestButtonText)
      : resolveOpeningDmButtonText(listener.openingDmButtonText);
    if (normalizeMatchText(expectedButton) === normalizedInbound) {
      return { automation: item.automation as AutomationWithRelations, action: { ...action, ...(item.commentId ? { flowId: item.commentId } : {}) } };
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Duplicate prevention
// ---------------------------------------------------------------------------

/**
 * Returns true if a DM has already been successfully sent to this recipient
 * for this automation. One DM per person per campaign, ever.
 */
export const isDuplicate = async (
  automationId: string,
  recipientIgId: string,
  mediaId?: string,
  commentId?: string
): Promise<boolean> => {
  const existing = await client.messageLog.findFirst({
    where: {
      automationId,
      recipientIgId,
      messageType: "DM",
      status: "SENT",
      ...(commentId
        ? { commentId }
        : mediaId
        ? { mediaId }
        : {}),
    },
  });
  return !!existing;
};

/**
 * Consent/follow callbacks intentionally bypass the normal "one DM ever"
 * guard because the opening and follow-request messages are already sent DMs.
 * This marker prevents repeated button taps from releasing the final payload
 * more than once per comment journey. Payloads created before flow IDs were
 * added fall back to the relative order of the latest opening and final logs.
 */
export const hasDeliveredFinalPayload = async (
  automationId: string,
  recipientIgId: string,
  flowId?: string
): Promise<boolean> => {
  const baseWhere = {
    automationId,
    recipientIgId,
    messageType: "DM" as const,
    status: "SENT" as const,
  };

  if (flowId) {
    const deliveredForFlow = await client.messageLog.findFirst({
      where: {
        ...baseWhere,
        commentId: flowId,
        errorMessage: { in: ["final_dm_payload_sent", "follow_gate_payload_sent"] },
      },
      select: { id: true },
    });
    return Boolean(deliveredForFlow);
  }

  const [latestDelivered, latestOpening] = await Promise.all([
    client.messageLog.findFirst({
      where: {
        ...baseWhere,
        errorMessage: { in: ["final_dm_payload_sent", "follow_gate_payload_sent"] },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
    client.messageLog.findFirst({
      where: { ...baseWhere, errorMessage: "opening_dm_sent" },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
  ]);

  if (!latestDelivered) return false;
  if (!latestOpening) return true;
  return latestDelivered.createdAt >= latestOpening.createdAt;
};

export const hasProcessedCommentWebhook = async (
  automationId: string,
  commentId: string,
  currentWebhookEventId?: string
) => {
  const [event, messageLog, webhookEvent] = await Promise.all([
    client.automationEvent.findFirst({
      where: {
        automationId,
        commentId,
        eventType: {
          in: [
            "COMMENT_RECEIVED",
            "KEYWORD_MATCHED",
            "DM_SENT",
            "DM_SKIPPED",
            "PUBLIC_REPLY_SENT",
            "PUBLIC_REPLY_FAILED",
            "DM_FAILED",
            "DUPLICATE_SKIPPED",
          ],
        },
      },
      select: { id: true },
    }),
    client.messageLog.findFirst({
      where: { automationId, commentId },
      select: { id: true },
    }),
    client.webhookEvent.findFirst({
      where: {
        automationId,
        commentId,
        ...(currentWebhookEventId ? { id: { not: currentWebhookEventId } } : {}),
        status: { in: ["PROCESSED", "IGNORED", "FAILED"] },
      },
      select: { id: true },
    }),
  ]);

  return Boolean(event || messageLog || webhookEvent);
};

export const hasAp3kGeneratedCommentId = async (
  automationId: string,
  commentId: string
) => {
  const event = await client.automationEvent.findFirst({
    where: {
      automationId,
      commentId,
      eventType: "PUBLIC_REPLY_SENT",
    },
    select: { id: true },
  });

  return Boolean(event);
};

export const hasRecentAp3kReplyTextMatch = async (data: {
  automationId: string;
  mediaId: string;
  normalizedText: string;
  textHash: string;
  since: Date;
}) => {
  const recentEvents = await client.automationEvent.findMany({
    where: {
      automationId: data.automationId,
      mediaId: data.mediaId,
      eventType: "PUBLIC_REPLY_SENT",
      createdAt: { gte: data.since },
    },
    select: { meta: true },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  return recentEvents.some((event) => {
    const meta = event.meta && typeof event.meta === "object" && !Array.isArray(event.meta)
      ? (event.meta as Record<string, unknown>)
      : {};
    return (
      meta.publicReplyTextHash === data.textHash ||
      meta.normalizedPublicReplyText === data.normalizedText
    );
  });
};

export const countRecentPublicReplies = async (data: {
  automationId: string;
  mediaId?: string;
  since: Date;
}) => {
  return await client.messageLog.count({
    where: {
      automationId: data.automationId,
      messageType: "COMMENT_REPLY",
      status: "SENT",
      createdAt: { gte: data.since },
      ...(data.mediaId ? { mediaId: data.mediaId } : {}),
    },
  });
};

export const hasRecentHandledCommenter = async (data: {
  automationId: string;
  commenterId: string;
  mediaId: string;
  since: Date;
}) => {
  const existing = await client.messageLog.findFirst({
    where: {
      automationId: data.automationId,
      recipientIgId: data.commenterId,
      mediaId: data.mediaId,
      status: "SENT",
      createdAt: { gte: data.since },
      messageType: { in: ["COMMENT_REPLY", "DM"] },
    },
    select: { id: true },
  });

  return Boolean(existing);
};

export const countLoopGuardEvents = async (automationId: string, since: Date) => {
  return await client.automationEvent.count({
    where: {
      automationId,
      eventType: "LOOP_GUARD_TRIGGERED",
      createdAt: { gte: since },
    },
  });
};

export const countRecentSelfCommentSkips = async (automationId: string, since: Date) => {
  return await client.automationEvent.count({
    where: {
      automationId,
      eventType: "SELF_COMMENT_SKIPPED",
      createdAt: { gte: since },
    },
  });
};

export const pauseAutomationForLoopGuard = async (automationId: string) => {
  return await client.automation.update({
    where: { id: automationId },
    data: { active: false },
  });
};

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

export const createMessageLog = async (data: {
  automationId: string;
  recipientIgId: string;
  mediaId?: string;
  commentId?: string;
  messageType: MESSAGE_TYPE;
  status: SEND_STATUS;
  errorMessage?: string;
}) => {
  return await client.messageLog.create({
    data: {
      ...data,
      sentAt: data.status === "SENT" ? new Date() : undefined,
    },
  });
};

export const upsertLead = async (data: {
  automationId: string;
  igUserId: string;
  igUsername?: string;
  commentText?: string;
  mediaId?: string;
}) => {
  return await client.lead.upsert({
    where: {
      automationId_igUserId: {
        automationId: data.automationId,
        igUserId: data.igUserId,
      },
    },
    create: data,
    update: {
      igUsername: data.igUsername,
      commentText: data.commentText,
      mediaId: data.mediaId,
    },
  });
};

export const createAutomationEvent = async (data: {
  automationId: string;
  eventType: EVENT_TYPE;
  igUserId?: string;
  mediaId?: string;
  commentId?: string;
  keyword?: string;
  meta?: Prisma.InputJsonObject;
}) => {
  return await client.automationEvent.create({ data });
};

export const createWebhookEvent = async (data: {
  automationId?: string;
  eventSource?: "META_REAL" | "SIMULATED_INTERNAL";
  eventType: string;
  field?: string;
  igAccountId?: string;
  igUserId?: string;
  mediaId?: string;
  commentId?: string;
  status?: string;
  errorMessage?: string;
  payload?: Prisma.InputJsonObject;
}) => {
  return await client.webhookEvent.create({
    data: {
      provider: "meta",
      status: "RECEIVED",
      ...data,
    },
  });
};

export const updateWebhookEvent = async (
  id: string,
  data: {
    automationId?: string;
    eventType?: string;
    status?: string;
    errorMessage?: string;
    processedAt?: Date;
  }
) => {
  return await client.webhookEvent.update({
    where: { id },
    data,
  });
};

export const mergeWebhookEventPayload = async (
  id: string,
  payload: Prisma.InputJsonObject
) => {
  const existing = await client.webhookEvent.findUnique({
    where: { id },
    select: { payload: true },
  });

  const existingPayload =
    existing?.payload && typeof existing.payload === "object" && !Array.isArray(existing.payload)
      ? (existing.payload as Prisma.InputJsonObject)
      : {};

  return await client.webhookEvent.update({
    where: { id },
    data: {
      payload: {
        ...existingPayload,
        ...payload,
      },
    },
  });
};

// ---------------------------------------------------------------------------
// Counter tracking — fast path increments on Listener
// ---------------------------------------------------------------------------

export const trackResponse = async (
  automationId: string,
  type: "COMMENT" | "DM"
) => {
  const field = type === "COMMENT" ? "commentCount" : "dmCount";
  return await client.listener.update({
    where: { automationId },
    data: { [field]: { increment: 1 } },
  });
};

// ---------------------------------------------------------------------------
// SMARTAI chat history (fixed parameter names — original had them swapped)
// pageId        = IG Business Account ID, stored as senderId
// messageText   = the actual message string
// recipientIgId = the IG user who sent or received this message
// ---------------------------------------------------------------------------

export const createChatHistory = (
  automationId: string,
  pageId: string,
  messageText: string,
  recipientIgId: string
) => {
  return client.automation.update({
    where: { id: automationId },
    data: {
      dms: {
        create: {
          senderId: pageId,
          message: messageText,
          reciever: recipientIgId,
        },
      },
    },
  });
};

export const getChatHistory = async (pageId: string, recipientIgId: string) => {
  const history = await client.dms.findMany({
    where: {
      AND: [{ senderId: pageId }, { reciever: recipientIgId }],
    },
    orderBy: { createdAt: "asc" },
  });

  const chatSession: { role: "assistant" | "user"; content: string }[] =
    history.map((chat) => ({
      role: chat.reciever ? "assistant" : "user",
      content: chat.message!,
    }));

  return {
    history: chatSession,
    automationId: history[history.length - 1]?.automationId ?? null,
  };
};
