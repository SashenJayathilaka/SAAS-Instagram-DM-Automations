"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";

/** Keep off-screen demos out of the initial download and decoding workload. */
export default function VisibleProductVideo({ src, poster, label, className, deferUntilLoaded = false }: {
  src: string;
  deferUntilLoaded?: boolean;
  poster?: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const { locale } = useI18n();

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ready = !deferUntilLoaded;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    let disposed = false;
    const sync = () => {
      const active = ready && visible && document.visibilityState === "visible";
      if (active && !video.getAttribute("src")) {
        video.src = src;
        video.load();
      }
      // Product demos are decorative previews. Reduced-motion visitors see the
      // poster, and autoplay failures remain a clean poster instead of exposing
      // browser or custom playback chrome inside the phone mockup.
      video.controls = false;
      if (active && !motion.matches) {
        void video.play().then(() => {
          // A pending play request may resolve after leaving the viewport.
          if (disposed || !visible || document.visibilityState !== "visible" || motion.matches) video.pause();
        }).catch(() => { video.pause(); });
      } else {
        video.pause();
      }
    };
    // Let critical CSS, fonts and the initial paint finish before hero video bytes compete.
    const afterLoad = () => { timer = setTimeout(() => { ready = true; sync(); }, 1200); };
    if (deferUntilLoaded) {
      if (document.readyState === "complete") afterLoad();
      else window.addEventListener("load", afterLoad, { once: true });
    }
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      // A sliver at the viewport edge should not start a large media download.
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      sync();
    }, { threshold: [0, 0.25] });
    if (observer) observer.observe(video);
    else { visible = true; sync(); }
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("load", afterLoad);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, deferUntilLoaded]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-label={translateUi(label, locale)}
      className={className}
    />
  );
}
