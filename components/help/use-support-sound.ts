"use client";
import { useEffect, useRef, useState } from "react";
const KEY = "ap3k-support-sound";
/** Opt-in response cue only; never used by background webhook events. */
export function useSupportSound() {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const context = useRef<AudioContext | null>(null);
  useEffect(() => {
    try { enabledRef.current = localStorage.getItem(KEY) === "on"; setEnabled(enabledRef.current); } catch { /* Storage may be disabled. */ }
    return () => { void context.current?.close().catch(() => {}); context.current = null; };
  }, []);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const prepare = () => {
    if (!enabledRef.current || reduced()) return;
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
    } catch { /* Unsupported or blocked audio stays silent. */ }
  };
  const toggle = () => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try { localStorage.setItem(KEY, next ? "on" : "off"); } catch { /* Session preference still works. */ }
    if (!next) void context.current?.suspend().catch(() => {});
  };
  const complete = () => {
    const ctx = context.current;
    if (!enabledRef.current || reduced() || document.visibilityState !== "visible" || !ctx || ctx.state !== "running") return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.18);
    } catch { /* Sound must never break a support response. */ }
  };
  return { enabled, toggle, prepare, complete };
}
