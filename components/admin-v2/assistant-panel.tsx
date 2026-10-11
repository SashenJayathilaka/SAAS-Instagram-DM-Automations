"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminAssistantAction } from "@/actions/admin/assistant";

export function AssistantPanel() {
  const [pending, setPending] = useState(false),
    [answer, setAnswer] = useState("");
  return (
    <div className="admin-panel space-y-4">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-violet-500/10 p-2 text-violet-700 dark:text-violet-300">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">Your operations briefing</h2>
          <p className="text-xs text-muted-foreground dark:text-slate-400">
            Powered by your active AI provider
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground dark:text-slate-400">
        Summarize delivery health and recent growth into a short priority list.
        Only aggregate counters are shared—never private messages, emails, or
        credentials.
      </p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
            if (pending) return;
            setPending(true);
            try {
              setAnswer((await adminAssistantAction("operations")).message);
            } catch {
              setAnswer(
                "The request failed. No changes were made. Please retry.",
              );
            } finally {
              setPending(false);
            }
        }}
      >
        {pending ? "Preparing briefing…" : "Generate briefing"}
      </Button>
      {answer && (
        <div
          role="status"
          className="whitespace-pre-wrap border-t border-slate-200 dark:border-white/10 pt-4 text-sm leading-7 text-slate-800 dark:text-slate-300"
        >
          {answer}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Advisory only. Nothing is changed or published. Up to 10 requests per
        hour; provider usage may be billed.
      </p>
    </div>
  );
}
