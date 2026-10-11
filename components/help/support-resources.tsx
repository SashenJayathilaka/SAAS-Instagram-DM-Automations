"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { SupportResource } from "@/lib/support-resources";
import { PRODUCT_SCREENSHOTS } from "@/lib/product-screenshots";
export function SupportResources({ resources, workspace }: { resources: SupportResource[]; workspace: string }) {
  return <div className="mt-3 space-y-3 whitespace-normal">
    {resources.map(resource => <div key={resource.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/15 dark:bg-slate-950/50">
      <Link href={resource.href} target="_blank" className="flex items-center justify-between gap-2 p-3 text-xs font-bold text-violet-700 dark:text-violet-300">{resource.title}<ArrowUpRight size={15} /></Link>
      {resource.screenshot && PRODUCT_SCREENSHOTS[resource.screenshot] && <a href={PRODUCT_SCREENSHOTS[resource.screenshot].src} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge ${resource.title} screenshot`}><Image src={PRODUCT_SCREENSHOTS[resource.screenshot].src} alt={PRODUCT_SCREENSHOTS[resource.screenshot].alt} width={PRODUCT_SCREENSHOTS[resource.screenshot].width} height={PRODUCT_SCREENSHOTS[resource.screenshot].height} sizes="350px" className="h-auto w-full" /><span className="block px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">Example workspace · tap to enlarge</span></a>}
      {resource.dashboard !== undefined && <Link className="block border-t border-slate-200 p-3 text-xs font-semibold dark:border-white/10" href={`/dashboard/${encodeURIComponent(workspace)}${resource.dashboard ? `/${resource.dashboard}` : ""}`}>Open in your workspace →</Link>}
    </div>)}
    {resources.some(resource => resource.video) && <details className="rounded-xl border border-slate-200 p-3 dark:border-white/15"><summary className="cursor-pointer text-xs font-bold">Watch the AP3K setup tutorial</summary><iframe className="mt-3 aspect-video w-full rounded-lg border-0" src="https://www.youtube-nocookie.com/embed/SSOYGbfwLUQ" title="AP3K comment-to-DM tutorial" loading="lazy" allow="encrypted-media; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></details>}
  </div>;
}
