import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  markClassName?: string;
  showText?: boolean;
};

export default function AP3KLogo({ className, markClassName, showText = true }: Props) {
  return (
    <div className={cn("flex items-center gap-2.5 text-slate-950 dark:text-rf-text", className)}>
      <div
        className={cn(
          "relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-[13px] bg-ap3k-gradient shadow-[0_10px_28px_rgba(109,40,217,0.28)] ring-1 ring-white/20",
          markClassName
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className="h-full w-full p-[7px]">
          <path d="M8.5 36 20.7 9.2a3.62 3.62 0 0 1 6.6 0L39.5 36" stroke="currentColor" strokeWidth="4.7" strokeLinecap="round" strokeLinejoin="round" className="text-white" />
          <path d="M14 27.5h18.6" stroke="currentColor" strokeWidth="4.3" strokeLinecap="round" className="text-white" />
          <path d="m30.1 23.7 4.9 3.8-4.9 3.8" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" className="text-white" />
        </svg>
      </div>
      {showText && (
        <span className="text-[1.05em] font-black leading-none tracking-[-0.055em]">{" AP3K "}</span>
      )}
    </div>
  );
}
