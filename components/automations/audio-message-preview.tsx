"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";

const bars = [4, 9, 5, 15, 22, 8, 17, 11, 24, 6, 16, 20, 9, 14, 5, 11, 7, 4];
export default function AudioMessagePreview({ source }: { source: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false), [error, setError] = useState(false);
  const tr = useUi();
  useEffect(() => { setPlaying(false); setError(false); }, [source]);
  return <div>
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-2.5 py-2 text-slate-800 dark:bg-white/10 dark:text-slate-100">
      <audio ref={audio} src={source} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setError(true); }} />
      <button type="button" aria-label={tr(playing ? "Pause audio" : "Play audio")} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-white/15" onClick={() => {
        if (!audio.current) return;
        if (playing) audio.current.pause();
        else { setError(false); void audio.current.play().catch(() => setError(true)); }
      }}>{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>
      <span className="flex h-6 min-w-0 items-center gap-0.5" aria-hidden="true">{bars.map((height, i) => <span key={i} className="w-0.5 rounded-full bg-current" style={{ height }} />)}</span>
    </div>
    {error && <p role="alert" className="mt-1 text-xs text-red-500">{tr("Could not play audio. Try again.")}</p>}
  </div>;
}
