import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "slate" | "pink";

const TONE_CLASSES: Record<Tone, string> = {
  green: "border-emerald-500/25 bg-emerald-500/[0.09] text-emerald-700 dark:text-emerald-300",
  amber: "border-amber-500/25 bg-amber-500/[0.09] text-amber-800 dark:text-amber-200",
  red: "border-red-500/25 bg-red-500/[0.09] text-red-700 dark:text-red-300",
  blue: "border-sky-500/25 bg-sky-500/[0.09] text-sky-700 dark:text-sky-300",
  slate: "border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.045] text-slate-800 dark:text-slate-300",
  pink: "border-pink-500/25 bg-pink-500/[0.09] text-pink-700 dark:text-pink-300",
};

export function V2Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[9px] font-black uppercase leading-none tracking-[0.11em] sm:text-[10px]",
        TONE_CLASSES[tone]
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export function statusTone(status: string): Tone {
  if (status === "CONNECTED" || status === "ACTIVE" || status === "SENT") return "green";
  if (status === "DISCONNECTED" || status === "SUSPENDED" || status === "FAILED") return "red";
  if (status === "SKIPPED") return "amber";
  return "slate";
}

export function eventTone(eventType: string): Tone {
  if (eventType === "PUBLIC_REPLY_SENT" || eventType === "KEYWORD_MATCHED" || eventType === "DM_SENT") return "green";
  if (eventType === "AI_REPLY_GENERATED") return "pink";
  if (eventType.includes("FAILED") || eventType.includes("LOOP_GUARD")) return "red";
  if (eventType.includes("SKIPPED") || eventType === "NO_MATCH") return "amber";
  if (eventType === "COMMENT_RECEIVED" || eventType === "WEBHOOK_RECEIVED") return "blue";
  return "slate";
}

export function accountHealth(account: {
  status: string;
  reconnectRequired: boolean;
  expiresAt: Date | null;
  oauthLastError: string | null;
}): { label: "Healthy" | "Needs attention" | "Broken"; tone: Tone } {
  const tokenExpired = Boolean(account.expiresAt && new Date(account.expiresAt).getTime() < Date.now());
  if (account.status === "DISCONNECTED" || tokenExpired) return { label: "Broken", tone: "red" };
  if (account.reconnectRequired || account.oauthLastError) return { label: "Needs attention", tone: "amber" };
  return { label: "Healthy", tone: "green" };
}
