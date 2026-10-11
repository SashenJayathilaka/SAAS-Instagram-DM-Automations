"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { Expand, ExternalLink, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { useUi } from "@/components/i18n/use-ui";
import { TUTORIAL_LABELS, TUTORIAL_SCREENSHOTS, tutorialImageSrc, type TutorialScreenshotId } from "@/lib/tutorial-content";

export default function TutorialScreenshot({ id, compact = false }: { id: TutorialScreenshotId; compact?: boolean }) {
  const tr = useUi();
  const shot = TUTORIAL_SCREENSHOTS[id];
  const [zoomed, setZoomed] = useState(false);
  const src = tutorialImageSrc(id);
  return (
    <figure className="my-6 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#101827]" data-tutorial-screenshot={id}>
      <Dialog.Root onOpenChange={() => setZoomed(false)}>
        <Dialog.Trigger asChild>
          <button type="button" className="group block w-full text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-violet-500" aria-label={`${tr(TUTORIAL_LABELS.enlarge)}: ${tr(shot.title)}`}>
            <Image src={src} alt={tr(shot.caption)} width={shot.width} height={shot.height} sizes={compact ? "(max-width: 767px) 100vw, 550px" : "(max-width: 895px) 100vw, 832px"} className="h-auto w-full bg-[#080b19] object-contain" />
            <span className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-xs font-bold text-slate-700 transition-colors group-hover:text-violet-600 dark:text-slate-200 dark:group-hover:text-violet-300">
              <span>{tr(shot.title)}</span><span className="inline-flex shrink-0 items-center gap-1.5 text-violet-600 dark:text-violet-300"><Expand className="h-4 w-4" /><span className="hidden sm:inline">{tr(TUTORIAL_LABELS.enlarge)}</span></span>
            </span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-slate-950/85 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-2 z-[111] flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#080b19] text-white shadow-2xl outline-none sm:inset-6" aria-describedby={undefined}>
            <header className="flex shrink-0 items-center gap-2 border-b border-white/10 p-3 sm:px-5">
              <Dialog.Title className="min-w-0 flex-1 text-sm font-bold">{tr(shot.title)}</Dialog.Title>
              <button type="button" onClick={() => setZoomed(!zoomed)} aria-label={tr(zoomed ? TUTORIAL_LABELS.fit : TUTORIAL_LABELS.zoom)} aria-pressed={zoomed} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-violet-400">{zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}</button>
              <Dialog.Close aria-label={tr("Close")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-violet-400"><X className="h-5 w-5" /></Dialog.Close>
            </header>
            <div dir="ltr" tabIndex={0} role="region" aria-label={tr(shot.title)} className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain focus-visible:outline focus-visible:outline-violet-400">
              <div style={zoomed ? { width: shot.width } : undefined} className={zoomed ? undefined : "flex min-h-full items-center justify-center"}>
                <Image src={src} alt={tr(shot.caption)} width={shot.width} height={shot.height} unoptimized className={zoomed ? "h-auto w-full max-w-none" : "h-auto max-h-[calc(100dvh-15rem)] w-auto max-w-full object-contain"} />
              </div>
            </div>
            <footer className="shrink-0 border-t border-white/10 p-3 text-xs leading-5 text-slate-300 sm:px-5">
              <p>{tr(TUTORIAL_LABELS.pan)}</p>
              <a href={src} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-9 items-center gap-2 font-bold text-violet-300 underline underline-offset-4">{tr(TUTORIAL_LABELS.original)}<ExternalLink className="h-3.5 w-3.5" /></a>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {!compact && <figcaption className="border-t border-slate-100 px-4 py-3 text-xs leading-6 text-slate-600 dark:border-white/10 dark:text-slate-400">{tr(shot.caption)}</figcaption>}
    </figure>
  );
}
