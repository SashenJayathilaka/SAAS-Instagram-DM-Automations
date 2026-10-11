import { UiText } from "@/components/i18n/localized-copy";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Props = {
  icon: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function EmptyState({ icon, title, description, ctaLabel, ctaHref }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border border-slate-200 bg-muted text-3xl dark:border-white/[0.12]">
        {icon}
      </div>
      <div>
        <h3 className="mb-1.5 text-lg font-black text-slate-950 dark:text-rf-text"><UiText>{title}</UiText></h3>
        <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-rf-muted"><UiText>{description}</UiText></p>
      </div>
      {ctaLabel && ctaHref && (
        <Button asChild className="ap3k-gradient-button px-5">
          <Link href={ctaHref}><UiText>{ctaLabel}</UiText></Link>
        </Button>
      )}
    </div>
  );
}
