import { normalizeLinkButtons, linkButtonsAreComplete, type LinkButton } from "@/lib/link-buttons";

export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const STORY_SCOPES = ["MENTION", "ALL", "NEXT", "SPECIFIC"] as const;
export type StoryScope = (typeof STORY_SCOPES)[number];
export type InstagramStory = {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  timestamp: string;
  permalink: string;
};
export type StoryCard = { title: string; subtitle: string; image: string; links: LinkButton[] };
export type StoryConfig = {
  version: 1;
  scope: StoryScope;
  stories: InstagramStory[];
  intentPrompt: string;
  cards: StoryCard[];
  // Only the server can arm or bind a next-story rule. Never trust these on save.
  armedAt?: string;
  baselineIds?: string[];
  boundStoryId?: string;
  observedThrough?: string;
};

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown, limit = 2000) => typeof value === "string" ? value.trim().slice(0, limit) : "";
export function storyPublicUrl(value: unknown) {
  const raw = text(value, 12000);
  if (!raw) return "";
  try { const url = new URL(raw); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : ""; } catch { return ""; }
}
export function readInstagramStory(value: unknown): InstagramStory | null {
  const item = record(value);
  const id = text(item.id, 100);
  const timestamp = text(item.timestamp, 50);
  if (!id || !/^[\w-]+$/.test(id) || !Number.isFinite(Date.parse(timestamp))) return null;
  return {
    id, timestamp,
    mediaUrl: storyPublicUrl(item.mediaUrl ?? item.media_url),
    thumbnailUrl: storyPublicUrl(item.thumbnailUrl ?? item.thumbnail_url),
    mediaType: (item.mediaType ?? item.media_type) === "VIDEO" ? "VIDEO" : "IMAGE",
    permalink: storyPublicUrl(item.permalink),
  };
}
export function storyIsLive(story: Pick<InstagramStory,"timestamp">, now = Date.now()) {
  const at = Date.parse(story.timestamp);
  return Number.isFinite(at) && at <= now + 60000 && at + STORY_LIFETIME_MS > now;
}
export function normalizeStoryConfig(value: unknown, legacyTrigger?: string | null): StoryConfig {
  const raw = record(value);
  const scope = STORY_SCOPES.includes(raw.scope as StoryScope) ? raw.scope as StoryScope : legacyTrigger === "REPLY" || legacyTrigger === "REACTION" ? "ALL" : "MENTION";
  const unique = new Map<string, InstagramStory>();
  for (const item of Array.isArray(raw.stories) ? raw.stories.slice(0,100) : []) {
    const story = readInstagramStory(item);
    if (story) unique.set(story.id,story);
  }
  const cards = (Array.isArray(raw.cards) ? raw.cards : []).slice(0,10).map(value => {
    const card = record(value);
    return {title:text(card.title,80),subtitle:text(card.subtitle,80),image:storyPublicUrl(card.image),links:normalizeLinkButtons(card.links)};
  });
  const armedAt = text(raw.armedAt,50);
  return {
    version:1, scope, stories:scope === "SPECIFIC" || (scope === "NEXT" && raw.boundStoryId) ? Array.from(unique.values()) : [],
    intentPrompt:text(raw.intentPrompt,600), cards,
    ...(scope === "NEXT" && Number.isFinite(Date.parse(armedAt)) ? {
      armedAt,
      ...(Number.isFinite(Date.parse(text(raw.observedThrough,50))) ? {observedThrough:text(raw.observedThrough,50)} : {}),
      baselineIds:Array.from(new Set((Array.isArray(raw.baselineIds) ? raw.baselineIds : []).filter((id):id is string=>typeof id === "string" && /^[\w-]{1,100}$/.test(id)))).slice(0,200),
      ...(typeof raw.boundStoryId === "string" && /^[\w-]{1,100}$/.test(raw.boundStoryId) ? {boundStoryId:raw.boundStoryId}:{boundStoryId:""}),
    }:{}),
  };
}
export function readStoryConfig(value: unknown): StoryConfig | null {
  const raw = record(value);
  return raw.version === 1 && STORY_SCOPES.includes(raw.scope as StoryScope) ? normalizeStoryConfig(raw) : null;
}
export function storyScopeMatches(config: StoryConfig, interaction: "MENTION"|"REPLY"|"REACTION", storyId?: string, occurredAt = Date.now()) {
  if (config.scope === "MENTION") return interaction === "MENTION";
  if (interaction === "MENTION") return false;
  if (config.scope === "ALL") return true;
  if (!storyId) return false; // Never widen a specific story to all stories on missing webhook context.
  if (config.scope === "NEXT") return Boolean(config.boundStoryId && config.boundStoryId === storyId);
  return config.stories.some(story => story.id === storyId && storyIsLive(story,occurredAt));
}
export function nextStoryCandidate(config: StoryConfig, stories: InstagramStory[], complete: boolean, now = Date.now()) {
  if (config.scope !== "NEXT" || config.boundStoryId || !config.armedAt || !complete) return null;
  const at = Date.parse(config.armedAt);
  // An expired gap is unknowable from the active-story edge. Fail closed rather than
  // attach a campaign to the wrong later story. The scheduler binds before expiry.
  if (!Number.isFinite(at) || at > now || now - Date.parse(config.observedThrough || config.armedAt) >= STORY_LIFETIME_MS) return null;
  return [...stories].filter(story => !config.baselineIds?.includes(story.id) && Date.parse(story.timestamp) >= at && storyIsLive(story, now))
    .sort((a,b) => Date.parse(a.timestamp)-Date.parse(b.timestamp) || a.id.localeCompare(b.id))[0] ?? null;
}
export function validateStoryCards(cards: StoryCard[], carousel: boolean) {
  if (!cards.length || (carousel ? cards.length > 10 : cards.length !== 1)) return "Add an image card with a title, image and destination.";
  if (cards.some(card => !card.title || !card.image || !linkButtonsAreComplete(card.links))) return "Complete every card title, image and link button.";
  return null;
}
