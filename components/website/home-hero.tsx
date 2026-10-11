"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/providers/i18n-provider";
import { localizePublicPath } from "@/lib/i18n/config";
import { HOME_HERO_COPY } from "@/lib/i18n/home-hero";
import styles from "./home-hero.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

function ConversationCards({ side }: { side: "left" | "right" }) {
  return (
    <div className={`${styles.wing} ${styles[side]}`} aria-hidden="true">
      {(["photo", "comment", "dm"] as const).map(kind => (
        <div key={kind} className={`${styles.card} ${styles[kind]}`}>
          {(["light", "dark"] as const).map(theme => (
            <Image key={theme} className={styles[`${theme}Art`]} src={`/media/hero/${side}-${kind}-${theme}.svg`}
              alt="" width={285} height={282} unoptimized />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HomeHero() {
  const { locale } = useI18n();
  const copy = HOME_HERO_COPY[locale];
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const inView = useInView(section, { amount: 0.15 });
  const reducedMotion = useReducedMotion();
  const [pageVisible, setPageVisible] = useState(true);
  const [motionReady, setMotionReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const showVideo = videoReady && motionReady && reducedMotion === false;
  const playing = motionReady && reducedMotion === false && inView && pageVisible;

  useEffect(() => {
    // Keep the identical, eagerly loaded poster on small screens until the
    // visitor interacts. Decorative video must not delay the first useful paint.
    const media = window.matchMedia("(min-width: 768px)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const enable = () => setMotionReady(true);
    const update = () => { if (media.matches && !connection?.saveData) enable(); };
    update();
    media.addEventListener("change", update);
    window.addEventListener("pointerdown", enable, { once: true, passive: true });
    window.addEventListener("keydown", enable, { once: true });
    window.addEventListener("scroll", enable, { once: true, passive: true });
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
      window.removeEventListener("scroll", enable);
    };
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (playing) void element.play().catch(() => { /* Keep the poster if autoplay is unavailable. */ });
    else element.pause();
  }, [playing]);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const offset = reducedMotion ? 0 : Math.max(0, Math.min(window.scrollY, 650));
      element.style.setProperty("--scroll", String(offset));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <section ref={section} lang={locale} className={`${styles.hero} ${inter.className}`} data-playing={playing} aria-labelledby="home-hero-title">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.scene} role="img" aria-label={copy.demoDescription}>
        <ConversationCards side="left" />
        <ConversationCards side="right" />
      </div>
      <div className={styles.content}>
        <div className={styles.keywordAnimation} aria-hidden="true">
          <div className={styles.keywordMedia}>
            <Image className={`${styles.keywordVideo} ${styles.posterLayer}`} data-hidden={showVideo} src="/media/hero/comment-water-drop-poster.webp"
              alt="" width={1530} height={364} priority unoptimized />
            <video ref={video} className={`${styles.keywordVideo} ${styles.motionLayer}`}
              width={1530} height={364} muted loop playsInline preload="none" tabIndex={-1}
              src={motionReady && reducedMotion === false ? "/media/hero/comment-water-drop.webm" : undefined}
              onPlaying={() => setVideoReady(true)}
              onEmptied={() => setVideoReady(false)}
              onError={() => setVideoReady(false)} data-ready={showVideo} />
          </div>
        </div>
        <h1 id="home-hero-title" className={styles.title}>
          <span>{copy.titleTop}{" "}</span>
          <strong>{copy.titleBottom}</strong>
        </h1>
        <p className={styles.description}>{copy.description}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={localizePublicPath("/sign-up", locale)}>{copy.cta}</Link>
        </div>
        <div className={styles.trust}>
          <p>{copy.audience}</p>
          <Image src="/media/hero/creator-portraits.webp" alt="" width={123} height={36} sizes="123px" className={styles.portraits} />
        </div>
        <div className={styles.api}>
          <span>{copy.api}</span>
        </div>
      </div>
    </section>
  );
}
