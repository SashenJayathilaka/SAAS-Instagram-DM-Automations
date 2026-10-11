import { z } from "zod";
import { matchKeywordWithMode } from "@/lib/matching";
export const flowPostSchema = z.object({ postid: z.string().min(1).max(100), media: z.string().max(4000), caption: z.string().max(4000).optional(), mediaType: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]) });
export const flowTriggerSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/), source: z.enum(["COMMENT", "DM", "STORY"]),
  storyTrigger: z.enum(["REPLY", "MENTION", "REACTION"]).default("REPLY"),
  keyword: z.string().trim().max(100).default(""), anyMessage: z.boolean().default(false),
  post: flowPostSchema.nullable().optional(), postScope: z.enum(["specific", "all", "next"]).optional(),
  sharedPost: z.boolean().optional(), publishedAt: z.string().datetime().optional(), boundPostId: z.string().max(100).optional(),
});
export type FlowTrigger = z.infer<typeof flowTriggerSchema>;
export function readFlowTriggers(value: unknown): FlowTrigger[] | null {
  if (value == null) return null;
  const parsed = z.array(flowTriggerSchema).max(10).safeParse(value);
  return parsed.success ? parsed.data : [];
}
export function matchFlowTrigger(triggers: FlowTrigger[], event: {source: FlowTrigger["source"]; text: string; mediaId?: string; storyTrigger?: string; sharedPost?: boolean}): FlowTrigger | null {
  const candidates = triggers.filter(t => {
    if (t.source !== event.source) return false;
    if (t.source === "STORY" && t.storyTrigger !== event.storyTrigger) return false;
    if (t.source === "DM" && Boolean(t.sharedPost) !== Boolean(event.sharedPost)) return false;
    if (t.source === "COMMENT") {
      const scope = t.postScope ?? (t.post?.postid === "ANY" ? "all" : "specific");
      if (scope === "next" && (!t.boundPostId || t.boundPostId !== event.mediaId)) return false;
      if (scope === "specific" && t.post?.postid !== event.mediaId) return false;
    }
    return t.anyMessage || (t.source === "STORY" && !t.keyword) || Boolean(matchKeywordWithMode(event.text, [{ word: t.keyword }], "CONTAINS"));
  });
  return candidates.find(t => !t.anyMessage && Boolean(t.keyword)) ?? candidates[0] ?? null;
}
export function isSharedPostAttachment(attachments: Array<{type?: string}>): boolean {
  return attachments.some(a => a.type === "ig_post" || a.type === "share" || a.type === "ig_reel" || a.type === "reel");
}
// Drafts can be disconnected or empty. Bound payload size/depth and node identities;
// publication still uses the complete discriminated node and graph validator.
export function readFlowDraft(raw: unknown) {
  const parsed = z.object({version:z.literal(1),triggerPosition:z.object({x:z.number().min(0).max(6000),y:z.number().min(0).max(6000)}).optional(),entry:z.string().max(60),oncePerContact:z.boolean(),nodes:z.array(z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),kind:z.enum(["message","product","email","question","random","condition","delay","capture","phone","setfield","carousel","tag","webhook","end"]),label:z.string().max(80),x:z.number().min(0).max(6000),y:z.number().min(0).max(6000)}).passthrough()).max(50)}).safeParse(raw);
  if (!parsed.success || JSON.stringify(raw).length > 150000) return null;
  if (new Set(parsed.data.nodes.map(n=>n.id)).size !== parsed.data.nodes.length) return null;
  return parsed.data;
}
