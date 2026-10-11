"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff, Info, Layers, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useUi } from "@/components/i18n/use-ui";
import { useI18n } from "@/providers/i18n-provider";
import { generateAutomationCopyAction } from "@/actions/automation-copy";
import { DEFAULT_COMMENT_PROMPT, DEFAULT_COMMENT_ONLY_PROMPT, MAX_COMMENT_REPLIES, MAX_MESSAGE_VARIATIONS, normalizeCopyList, personalizeUsername, variationGenerationError, type AutomationCopyInput, type AutomationCopyMode } from "@/lib/automation-copy";
import type { LinkButton } from "@/lib/link-buttons";
import UsernameField from "./username-field";
import { MentionText } from "./mention-text";
import { editorStyles as s } from "./editor-layout";

type Context = Omit<AutomationCopyInput, "mode" | "text" | "existing" | "instructions" | "locale"> & { available: boolean };

function useCopyGeneration(context: Context) {
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const contextKey = JSON.stringify({ ...context, locale });
  const latestContext = useRef(contextKey); latestContext.current = contextKey;
  async function generate(mode: AutomationCopyMode, values: Partial<AutomationCopyInput> = {}) {
    if (pending.current) return null;
    if (!context.available) { setError("AI generation is available on Pro and Business plans."); return null; }
    pending.current = true; setBusy(true); setError(null);
    try {
      const result = await generateAutomationCopyAction({ ...context, ...values, mode, locale });
      if (latestContext.current !== contextKey) return null;
      if (!result.ok) { setError(result.error); return null; }
      return result.items;
    } catch { setError("AI could not generate copy. Your saved text is unchanged. Try again."); return null; }
    finally { pending.current = false; setBusy(false); }
  }
  return { generate, busy, error };
}

export function CopyField({ label, value, onChange, maxLength = 1000, rows = 4, disabled = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number; rows?: number; disabled?: boolean; compact?: boolean }) {
  return <div className={`${s.copyField} ${compact ? s.copyCompact : ""}`}><UsernameField {...{label,value,onChange,maxLength,rows,disabled}} /></div>;
}

export function PublicReplyComposer({ replies, onRepliesChange, ai, prompt, onPromptChange, context, onPreview, publishLocked = false }: {
  publishLocked?: boolean;
  replies: string[]; onRepliesChange: (value: string[]) => void; ai: boolean; prompt: string; onPromptChange: (value: string) => void; context: Context; onPreview: (reply: string) => void;
}) {
  const tr = useUi(); const generation = useCopyGeneration(context);
  const [draft, setDraft] = useState("");
  const draftRef = useRef(draft); draftRef.current = draft;
  const [samples, setSamples] = useState<string[]>([]);
  const [showSamples, setShowSamples] = useState(false);
  const repliesRef = useRef(replies); repliesRef.current = replies;
  const promptRef = useRef(prompt); promptRef.current = prompt;
  useEffect(() => { setSamples([]); onPreview(""); }, [prompt, context.sendDm, context.openingDm, onPreview]); // Samples must reflect the current prompt and delivery mode.
  const defaultPrompt = tr(context.sendDm ? DEFAULT_COMMENT_PROMPT : DEFAULT_COMMENT_ONLY_PROMPT);
  const add = () => { const next = draft.trim(); if (!next || replies.length >= MAX_COMMENT_REPLIES) return; onRepliesChange(normalizeCopyList([...replies, next])); setDraft(""); };
  async function generateReplies() {
    const before = draft;
    const items = await generation.generate("COMMENT_REPLIES", { text: draft || replies.find(x => x.trim()) || "", existing: replies });
    if (items) { onRepliesChange(normalizeCopyList([...repliesRef.current, ...items.slice(0, 1)])); if (draftRef.current === before) setDraft(""); }
  }
  async function regeneratePrompt() {
    const before = prompt;
    const items = await generation.generate("COMMENT_PROMPT", { instructions: prompt || defaultPrompt, existing: [prompt] });
    if (items && promptRef.current === before) onPromptChange(items[0]);
  }
  async function preview() {
    setShowSamples(true);
    const before = prompt;
    const items = await generation.generate("COMMENT_SAMPLES", { instructions: prompt || defaultPrompt, existing: samples });
    if (items && promptRef.current === before) { setSamples(items); onPreview(items[0]); }
  }
  return <div className={s.copySection}>
    {ai ? <>
      <div className={s.copyHeading}><strong>{tr("Prompt")}</strong><button type="button" className={s.textAction} disabled={generation.busy || !context.available} onClick={() => void regeneratePrompt()}>{generation.busy ? <Loader2 className="animate-spin"/> : <Sparkles/>}{tr("Regenerate prompt")}</button></div>
      <div className={publishLocked ? s.lockedCopy : undefined}><CopyField label="AI comment prompt" value={prompt} onChange={onPromptChange} maxLength={prompt.length > 400 ? 1600 : 400} rows={4}/></div>
      {publishLocked && <p role="alert" className={s.publishRestriction}>{tr("AI only available on paid plans.")}</p>}
      <button type="button" className={s.outlineAction} disabled={generation.busy} onClick={() => showSamples ? setShowSamples(false) : void preview()}>{showSamples ? <EyeOff/> : <Eye/>}{tr(showSamples ? "Hide preview" : "Preview replies")}</button>
      {showSamples && <><div className={s.copyHeading}><strong>{tr("Sample replies")}</strong><button type="button" className={s.textAction} disabled={generation.busy || !context.available} onClick={() => void preview()}><RefreshCw className={generation.busy ? "animate-spin" : ""}/>{tr("New samples")}</button></div><div className={s.replyList}>{samples.length ? samples.map((reply, index) => <button type="button" key={index} className={s.sampleReply} onClick={() => onPreview(reply)} dir="auto"><MentionText text={reply}/></button>) : <p className={s.hint}>{tr(generation.busy ? "Generating replies…" : "Generate samples to preview your prompt.")}</p>}</div><p className={s.hint}>{tr("Samples show the AI style. Live replies are written for each matching comment.")}</p></>}
    </> : <>
      <div className={s.copyHeading}><strong>{tr("Your replies")} · {replies.length}</strong><span className={s.hint}>{tr("Rotate randomly per comment")}</span></div>
      <div className={s.replyList}>{replies.map((reply, index) => <div className={s.replyLine} key={index}><textarea aria-label={`${tr("Reply")} ${index + 1}`} dir="auto" rows={1} maxLength={1000} value={reply} onFocus={() => onPreview(reply)} onChange={e => { onRepliesChange(replies.map((x, i) => i === index ? e.target.value : x)); onPreview(e.target.value); }}/><button type="button" className={s.remove} aria-label={`${tr("Delete reply")} ${index + 1}`} onClick={() => onRepliesChange(replies.filter((_, i) => i !== index))}><Trash2 size={15}/></button></div>)}</div>
      {replies.length < MAX_COMMENT_REPLIES && <div className={s.replyEntry}><input aria-label={tr("Add reply")} placeholder={tr("Type a reply and press Enter…")} value={draft} maxLength={1000} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}/><button type="button" className={s.generateAction} disabled={generation.busy || !context.available} onClick={() => void generateReplies()}>{generation.busy ? <Loader2 className="animate-spin"/> : <Sparkles/>}{tr("Generate")}</button><button type="button" aria-label={tr("Insert username")} title={tr("Insert username")} onClick={() => setDraft(x => `${x}{{username}}`.slice(0, 1000))}>{"{}"}</button><button type="button" aria-label={tr("Add reply")} disabled={!draft.trim()} onClick={add}><Plus size={16}/></button></div>}
      <p className={s.infoHint}><Info size={14}/>{tr("Add 3 or more replies to keep responses varied. Every variation should communicate the same next step.")}</p>
    </>}
    {generation.error && <p role="alert" className={s.error}>{tr(generation.error)}</p>}
  </div>;
}

export function MessageCopyComposer({ message, onMessageChange, variations, onVariationsChange, context, linkButtons = [], onPreview, children, maxLength = 1000 }: {
  message: string; onMessageChange: (value: string) => void; variations: string[]; onVariationsChange: (value: string[]) => void;
  context: Context; linkButtons?: LinkButton[]; onPreview?: (value: string) => void; children?: ReactNode; maxLength?: number;
}) {
  const tr = useUi();
  const generation = useCopyGeneration({ ...context, linkButtons });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const sourceKey = JSON.stringify({ message, linkButtons, hasButtons: context.hasButtons });
  const sourceRef = useRef(sourceKey); sourceRef.current = sourceKey;
  const openRef = useRef(open); openRef.current = open;
  const draftRef = useRef(draft); draftRef.current = draft;
  const readiness = variationGenerationError({ text: message, hasButtons: context.hasButtons, linkButtons });
  const canGenerate = context.available && !readiness;
  const setCurrentDraft = (next: string[]) => { draftRef.current = next; setDraft(next); };

  async function generateVariations(action: "replace" | "append" | "single", index?: number) {
    if (!canGenerate) return;
    const before = draftRef.current;
    const source = sourceKey;
    const count = action === "replace" ? 5 : 1;
    const items = await generation.generate("MESSAGE_VARIATIONS", { text: message, linkButtons, count, existing: [message, ...before] });
    if (!items || sourceRef.current !== source || !openRef.current || before !== draftRef.current) return;
    const copy = items.slice(0, count).map(text => text.slice(0, maxLength));
    setCurrentDraft(action === "single" && index !== undefined ? before.map((value, i) => i === index ? copy[0] : value) : normalizeCopyList(action === "replace" ? copy : [...before, ...copy], MAX_MESSAGE_VARIATIONS));
  }
  function show() {
    setCurrentDraft([...variations]); openRef.current = true; setOpen(true);
    if (!variations.length) void generateVariations("replace");
  }
  const shown = selected > 0 ? variations[selected - 1] ?? message : message;
  const previewButtons = context.hasButtons ? linkButtons : [];
  return <div className={s.copySection} onFocusCapture={() => onPreview?.(shown)}>
    <div className={s.variationsBar}>
      <span><Layers size={15}/>{tr("Variations")}<Info size={14} className={s.variationInfo} aria-label={tr("These rotate automatically so your DMs feel personal. Your links and buttons stay the same.")}/></span>
      <button type="button" className={s.variationAdd} disabled={generation.busy || (!variations.length && !canGenerate)} title={readiness ? tr(readiness) : undefined} onClick={show}><span aria-hidden="true">✦</span>{tr(variations.length ? "Edit variations" : "Add variations")}{variations.length ? ` (${variations.length})` : ""}</button>
    </div>
    {readiness && <p className={s.hint}>{tr(readiness)}</p>}
    {variations.length > 0 && <div className={s.variationTabs}>{[message, ...variations].map((_, index) => <button type="button" key={index} aria-pressed={selected === index} onClick={() => { setSelected(index); onPreview?.(index ? variations[index - 1] : message); }}>{index === 0 ? tr("Original") : `${tr("Variation")} ${index}`}</button>)}</div>}
    <div className={s.messageGrid}>
      <div className={s.miniPreview} aria-label={tr("Message preview")}><span className={s.miniCaption}>{tr("Preview")}</span><div className={s.miniCard}><p dir="auto"><MentionText text={shown || tr("Enter your message here")}/></p>{previewButtons.map((button, index) => <span key={index} dir="auto">{button.label || tr("Get the Link")}</span>)}</div></div>
      <div className={s.messageFields}><div className={s.copyHeading}><strong>{tr("Message")}</strong></div>
        <CopyField label="DM message text" value={shown} maxLength={maxLength} onChange={value => { if (selected > 0 && variations[selected - 1] !== undefined) onVariationsChange(variations.map((x, i) => i === selected - 1 ? value : x)); else onMessageChange(value); onPreview?.(value); }}/>
        {children}
      </div>
    </div>
    {generation.error && !open && <p role="alert" className={s.error}>{tr(generation.error)}</p>}
    <Dialog open={open} onOpenChange={value => { openRef.current = value; setOpen(value); }}><DialogContent className={`${s.copyDialog} ${s.variationDialog}`}>
      <div className={s.variationDialogHeader}><span aria-hidden="true">✦</span><div><DialogTitle>{tr("Variations")}</DialogTitle><DialogDescription>{tr("These rotate automatically so your DMs feel personal. Your links and buttons stay the same.")}</DialogDescription></div></div>
      <div className={s.variationScroll}>
        <div className={s.copyHeading}><span>{tr("{count} variations added").replace("{count}", String(draft.length))}</span><button type="button" className={s.textAction} disabled={generation.busy || !canGenerate} onClick={() => void generateVariations("replace")}><span aria-hidden="true">✦</span>{tr("Regenerate")}</button></div>
        {generation.busy && <p role="status" className={s.generatingStatus}><Loader2 size={15} className="animate-spin"/>{tr("Writing variations of your message…")}</p>}
        <div className={s.variationList}>{draft.map((value, index) => <div key={index}><div className={s.copyHeading}><strong>{tr("Variation")} {index + 1}</strong><div className={s.copyActions}><button type="button" className={s.textAction} aria-label={`${tr("Regenerate variation")} ${index + 1}`} disabled={generation.busy || !canGenerate} onClick={() => void generateVariations("single", index)}><RefreshCw size={14}/></button><button type="button" className={s.remove} aria-label={`${tr("Delete variation")} ${index + 1}`} onClick={() => setCurrentDraft(draftRef.current.filter((_, i) => i !== index))}><Trash2 size={14}/></button></div></div><CopyField label={`${tr("Variation")} ${index + 1}`} value={value} maxLength={maxLength} onChange={text => setCurrentDraft(draftRef.current.map((v, i) => i === index ? text : v))} rows={3}/></div>)}</div>
        {generation.error && <p role="alert" className={s.error}>{tr(generation.error)}</p>}
        <div className={s.variationBottomActions}><button type="button" className={s.outlineAction} disabled={draft.length >= MAX_MESSAGE_VARIATIONS || generation.busy} onClick={() => setCurrentDraft([...draftRef.current, ""])}><Plus/>{tr("Write my own")}</button><button type="button" className={s.generateAction} disabled={draft.length >= MAX_MESSAGE_VARIATIONS || generation.busy || !canGenerate} onClick={() => void generateVariations("append")}><span aria-hidden="true">✦</span>{tr("Generate more")}</button></div>
      </div>
      <div className={s.variationDialogFooter}><button type="button" className={s.cancelAction} onClick={() => { openRef.current = false; setOpen(false); }}>{tr("Cancel")}</button><button type="button" className={s.publish} disabled={generation.busy || draft.some(x => !x.trim())} onClick={() => { onVariationsChange(normalizeCopyList(draft, MAX_MESSAGE_VARIATIONS)); setSelected(0); onPreview?.(message); openRef.current = false; setOpen(false); }}>{tr("Save")}</button></div>
    </DialogContent></Dialog>
  </div>;
}
