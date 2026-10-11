"use client";

import { useSupportSound } from "./use-support-sound";
import { SupportReply } from "./support-reply";
import { SupportActions } from "./support-actions";
import { supportActionsFor, supportQuestionsFor } from "@/lib/support-assistance";
import { SupportResources } from "./support-resources";
import type { SupportResource } from "@/lib/support-resources";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";
import { localizePublicPath } from "@/lib/i18n/config";
import { useUi } from "@/components/i18n/use-ui";
import { UiText } from "@/components/i18n/localized-copy";
import { askSupportAssistantAction, clearSupportHistoryAction, getSupportHistoryAction } from "@/actions/support";
import { cn } from "@/lib/utils";
import { BookOpen, ChevronUp, CircleHelp, ExternalLink, Loader2, Mail, RefreshCw, RotateCcw, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { CSSProperties } from "react";

type ChatMessage = { id: string; role: string; content: string; createdAt: Date | string; resources?: SupportResource[] };

export default function HelpHub({ slug, expanded = true, mobile = false }: { slug: string; expanded?: boolean; mobile?: boolean }) {
  const { locale } = useI18n();
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const helpId = useId();
  const menu = <>
            <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><UiText>{"Support"}</UiText></p>
            <button type="button" onClick={() => { setAssistantOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition hover:bg-violet-50 dark:hover:bg-violet-500/10">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Sparkles className="h-4 w-4" /></span>
              <span><span className="block text-sm font-black"><UiText>{"Get help"}</UiText></span><span className="block text-xs text-slate-500 light:text-slate-600"><UiText>{"Ask AP3K Support Assistant"}</UiText></span></span>
            </button>
            <HelpLink href="/docs" icon={BookOpen} title="Documentation" detail="Guides for every AP3K feature" />
            <HelpLink href={`/dashboard/${slug}/account`} icon={RefreshCw} title="Fix Instagram permissions" detail="Reconnect your professional account" />
            <HelpLink href="/contact" icon={Mail} title="Email support" detail="Contact support@ap3k.com" />
            <div className="my-2 border-t border-slate-200 dark:border-white/10" />
            <div className="grid grid-cols-2 gap-1 px-1 pb-1 text-xs font-bold text-slate-500 light:text-slate-600">
              <Link href={localizePublicPath("/terms", locale)} className="rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/[0.06]"><UiText>{"Terms"}</UiText></Link>
              <Link href={localizePublicPath("/privacy", locale)} className="rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-white/[0.06]"><UiText>{"Privacy"}</UiText></Link>
            </div>
  </>;
  const trigger = (
        <button
          ref={helpButtonRef}
          type="button"
          className={cn("flex min-h-11 w-full items-center rounded-xl text-sm font-bold text-slate-500 light:text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white", expanded ? "gap-2.5 px-3" : "justify-center")}
          aria-expanded={menuOpen}
          aria-controls={mobile ? helpId : undefined}
          onClick={mobile ? () => setMenuOpen(value => !value) : undefined}
          aria-label={translateUi("Help", locale)}
        >
          <CircleHelp className="h-[18px] w-[18px] shrink-0" />
          {expanded ? <span className="flex-1 text-start"><UiText>{"Help"}</UiText></span> : null}
          {mobile && <ChevronUp aria-hidden="true" className={cn("h-4 w-4 transition-transform", !menuOpen && "rotate-180")} />}
        </button>
  );
  return <>
    {mobile ? <div>
      {menuOpen && <div id={helpId} className="mb-2 max-h-[45dvh] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-lg dark:border-white/10 dark:bg-[#121827] dark:text-white">{menu}</div>}
      {trigger}
    </div> : <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent onCloseAutoFocus={(event) => { if (assistantOpen) event.preventDefault(); }} side="right" align="end" sideOffset={12} collisionPadding={12} className="z-[70] w-[min(20rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#121827] dark:text-white">{menu}</PopoverContent>
    </Popover>}
    {assistantOpen ? <SupportAssistant workspace={slug} onClose={() => setAssistantOpen(false)} onRestoreFocus={() => helpButtonRef.current?.focus()} /> : null}
  </>;
}

function HelpLink({ href, icon: Icon, title, detail }: { href: string; icon: typeof BookOpen; title: string; detail: string }) {
  const { locale } = useI18n();
  return <Link href={localizePublicPath(href, locale)} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"><span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 light:text-slate-600 dark:bg-white/[0.06]"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-black"><UiText>{title}</UiText></span><span className="block truncate text-xs text-slate-500 light:text-slate-600"><UiText>{detail}</UiText></span></span><ExternalLink className="h-3.5 w-3.5 text-slate-400" /></Link>;
}

export function SupportAssistant({ workspace, onClose, onRestoreFocus }: { workspace: string; onClose: () => void; onRestoreFocus: () => void }) {
  const tr = useUi();
  const sound = useSupportSound();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const mounted = useRef(true);
  const requestInFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const completeReply = useCallback(() => { setRevealingId(null); soundRef.current.complete(); }, []);
  const lastQuestion = [...messages].reverse().find(message => message.role === "user")?.content ?? "";
  const busy = loading || pending || clearing || Boolean(revealingId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [viewport, setViewport] = useState({ height: "100dvh", top: "0px" });

  useEffect(() => {
    let active = true;
    void getSupportHistoryAction().then((result) => { if (active) { setMessages(result.messages); if (result.status !== 200) setNotice("Could not load support history. Please try again."); } }).catch(() => { if (active) setNotice("Could not load support history. Please try again."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    // iOS changes the visual viewport, not 100dvh, when the keyboard opens.
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;
    const update = () => setViewport({ height: `${visualViewport.height}px`, top: `${visualViewport.offsetTop}px` });
    update();
    visualViewport.addEventListener("resize", update);
    visualViewport.addEventListener("scroll", update);
    return () => {
      visualViewport.removeEventListener("resize", update);
      visualViewport.removeEventListener("scroll", update);
    };
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }, [messages, pending, revealingId]);

  const send = async (question = draft) => {
    const value = question.trim();
    if (!value || requestInFlight.current || busy) return;
    requestInFlight.current = true;
    sound.prepare();
    setPending(true);
    setDraft("");
    setNotice(null);
    const optimistic: ChatMessage = { id: `pending-${Date.now()}`, role: "user", content: value, createdAt: new Date() };
    setMessages((current) => [...current, optimistic]);
    try {
      // Start network work immediately; fast answers get a short, local typing cue.
      const [result] = await Promise.all([
        askSupportAssistantAction(value),
        new Promise<void>(resolve => setTimeout(resolve, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000)),
      ]);
      if (!mounted.current) return;
      if (result.status === 200 && result.userMessage && result.assistantMessage) {
        setRevealingId(result.assistantMessage.id);
        setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), result.userMessage!, result.assistantMessage!]);
      } else {
        if ("userMessage" in result && result.userMessage) {
          setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), result.userMessage!]);
        }
        setNotice(result.data);
      }
    } catch {
      if (!mounted.current) return;
      setNotice("Could not send your question. Please try again.");
      setDraft(value);
      setMessages((current) => current.filter((item) => item.id !== optimistic.id));
    } finally {
      requestInFlight.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const clearHistory = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setClearing(true);
    try { const result = await clearSupportHistoryAction(); if (result.status !== 200) throw new Error("clear failed"); if (mounted.current) { setMessages([]); setNotice(null); } }
    catch { if (mounted.current) setNotice("Could not clear support history. Please try again."); }
    finally { requestInFlight.current = false; if (mounted.current) setClearing(false); }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none" />
        <Dialog.Content
          style={{ "--support-height": viewport.height, "--support-top": viewport.top } as CSSProperties}
          onOpenAutoFocus={(event) => { event.preventDefault(); closeButtonRef.current?.focus({ preventScroll: true }); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}
          className="fixed left-0 top-[var(--support-top)] z-[101] flex h-[var(--support-height)] w-full flex-col overflow-hidden bg-white text-slate-950 shadow-[0_28px_100px_rgba(15,23,42,0.34)] outline-none dark:bg-[#0b1020] dark:text-white sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(720px,calc(100dvh-2rem))] sm:w-[min(430px,calc(100vw-2rem))] sm:rounded-[28px] sm:border sm:border-slate-200 dark:sm:border-white/10"
        >
        <header className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10 sm:py-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ap3k-gradient text-white shadow-lg shadow-violet-500/20"><Sparkles className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><Dialog.Title className="truncate font-black"><UiText>{"AP3K Support Assistant"}</UiText></Dialog.Title><Dialog.Description className="truncate text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"AI help · AP3K guides and plan details"}</UiText></Dialog.Description></div>
          <button type="button" onClick={sound.toggle} aria-pressed={sound.enabled} aria-label={sound.enabled ? "Mute response sound" : "Enable response sound"} title={sound.enabled ? "Response sound on (suppressed with reduced motion)" : "Response sound off"} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 dark:text-slate-400">{sound.enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={tr("Close support")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 light:text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5">
          <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-6 dark:bg-white/[0.07]"><UiText>{"Hi! Ask me how to connect Instagram, build an automation, use AP3K AI, manage billing, or troubleshoot your workspace."}</UiText></div>
          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400"><UiText>{"Support Assistant · AI agent"}</UiText></p>
          {loading ? <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div> : null}
          {messages.map((message, index) => {
            const assistant = message.role === "assistant";
            const revealing = revealingId === message.id;
            const question = messages.slice(0, index).reverse().find(item => item.role === "user")?.content ?? "";
            return <div dir="auto" key={message.id} className={cn("whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6", !assistant ? "ms-auto max-w-[85%] rounded-br-md bg-violet-600 text-white" : "max-w-[96%] rounded-bl-md bg-slate-100 dark:bg-white/[0.07]")}>
              {assistant ? <SupportReply text={message.content} animate={revealing} onComplete={completeReply} /> : message.content}
              {assistant && !revealing && message.resources?.length ? <SupportResources resources={message.resources} workspace={workspace} /> : null}
              {assistant && !revealing && index === messages.length - 1 ? <SupportActions key={message.id} actions={supportActionsFor(question)} workspace={workspace} /> : null}
            </div>;
          })}
          <div role="status" aria-live="polite" aria-atomic="true" className={pending || revealingId ? "flex w-fit items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600 dark:bg-white/[0.07] dark:text-slate-300" : "sr-only"}>
            {pending || revealingId ? <><span aria-hidden="true" className="flex gap-1">{[0, 1, 2].map(dot => <span key={dot} className="h-1.5 w-1.5 rounded-full bg-violet-500 motion-safe:animate-pulse" style={{ animationDelay: `${dot * 180}ms` }} />)}</span><UiText>AP3K AI is preparing your answer…</UiText></> : messages.at(-1)?.role === "assistant" ? messages.at(-1)?.content : ""}
          </div>
          {!loading && <div aria-label={tr("Suggested questions")} className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400"><UiText>{messages.length ? "You can also ask" : "Try asking"}</UiText></p>
            <div className="grid gap-2">{supportQuestionsFor(lastQuestion).map(question => <button key={question} type="button" disabled={busy} onClick={() => void send(tr(question))} className="min-h-11 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-start text-xs font-medium leading-5 text-violet-800 transition-colors hover:bg-violet-50 focus-visible:outline-violet-500 disabled:opacity-50 dark:border-violet-400/20 dark:bg-violet-500/5 dark:text-violet-200 dark:hover:bg-violet-500/15"><UiText>{question}</UiText></button>)}</div>
          </div>}
          {notice ? <p className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200"><UiText>{notice}</UiText></p> : null}
          <div ref={bottomRef} />
        </div>
        <footer className="shrink-0 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/10 sm:p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 dark:border-white/10 dark:bg-white/[0.04]">
            <textarea aria-label={tr("Ask a question…")} dir="auto" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} rows={1} maxLength={1200} placeholder={tr("Ask a question…")} className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none sm:text-sm" />
            <button type="button" onClick={() => void send()} disabled={!draft.trim() || busy} aria-label={tr("Send")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-60 dark:disabled:bg-white/10"><Send className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500 light:text-slate-600"><span><UiText>{"AI can make mistakes. Never share secrets."}</UiText></span><button type="button" disabled={busy} onClick={() => void clearHistory()} className="inline-flex shrink-0 items-center gap-1 font-bold hover:text-slate-900 dark:hover:text-white"><RotateCcw className="h-3 w-3" /> <UiText>{"Start over"}</UiText></button></div>
        </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
