import { UiText } from "@/components/i18n/localized-copy";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  icon: string;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  empty?: boolean;
};

export default function StatCard({ label, value, icon, delta, deltaDir = "neutral", empty }: Props) {
  const hideForMessagingReview =
    process.env.NEXT_PUBLIC_MESSAGING_REVIEW_MODE === "true" &&
    label.toLowerCase() === "reply rate";

  if (hideForMessagingReview) return null;

  return (
    <div className="ap3k-card relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rf-pink/50 to-transparent" />
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-rf-muted">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-black text-rf-pink shadow-inner dark:border-white/10 dark:bg-white/[0.04] dark:text-base">
          {icon}
        </span>
        <UiText>{label}</UiText>
      </div>
      <div className="text-3xl font-bold tabular-nums tracking-tight text-slate-950 dark:text-rf-text">
        {empty ? "—" : value}
      </div>
      {delta && !empty && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full w-fit border",
            deltaDir === "up" && "bg-rf-green/10 text-rf-green",
            deltaDir === "down" && "bg-red-500/10 text-red-400",
            deltaDir === "neutral" && "border-slate-200 bg-slate-100 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-rf-muted"
          )}
        >
          {delta}
        </span>
      )}
    </div>
  );
}
