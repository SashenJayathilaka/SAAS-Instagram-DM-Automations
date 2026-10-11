import { cn } from "@/lib/utils";

export type StepStatus = "done" | "active" | "todo";

type Step = { label: string; status: StepStatus };

type Props = { steps: Step[] };

export default function WizardStepper({ steps }: Props) {
  const activeStep = Math.max(0, steps.findIndex((step) => step.status === "active"));

  return (
    <div className="w-full" aria-label={`Step ${activeStep + 1} of ${steps.length}: ${steps[activeStep]?.label ?? ""}`}>
      <div className="flex w-full items-start gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className={cn("flex min-w-0 items-start", i < steps.length - 1 ? "flex-1" : "shrink-0")}>
            <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 sm:w-auto">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                  step.status === "done" && "bg-rf-green text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]",
                  step.status === "active" && "bg-rf-blue text-white shadow-[0_0_14px_rgba(59,130,246,0.4)]",
                  step.status === "todo" && "border border-slate-300 bg-white text-slate-500 dark:border-white/20 dark:bg-white/[0.06] dark:text-slate-400"
                )}
              >
                {step.status === "done" ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "hidden max-w-24 text-center text-[10px] font-semibold leading-tight sm:block",
                  step.status === "done" && "text-rf-green",
                  step.status === "active" && "text-rf-blue",
                  step.status === "todo" && "text-slate-500 dark:text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("mx-1 mt-[15px] h-0.5 min-w-2 flex-1 sm:mx-2", step.status === "done" ? "bg-rf-green" : "bg-slate-200 dark:bg-white/15")} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-black text-rf-blue sm:hidden">{steps[activeStep]?.label}</p>
    </div>
  );
}
