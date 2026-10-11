"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { onCurrentUser } from "@/actions/user";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { client } from "@/lib/prisma";
import { canActivateCampaign } from "@/actions/usage/queries";
import { validateFlow } from "@/lib/automation-flow/definition";
import { flowPostSchema, flowTriggerSchema, readFlowDraft, type FlowTrigger } from "@/lib/automation-flow/triggers";
import { flowAssetIssue } from "@/lib/automation-flow/publication";

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  integrationId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  revision: z.number().int().min(0),
  active: z.boolean(),
  source: z.enum(["COMMENT", "DM", "STORY"]),
  storyTrigger: z.enum(["REPLY", "MENTION", "REACTION"]),
  keyword: z.string().trim().max(100),
  anyMessage: z.boolean(),
  post: flowPostSchema.nullable(),
  triggers: z.array(flowTriggerSchema).max(10).optional(),
  openingEnabled: z.boolean().optional(),
  opening: z.string().trim().max(800),
  openingButton: z.string().trim().max(20),
  publicReply: z.string().trim().max(300),
  flow: z.unknown(),
});
export type SaveFlowInput = z.infer<typeof inputSchema>;
export async function saveAutomationFlow(raw: SaveFlowInput) {
  const current = await onCurrentUser();
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    return { status: 400, error: parsed.error.issues[0].message };
  const input = parsed.data;
  const checked = input.active ? validateFlow(input.flow) : { flow: readFlowDraft(input.flow), errors: ["Invalid draft structure."] };
  if (!checked.flow) return { status: 400, error: checked.errors.join(" ") };
  const triggers: FlowTrigger[] = input.triggers ?? [{ id: "primary", source: input.source, storyTrigger: input.storyTrigger, keyword: input.keyword, anyMessage: input.anyMessage, post: input.post, postScope: input.post?.postid === "ANY" ? "all" : "specific" }];
  if (new Set(triggers.map(t => t.id)).size !== triggers.length) return {status:400,error:"Trigger IDs must be unique."};
  if (input.active) {
    if (!triggers.length) return {status:400,error:"Add a trigger before publishing."};
    for (const trigger of triggers) {
      if (trigger.source !== "STORY" && !trigger.anyMessage && !trigger.keyword) return { status:400,error:"Add a trigger keyword or select any message." };
      if (trigger.source === "COMMENT" && (trigger.postScope ?? "specific") === "specific" && !trigger.post) return {status:400,error:"Choose a post or Any post."};
    }
  }
  const accountId = await currentInstagramAccountId(current.id);
  if (input.integrationId !== accountId)
    return {
      status: 409,
      error: "Your Instagram account changed. Reload before saving.",
    };
  const user = await client.user.findUnique({
    where: { clerkId: current.id },
    include: { subscription: true },
  });
  const integration = user
    ? await client.integrations.findFirst({
        where: { id: accountId, userId: user.id },
      })
    : null;
  if (!user || !integration)
    return { status: 403, error: "Connect Instagram before saving this flow." };
  if (user.status === "SUSPENDED")
    return { status: 403, error: "Your account is suspended." };
  const existing = input.id
    ? await client.automation.findFirst({
        where: {
          id: input.id,
          userId: user.id,
          integrationId: accountId,
          archivedAt: null,
        },
        include: { listener: true },
      })
    : null;
  if (input.id && (!existing || !existing.listener?.flowDefinition))
    return {
      status: 404,
      error: "This flow is not available in the selected account.",
    };
  if (input.active) {
    if (!["PRO", "BUSINESS"].includes(user.subscription?.plan ?? "FREE"))
      return {
        status: 403,
        error:
          "Publishing custom flows requires Pro or Business. You can save and preview a draft on Free.",
      };
    if (
      integration.status !== "CONNECTED" ||
      integration.reconnectRequired ||
      integration.planLocked
    )
      return {
        status: 403,
        error: "Reconnect or unlock this Instagram account before publishing.",
      };
    if (existing?.needsReview)
      return {
        status: 403,
        error:
          "This automation needs an account review before it can be published.",
      };
    if (!(await canActivateCampaign(user.id, input.id)).ok)
      return {
        status: 403,
        error: "Your active-automation limit has been reached.",
      };
  }
  if (input.active) {
    const published = validateFlow(input.flow).flow!;
    const assetIssue=await flowAssetIssue(published,user.id);
    if(assetIssue)return {status:400,error:assetIssue};
  }
  const primary = triggers[0];
  const flow = checked.flow;
  const entry = input.active ? validateFlow(input.flow).flow!.nodes.find(node=>node.id===flow.entry) : null;
  const entryOpening = entry?.kind === "question" && entry.options.length === 1 ? entry : null;
  const opening = entryOpening?.text ?? input.opening;
  const openingButton = entryOpening?.options[0].label ?? input.openingButton;
  if (input.active && triggers.some(t=>t.source === "COMMENT") && (!opening || !openingButton)) return {status:400,error:"Comment flows need an opening message and button to start the messaging window."};
  const oldTriggers = Array.isArray(existing?.listener?.flowTriggers) ? existing.listener.flowTriggers as unknown as FlowTrigger[] : [];
  const savedTriggers = triggers.map(trigger=> {
    // Binding metadata is server-owned. Editing the same next-post trigger preserves its publication boundary.
    const old = input.active && !existing?.active ? undefined : oldTriggers.find(t=>t.id===trigger.id && t.postScope === "next");
    const {publishedAt: _publishedAt,boundPostId:_boundPostId,...clean} = trigger;
    return trigger.postScope === "next" ? {...clean,publishedAt:old?.publishedAt ?? new Date().toISOString(),...(old?.boundPostId ? {boundPostId:old.boundPostId} : {})} : clean;
  });
  try {
    const saved = await client.$transaction(async (tx) => {
      const draftOnly = Boolean(existing?.active && !input.active);
      if (input.id && existing?.listener) {
        const draft = existing.listener.flowDraft as {revision?:number} | null;
        const expectedRevision = draft?.revision ?? existing.listener.flowRevision;
        if (expectedRevision !== undefined && expectedRevision !== input.revision) throw new Error("FLOW_CONFLICT");
        const claimed = await tx.listener.updateMany({
          where: { automationId: input.id, flowRevision: existing.listener.flowRevision ?? input.revision, ...(existing.listener.flowDraft !== undefined ? {flowDraft:{equals:existing.listener.flowDraft ?? Prisma.DbNull}} : {}) },
          data: draftOnly ? {flowDraft:{revision:input.revision+1,flow,triggers:savedTriggers,name:input.name,opening:input.opening,openingButton:input.openingButton,publicReply:input.publicReply,openingEnabled:input.openingEnabled ?? true} as Prisma.InputJsonValue} : {flowRevision: input.revision + 1},
        });
        if (!claimed.count) throw new Error("FLOW_CONFLICT");
      }
      if (draftOnly) return {id:existing!.id};
      const automation = await tx.automation.upsert({
        where: { id: input.id ?? crypto.randomUUID() },
        create: { userId: user.id, integrationId: accountId, name: input.name },
        update: {},
        select: { id: true },
      });
      await tx.keyword.deleteMany({ where: { automationId: automation.id } });
      await tx.post.deleteMany({ where: { automationId: automation.id } });
      await tx.trigger.deleteMany({ where: { automationId: automation.id } });
      // Editing cancels pending runs; old buttons cannot silently execute a new graph.
      await tx.automationFlowSession.updateMany({
        where: { automationId: automation.id },
        data: { status: "CANCELLED" },
      });
      return tx.automation.update({
        where: { id: automation.id },
        data: {
          name: input.name,
          active: input.active,
          source: primary?.source ?? input.source,
          sendPrivateDm: true,
          storyTriggerType: primary?.source === "STORY" ? primary.storyTrigger : null,
          triggerMode: primary?.anyMessage ? primary.source === "COMMENT" ? "ANY_COMMENT" : "ANY_MESSAGE" : "SPECIFIC_KEYWORD",
          matchingMode: "CONTAINS",
          followGateRequired: false,
          keywords: {create: Array.from(new Set(triggers.filter(t=>!t.anyMessage && t.keyword).map(t=>t.keyword.toLowerCase()))).map(word=>({word}))},
          posts: {create: Array.from(new Map(triggers.filter(t=>t.source === "COMMENT").flatMap(t=>t.postScope === "all" ? [{postid:"ANY",media:"",mediaType:"IMAGE" as const}] : t.postScope === "next" ? [] : t.post ? [t.post] : []).map(post=>[post.postid,post])).values())},
          trigger: {create: Array.from(new Set(triggers.map(t=>t.source === "STORY" ? `STORY_${t.storyTrigger}` : t.source))).map(type=>({type}))},
          listener: {
            upsert: {
              create: {
                flowRevision: 1,
                prompt: "Continue the conversation",
                flowDefinition: flow as Prisma.InputJsonValue,
                flowTriggers: savedTriggers as Prisma.InputJsonValue,
                flowDraft: Prisma.DbNull,
                openingDmEnabled: true,
                openingDmText: opening,
                openingDmButtonText: openingButton,
                commentReply: input.publicReply || null,
              },
              update: {
                flowDefinition: flow as Prisma.InputJsonValue,
                flowTriggers: savedTriggers as Prisma.InputJsonValue,
                flowDraft: Prisma.DbNull,
                openingDmEnabled: true,
                openingDmText: opening,
                openingDmButtonText: openingButton,
                commentReply: input.publicReply || null,
              },
            },
          },
        },
        select: { id: true },
      });
    });
    return {
      status: 200,
      id: saved.id,
      revision: input.id ? input.revision + 1 : 1,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "FLOW_CONFLICT")
      return {
        status: 409,
        error:
          "This flow was changed in another tab. Reload before replacing its settings.",
      };
    return {
      status: 500,
      error:
        "The flow could not be saved. Your changes are still in the editor. Please try again.",
    };
  }
}

export async function getAutomationFlowEntries(automationId: string) {
  const current = await onCurrentUser();
  const accountId = await currentInstagramAccountId(current.id);
  const automation = await client.automation.findFirst({
    where: {
      id: automationId,
      integrationId: accountId,
      User: { clerkId: current.id },
      archivedAt: null,
    },
    select: { id: true },
  });
  if (!automation) return [];
  return client.automationFlowEntry.findMany({
    where: { automationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, recipientIgId: true, outcome: true, createdAt: true },
  });
}
