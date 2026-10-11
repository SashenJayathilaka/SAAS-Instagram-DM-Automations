"use client";

import localFont from "next/font/local";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/providers/i18n-provider";
import { HOME_SETUP_COPY } from "@/lib/i18n/home-setup";
import styles from "./home-setup.module.css";

const geist = localFont({ src: "../../public/fonts/geist/Geist-Variable.woff2", weight: "100 900", display: "swap" });
const ANGLES = [-2, 1, -1];

export default function HomeSetup({ locale: fixedLocale, comparison = false }: { locale?: "en"; comparison?: boolean } = {}) {
  const { locale: selectedLocale } = useI18n();
  const locale = fixedLocale ?? selectedLocale;
  const baseCopy = HOME_SETUP_COPY[locale];
  const copy = comparison ? { ...baseCopy, cards: [
    { title: "Choose the trigger", description: "Pick an eligible post comment, Story interaction or incoming DM." },
    { title: "Build your response", description: "Write the message and add the destination your audience requested." },
    { title: "Test the full journey", description: "Review and publish deliberately, then test from another Instagram account." },
  ] } : baseCopy;
  const reduced = useReducedMotion();
  const labels = [copy.trigger, "share-link.com", comparison ? "Preview → Test" : "❤️ 9K · 💬 2K"];

  return <section id="automation-setup" className={`${styles.section} ${geist.className}`} lang={locale} aria-labelledby="automation-setup-title">
    <div className={styles.container}>
      <h2 id="automation-setup-title" className={styles.title}>
        {copy.title[0]}<br />
        <span className={styles.highlight}><span>{copy.title[1]}</span></span><br />
        {copy.title[2]}
      </h2>
      <p className={styles.description}>{copy.description}</p>
      <ol className={styles.cards}>
        {copy.cards.map((card, index) => <motion.li key={index} className={styles.card}
          initial={reduced ? false : { opacity: 0, y: 30, rotate: ANGLES[index] }}
          whileInView={{ opacity: 1, y: 0, rotate: ANGLES[index] }}
          viewport={{ once: true, amount: .2 }}
          transition={{ duration: reduced ? 0 : .6, delay: reduced ? 0 : index * .15, ease: "easeOut" }}>
          <div aria-hidden="true" className={`${styles.badge} ${styles[`badge${index + 1}`]}`}>{labels[index]}</div>
          <div className={styles.number} aria-hidden="true">{index + 1}</div>
          <h3>{card.title}</h3>
          <p>{card.description}</p>
        </motion.li>)}
      </ol>
    </div>
  </section>;
}
