"use client";

import { UiText } from "@/components/i18n/localized-copy";
import { supportedTimeZones } from "@/lib/time-zone";
import { translateUi } from "@/lib/i18n/translate";
import { useI18n } from "@/providers/i18n-provider";
import { useTimeZone } from "@/providers/time-zone-provider";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export function TimeZoneSettings() {
  const { locale } = useI18n();
  const { timeZone, detected, automatic, save } = useTimeZone();
  const [selection, setSelection] = useState(automatic ? "automatic" : timeZone);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(supportedTimeZones, []);
  const now = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date());

  async function submit() {
    setSaving(true);
    try {
      await save(selection === "automatic" ? detected : selection, selection === "automatic");
      toast.success(translateUi("Time zone saved", locale));
    } catch (error) {
      toast.error(translateUi(error instanceof Error ? error.message : "Could not save the time zone.", locale));
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-4">
    <div>
      <h2 className="text-sm font-black text-slate-950 dark:text-white"><UiText>{"Time zone"}</UiText></h2>
      <p className="mt-0.5 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"AP3K detects your device time zone automatically. Choose a fixed zone if you manage the account from another location."}</UiText></p>
    </div>
    <label className="block">
      <span className="sr-only"><UiText>{"Time zone"}</UiText></span>
      <select value={selection} onChange={(event) => setSelection(event.target.value)} className="ap3k-select w-full rounded-xl px-3 py-2.5 text-sm">
        <option value="automatic">{translateUi("Automatic", locale)} — {detected.replaceAll("_", " ")}</option>
        {zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
      </select>
    </label>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300"><UiText>{"Current AP3K time:"}</UiText>{" "}<bdi className="tabular-nums">{now}</bdi></p>
      <button type="button" onClick={submit} disabled={saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}<UiText>{"Save time zone"}</UiText>
      </button>
    </div>
  </div>;
}
