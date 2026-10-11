"use server";

import { publicAutomation } from "@/lib/automation-public";
import { prepareStoryPublication } from "@/lib/story-automation-runtime";
import {attachmentScopeFilter} from "@/lib/attachment-scope";
import {attachmentId} from "@/lib/message-attachment";

import { waitUntil } from "@vercel/functions";

import { hasProEngagement } from "@/lib/automation-engagement-settings";
import { validateFlow } from "@/lib/automation-flow/definition";
import { readFlowTriggers } from "@/lib/automation-flow/triggers";
import { flowAssetIssue } from "@/lib/automation-flow/publication";
import { followUpSchedulerReady } from "@/lib/automation-engagement";
import { productImageId } from "@/lib/product-card";
import { onCurrentUser } from "../user";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { findUser } from "../user/queries";
import {
  normalizeCampaignPayload,
  summarizeCampaignPayload,
  validateNormalizedCampaignPayload,
  type RawCampaignPayload,
} from "@/lib/campaign-save";
import {
  normalizeMessageAutomationPayload,
  validateMessageAutomationPayload,
  type RawMessageAutomationPayload,
} from "@/lib/message-automation";
import {
  refreshExpiredCampaignMediaForClerkUser,
  refreshExpiredCampaignMediaListForClerkUser,
} from "@/lib/campaign-media-refresh";
import {
  instagramMediaFetchError,
  resolveInstagramMediaConnection,
} from "@/lib/instagram-media";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import { canActivateCampaign } from "@/actions/usage/queries";
import { client } from "@/lib/prisma";
import { refreshInstagramProfileSnapshotForUser } from "@/lib/instagram-profile-snapshot";
import { notifyAutomationActivatedEmail } from "@/lib/email/events";
import {
  addKeyWords,
  addListener,
  addPosts,
  addTrigger,
  createAutomation,
  createCompleteAutomation,
  createCompleteMessageAutomation,
  deleteAutomationQuery,
  deleteKeywordsQuery,
  duplicateAutomationQuery,
  findAutomationForUser,
  getAutomation,
  getAutomationAnalytics,
  getAutomationActivity,
  getDashboardActivity,
  updateAutomation,
  updateCompleteAutomation,
  updateCompleteMessageAutomation,
} from "./queries";

export const createAutomations = async (id?: string) => {
  const user = await onCurrentUser();

  try {
    const create = await createAutomation(user.id, id);

    if (create) return { status: 200, data: "Automation created" };
    return { status: 404, data: "Failed to create automation" };
  } catch (error: any) {
    return { status: 500, data: error.message };
  }
};

export const saveCampaign = async (
  payload: RawCampaignPayload,
  automationId?: string,
  expectedIntegrationId?: string,
) => {
  const user = await onCurrentUser();
  let saveStage = "account-scope";

  try {
    if (
      expectedIntegrationId !== undefined &&
      expectedIntegrationId !== (await currentInstagramAccountId(user.id))
    )
      return {
        status: 409,
        data: "Your Instagram account changed. Reload this page before saving.",
      };
    saveStage = "validation";
    const cleanPayload = normalizeCampaignPayload(payload);
    const validationError = validateNormalizedCampaignPayload(cleanPayload);
    const summary = summarizeCampaignPayload(
      cleanPayload,
      payload.publicReplyEnabled !== false,
    );
    let activationProfile: Awaited<ReturnType<typeof findUser>> = null;

    if (
      cleanPayload.active &&
      cleanPayload.listener.followUpEnabled &&
      !(await followUpSchedulerReady())
    ) {
      return {
        status: 400,
        data: "Scheduled follow-ups are not connected yet. Save a draft or turn off the reminder before activating.",
      };
    }
    if (
      hasProEngagement({
        ...cleanPayload.listener,
        followGateRequired: cleanPayload.followGateRequired,
      })
    ) {
      const profile = await findUser(user.id);
      if (!["PRO", "BUSINESS"].includes(profile?.subscription?.plan ?? "FREE"))
        return {
          status: 403,
          data: "Collect info, Ask to follow, and Follow-up messages require Pro or Business.",
        };
    }
    if (cleanPayload.active && cleanPayload.listener.aiReplyEnabled) {
      const aiProfile = await findUser(user.id);
      const aiPlan = aiProfile?.subscription?.plan ?? "FREE";
      if (aiPlan !== "PRO" && aiPlan !== "BUSINESS") {
        return {
          status: 403,
          data: "AI only available on paid plans.",
        };
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[campaign-save] normalized payload", {
        action: "saveCampaign",
        userId: user.id,
        automationId,
        ...summary,
      });
    }

    if (validationError) {
      console.warn("[campaign-save] validation failed", {
        action: "saveCampaign",
        userId: user.id,
        automationId,
        reason: validationError,
        ...summary,
      });
      return { status: 400, data: validationError };
    }

    if (
      cleanPayload.sendPrivateDm &&
      cleanPayload.listener.responseFormat === "PRODUCT_CARD"
    ) {
      saveStage = "image-ownership";
      const imageId = productImageId(cleanPayload.listener.mediaUrl);
      const image = imageId
        ? await client.automationImage.findFirst({
            where: { id: imageId, user: { clerkId: user.id } },
            select: { id: true },
          })
        : null;
      if (!image)
        return {
          status: 400,
          data: "Upload a product image from your own account before saving.",
        };
    }

    if (cleanPayload.listener.responseFormat === "ATTACHMENT") {
      const id=attachmentId(cleanPayload.listener.mediaUrl);
      const file=id?await client.automationAttachment.findFirst({where:{id,status:"READY",user:{clerkId:user.id},...attachmentScopeFilter()},select:{mediaType:true}}):null;
      if(!file)return {status:400,data:"Choose a ready attachment from your own account."};
      cleanPayload.listener.mediaType=file.mediaType as "IMAGE"|"VIDEO"|"AUDIO"|"FILE";
    }
    if (cleanPayload.active) {
      saveStage = "activation-checks";
      const profile = await findUser(user.id);
      activationProfile = profile;
      if ((profile as any)?.status === "SUSPENDED") {
        return {
          status: 403,
          data: "Your account is suspended. Contact support before creating or activating automations.",
        };
      }
      if (
        (profile as any)?.integrations?.length &&
        !getCanonicalInstagramIntegration((profile as any).integrations)
      ) {
        return {
          status: 403,
          data: "Reconnect Instagram before activating automations.",
        };
      }
      if (!getCanonicalInstagramIntegration((profile as any)?.integrations)) {
        return {
          status: 403,
          data: "Connect Instagram before activating automations.",
        };
      }
      if (automationId) {
        const existing = await client.automation.findFirst({
          where: {
            id: automationId,
            User: { clerkId: user.id },
            integrationId: await currentInstagramAccountId(user.id),
            archivedAt: null,
          },
          select: { needsReview: true, reviewReason: true },
        });
        if (existing?.needsReview) {
          const repaired = await validatePostForReviewedCampaign(
            profile?.integrations,
            cleanPayload.post.postid,
          );
          if (!repaired.ok) {
            return {
              status: 403,
              data: repaired.message,
            };
          }
        }
      }
      const activation = profile?.id
        ? await canActivateCampaign(profile.id, automationId)
        : { ok: false };

      if (!activation.ok) {
        return {
          status: 403,
          data: "Your plan allows 1 active automation. Pause another automation or upgrade.",
        };
      }
    }

    saveStage = "database-write";
    const saved = automationId
      ? await updateCompleteAutomation(automationId, user.id, cleanPayload)
      : await createCompleteAutomation(user.id, cleanPayload);

    const savedResult = saved as {
      automations?: { id: string }[];
      id?: string;
    } | null;
    const id =
      automationId || savedResult?.automations?.[0]?.id || savedResult?.id;
    if (saved && id) {
      if (cleanPayload.active && activationProfile?.id) {
        await notifyAutomationActivatedEmail({
          userId: activationProfile.id,
          automationId: id,
          automationName: cleanPayload.name,
        });
      }
      return { status: 200, data: { id } };
    }

    return { status: 404, data: "Automation not found" };
  } catch (error) {
    const message = campaignSaveErrorMessage(error);
    console.error("[campaign-save] save failed", {
      action: "saveCampaign",
      userId: user.id,
      automationId,
      prismaCode: getPrismaErrorCode(error),
      prismaMeta: getSafePrismaMeta(error),
      saveStage,
      errorName: error instanceof Error ? error.name : typeof error,
      // Keep diagnostics useful without logging messages, URLs, tokens, or payloads.
      errorHint:
        error instanceof Error
          ? error.message.match(
              /Cannot read properties of (?:undefined|null) \(reading '[\w]+'\)|Unknown argument `[\w]+`|Argument `[\w]+` is missing|[\w.]+ is not a function/,
            )?.[0]
          : undefined,
      message,
    });
    return { status: 500, data: message };
  }
};

export const saveMessageAutomation = async (
  payload: RawMessageAutomationPayload,
  automationId?: string,
  expectedIntegrationId?: string,
) => {
  const user = await onCurrentUser();

  try {
    if (
      expectedIntegrationId !== undefined &&
      expectedIntegrationId !== (await currentInstagramAccountId(user.id))
    )
      return {
        status: 409,
        data: "Your Instagram account changed. Reload this page before saving.",
      };
    const cleanPayload = normalizeMessageAutomationPayload(payload);
    if (
      payload.aiConversation &&
      (!cleanPayload.aiConversation ||
        !cleanPayload.aiReplyEnabled ||
        cleanPayload.source !== "DM")
    )
      return {
        status: 400,
        data: "Complete the AI conversation goal, context and tasks.",
      };
    if (cleanPayload.responseFormat === "ATTACHMENT") {
      const id=attachmentId(cleanPayload.mediaUrl);
      const file=id?await client.automationAttachment.findFirst({where:{id,status:"READY",user:{clerkId:user.id},...attachmentScopeFilter()},select:{mediaType:true}}):null;
      if(!file)return {status:400,data:"Choose a ready attachment from your own account."};
      cleanPayload.mediaType=file.mediaType as "IMAGE"|"VIDEO"|"AUDIO"|"FILE";
    }
    const validationError = validateMessageAutomationPayload(cleanPayload);
    if (validationError) return { status: 400, data: validationError };

    const profile = await findUser(user.id);
    if ((profile as any)?.status === "SUSPENDED") {
      return {
        status: 403,
        data: "Your account is suspended. Contact support before activating automations.",
      };
    }

    if (
      hasProEngagement(cleanPayload) &&
      !["PRO", "BUSINESS"].includes(profile?.subscription?.plan ?? "FREE")
    )
      return {
        status: 403,
        data: "Collect info, Ask to follow, and Follow-up messages require Pro or Business.",
      };
    if (
      cleanPayload.active &&
      cleanPayload.followUpEnabled &&
      !(await followUpSchedulerReady())
    )
      return {
        status: 400,
        data: "Scheduled reminders are temporarily unavailable.",
      };
    if (cleanPayload.aiReplyEnabled) {
      const plan = profile?.subscription?.plan ?? "FREE";
      if (plan !== "PRO" && plan !== "BUSINESS") {
        return {
          status: 403,
          data: "AI DM replies are available on Pro and Business plans.",
        };
      }
    }

    if (cleanPayload.active) {
      const instagram = getCanonicalInstagramIntegration(
        (profile as any)?.integrations,
      );
      if (!instagram) {
        return {
          status: 403,
          data: "Connect or reconnect Instagram before activating automations.",
        };
      }
      const activation = profile?.id
        ? await canActivateCampaign(profile.id, automationId)
        : { ok: false };
      if (!activation.ok) {
        return {
          status: 403,
          data: "Your plan's active automation limit has been reached. Pause one or upgrade.",
        };
      }
    }

    if (cleanPayload.source === "STORY" && cleanPayload.storyConfig) {
      const paid = ["PRO","BUSINESS"].includes(profile?.subscription?.plan ?? "FREE");
      if (cleanPayload.active && !paid && (cleanPayload.storyConfig.scope === "NEXT" || cleanPayload.triggerMode === "INTENT_MATCH")) return {status:403,data:"Next story and intent matching require Pro or Business."};
      const previous = automationId ? await client.automation.findFirst({where:{id:automationId,User:{clerkId:user.id},integrationId:await currentInstagramAccountId(user.id),archivedAt:null},select:{id:true,storyConfig:true,active:true}}) : null;
      if (automationId && !previous) return {status:404,data:"Automation not found"};
      const integration = getCanonicalInstagramIntegration((profile as any)?.integrations);
      if (cleanPayload.active && !integration) return {status:403,data:"Reconnect Instagram before publishing a story automation."};
      const prepared = await prepareStoryPublication(cleanPayload,previous,integration ?? {});
      if (!prepared.ok) return {status:400,data:prepared.error};
      cleanPayload.storyConfig = prepared.config;
      // Card upload IDs are tenant-scoped just like post automation images.
      for (const card of cleanPayload.storyConfig.cards) {
        const id=productImageId(card.image);
        if (id && !(await client.automationImage.findFirst({where:{id,user:{clerkId:user.id}},select:{id:true}}))) return {status:400,data:"Choose a card image from your own account."};
      }
    }

    const saved = automationId
      ? await updateCompleteMessageAutomation(
          automationId,
          user.id,
          cleanPayload,
        )
      : await createCompleteMessageAutomation(user.id, cleanPayload);
    if (!saved?.id) return { status: 404, data: "Automation not found" };
    if (cleanPayload.active && profile?.id) {
      await notifyAutomationActivatedEmail({
        userId: profile.id,
        automationId: saved.id,
        automationName: cleanPayload.name,
      });
    }
    return { status: 200, data: { id: saved.id } };
  } catch (error) {
    console.error("[message-automation-save] save failed", {
      automationId,
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 500,
      data: "Could not save automation. Please try again.",
    };
  }
};

function campaignSaveErrorMessage(error: unknown) {
  const code = getPrismaErrorCode(error);
  const text = error instanceof Error ? error.message : String(error);
  const meta = JSON.stringify(getSafePrismaMeta(error) ?? {});

  if (
    code === "P2022" ||
    text.includes("triggerMode") ||
    meta.includes("triggerMode")
  ) {
    return "Could not save automation because the database migration is missing. Deploy migration.";
  }

  if (
    text.includes("mediaType") ||
    text.includes("MEDIATYPE") ||
    text.includes("CAROSEL_ALBUM") ||
    text.includes("CAROUSEL_ALBUM")
  ) {
    return "Could not save automation. Check the selected Instagram post.";
  }

  return "Could not save automation. Please try again.";
}

function getPrismaErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function getSafePrismaMeta(error: unknown) {
  if (typeof error !== "object" || error === null || !("meta" in error))
    return undefined;
  return (error as { meta?: unknown }).meta;
}

export const getAllAutomation = async () => {
  const user = await onCurrentUser();

  try {
    const getAll = await getAutomation(user.id);

    if (getAll) {
      const automations = getAll.automations || [];
      // Meta can be slow or a post can have been deleted. Navigation must not
      // wait for thumbnail repair. Clone because the refresher mutates posts.
      waitUntil(refreshExpiredCampaignMediaListForClerkUser(user.id, structuredClone(automations)).catch((error) => {
        console.warn("[campaign-media] automatic list refresh skipped", {
          message: error instanceof Error ? error.message : String(error),
        });
      }));
      return { status: 200, data: automations };
    }

    return { status: 404, data: [] };
  } catch (error: any) {
    return { status: 500, data: [] };
  }
};

export const getAutomationInfo = async (id: string) => {
  const user = await onCurrentUser();

  try {
    const automation = await findAutomationForUser(id, user.id);

    if (automation) {
      try {
        await refreshExpiredCampaignMediaForClerkUser(user.id, automation);
      } catch (error) {
        console.warn("[campaign-media] automatic detail refresh skipped", {
          automationId: id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return { status: 200, data: publicAutomation(automation) };
    }

    return { status: 404 };
  } catch (error) {
    return { status: 500 };
  }
};

export const duplicateAutomation = async (id: string) => {
  const user = await onCurrentUser();

  try {
    const duplicated = await duplicateAutomationQuery(id, user.id);
    if (duplicated) return { status: 200, data: "Automation duplicated" };
    return {
      status: 404,
      data: "This automation needs a post and DM before it can be duplicated",
    };
  } catch {
    return { status: 500, data: "Failed to duplicate automation" };
  }
};

export const deleteAutomation = async (id: string) => {
  const user = await onCurrentUser();

  try {
    const deleted = await deleteAutomationQuery(id, user.id);
    if (deleted.count > 0) return { status: 200, data: "Automation deleted" };
    return { status: 404, data: "Automation not found" };
  } catch {
    return { status: 500, data: "Failed to delete automation" };
  }
};

export const updateAutomationName = async (
  automationId: string,
  data: {
    name?: string;
    active?: boolean;
    automation?: string;
  },
) => {
  const user = await onCurrentUser();

  try {
    if (data.active === true) {
      const saved = await client.automation.findFirst({where:{id:automationId,User:{clerkId:user.id},integrationId:await currentInstagramAccountId(user.id)},select:{listener:{select:{aiReplyEnabled:true,aiDmReplyEnabled:true}}}});
      const plan = (await findUser(user.id))?.subscription?.plan ?? "FREE";
      if ((saved?.listener?.aiReplyEnabled || saved?.listener?.aiDmReplyEnabled) && !["PRO", "BUSINESS"].includes(plan)) return {status:403,data:"AI only available on paid plans."};
      const profile = await findUser(user.id);
      if ((profile as any)?.status === "SUSPENDED") {
        return {
          status: 403,
          data: "Your account is suspended. Contact support before activating automations.",
        };
      }
      if (
        (profile as any)?.integrations?.length &&
        !getCanonicalInstagramIntegration((profile as any).integrations)
      ) {
        return {
          status: 403,
          data: "Reconnect Instagram before activating automations.",
        };
      }
      if (!getCanonicalInstagramIntegration((profile as any)?.integrations)) {
        return {
          status: 403,
          data: "Connect Instagram before activating automations.",
        };
      }
      const existing = await client.automation.findFirst({
        where: {
          id: automationId,
          User: { clerkId: user.id },
          integrationId: await currentInstagramAccountId(user.id),
          archivedAt: null,
        },
        select: { needsReview: true, reviewReason: true },
      });
      if (existing?.needsReview) {
        return {
          status: 403,
          data:
            existing.reviewReason ??
            "Review this automation before activating.",
        };
      }
      const activation = profile?.id
        ? await canActivateCampaign(profile.id, automationId)
        : { ok: false };
      if (!activation.ok) {
        return {
          status: 403,
          data: "Your plan allows 1 active automation. Pause another automation or upgrade.",
        };
      }
    }

    const update = await updateAutomation(automationId, user.id, data);

    if (update) return { status: 200, data: "Automation updated" };
    return { status: 404, data: "Failed to update automation" };
  } catch (error) {
    return { status: 500, data: "Failed to update automation" };
  }
};

export const saveListener = async (
  automationId: string,
  listener: "SMARTAI" | "MESSAGE",
  prompt: string,
  reply?: string,
  ctaLink?: string,
) => {
  const user = await onCurrentUser();

  try {
    const create = await addListener(
      automationId,
      user.id,
      listener,
      prompt,
      reply,
      ctaLink,
    );

    if (create) return { status: 200, data: "Listener created" };
    return { status: 404, data: "Failed to create listener" };
  } catch (error) {
    return { status: 500, data: "Failed to save listener" };
  }
};

export const saveTrigger = async (automationId: string, trigger: string[]) => {
  const user = await onCurrentUser();

  try {
    const create = await addTrigger(automationId, user.id, trigger);

    if (create) return { status: 200, data: "Trigger created" };
    return { status: 404, data: "Failed to create trigger" };
  } catch (error) {
    return { status: 500, data: "Failed to save trigger" };
  }
};

export const saveKeywords = async (automationId: string, keywords: string) => {
  const user = await onCurrentUser();

  try {
    const create = await addKeyWords(automationId, user.id, keywords);

    if (create) return { status: 200, data: "Keywords created" };
    return { status: 404, data: "Failed to create keywords" };
  } catch (error) {
    return { status: 500, data: "Failed to save keywords" };
  }
};

export const deleteKeywords = async (automationId: string) => {
  const user = await onCurrentUser();

  try {
    const deleted = await deleteKeywordsQuery(automationId, user.id);
    if (deleted) {
      return { status: 200, data: "Keywords deleted" };
    }
    return { status: 404, data: "Failed to delete keywords" };
  } catch (error) {
    return { status: 500, data: "Failed to delete keywords" };
  }
};

export const getProfilePosts = async () => {
  const user = await onCurrentUser();

  try {
    const profile = await findUser(user.id);
    const connection = resolveInstagramMediaConnection(profile?.integrations);
    if (!connection.ok) {
      console.log(
        "[instagram-media] fetch skipped: missing connected Instagram token or business account",
      );
      return {
        status: 401,
        data: { data: [], error: connection.error },
      };
    }

    const baseUrl =
      process.env.INSTAGRAM_BASE_URL || "https://graph.facebook.com/v20.0";
    const posts = await fetch(
      `${baseUrl}/${connection.instagramBusinessAccountId}/media?fields=id,caption,media_url,thumbnail_url,media_type,timestamp,permalink&limit=25`,
      {
        headers: { Authorization: `Bearer ${connection.token}` },
        cache: "no-store",
      },
    );

    const parsed = await posts.json();

    if (posts.ok && parsed) return { status: 200, data: parsed };
    console.log("[instagram-media] fetch failed", {
      status: posts.status,
      message: parsed?.error?.message ?? "unknown error",
    });
    return {
      status: posts.status,
      data: {
        data: [],
        error: instagramMediaFetchError(posts.status),
      },
    };
  } catch (error: any) {
    console.log("[instagram-media] fetch error", {
      message: error instanceof Error ? error.message : String(error),
    });

    return {
      status: 500,
      data: { data: [], error: "AP3K could not load posts right now." },
    };
  }
};

export const savePosts = async (
  automationId: string,
  posts: {
    postid: string;
    caption?: string;
    media: string;
    mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  }[],
) => {
  const user = await onCurrentUser();

  try {
    const create = await addPosts(automationId, user.id, posts);

    if (create) return { status: 200, data: "Posts created" };
    return { status: 404, data: "Failed to create posts" };
  } catch (error) {
    return { status: 500, data: "Failed to save posts" };
  }
};

export const activateAutomation = async (id: string, status: boolean) => {
  const user = await onCurrentUser();

  try {
    if (status) {
      const profile = await findUser(user.id);
      const existing = await client.automation.findFirst({
        where: {
          id,
          User: { clerkId: user.id },
          integrationId: await currentInstagramAccountId(user.id),
          archivedAt: null,
        },
        select: {
          source: true,
          followGateRequired: true,
          needsReview: true,
          reviewReason: true,
          listener: {
            select: {
              aiReplyEnabled: true,
              aiDmReplyEnabled: true,
              phoneCaptureEnabled: true,
              emailCaptureEnabled: true,
              followUpEnabled: true,
              flowDefinition: true,
              flowTriggers: true,
              openingDmText: true,
              openingDmButtonText: true,
            },
          },
        },
      });
      if ((existing?.listener?.aiReplyEnabled || existing?.listener?.aiDmReplyEnabled) && !["PRO", "BUSINESS"].includes(profile?.subscription?.plan ?? "FREE")) return {status:403,data:"AI only available on paid plans."};
      if (
        existing &&
        hasProEngagement({
          ...existing.listener,
          followGateRequired: existing.followGateRequired,
        }) &&
        !["PRO", "BUSINESS"].includes(profile?.subscription?.plan ?? "FREE")
      )
        return {
          status: 403,
          data: "Collect info, Ask to follow, and Follow-up messages require Pro or Business.",
        };
      if (
        existing?.listener?.flowDefinition &&
        !["PRO", "BUSINESS"].includes(profile?.subscription?.plan ?? "FREE")
      )
        return {
          status: 403,
          data: "Publishing custom flows requires Pro or Business.",
        };
      if (existing?.listener?.flowDefinition) {
        const checked = validateFlow(existing.listener.flowDefinition);
        if (!checked.flow)
          return {
            status: 400,
            data: "Finish and publish this flow from the editor before activating it.",
          };
        const triggers = readFlowTriggers(existing.listener.flowTriggers);
        if (
          triggers &&
          (!triggers.length ||
            triggers.some(
              (t) =>
                (t.source !== "STORY" && !t.anyMessage && !t.keyword) ||
                (t.source === "COMMENT" &&
                  (t.postScope ?? "specific") === "specific" &&
                  !t.post),
            ))
        )
          return {
            status: 400,
            data: "Complete this flow’s triggers in the editor before activating it.",
          };
        if (
          (existing.source === "COMMENT" ||
            triggers?.some((t) => t.source === "COMMENT")) &&
          (!existing.listener.openingDmText ||
            !existing.listener.openingDmButtonText)
        )
          return {
            status: 400,
            data: "Add an opening message and button before activating this comment flow.",
          };
        const issue = await flowAssetIssue(checked.flow, profile!.id);
        if (issue) return { status: 400, data: issue };
      }
      if (existing?.needsReview) {
        return {
          status: 403,
          data:
            existing.reviewReason ??
            "Review this automation before activating.",
        };
      }
      if ((profile as any)?.status === "SUSPENDED") {
        return {
          status: 403,
          data: "Your account is suspended. Contact support before activating automations.",
        };
      }
      if (
        (profile as any)?.integrations?.length &&
        !getCanonicalInstagramIntegration((profile as any).integrations)
      ) {
        return {
          status: 403,
          data: "Reconnect Instagram before activating automations.",
        };
      }
      if (!getCanonicalInstagramIntegration((profile as any)?.integrations)) {
        return {
          status: 403,
          data: "Connect Instagram before activating automations.",
        };
      }
      const activation = profile?.id
        ? await canActivateCampaign(profile.id, id)
        : { ok: false };
      if (!activation.ok) {
        return {
          status: 403,
          data: "Your plan allows 1 active automation. Pause another automation or upgrade.",
        };
      }
    }
    const activate = await updateAutomation(id, user.id, { active: status });
    if (activate) {
      if (status && activate.userId) {
        await notifyAutomationActivatedEmail({
          userId: activate.userId,
          automationId: activate.id,
          automationName: activate.name,
        });
      }
      return {
        status: 200,
        data: `Automation ${status ? "activated" : "deactivated"}`,
      };
    }
    return { status: 404, data: "Failed to activate automation" };
  } catch (error) {
    return { status: 500, data: "Failed to activate automation" };
  }
};

export const repairCampaign = async (automationId: string) => {
  const user = await onCurrentUser();

  try {
    const [automation, profile] = await Promise.all([
      client.automation.findFirst({
        where: {
          id: automationId,
          User: { clerkId: user.id },
          integrationId: await currentInstagramAccountId(user.id),
          archivedAt: null,
        },
        include: { posts: true, keywords: true, listener: true },
      }),
      findUser(user.id),
    ]);
    if (!automation) return { status: 404, data: "Automation not found" };
    const integrationId = profile?.integrations?.[0]?.id;
    if (integrationId) {
      try {
        await refreshInstagramProfileSnapshotForUser(user.id, integrationId, {
          force: true,
        });
      } catch {
        // Profile refresh is helpful for repair, but media validation below decides the outcome.
      }
    }

    const postId = automation.posts[0]?.postid;
    const validAction =
      Boolean(
        automation.sendPrivateDm !== false &&
        automation.listener?.prompt?.trim(),
      ) ||
      Boolean(
        automation.listener?.commentReply?.trim() ||
        automation.listener?.commentReply2?.trim() ||
        automation.listener?.commentReply3?.trim(),
      );
    const validTrigger =
      automation.triggerMode === "ANY_COMMENT" ||
      automation.keywords.some((keyword) => keyword.word.trim());
    if (!validAction || !validTrigger) {
      return {
        status: 403,
        data: "This automation is missing trigger or reply settings.",
      };
    }

    const postValidation = await validatePostForReviewedCampaign(
      profile?.integrations,
      postId,
    );
    if (!postValidation.ok) {
      return { status: 409, data: postValidation.message };
    }

    await client.automation.update({
      where: { id: automation.id },
      data: { needsReview: false, reviewReason: null },
    });
    return {
      status: 200,
      data: "Automation repaired. You can activate it now.",
    };
  } catch {
    return { status: 500, data: "Could not repair automation." };
  }
};

async function validatePostForReviewedCampaign(
  integrations: any[] | undefined,
  postId?: string | null,
) {
  if (!postId) {
    return {
      ok: false,
      message: "Choose Any Post or a current-account post before reactivating.",
    };
  }
  if (postId === "ANY") return { ok: true, message: "Any Post remains valid." };

  const connection = resolveInstagramMediaConnection(integrations);
  if (!connection.ok) {
    return {
      ok: false,
      message: "Reconnect Instagram before reviewing this automation.",
    };
  }

  try {
    const baseUrl =
      process.env.INSTAGRAM_BASE_URL || "https://graph.facebook.com/v20.0";
    const response = await fetch(
      `${baseUrl}/${connection.instagramBusinessAccountId}/media?fields=id&limit=100`,
      {
        headers: { Authorization: `Bearer ${connection.token}` },
        cache: "no-store",
      },
    );
    const parsed = await response.json();
    const ids = Array.isArray(parsed?.data)
      ? parsed.data.map((item: any) => String(item.id))
      : [];
    if (response.ok && ids.includes(postId))
      return { ok: true, message: "Selected post belongs to current account." };
    return {
      ok: false,
      message:
        "Selected post is not in the current Instagram account media list. Choose Any Post or a fresh current-account post.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Could not verify selected post ownership. Choose Any Post or a fresh current-account post.",
    };
  }
}

export const getAutomationStats = async (automationId: string) => {
  const user = await onCurrentUser();

  try {
    const stats = await getAutomationAnalytics(automationId, user.id);
    if (!stats) return { status: 404, data: null };
    return { status: 200, data: stats };
  } catch (error) {
    return { status: 500, data: null };
  }
};

export const getAutomationLogs = async (automationId: string) => {
  const user = await onCurrentUser();

  try {
    const activity = await getAutomationActivity(automationId, user.id);
    if (!activity) return { status: 404, data: [] };
    return { status: 200, data: activity };
  } catch (error) {
    return { status: 500, data: [] };
  }
};

export const getRecentAutomationActivity = async () => {
  const user = await onCurrentUser();

  try {
    const activity = await getDashboardActivity(user.id);
    return { status: 200, data: activity };
  } catch (error) {
    return { status: 500, data: [] };
  }
};

export const saveMatchingMode = async (
  automationId: string,
  mode: "EXACT" | "CONTAINS" | "SMART_AI",
) => {
  const user = await onCurrentUser();
  try {
    const update = await updateAutomation(automationId, user.id, {
      matchingMode: mode as any,
    });
    if (update) return { status: 200, data: "Matching mode saved" };
    return { status: 404, data: "Failed to save matching mode" };
  } catch (error) {
    return { status: 500, data: "Failed to save matching mode" };
  }
};
