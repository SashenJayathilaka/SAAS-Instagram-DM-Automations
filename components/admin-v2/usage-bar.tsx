import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red";

const BAR_CLASSES: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function UsageBar({ percent, tone }: { percent: number; tone: Tone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-50 dark:bg-white/[0.06]">
      <div
        className={cn("h-full rounded-full", BAR_CLASSES[tone])}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
