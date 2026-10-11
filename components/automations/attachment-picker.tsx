"use client";
import { useEffect, useRef, useState } from "react";
import { upload, type UploadTask } from "@upstash/blob/browser";
import { Check, File, Mic, Upload, X, Loader2, RotateCcw, Square } from "lucide-react";
import { ATTACHMENT_ACCEPT, attachmentId, validateAttachmentDeclaration, type MessageAttachment } from "@/lib/message-attachment";
import { startWavRecording } from "@/lib/record-audio";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUi } from "@/components/i18n/use-ui";
import AudioMessagePreview from "./audio-message-preview";
import s from "./attachment-picker.module.css";

function sourceFor(attachment: MessageAttachment) {
  return attachmentId(attachment.url) ? new URL(attachment.url).pathname : "";
}
function fileSize(bytes?: number) {
  if (bytes == null) return "";
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}
function extension(file: MessageAttachment) {
  return file.name.includes(".") ? file.name.split(".").pop()!.slice(0, 5).toUpperCase() : file.mediaType;
}
export function AttachmentPreview({ attachment }: { attachment: MessageAttachment }) {
  const source = sourceFor(attachment);
  if (attachment.mediaType === "AUDIO") return <AudioMessagePreview source={source} />;
  return <div className="min-w-0 overflow-hidden rounded-2xl text-sm text-slate-800 dark:text-slate-100">
    {attachment.mediaType === "IMAGE" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={source} alt={attachment.name} className="max-h-60 w-full object-contain" />
    ) : attachment.mediaType === "VIDEO" ? (
      <video src={source} controls preload="metadata" playsInline className="max-h-72 w-full rounded-2xl" />
    ) : <a href={source} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all bg-slate-100 p-3 dark:bg-white/10"><File size={20} />{attachment.name} · Download PDF</a>}
  </div>;
}
function FileDetails({ file, onRemove }: { file: MessageAttachment; onRemove?: () => void }) {
  const tr = useUi();
  return <div className={s.file}>
    {file.mediaType === "IMAGE" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={sourceFor(file)} alt="" className={s.thumbnail} />
    ) : <span className={`${s.badge} ${file.mediaType === "AUDIO" ? s.audioBadge : ""}`}>{extension(file)}</span>}
    <div className={s.fileInfo}><span className={s.filename} title={file.name}>{file.name}</span>{file.size != null && <p className={s.size}>{fileSize(file.size)}</p>}</div>
    {onRemove && <button type="button" className={`${s.icon} ${s.remove}`} onClick={onRemove} aria-label={tr("Remove attachment")}><X size={20} /></button>}
  </div>;
}
export default function AttachmentPicker({ value, onChange }: { value?: MessageAttachment; onChange: (attachment?: MessageAttachment) => void }) {
  const tr = useUi();
  const input = useRef<HTMLInputElement>(null), task = useRef<UploadTask>(),
    recording = useRef<Awaited<ReturnType<typeof startWavRecording>>>(),
    alive = useRef(true), unsubscribe = useRef<() => void>(),
    starting = useRef(false), attempt = useRef(0), uploading = useRef(false), canceled = useRef(false);
  const [busy, setBusy] = useState(false), [percent, setPercent] = useState(0), [uploadName, setUploadName] = useState(""),
    [error, setError] = useState(""), [drag, setDrag] = useState(false), [record, setRecord] = useState(false),
    [asking, setAsking] = useState(false), [seconds, setSeconds] = useState(0),
    [levels, setLevels] = useState<number[]>(Array(60).fill(0)),
    [draft, setDraft] = useState<globalThis.File>(), [draftUrl, setDraftUrl] = useState(""),
    [resolvedFile, setResolvedFile] = useState<MessageAttachment>(),
    [recent, setRecent] = useState(false), [files, setFiles] = useState<MessageAttachment[]>([]), [loading, setLoading] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      // Invalidate permission requests using the latest scalar counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      attempt.current++;
      unsubscribe.current?.();
      task.current?.cancel();
      recording.current?.cancel();
    };
  }, []);
  useEffect(() => {
    if (!draft) { setDraftUrl(""); return; }
    const url = URL.createObjectURL(draft);
    setDraftUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft]);
  useEffect(() => {
    if (!value?.id || value.size !== undefined) return;
    const controller = new AbortController();
    const id = value.id;
    void fetch(`/api/attachments?id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        const file = result.files?.find((entry: MessageAttachment) => entry.id === id);
        if (file && !controller.signal.aborted) setResolvedFile(file);
      }).catch(() => { /* Playback remains available if metadata cannot load. */ });
    return () => controller.abort();
  }, [value?.id, value?.size]);
  const selected = value && resolvedFile?.id === value.id ? resolvedFile : value;
  async function pick(file?: globalThis.File) {
    if (!file || uploading.current || starting.current || recording.current) return;
    uploading.current = true;
    canceled.current = false;
    setError("");
    try {
      validateAttachmentDeclaration(file.type, file.size);
      setBusy(true); setPercent(0); setUploadName(file.name);
      const current = upload(file, { route: "/api/attachments/upload" });
      task.current = current;
      unsubscribe.current = current.subscribe(() => { if (alive.current) setPercent(current.snapshot().percent); });
      const result = await current.done;
      if (alive.current && !canceled.current) { onChange(result.data as MessageAttachment); setDraft(undefined); }
    } catch (e) {
      if (alive.current && !canceled.current) setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      unsubscribe.current?.(); unsubscribe.current = undefined; task.current = undefined;
      uploading.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function discard() {
    attempt.current++; starting.current = false;
    recording.current?.cancel(); recording.current = undefined;
    setRecord(false); setAsking(false); setDraft(undefined); setSeconds(0); setError("");
  }
  function stop() {
    const wav = recording.current?.stop();
    recording.current = undefined; setRecord(false);
    if (wav && wav.size > 44) {
      setDraft(new globalThis.File([wav], `recording-aud-${Date.now()}.wav`, { type: "audio/wav" }));
    } else setError("Record some audio before uploading.");
  }
  async function start() {
    if (starting.current || recording.current || uploading.current) return;
    const currentAttempt = ++attempt.current;
    starting.current = true;
    setError(""); setDraft(undefined); setSeconds(0); setLevels(Array(60).fill(0)); setAsking(true);
    try {
      const rec = await startWavRecording(stop, ({ seconds: elapsed, level }) => {
        if (!alive.current || currentAttempt !== attempt.current) return;
        setSeconds(Math.floor(elapsed));
        setLevels((old) => [...old.slice(1), level]);
      });
      if (!alive.current || currentAttempt !== attempt.current) { rec.cancel(); return; }
      recording.current = rec; setRecord(true);
    } catch {
      if (alive.current && currentAttempt === attempt.current) setError("Microphone access is unavailable. Allow microphone access or upload an audio file.");
    } finally {
      if (currentAttempt === attempt.current) { starting.current = false; if (alive.current) setAsking(false); }
    }
  }
  async function showRecent() {
    setRecent(true); setLoading(true); setError("");
    try {
      const r = await fetch("/api/attachments");
      if (!r.ok) throw new Error("Could not load your recent files.");
      const data = await r.json(); if (alive.current) setFiles(data.files);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Could not load files.");
    } finally { if (alive.current) setLoading(false); }
  }
  return <div className={s.picker}>
    <input ref={input} type="file" accept={ATTACHMENT_ACCEPT} className="sr-only" aria-label={tr("Upload file")} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
    {busy ? <div className={s.progress}>
      <div className={s.progressLabel}><span>{tr("Uploading")} {uploadName}…</span><span>{Math.round(percent)}%</span></div>
      <div className={s.progressTrack} role="progressbar" aria-label={tr("Uploading file…")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><div className={s.progressFill} style={{ width: `${percent}%` }} /></div>
      <div className={s.actions}><button type="button" className={`${s.button} ${s.ghost}`} onClick={() => { canceled.current = true; task.current?.cancel(); }}>{tr("Cancel")}</button></div>
    </div> : record ? <div className={s.recording}>
      <span className={s.dot} role="status" aria-label={tr("Recording audio…")} />
      <div className={s.waveform} aria-hidden="true">{levels.map((level, i) => <span key={i} className={s.bar} style={{ height: `${3 + level * 41}px` }} />)}</div>
      <span className={s.timer}>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
      <button type="button" className={s.icon} onClick={stop} aria-label={tr("Stop recording")}><Square size={17} fill="currentColor" /></button>
      <button type="button" className={s.icon} onClick={discard} aria-label={tr("Discard recording")}><X size={20} /></button>
    </div> : draft ? <div className={s.review}>
      {draftUrl && <audio key={draftUrl} src={draftUrl} controls preload="metadata" aria-label={tr("Review recording")} />}
      <div className={s.actions}>
        <button type="button" className={`${s.button} ${s.primary}`} onClick={() => void pick(draft)}><Check size={19} />{tr("Upload")}</button>
        <button type="button" className={s.button} onClick={() => void start()}><RotateCcw size={18} />{tr("Re-record")}</button>
        <button type="button" className={`${s.button} ${s.ghost}`} onClick={discard}><X size={18} />{tr("Discard")}</button>
      </div>
    </div> : value ? <div>
      {value.mediaType === "AUDIO" && <div className={s.preview}><audio className={s.audio} src={sourceFor(value)} controls preload="metadata" /></div>}
      {value.mediaType === "VIDEO" && <div className={s.preview}><video className={s.video} src={sourceFor(value)} controls preload="metadata" playsInline /></div>}
      <FileDetails file={selected!} onRemove={() => { onChange(); setError(""); }} />
    </div> : <div className={`${s.drop} ${drag ? s.drag : ""}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void pick(e.dataTransfer.files?.[0]); }}>
      <button type="button" className={s.button} onClick={() => input.current?.click()} disabled={asking}><Upload size={18} />{tr("Upload file")}</button>
      <p className="font-semibold text-slate-900 dark:text-white">{tr("or drag and drop here")}</p>
      <p className={s.help}>{tr("Image (PNG/JPG/GIF) up to 8MB")} · {tr("Video (MP4/MOV) up to 25MB")} · {tr("Audio (AAC/M4A/WAV) up to 25MB")} · {tr("PDF up to 25MB")}</p>
      <div className={s.actions}>
        <button type="button" className={`${s.button} ${s.pill}`} onClick={() => void start()} disabled={asking}>{asking ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}{tr("Record audio")}</button>
        <button type="button" className={`${s.button} ${s.pill}`} onClick={() => void showRecent()} disabled={asking}><File size={16} />{tr("Pick recent")}</button>
        {asking && <button type="button" className={`${s.button} ${s.ghost}`} onClick={discard}>{tr("Cancel")}</button>}
      </div>
    </div>}
    {value?.mediaType === "FILE" && <p className={`mt-3 ${s.help}`}>{tr("PDFs are delivered as download links.")}</p>}
    {error && <p role="alert" className={s.error}>{tr(error)}</p>}
    <Dialog open={recent} onOpenChange={setRecent}><DialogContent className="max-h-[80dvh] overflow-y-auto"><DialogHeader><DialogTitle>{tr("Pick recent")}</DialogTitle></DialogHeader>
      {loading ? <p role="status">{tr("Loading…")}</p> : !files.length ? <p className={s.help}>{tr("Your uploaded files will appear here.")}</p> : <div className="grid gap-2">{files.map((file) => <button type="button" key={file.id} className="min-w-0 rounded-xl text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500" onClick={() => { onChange(file); setRecent(false); }}><FileDetails file={file} /></button>)}</div>}
    </DialogContent></Dialog>
  </div>;
}
