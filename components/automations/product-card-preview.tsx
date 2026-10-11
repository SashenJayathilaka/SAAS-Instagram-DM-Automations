"use client";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";
import type { LinkButton } from "@/lib/link-buttons";
export default function ProductCardPreview({ title, subtitle, imageUrl, buttons }: { title: string; subtitle?: string; imageUrl?: string; buttons: LinkButton[] }) {
  const tr = useUi();
  return <div className="ms-9 w-[calc(100%_-_2.25rem)] max-w-64 overflow-hidden rounded-2xl bg-[#262628] text-white">
    <div className="relative aspect-square bg-white/5">{imageUrl ? <Image src={imageUrl} alt={title || tr("Product image")} fill sizes="256px" unoptimized className="object-contain" /> : <div className="grid h-full place-items-center text-white/40"><ImageIcon className="h-10 w-10" aria-label={tr("Product image")} /></div>}</div>
    <div className="space-y-2 p-3"><p dir="auto" className="break-words text-xs font-bold">{title || tr("Product title")}</p>{subtitle && <p dir="auto" className="break-words text-[11px] leading-5 text-white/80">{subtitle}</p>}{buttons.slice(0, 3).map((button, index) => <div key={index} dir="auto" className="rounded-lg bg-white/10 px-3 py-2.5 text-center text-xs font-semibold">{button.label || tr("Add link")}</div>)}</div>
  </div>;
}
