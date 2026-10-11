"use client";

import { Inter } from "next/font/google";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/providers/i18n-provider";
import { HOME_FAQ } from "@/lib/i18n/home-faq";
import styles from "./home-faq.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function HomeFaq() {
  const { locale } = useI18n();
  const copy = HOME_FAQ[locale];
  return <section id="faq" aria-labelledby="home-faq-title" className={`${styles.section} ${inter.className}`}>
    <div className={styles.container}>
      <header className={styles.heading}>
        <p>{copy.eyebrow}</p>
        <h2 id="home-faq-title">{copy.title}</h2>
      </header>
      {/* Native disclosure keeps every answer in the initial HTML and works without hydration. */}
      <div className={styles.questions}>
        {copy.items.map(([question, answer], index) => <details key={index} className={styles.item}>
          <summary className={styles.trigger}><span>{question}</span><ChevronDown aria-hidden="true" /></summary>
          <div className={styles.answer}>{answer}</div>
        </details>)}
      </div>
      <div className={styles.trust}>
        <p>{copy.trust}</p>
      </div>
    </div>
  </section>;
}
