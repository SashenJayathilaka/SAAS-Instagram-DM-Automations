"use client";
import { useState } from "react";
import { Instagram, Trash2, RefreshCw, Check } from "lucide-react";
import type { FlowTrigger } from "@/lib/automation-flow/triggers";
const choices = [
  {
    label: "User comments on your Post or Reel",
    detail: "Post or Reel Comments",
    source: "COMMENT",
  },
  {
    label: "User replies to your Story",
    detail: "Story reply",
    source: "STORY",
    storyTrigger: "REPLY",
  },
  { label: "User sends a message", detail: "Instagram message", source: "DM" },
  {
    label: "User mentions you in a Story",
    detail: "Story mention",
    source: "STORY",
    storyTrigger: "MENTION",
  },
  {
    label: "User shares a post or reel",
    detail: "Instagram message",
    source: "DM",
    sharedPost: true,
  },
] as const;
export function triggerLabel(t: FlowTrigger) {
  return t.sharedPost
    ? "User shares a post or reel"
    : t.source === "COMMENT"
      ? "User comments on your Post or Reel"
      : t.source === "STORY"
        ? t.storyTrigger === "MENTION"
          ? "User mentions you in a Story"
          : "User replies to your Story"
        : "User sends a message";
}
export default function FlowTriggerEditor({
  trigger,
  posts,
  postsLoading,
  postsError,
  refreshPosts,
  onChange,
  onAdd,
  onRemove,
}: {
  trigger?: FlowTrigger;
  posts: any[];
  postsLoading?: boolean;
  postsError?: string;
  refreshPosts: () => void;
  onChange: (t: FlowTrigger) => void;
  onAdd: (t: FlowTrigger) => void;
  onRemove?: () => void;
}) {
  if (!trigger)
    return (
      <div className="space-y-3 p-5">
        {choices.map((c, i) => (
          <button
            key={i}
            onClick={() =>
              onAdd({
                id: `trigger_${crypto.randomUUID().slice(0, 8)}`,
                source: c.source,
                storyTrigger: "storyTrigger" in c ? c.storyTrigger : "REPLY",
                sharedPost: "sharedPost" in c ? c.sharedPost : false,
                keyword: "",
                anyMessage: c.source === "STORY" || "sharedPost" in c,
                post: null,
                postScope: "specific",
              })
            }
            className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-[#f5f5f5] px-4 py-4 text-left transition hover:border-violet-400 dark:bg-white/5"
          >
            <Instagram className="h-5 w-5 shrink-0 text-pink-500" />
            <span>
              <strong className="block text-[13px] font-semibold">
                {c.label}
              </strong>
              <span className="mt-1 block text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                {c.detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  const patch = (p: Partial<FlowTrigger>) => onChange({ ...trigger, ...p });
  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold">{triggerLabel(trigger)}</h3>
        {onRemove && (
          <button
            aria-label="Remove trigger"
            onClick={onRemove}
            className="p-1 text-red-500"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {trigger.source === "COMMENT" && (
        <>
          <label className="block text-sm font-medium">
            Post
            <select
              value={trigger.postScope ?? "specific"}
              onChange={(e) =>
                patch({
                  postScope: e.target.value as FlowTrigger["postScope"],
                  post:
                    e.target.value === "all"
                      ? { postid: "ANY", media: "", mediaType: "IMAGE" }
                      : null,
                  boundPostId: undefined,
                })
              }
              className="flow-editor-input"
            >
              <option value="specific">A specific post or reel</option>
              <option value="all">All posts and reels</option>
              <option value="next">Next published post or reel</option>
            </select>
          </label>
          {trigger.postScope === "next" && (
            <p className="rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              Listens to the first Instagram post or reel published after you
              publish this automation.
            </p>
          )}
          {(!trigger.postScope || trigger.postScope === "specific") && (
            <div>
              <div className="mb-3 flex justify-between text-xs">
                <span>Select a post</span>
                <button
                  onClick={refreshPosts}
                  disabled={postsLoading}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
                >
                  <RefreshCw size={14} className={postsLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
              {postsError && (
                <p role="alert" className="mb-3 text-xs text-red-500">
                  {postsError}
                </p>
              )}
              <div className="flow-post-scroll max-h-72 overflow-y-auto overscroll-contain rounded-xl p-1" role="group" aria-label="Instagram posts">
              <div className="grid grid-cols-3 content-start items-start gap-2">
                {posts.map((p) => {
                  const id = String(p.id ?? p.postid);
                  const src = p.thumbnail_url || p.media_url || p.media;
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        patch({
                          post: {
                            postid: id,
                            media: src ?? "",
                            caption: p.caption ?? "",
                            mediaType: p.media_type ?? p.mediaType ?? "IMAGE",
                          },
                        })
                      }
                      type="button"
                      aria-pressed={trigger.post?.postid === id}
                      aria-label={`Select post ${p.caption?.slice(0, 45) || id}`}
                      className={`flow-post-tile relative block w-full aspect-square overflow-hidden rounded-xl border-2 ${trigger.post?.postid === id ? "border-violet-500" : "border-transparent"}`}
                    >
                      <PostThumbnail src={src} caption={p.caption} />
                      {trigger.post?.postid === id && <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-white shadow-sm"><Check size={14} /></span>}
                    </button>
                  );
                })}
              </div>
              </div>
              {postsLoading && (
                <p className="py-5 text-center text-xs">Loading posts…</p>
              )}
              {!postsLoading && !posts.length && (
                <p className="py-5 text-center text-xs text-slate-500 light:text-slate-600">
                  No posts loaded. Refresh your connected Instagram account.
                </p>
              )}
            </div>
          )}
        </>
      )}
      {trigger.source === "STORY" && (
        <label className="block text-sm font-medium">
          Story interaction
          <select
            className="flow-editor-input"
            value={trigger.storyTrigger}
            onChange={(e) =>
              patch({
                storyTrigger: e.target.value as FlowTrigger["storyTrigger"],
              })
            }
          >
            <option value="REPLY">Story reply</option>
            <option value="MENTION">Story mention</option>
            <option value="REACTION">Story reaction</option>
          </select>
        </label>
      )}
      {!trigger.sharedPost && (
        <>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              {trigger.source === "COMMENT" ? "Any comment" : "Any message"}
            </span>
            <input
              type="checkbox"
              checked={trigger.anyMessage}
              onChange={(e) => patch({ anyMessage: e.target.checked })}
              className="h-4 w-4 accent-violet-600"
            />
          </label>
          {!trigger.anyMessage && (
            <label className="block text-sm font-medium">
              Keyword
              <input
                className="flow-editor-input"
                value={trigger.keyword}
                maxLength={100}
                placeholder="e.g. link"
                onChange={(e) => patch({ keyword: e.target.value })}
              />
              <span className="mt-2 block text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
                Matches this phrase inside the message. Add another trigger for
                a different keyword.
              </span>
            </label>
          )}
        </>
      )}
      {trigger.sharedPost && (
        <p className="text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
          Runs when Instagram delivers a post or reel share in your inbox.
          Ordinary text messages do not trigger this rule.
        </p>
      )}
    </div>
  );
}

function PostThumbnail({ src, caption }: { src?: string; caption?: string }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || failedSrc === src || /\.(mp4|mov)(?:[?#]|$)/i.test(src)) return <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-300"><Instagram size={22} /><span className="text-[10px]">Instagram post</span></span>;
  // Expired Instagram images should leave a selectable tile, never a broken icon.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={caption?.slice(0, 70) || "Instagram post"} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} className="absolute inset-0 h-full w-full object-cover" />;
}
