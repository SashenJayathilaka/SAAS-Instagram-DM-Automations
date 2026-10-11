"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UiText } from "@/components/i18n/localized-copy";
import { updateEmailPreferencesAction } from "@/actions/email-preferences";

type Props = {
  preferences: {
    productTips: boolean;
    weeklyReports: boolean;
    promotions: boolean;
  };
};

const options = [
  { name: "productTips", title: "Setup and product guidance", detail: "Useful reminders that help you connect Instagram, finish an automation, and use AP3K well." },
  { name: "weeklyReports", title: "Weekly performance report", detail: "A concise summary of replies, DMs, leads, and comment activity." },
  { name: "promotions", title: "Offers and product announcements", detail: "Occasional AP3K promotions and major feature announcements. Off by default." },
] as const;

export function EmailPreferences({ preferences }: Props) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"saved" | "error" | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setStatus(null);
    try { await updateEmailPreferencesAction(data); setStatus("saved"); }
    catch { setStatus("error"); }
    finally { setSaving(false); }
  }
  return (
    <form id="email-preferences" onSubmit={save} onChange={() => setStatus(null)} aria-busy={saving} className="scroll-mt-6 space-y-4">
      <fieldset disabled={saving} className="space-y-4">
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.name} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 light:border-slate-300 bg-slate-50/70 p-3 transition hover:border-violet-300 dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-violet-400/30">
            <input
              type="checkbox"
              name={option.name}
              defaultChecked={preferences[option.name]}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="min-w-0">
              <span className="block text-xs font-black text-slate-900 dark:text-white"><UiText>{option.title}</UiText></span>
              <span className="mt-1 block text-[11px] leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{option.detail}</UiText></span>
            </span>
          </label>
        ))}
      </div>
      <p className="text-[11px] leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Security, account connection, automation failure, usage-limit, support, and billing emails cannot be disabled because they protect the service you asked AP3K to run."}</UiText></p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" disabled={saving} className="w-full rounded-xl bg-violet-600 text-white shadow-sm hover:bg-violet-700 sm:w-auto">
          {saving ? <Loader2 className="animate-spin" /> : status === "saved" ? <Check /> : null}
          <UiText>{saving ? "Saving…" : status === "saved" ? "Preferences saved" : "Save email preferences"}</UiText>
        </Button>
        {status && <p role={status === "error" ? "alert" : "status"} className={`text-xs ${status === "error" ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}><UiText>{status === "error" ? "Could not save your preferences. Please try again." : "Your email preferences have been saved."}</UiText></p>}
      </div>
      </fieldset>
    </form>
  );
}
