import { UiText } from "@/components/i18n/localized-copy";
import { cn } from "@/lib/utils";

type ChecklistItem = {
  label: string;
  done: boolean;
  href?: string;
};

type Props = { items: ChecklistItem[] };

export default function OnboardingChecklist({ items }: Props) {
  const doneCount = items.filter((i) => i.done).length;
  const pct = Math.round((doneCount / items.length) * 100);

  if (doneCount === items.length) return null;

  return (
    <div className="ap3k-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-rf-text"><UiText>{"Getting started"}</UiText></h3>
        <span className="text-xs text-slate-500 dark:text-rf-muted">{doneCount}<UiText>{" of "}</UiText>{items.length}<UiText>{" done"}</UiText></span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-4 overflow-hidden bg-slate-200 dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-ap3k-gradient transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2.5 text-xs">
            <span
              className={cn(
                "w-5 h-5 rounded-[5px] flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                item.done
                  ? "bg-rf-green text-white shadow-[0_0_18px_rgba(16,185,129,0.24)]"
                  : "border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/15 dark:bg-white/[0.03] dark:text-rf-subtle"
              )}
            >
              <UiText>{item.done ? "✓" : ""}</UiText>
            </span>
            {item.href && !item.done ? (
              <a href={item.href} className="font-semibold text-pink-600 hover:text-pink-700 dark:text-rf-pink dark:hover:text-rf-purple">
                <UiText>{item.label}</UiText>
              </a>
            ) : (
              <span className={item.done ? "text-slate-900 dark:text-rf-text" : "text-slate-600 dark:text-rf-muted"}><UiText>{item.label}</UiText></span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
