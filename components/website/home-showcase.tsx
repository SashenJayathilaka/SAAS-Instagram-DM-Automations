"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Inter } from "next/font/google";
import Image from "next/image";
import { useI18n } from "@/providers/i18n-provider";
import { HOME_SHOWCASE_COPY } from "@/lib/i18n/home-showcase";
import styles from "./home-showcase.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const ART = ["send_links", "reply_to_comments", "reply_to_dm", "send_a_follow_up_message", "get_new_followers", "collect_contact_details", "reply_to_story_mentions", "reply_to_shared_post"] as const;
const CYCLE_MS = 5000;

export default function HomeShowcase({ locale: fixedLocale, autoPlay = true, contained = false }: { locale?: "en"; autoPlay?: boolean; contained?: boolean } = {}) {
  const { locale: selectedLocale } = useI18n();
  const locale = fixedLocale ?? selectedLocale;
  const copy = HOME_SHOWCASE_COPY[locale];
  const section = useRef<HTMLElement>(null);
  const elapsed = useRef(0);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [desktop, setDesktop] = useState(false);
  const reduced = useReducedMotion();
  const inView = useInView(section, { amount: .3 });
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "center center"] });
  const leftX = useTransform(scrollYProgress, [0, 1], ["50%", "0%"]);
  const rightX = useTransform(scrollYProgress, [0, 1], ["-50%", "0%"]);
  const leftRotate = useTransform(scrollYProgress, [0, 1], [0, -12]);
  const rightRotate = useTransform(scrollYProgress, [0, 1], [0, 12]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const playing = autoPlay && reduced === false && inView && visible && desktop && !hovered && !focused;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => { setDesktop(media.matches); setVisible(document.visibilityState === "visible"); };
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed.current += now - previous;
      previous = now;
      if (elapsed.current >= CYCLE_MS) {
        elapsed.current = 0;
        setActive(value => (value + 1) % ART.length);
      }
      setProgress(elapsed.current / CYCLE_MS);
    }, 50);
    return () => window.clearInterval(timer);
  }, [playing]);

  const select = (index: number) => { setActive(index); elapsed.current = 0; setProgress(0); };
  const art = (side: "l" | "r") => <AnimatePresence initial={false}>
    <motion.div key={active} className={styles.art} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: reduced ? 0 : .3 }}>
      <Image src={`/media/showcase/${ART[active]}_${side}.webp`} alt="" fill sizes="(min-width: 1280px) 256px, 236px" />
    </motion.div>
  </AnimatePresence>;

  return <section ref={section} className={`${styles.section} ${inter.className} ${contained ? styles.contained : ""}`} aria-labelledby={desktop ? "automatic-heading" : "automatic-heading-mobile"} lang={locale}>
    <div className={styles.desktop} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <motion.div aria-hidden="true" className={`${styles.wing} ${styles.left}`} style={reduced ? { rotate: -12 } : { x: leftX, rotate: leftRotate, opacity }}>{art("l")}</motion.div>
      <div className={styles.panel}>
        <h2 id="automatic-heading">{copy.automatically}</h2>
        <div className={styles.options}>
          {copy.labels.map((label, index) => <button type="button" key={ART[index]} aria-pressed={active === index} onClick={() => select(index)}>
            <span className={active === index ? styles.active : undefined} style={active === index ? { "--fill": `${playing ? progress * 100 : 100}%` } as CSSProperties : undefined}>{label}</span>
          </button>)}
        </div>
      </div>
      <motion.div aria-hidden="true" className={`${styles.wing} ${styles.right}`} style={reduced ? { rotate: 12 } : { x: rightX, rotate: rightRotate, opacity }}>{art("r")}</motion.div>
    </div>
    <div className={styles.mobile}>
      <h2 id="automatic-heading-mobile">{copy.automatically}</h2>
      <div className={styles.track} tabIndex={0} aria-label={copy.automatically}>
        {ART.map((name, index) => <figure key={name} className={styles.slide}>
          <figcaption>{copy.labels[index]}</figcaption>
          <div className={styles.mobileArt}><Image src={`/media/showcase/${name}_l.webp`} alt={copy.labels[index]} fill sizes="280px" /></div>
        </figure>)}
      </div>
    </div>
  </section>;
}
