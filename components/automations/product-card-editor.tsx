"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";
import { PRODUCT_IMAGE_INPUT_LIMIT, PRODUCT_IMAGE_UPLOAD_LIMIT } from "@/lib/product-card";
import type { LinkButton } from "@/lib/link-buttons";
import MessageResponseEditor from "./message-response-editor";

async function prepareImage(file: File): Promise<Blob> {
  if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("Upload a PNG or JPEG image.");
  if (file.size > PRODUCT_IMAGE_INPUT_LIMIT) throw new Error("Choose an image up to 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const photo = new window.Image(); photo.src = url; await photo.decode();
    if (!photo.naturalWidth || photo.naturalWidth * photo.naturalHeight > 25_000_000) throw new Error("Choose an image smaller than 25 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(photo.naturalWidth * scale); canvas.height = Math.round(photo.naturalHeight * scale);
    const context = canvas.getContext("2d"); if (!context) throw new Error("Could not prepare the image.");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob || blob.size > PRODUCT_IMAGE_UPLOAD_LIMIT) throw new Error("Choose a less detailed product image.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

type Props = { title: string; subtitle: string; imageUrl: string; linkButtons: LinkButton[]; onChange: (next: Partial<{ title: string; subtitle: string; imageUrl: string; linkButtons: LinkButton[] }>) => void };
export default function ProductCardEditor({ title, subtitle, imageUrl, linkButtons, onChange }: Props) {
  const tr = useUi(); const id = useId(); const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null); const sequence = useRef(0);
  const [busy, setBusy] = useState(false); const [dragging, setDragging] = useState(false); const [error, setError] = useState("");
  useEffect(() => () => { sequence.current++; request.current?.abort(); }, []);
  async function upload(file?: File) {
    if (!file) return;
    const version = ++sequence.current; request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(""); onChange({ imageUrl: "" });
    try {
      const body = await prepareImage(file);
      if (version !== sequence.current) return;
      const response = await fetch("/api/automation-images", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body, signal: controller.signal });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Could not upload the image. Please try again.");
      if (version === sequence.current) onChange({ imageUrl: result.url });
    } catch (failure) { if (version === sequence.current && !controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Could not upload the image. Please try again."); }
    finally { if (version === sequence.current) setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="space-y-4">
    <input ref={input} id={id} type="file" accept="image/png,image/jpeg" className="sr-only" aria-label={tr("Upload product image")} onChange={event => void upload(event.target.files?.[0])} />
    <div onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files?.[0]); }} className={`relative overflow-hidden rounded-2xl border-2 border-dashed ${dragging ? "border-violet-500 bg-violet-500/10" : "border-slate-300 bg-white dark:border-white/20 dark:bg-slate-950/40"}`}>
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className="relative flex min-h-48 w-full flex-col items-center justify-center gap-3 p-4 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500" aria-label={tr(imageUrl ? "Replace product image" : "Upload product image")}>
        {imageUrl ? <Image src={imageUrl} alt={title || tr("Product image")} width={400} height={300} unoptimized className="max-h-64 w-full object-contain" /> : busy ? <><Loader2 className="h-8 w-8 animate-spin text-violet-500 light:text-violet-700" /><span role="status">{tr("Uploading image…")}</span></> : <><ImagePlus className="h-8 w-8 text-violet-500 light:text-violet-700" /><span className="font-semibold">{tr("Click or drag image to upload")}</span><span className="text-sm text-slate-500 light:text-slate-600 dark:text-slate-400">{tr("PNG or JPEG, up to 10 MB")}</span></>}
      </button>
      {imageUrl && <button type="button" aria-label={tr("Remove product image")} onClick={() => onChange({ imageUrl: "" })} className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white"><X className="h-4 w-4" /></button>}
    </div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{tr(error)}</p>}
    <p className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">{tr("Your product photo is optimized and shared with Instagram to deliver the card.")}</p>
    <label className="block text-sm font-semibold">{tr("Product title")}<input dir="auto" value={title} maxLength={80} placeholder={tr("Write a title")} onChange={e => onChange({ title: e.target.value })} className="ap3k-input mt-2 w-full rounded-xl px-4 py-3" /></label>
    <label className="block text-sm font-semibold">{tr("Subtitle (optional)")}<textarea dir="auto" value={subtitle} maxLength={80} rows={2} placeholder={tr("Describe the product or your offer")} onChange={e => onChange({ subtitle: e.target.value })} className="ap3k-textarea mt-2 w-full rounded-xl px-4 py-3" /></label>
    <MessageResponseEditor hideMessage message={title} linkButtons={linkButtons} onChange={next => { if (next.linkButtons) onChange({ linkButtons: next.linkButtons }); }} />
  </div>;
}
