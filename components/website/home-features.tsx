"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Inter } from "next/font/google";
import Image from "next/image";
import { useI18n } from "@/providers/i18n-provider";
import { HOME_FEATURES_COPY } from "@/lib/i18n/home-features";
import styles from "./home-features.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const ART = ["story-automation", "next-post", "universal-automation", "backtrack", "story-mention", "link-tracking", "boosted-posts", "team-access"] as const;
const HIDDEN_FEATURES = new Set<string>(["boosted-posts", "team-access"]);
const PREVIEW_ONLY = new Set<string>();

function FeatureVideo({ name, label, width, height }: { name: string; label: string; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { amount: .1 });
  const reduced = useReducedMotion();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (inView && reduced === false) setLoaded(true);
  }, [inView, reduced]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const update = () => {
      if (loaded && inView && reduced === false && document.visibilityState === "visible") {
        void video.play().catch(() => { /* Keep the poster if autoplay is unavailable. */ });
      } else video.pause();
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => { video.pause(); document.removeEventListener("visibilitychange", update); };
  }, [loaded, inView, reduced]);

  return <video ref={ref} className={styles.video} src={loaded ? `/media/features/${name}.mp4` : undefined}
    poster={`/media/features/${name}-poster.webp`} width={width} height={height}
    muted loop playsInline preload="none" aria-label={label} />;
}

export default function HomeFeatures() {
  const { locale } = useI18n();
  const copy = HOME_FEATURES_COPY[locale];

  return <section id="features" className={`${styles.section} ${inter.className}`} lang={locale} aria-labelledby="powerful-features-title">
    <div id="how-it-works" className={styles.container}>
      <header className={styles.heading}>
        <p>{copy.kicker}</p>
        <h2 id="powerful-features-title">{copy.title}</h2>
      </header>
      <div className={styles.wideCards}>
        {copy.featured.map((card, index) => <article className={styles.wideCard} key={index}>
          <div className={styles.copy}><h3>{card.title}</h3><p>{card.description}</p></div>
          <div className={styles.videoPanel}><FeatureVideo name={index === 0 ? "ask-to-follow" : "ai-reply"} label={card.title}
            width={index === 0 ? 800 : 1526} height={index === 0 ? 766 : 1158} /></div>
        </article>)}
      </div>
      <div className={styles.grid}>
        {copy.cards.flatMap((card, index) => {
          const art = ART[index];
          if (!art || HIDDEN_FEATURES.has(art)) return [];
          return [<article className={styles.card} key={art}>
            <div className={styles.copy}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              {PREVIEW_ONLY.has(art) && <span className={styles.preview}>{copy.unavailable}</span>}
            </div>
            <Image className={styles.illustration} src={`/media/features/${art}.avif`} alt="" width={1176} height={654}
              sizes="(min-width: 1024px) 423px, (min-width: 933px) 885px, calc(100vw - 48px)" />
          </article>];
        })}
      </div>
    </div>
  </section>;
}
