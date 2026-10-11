import LocalizedCopy from "@/components/i18n/localized-copy";
import Image from "next/image";

type BlogVisualVariant =
  | "workflow"
  | "connect"
  | "keyword"
  | "any-comment"
  | "dm-link"
  | "analytics"
  | "troubleshoot";

type Props = {
  variant: BlogVisualVariant;
  alt: string;
  caption?: string;
  compact?: boolean;
};

const VISUALS: Record<BlogVisualVariant, string> = {
  workflow: "/images/blog/ap3k-workflow.webp",
  connect: "/images/blog/connect-instagram.webp",
  keyword: "/images/blog/keyword-automation.webp",
  "any-comment": "/images/blog/any-comment-automation.webp",
  "dm-link": "/images/blog/dm-link.webp",
  analytics: "/images/blog/lead-analytics.webp",
  troubleshoot: "/images/blog/troubleshooting.webp",
};

export type { BlogVisualVariant };

export function getBlogVisualSrc(variant: BlogVisualVariant) {
  return VISUALS[variant];
}

export default function BlogVisual({ variant, alt, caption, compact = false }: Props) {
  return (
    <LocalizedCopy><figure className="group">
      <div
        className={`relative isolate overflow-hidden border border-violet-500/20 bg-[#120923] shadow-[0_24px_70px_rgba(88,28,180,0.22)] ${compact ? "aspect-[16/9] rounded-t-[22px]" : "aspect-[16/9] rounded-[28px]"}`}
      >
        <Image
          src={VISUALS[variant]}
          alt={alt}
          fill
          sizes={compact ? "(max-width: 768px) 100vw, 33vw" : "(max-width: 1024px) 100vw, 896px"}
          className="object-cover transition duration-700 ease-out motion-safe:group-hover:scale-[1.025]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-violet-950/20 via-transparent to-pink-400/10 opacity-70" />
        <div className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 blur-sm transition duration-1000 motion-safe:group-hover:translate-x-[500%] motion-safe:group-hover:opacity-100" />
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          {caption}
        </figcaption>
      )}
    </figure></LocalizedCopy>
  );
}
