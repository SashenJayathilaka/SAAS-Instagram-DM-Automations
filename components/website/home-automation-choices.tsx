import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { Workflow, Zap } from "lucide-react";
import { dashboardEntryPath } from "@/lib/dashboard";
import { getServerLocale } from "@/lib/i18n/server";
import { HOME_AUTOMATION_CHOICES } from "@/lib/i18n/home-automation-choices";
import styles from "./home-automation-choices.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export default function HomeAutomationChoices() {
  const locale = getServerLocale();
  const copy = HOME_AUTOMATION_CHOICES[locale];
  return (
    <section id="automation-options" className={`${styles.section} ${inter.className}`} aria-labelledby="automation-options-title" lang={locale}>
      <div className={styles.container}>
        <header className={styles.heading}>
          <h2 id="automation-options-title">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </header>
        <div className={styles.cards}>
          {copy.cards.map((card, index) => {
            const flow = index === 1;
            const Icon = flow ? Workflow : Zap;
            return (
              <article key={index} className={styles.card}>
                <div className={styles.preview}>
                  <Image src={`/images/home/${flow ? "flow-builder" : "basic-automation"}.webp`} alt={card.alt} width={flow ? 1756 : 1758} height={flow ? 735 : 910} sizes="(min-width: 1024px) 413px, (min-width: 535px) 413px, calc(100vw - 98px)" />
                </div>
                <div className={styles.details}>
                  <div className={styles.cardHeading}><h3>{card.title}</h3><p>{card.subtitle}</p></div>
                  <Link href={dashboardEntryPath(flow ? "/automation/new?type=flow" : "/automation")} prefetch={false} className={`${styles.button} ${flow ? styles.flowButton : styles.basicButton}`}>
                    <Icon size={20} aria-hidden="true" /><span>{card.cta}</span>
                  </Link>
                  <ul>{card.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
