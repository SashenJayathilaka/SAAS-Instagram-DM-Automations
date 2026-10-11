"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, ExternalLink, History, Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getBacktrackInfo, startBacktrack } from "@/actions/automation-tools";
import s from "./automation-tools.module.css";

type Info = Awaited<ReturnType<typeof getBacktrackInfo>>;
interface SavedDialogProps { open: boolean; onOpenChange: (open: boolean) => void; automationId: string }
function useMediaInfo(open: boolean, automationId: string) {
  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setInfo(null);
    void getBacktrackInfo(automationId).then(value => { if (!cancelled) setInfo(value); }).catch(() => { if (!cancelled) setInfo({ ok: false, error: "Could not load this automation. Please close and try again." }); });
    return () => { cancelled = true; };
  }, [open, automationId]);
  return info;
}

export function BacktrackDialog({ open, onOpenChange, automationId }: SavedDialogProps) {
  const info = useMediaInfo(open, automationId);
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState({ queued: 0, skipped: 0 });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  const active = useRef(false);
  useEffect(() => {
    generation.current += 1;
    active.current = false;
    setRunning(false); setDone(false); setError(null); setTotals({ queued: 0, skipped: 0 }); cursor.current = undefined;
    return () => { generation.current += 1; active.current = false; };
  }, [open, automationId]);
  const close = (value: boolean) => { if (!value) { generation.current += 1; active.current = false; } onOpenChange(value); };
  const run = async () => {
    if (active.current || !info?.ok || !info.eligible) return;
    const runId = generation.current;
    active.current = true; setRunning(true); setError(null);
    try {
      while (active.current && generation.current === runId) {
        const result = await startBacktrack(automationId, cursor.current);
        if (generation.current !== runId || !active.current) return;
        if (!result.ok) { setError(result.error); return; }
        setTotals(previous => ({ queued: previous.queued + result.queued, skipped: previous.skipped + result.skipped }));
        cursor.current = result.cursor;
        if (result.done) { setDone(true); return; }
        if (!result.cursor) { setError("The backtrack could not continue. Please try again."); return; }
      }
    } catch { if (generation.current === runId) setError("Could not finish backtracking. You can retry; previously queued comments will not be queued twice."); }
    finally { if (generation.current === runId) { active.current = false; setRunning(false); } }
  };
  return <Dialog open={open} onOpenChange={close}><DialogContent className={`${s.dialog} ${s.small}`}>
    <header><DialogTitle className={s.title}>Backtrack comments</DialogTitle><DialogDescription className={s.subtitle}>Backtracking lets you reply to past comments up to 7 days old</DialogDescription></header>
    <div className={s.scroll}>
      {!info ? <p className={s.progress} role="status">Loading comments settings…</p> : !info.ok ? <p className={s.error} role="alert">{info.error}</p> : <>
        <div className={s.label}>Backtrack Keyword</div><div className={s.chips}>{info.anyComment ? <span className={s.chip}>Any comment</span> : info.keywords.map(keyword => <span className={s.chip} key={keyword}>{keyword}</span>)}</div>
        {!info.eligible && <p className={s.progress}>{info.reason ?? "This automation cannot backtrack comments yet."}</p>}
      </>}
    </div>
    {(running || done || totals.queued > 0 || totals.skipped > 0) && <div className={s.progress} role="status" aria-live="polite"><strong>{done ? "Backtracking complete" : running ? "Backtracking comments…" : "Backtracking paused"}</strong><br />{totals.queued} queued · {totals.skipped} skipped<p className={s.footnote}>Queued replies follow your automation’s delivery rules. Closing stops loading more comments; replies already queued continue.</p></div>}
    {error && <p role="alert" className={s.error}>{error}</p>}
    <div className={s.actions} style={{ justifyContent: "flex-start" }}>
      {done ? <button type="button" className={s.button} onClick={() => close(false)}>Done</button> : <button type="button" className={`${s.button} ${s.blue}`} disabled={running || !info?.ok || !info.eligible} onClick={() => void run()}>{running && <Loader2 className={s.spinner} />}{running ? "Backtracking…" : error ? "Retry backtracking" : "Backtrack Now"}</button>}
    </div>
  </DialogContent></Dialog>;
}

export function ViewMediaDialog({ open, onOpenChange, automationId }: SavedDialogProps) {
  const info = useMediaInfo(open, automationId);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`${s.dialog} ${s.small}`}>
    <header><DialogTitle className={s.title}>View Media</DialogTitle><DialogDescription className={s.subtitle}>Instagram posts and Reels selected for this automation.</DialogDescription></header>
    <div className={s.scroll}>{!info ? <p role="status" className={s.progress}>Loading media…</p> : !info.ok ? <p className={s.error} role="alert">{info.error}</p> : info.media.length ? <div className={s.mediaGrid}>{info.media.map(media => <article key={media.id} className={s.mediaCard}>
      {/* Instagram supplies the owned media thumbnail; it is not known at build time. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {media.thumbnailUrl && <img src={media.thumbnailUrl} alt={media.caption || "Selected Instagram post"} loading="lazy" />}
      {media.caption && <p>{media.caption.length > 140 ? `${media.caption.slice(0, 140)}…` : media.caption}</p>}
      {media.permalink && <a href={media.permalink} target="_blank" rel="noopener noreferrer">View on Instagram<ExternalLink /></a>}
    </article>)}</div> : <p className={s.progress}>No specific media is selected for this automation.</p>}</div>
  </DialogContent></Dialog>;
}

export interface PublishedDialogProps { open: boolean; onOpenChange: (open: boolean) => void; onBacktrack?: () => void; onScan: () => void; preferenceKey: string }
export function PublishedDialog({ open, onOpenChange, onBacktrack, onScan, preferenceKey }: PublishedDialogProps) {
  const [hide, setHide] = useState(false);
  useEffect(() => { if (open) { try { setHide(localStorage.getItem(preferenceKey) === "true"); } catch { setHide(false); } } }, [open, preferenceKey]);
  const changePreference = (checked: boolean) => { setHide(checked); try { localStorage.setItem(preferenceKey, String(checked)); } catch { /* Private browsing can disable storage; publishing still succeeds. */ } };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={`${s.dialog} ${s.small}`}>
    <div className={s.successIcon}><Check /></div>
    <header><DialogTitle className={s.title}>Automation published</DialogTitle><DialogDescription className={s.subtitle}>What would you like to do next?</DialogDescription></header>
    <div className={s.scroll}><div className={s.nextHeading}>Optional next steps<span>takes a minute</span></div><div className={s.cards}>
      {onBacktrack && <button type="button" className={s.card} onClick={onBacktrack}><span className={s.iconBox}><History /></span><span><strong>Backtrack comments</strong><p>Send your DM to people who commented before you published.</p></span><ChevronRight /></button>}
      <button type="button" className={s.card} onClick={onScan}><span className={`${s.iconBox} ${s.green}`}><ShieldCheck /></span><span><strong>Run a safety scan</strong><p>Check your automation for spam-risk patterns before it gets busy.</p></span><ChevronRight /></button>
    </div></div>
    <footer className={s.publishedFooter}><label className={s.preference}><input type="checkbox" checked={hide} onChange={event => changePreference(event.target.checked)} />Don&apos;t show this again after publishing</label><button type="button" className={s.button} onClick={() => onOpenChange(false)}>Done</button></footer>
  </DialogContent></Dialog>;
}
