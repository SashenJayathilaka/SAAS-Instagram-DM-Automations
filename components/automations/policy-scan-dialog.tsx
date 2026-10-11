"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2, MessageSquare, Reply, Send, ShieldCheck, Target, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { scanAutomationPolicy } from "@/actions/automation-policy";
import type { PolicyFinding, PolicyScanInput, PolicyScanResult } from "@/lib/automation-policy";
import s from "./automation-tools.module.css";

export interface PolicyScanDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; input: PolicyScanInput; slug: string;
  onPublish?: () => void; onApply?: (findings: PolicyFinding[]) => void;
}

export function PolicyScanDialog({ open, onOpenChange, input, slug, onPublish, onApply }: PolicyScanDialogProps) {
  const [result, setResult] = useState<PolicyScanResult | null>(null);
  const [retry, setRetry] = useState(0);
  const request = useRef<{ key: string; promise: Promise<PolicyScanResult> } | null>(null);
  const snapshot = JSON.stringify(input);
  useEffect(() => {
    if (!open) { request.current = null; return; }
    let cancelled = false;
    setResult(null);
    const key = `${snapshot}:${retry}`;
    if (request.current?.key !== key) {
      request.current = { key, promise: scanAutomationPolicy(JSON.parse(snapshot) as PolicyScanInput).catch(() => ({ ok: false, code: "ERROR", error: "The safety scan could not finish. Please try again." } as PolicyScanResult)) };
    }
    void request.current.promise.then(value => { if (!cancelled) setResult(value); });
    return () => { cancelled = true; };
  }, [open, snapshot, retry]);
  return <PolicyScanView key={`${snapshot}:${retry}`} open={open} onOpenChange={onOpenChange} input={input} slug={slug} onPublish={onPublish} onApply={onApply} result={result} onRetry={() => setRetry(n => n + 1)} />;
}

/** Presentation only; callers own requests and quota consumption. */
export function PolicyScanView({ open, onOpenChange, input, slug, onPublish, onApply, result, onRetry }: PolicyScanDialogProps & { result: PolicyScanResult | null; onRetry: () => void }) {
  const [expanded, setExpanded] = useState<string[]>([]);
  const findings = result?.ok ? result.findings : [];
  const editableSections = new Set(["reply", "opening", "message", "aiReplyInstructions", "productSubtitle", "emailCapturePrompt", "phoneCapturePrompt", "followUpMessage", "followRequestDmText"]);
  const replacements = findings.filter(f => f.replacement?.trim() && (editableSections.has(f.sectionId) || /^node:[^:]+:(text|subtitle)$/.test(f.sectionId)));
  const publish = () => { onOpenChange(false); onPublish?.(); };
  const icons = [Target, Reply, MessageSquare, Send];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={s.dialog}>
      <header className={s.header}>
        <span className={s.iconBox}><ShieldCheck /></span>
        <div className={s.heading}><DialogTitle className={s.title}>AI Meta Policy Safety check</DialogTitle><DialogDescription className={s.subtitle}>Reviewing your automation for risk patterns</DialogDescription></div>
        {result?.ok && <span className={`${s.badge} ${findings.length ? s.amber : s.green}`}><span className={s.dot} />{findings.length ? "Caution" : "No risks found"}</span>}
      </header>
      <div className={s.body} aria-live="polite" aria-busy={!result}>
        {result && !result.ok ? <div className={s.notice}>
          <strong>{result.code === "LIMIT" ? "You've used your free policy-scan allowance" : "The safety scan could not finish"}</strong>
          <p>{result.code === "LIMIT" ? `Upgrade to keep checking automations for Meta policy risk patterns${onPublish ? ", or skip the check and publish." : "."}` : result.error}</p>
          {result.code === "LIMIT" && <span className={s.allowance}>{result.used ?? 3} of {result.limit ?? 3} free scans used</span>}
        </div> : input.sections.map((section, index) => {
          const items = findings.filter(f => f.sectionId === section.id);
          const isExpanded = expanded.includes(section.id);
          const Icon = icons[index] ?? MessageSquare;
          return <section className={s.section} key={section.id}>
            <button type="button" className={`${s.row} ${!result ? s.pending : ""}`} disabled={!items.length} aria-expanded={items.length ? isExpanded : undefined} onClick={() => setExpanded(previous => isExpanded ? previous.filter(id => id !== section.id) : [...previous, section.id])}>
              <Icon /><span className={s.rowLabel}>{section.label}{section.detail && <span className={s.detail}>· {section.detail}</span>}</span>
              {!result ? <span className={s.status}><Loader2 className={s.spinner} />Scanning…</span> : items.length ? <span className={`${s.status} ${s.amber}`}><TriangleAlert />{items.length} {items.length === 1 ? "suggestion" : "suggestions"}<ChevronDown style={{ transform: isExpanded ? "rotate(180deg)" : undefined }} /></span> : <span className={`${s.status} ${s.green}`}><CheckCircle2 />Looks good</span>}
            </button>
            {!result && <div className={s.skeleton} />}
            {isExpanded && <div className={s.findings}>{items.map((finding, i) => <div className={s.finding} key={`${finding.textIndex}:${i}`}><strong>{finding.title}</strong><p>{finding.reason}</p>{finding.quote && <blockquote>“{finding.quote}”</blockquote>}{finding.replacement && <p><strong>Suggested wording:</strong> {finding.replacement}</p>}</div>)}</div>}
          </section>;
        })}
      </div>
      <footer className={s.footer}>
        {result?.ok && <div className={s.count}><span className={`${s.dot} ${findings.length ? s.amber : s.green}`} />{findings.length ? `${findings.length} suggestions` : "No risk patterns found"}</div>}
        <div className={s.actions}>
          {!result ? <button type="button" className={`${s.button} ${s.outline}`} onClick={() => onOpenChange(false)}>Cancel</button> : result.ok ? <>
            {onApply && replacements.length > 0 && <button type="button" className={`${s.button} ${s.outline}`} onClick={() => { onApply(replacements); onOpenChange(false); }}>Fix issues</button>}
            {onPublish ? <button type="button" className={s.button} onClick={publish}>{findings.length ? "Publish anyway" : "Publish"}<ArrowRight /></button> : <button type="button" className={s.button} onClick={() => onOpenChange(false)}>Done</button>}
          </> : <>
            {onPublish && <button type="button" className={`${s.button} ${s.outline}`} onClick={publish}>Skip check and publish</button>}
            {result.code === "LIMIT" ? <Link className={s.button} href={`/dashboard/${slug}/billing`}>Upgrade<ArrowRight /></Link> : <button type="button" className={s.button} onClick={onRetry}>Retry scan</button>}
          </>}
        </div>
        {result?.ok && <p className={s.footnote}>AI guidance, not Meta approval. Review suggestions before publishing.</p>}
      </footer>
    </DialogContent>
  </Dialog>;
}

export default PolicyScanDialog;
