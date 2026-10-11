"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { useUi } from "@/components/i18n/use-ui";

/** Mounted only while open; captures the actual Preview control for focus return. */
export default function MobilePreviewDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const tr = useUi();
  const returnFocus = useRef(typeof document === "undefined" ? null : document.activeElement);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-base" />
      <Dialog.Content
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => { event.preventDefault(); if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus({ preventScroll: true }); }}
        className="fixed start-1/2 top-1/2 z-[81] flex h-[calc(100dvh-1.5rem)] max-h-[850px] w-[calc(100%-1.5rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-overlay outline-none rtl:translate-x-1/2 data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-base"
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3 px-2">
          <Dialog.Title className="text-sm font-bold">{tr("Instagram preview")}</Dialog.Title>
          <Dialog.Close aria-label={tr("Close preview")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border transition-colors duration-fast hover:bg-accent"><X aria-hidden="true" className="h-4 w-4" /></Dialog.Close>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
