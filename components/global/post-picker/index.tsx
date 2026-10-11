"use client";

import { useUi } from "@/components/i18n/use-ui";
import { useI18n } from "@/providers/i18n-provider";
import { useTimeZone } from "@/providers/time-zone-provider";
import { UiText } from "@/components/i18n/localized-copy";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export type InstagramPost = {
  id: string;
  caption?: string;
  media_url?: string;
  thumbnail_url?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
  permalink?: string;
};

type Props = {
  posts: InstagramPost[];
  selected: string | null;
  onSelect: (post: InstagramPost) => void;
};

const POSTS_PER_PAGE = 14;

export default function PostPicker({ posts, selected, onSelect }: Props) {
  const tr = useUi();
  const { locale } = useI18n();
  const { timeZone } = useTimeZone();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const orderedPosts = useMemo(() => [...posts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [posts]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orderedPosts;
    return orderedPosts.filter((post) =>
      `${post.caption ?? ""} ${post.id}`.toLowerCase().includes(needle)
    );
  }, [orderedPosts, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const pagedPosts = filtered.slice(start, start + POSTS_PER_PAGE);
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  useEffect(() => {
    setPage(1);
  }, [query, posts]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-rf-border p-10 text-center text-rf-muted text-sm">
        <UiText>{"No posts found. Make sure your Instagram account is connected."}</UiText></div>
    );
  }

  if (!expanded) {
    return (
      <div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {orderedPosts.slice(0, 4).map((post) => {
            const thumb = post.media_type === "VIDEO" ? (post.thumbnail_url ?? post.media_url) : post.media_url;
            const isSelected = selected === post.id;
            return (
              <button key={post.id} type="button" onClick={() => onSelect(post)} aria-label={tr("Select post from {date}").replace("{date}", formatPostDate(post.timestamp, locale, tr, timeZone))} className={cn("group relative aspect-[4/5] overflow-hidden rounded-xl border-2 bg-slate-100 transition", isSelected ? "border-rf-blue ring-2 ring-rf-blue/20" : "border-transparent hover:border-rf-blue/50 dark:bg-white/[0.06]")}>
                {thumb ? <Image src={thumb} alt={post.caption?.trim() || tr("Instagram post")} fill sizes="(max-width: 640px) 22vw, 140px" className="object-cover" unoptimized /> : <span className="absolute inset-0 grid place-items-center text-xs font-black text-slate-400"><UiText>{"POST"}</UiText></span>}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 text-start text-[9px] font-black text-white"><UiText>{post.media_type === "VIDEO" ? "REEL" : post.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL" : "POST"}</UiText></span>
                {isSelected && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rf-blue text-[10px] font-black text-white">✓</span>}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setExpanded(true)} className="mt-4 text-sm font-black text-rf-blue transition hover:underline"><UiText>{"Show all posts"}</UiText></button>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="all-posts-title" className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1220]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10 sm:px-7 sm:py-5">
          <div><h3 id="all-posts-title" className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl"><UiText>{"Pick any post or Reel"}</UiText></h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400"><UiText>{"Select media from the connected Instagram account."}</UiText></p></div>
          <button type="button" onClick={() => { setExpanded(false); setQuery(""); }} aria-label={tr("Close all posts")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </header>

        <div className="shrink-0 border-b border-slate-200 px-5 py-3 dark:border-white/10 sm:px-7">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tr("Search posts")} className="ap3k-input w-full rounded-xl py-2.5 ps-9 pe-3 text-sm" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
          {filtered.length === 0 ? (
            <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-300"><UiText>{"No posts match your search."}</UiText></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {pagedPosts.map((post) => {
                const isSelected = selected === post.id;
                const thumb = post.media_type === "VIDEO" ? (post.thumbnail_url ?? post.media_url) : post.media_url;
                return (
                  <button key={post.id} type="button" onClick={() => { onSelect(post); setExpanded(false); setQuery(""); }} className={cn("group overflow-hidden rounded-2xl border-2 bg-white text-start transition-all dark:bg-[#101827]", isSelected ? "border-rf-blue shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" : "border-slate-200 hover:border-rf-blue/50 dark:border-white/10")}>
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-white/[0.04]">
                      {thumb ? <Image src={thumb} alt={post.caption?.trim() || tr("Instagram post")} fill sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 220px" className="object-cover" unoptimized /> : <span className="absolute inset-0 grid place-items-center text-xs font-black text-slate-400"><UiText>{"POST"}</UiText></span>}
                      <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-[9px] font-black text-white"><UiText>{post.media_type === "VIDEO" ? "REEL" : post.media_type === "CAROUSEL_ALBUM" ? "CAROUSEL" : "POST"}</UiText></span>
                      {isSelected ? <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-rf-blue text-xs font-black text-white">✓</span> : null}
                    </div>
                    <div className="p-3"><p className="line-clamp-2 text-xs font-bold leading-5 text-slate-950 dark:text-white">{post.caption?.trim() || tr("Instagram post or Reel")}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{formatPostDate(post.timestamp, locale, tr, timeZone)}</p></div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {filtered.length > POSTS_PER_PAGE && (
        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          >
            <ChevronLeft className="h-3.5 w-3.5" /><UiText>{" Previous"}</UiText></button>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {pageNumbers.map((item, index) => item === "…" ? (
              <span key={`ellipsis-${index}`} className="px-1 text-xs text-slate-500">…</span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => setPage(item)}
                className={cn(
                  "h-8 min-w-8 rounded-lg px-2 text-xs font-black transition-colors",
                  currentPage === item
                    ? "bg-rf-blue text-white shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          ><UiText>{"Next "}</UiText><ChevronRight className="h-3.5 w-3.5" />
          </button>
        </footer>
      )}
      </div>
    </div>
  );
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: Array<number | "…"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) pages.push("…");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("…");
  pages.push(totalPages);
  return pages;
}

function formatPostDate(value: string | undefined, locale: string, tr: (source: string) => string, timeZone: string) {
  if (!value) return tr("Date unavailable");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return tr("Date unavailable");
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone });
}
