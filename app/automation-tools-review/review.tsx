"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { PolicyScanView } from "@/components/automations/policy-scan-dialog";
import { PublishedDialog } from "@/components/automations/automation-tools-dialogs";
import type { PolicyScanInput, PolicyScanResult } from "@/lib/automation-policy";
const states = ["clean", "caution", "loading", "limit", "error", "published"];
const input: PolicyScanInput = { integrationId: "00000000-0000-4000-8000-000000000001", sections: [
  { id: "trigger", label: "Trigger", detail: "3 keywords", texts: ["LINK", "GUIDE", "INFO"] },
  { id: "reply", label: "Auto Reply", detail: "4 variations", texts: ["Check your DMs!", "Sent your guide.", "Your guide is on its way.", "Take a look in your inbox."] },
  { id: "opening", label: "Opener Message", texts: ["Claim your exclusive guide right now!"] },
  { id: "message", label: "Direct Message", texts: ["Here is your guide: https://ap3k.com"] },
] };
const caution: PolicyScanResult = { ok: true, used: 1, limit: 3, findings: [
  { sectionId: "reply", textIndex: 0, title: "Add variety to your replies", reason: "Using more varied, relevant replies can reduce repetitive-looking conversations. This is a recommendation, not a Meta requirement.", quote: "Check your DMs!", replacement: "Thanks for asking! Your guide is in your inbox." },
  { sectionId: "opening", textIndex: 0, title: "Keep your opening natural", reason: "Pressure-heavy wording may be less helpful than a clear, straightforward introduction.", quote: "Claim your exclusive guide right now!", replacement: "Thanks for your interest! Tap below to receive the guide." },
  { sectionId: "message", textIndex: 0, title: "Explain the resource", reason: "Give readers enough context to decide whether they want to open your link.", quote: "Here is your guide: https://ap3k.com", replacement: "Here is the Instagram automation guide you requested: https://ap3k.com" },
] };
function resultFor(state: string): PolicyScanResult | null {
  if (state === "loading") return null;
  if (state === "clean") return { ok: true, findings: [], used: 1, limit: 3 };
  if (state === "limit") return { ok: false, code: "LIMIT", error: "You've used your free policy-scan allowance", used: 3, limit: 3 };
  if (state === "error") return { ok: false, code: "ERROR", error: "The safety scan is temporarily unavailable. Your free allowance has not been used." };
  return caution;
}
export default function Review({ frame, state, dark }: { frame: boolean; state: string; dark: boolean }) {
  const { setTheme } = useTheme();
  useEffect(() => { if (frame) setTheme(dark ? "dark" : "light"); }, [frame, dark, setTheme]);
  const [width, setWidth] = useState(390), [chosen, setChosen] = useState(state), [night, setNight] = useState(dark), [open, setOpen] = useState(true);
  const [notice, setNotice] = useState("");
  if (!frame) return <main className="min-h-screen bg-slate-100 p-4 text-slate-950">
    <h1 className="mb-3 font-semibold">Design review · no scans, quota usage, or messages</h1>
    <div className="mb-4 flex flex-wrap items-center gap-4"><select aria-label="Dialog state" value={chosen} onChange={e => setChosen(e.target.value)}>{states.map(value => <option key={value}>{value}</option>)}</select><button onClick={() => setWidth(390)}>Mobile 390px</button><button onClick={() => setWidth(1280)}>Desktop 1280px</button><button onClick={() => setNight(v => !v)}>Toggle theme</button></div>
    <iframe title="Automation tools design review" key={`${chosen}:${night}`} src={`/automation-tools-review?frame=1&state=${chosen}&dark=${night ? "1" : "0"}`} style={{ width, maxWidth: "100%", height: 850, border: 0 }} />
  </main>;
  const explain = (text: string) => { setNotice(text); setOpen(false); };
  return <main className="min-h-screen bg-background p-6 text-foreground"><h1>Design review</h1><p className="my-4 text-sm">No real scans, publishing, or messages. {notice}</p><button onClick={() => setOpen(true)}>Reopen dialog</button>
    {state === "published" ? <PublishedDialog open={open} onOpenChange={setOpen} preferenceKey="ap3k:design-review:published" onScan={() => explain("Safety scan selected.")} onBacktrack={() => explain("Backtrack selected. No comments were sent.")} /> : <PolicyScanView open={open} onOpenChange={setOpen} input={input} slug="design-review" result={resultFor(state)} onRetry={() => explain("Retry selected.")} onApply={() => explain("Fix issues selected. No saved automation was changed.")} onPublish={() => explain("Publish selected. Nothing was published.")} />}
  </main>;
}
