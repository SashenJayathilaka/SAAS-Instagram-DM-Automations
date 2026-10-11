import { readNextPost } from "./next-post";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFlowTriggers, matchFlowTrigger } from "@/lib/automation-flow/triggers";
import { resolveCommentTriggerMatch } from "@/lib/matching";
import type { MATCHING_MODE } from "@prisma/client";
export const BACKTRACK_WINDOW_MS = 7 * 86400_000;
export function eligibleCommentTimestamp(timestamp: unknown, now = Date.now()): timestamp is string {
  if (typeof timestamp !== "string") return false;
  const time = Date.parse(timestamp);
  return Number.isFinite(time) && time <= now && time > now - BACKTRACK_WINDOW_MS;
}
export type BacktrackAutomation = { source: string; postConfig?: unknown; matchingMode: MATCHING_MODE; triggerMode: string; keywords: {word:string}[]; posts:{postid:string}[]; listener: {flowTriggers:unknown}|null };
export function backtrackMediaIds(a: BacktrackAutomation) {
  const triggers = readFlowTriggers(a.listener?.flowTriggers);
  const ids = triggers === null ? a.source === "COMMENT" ? a.posts.map(p=>p.postid === "NEXT" ? readNextPost(a.postConfig)?.boundPostId : p.postid) : [] : triggers.filter(t=>t.source === "COMMENT").map(t=>t.postScope === "next" ? t.boundPostId : t.post?.postid);
  return Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && /^\d+$/.test(id))));
}
export function backtrackMatches(a: BacktrackAutomation, text: string, mediaId:string) {
  const triggers = readFlowTriggers(a.listener?.flowTriggers);
  return triggers === null ? Boolean(resolveCommentTriggerMatch({text,keywords:a.keywords,mode:a.matchingMode,triggerMode:a.triggerMode})) : Boolean(matchFlowTrigger(triggers,{source:"COMMENT",text,mediaId}));
}
export type BacktrackCursor = { automationId:string; integrationId:string; mediaIds:string[]; index:number; after?:string; expires:number };
export function encodeBacktrackCursor(value:BacktrackCursor, secret:string) {
  const data = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${data}.${createHmac("sha256",secret).update(data).digest("base64url")}`;
}
export function decodeBacktrackCursor(raw:string, secret:string, automationId:string, integrationId:string): BacktrackCursor {
  if(raw.length>16000) throw new Error("This backtrack session is invalid. Start again.");
  const [data,signature,...extra]=raw.split(".");
  const expected=createHmac("sha256",secret).update(data || "").digest();
  const received=Buffer.from(signature || "","base64url");
  if(extra.length || received.length !== expected.length || !timingSafeEqual(received,expected)) throw new Error("This backtrack session is invalid. Start again.");
  const value=JSON.parse(Buffer.from(data,"base64url").toString()) as BacktrackCursor;
  if(value.automationId!==automationId || value.integrationId!==integrationId || !Number.isInteger(value.index) || value.index<0 || !Array.isArray(value.mediaIds) || value.index>=value.mediaIds.length || value.expires<Date.now()) throw new Error("This backtrack session expired. Start again.");
  return value;
}
/** Filter BEFORE keyword selection so a resumed job cannot select another campaign. */
export function deliveryCandidates<T extends {id:string}>(candidates:T[], target?:string) { return target ? candidates.filter(c=>c.id===target) : candidates; }
