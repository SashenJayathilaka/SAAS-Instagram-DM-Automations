"use client";

import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { PRODUCT_VIDEOS } from "@/lib/product-videos";

/** No third-party player request or autoplay until the visitor chooses to watch. */
export default function ProductVideo({ video = "overview" }: { video?: keyof typeof PRODUCT_VIDEOS }) {
  const [playing, setPlaying] = useState(false);
  const item = PRODUCT_VIDEOS[video];
  return <figure className="my-8 overflow-hidden rounded-2xl border border-violet-200 bg-white dark:border-white/10 dark:bg-slate-950">
    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-violet-100 via-slate-50 to-fuchsia-100 dark:from-violet-950 dark:via-slate-950 dark:to-fuchsia-950">
      {playing ? <iframe className="absolute inset-0 h-full w-full border-0" src={`https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1&rel=0`} title={item.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> :
        <button type="button" onClick={() => setPlaying(true)} aria-label={`Watch ${item.title}`} className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-slate-950 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-6px] focus-visible:outline-violet-500 dark:text-white sm:gap-3 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-600 text-white shadow-lg transition-transform motion-safe:hover:scale-105 sm:h-16 sm:w-16"><Play fill="currentColor" className="ms-1 h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" /></span>
          <span className="text-sm font-bold sm:text-xl">{item.title}</span>
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 sm:text-xs">{item.duration} · Watch on this page</span>
        </button>}
    </div>
    <figcaption className="space-y-2 p-4 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:p-5">
      <span className="block">{item.description}</span>
      <a className="inline-flex min-h-11 items-center gap-2 font-semibold text-violet-700 underline underline-offset-4 dark:text-violet-300" href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noopener noreferrer">Watch on YouTube <ExternalLink size={14} aria-hidden="true" /></a>
    </figcaption>
  </figure>;
}
