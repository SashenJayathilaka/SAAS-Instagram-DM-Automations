"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import AP3KLogo from "@/components/global/ap3k-logo";
import { UiText } from "@/components/i18n/localized-copy";
import styles from "./automation-empty-state.module.css";

type ConversationMessage = { text: string; hold: number; avatar?: 1 | 2 | 3 };

// Transcribed and timed from the supplied 2026-10-01 recording (25 fps).
// hold is the time until the next entrance, including this row's transition.
const conversation: readonly ConversationMessage[] = [
  { text: "Hey, AP3K", avatar: 1, hold: 2960 },
  { text: "How can we help you?", hold: 2880 },
  { text: "how does this work?", avatar: 1, hold: 1480 },
  { text: "Pick a post and a keyword, that's it", hold: 2560 },
  { text: "Anyone who comments gets your link in DM", hold: 2680 },
  { text: "instantly?", avatar: 1, hold: 3200 },
  { text: "Or add a delay so it feels human", hold: 3160 },
  { text: "won’t every DM look the same?", avatar: 2, hold: 3560 },
  { text: "AI writes variations, so each one reads fresh", hold: 2840 },
  { text: "can I send a PDF?", avatar: 2, hold: 3200 },
  { text: "PDFs, images, even a voice note", hold: 3200 },
  { text: "can I take payment in the DM?", avatar: 2, hold: 3480 },
  { text: "Yes, Stripe checkout right inside the chat", hold: 3200 },
  { text: "my keywords keep missing people", avatar: 3, hold: 3560 },
  { text: "Switch to AI intent, it reads what they meant", hold: 2680 },
  { text: "Works in any language your audience writes in", hold: 3040 },
  { text: "what about story replies?", avatar: 3, hold: 3440 },
  { text: "Story replies and mentions, both covered", hold: 3200 },
  { text: "can I ask them to follow first?", avatar: 3, hold: 3480 },
  { text: "Add an Ask to follow step before the link", hold: 3200 },
  { text: "people DM me before commenting", avatar: 1, hold: 3600 },
  { text: "Conversation starter shows 4 one tap questions", hold: 3200 },
  { text: "I want a proper multi step flow", avatar: 1, hold: 3480 },
  { text: "Flow builder does that, or let AI build it", hold: 2720 },
  { text: "Describe the goal and it drafts the whole flow", hold: 3120 },
  { text: "can I split test two offers?", avatar: 2, hold: 3520 },
  { text: "Drop a randomizer node and split the traffic", hold: 3160 },
  { text: "worried about getting flagged", avatar: 3, hold: 3440 },
  { text: "Every send goes through a safety queue", hold: 2280 },
  { text: "Paced to stay inside Meta limits", hold: 2960 },
  { text: "ok setting one up now", avatar: 1, hold: 3000 },
  { text: "Takes about a minute 💫", hold: 2720 },
];

export default function AutomationEmptyState({ slug }: { slug: string }) {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) {
        timer = setTimeout(() => setStep((current) => current + 1), conversation[step % conversation.length].hold);
      }
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, [step, reducedMotion]);

  // Retain an extra, clipped row so the loop never clears the whole conversation.
  // Reduced motion shows the original explanatory exchange without cycling.
  const last = reducedMotion ? 3 : step;
  const first = reducedMotion ? 1 : Math.max(0, last - 3);
  const visible = Array.from({ length: last - first + 1 }, (_, offset) => first + offset);

  return <div className={styles.stage}>
    <section className={styles.card} aria-label="Create your first automation">
      <div className={styles.conversation} aria-hidden="true">
        <div className={styles.messages}>
          {visible.map((index) => {
            const message = conversation[index % conversation.length];
            return <motion.div
              key={index}
              className={styles.message}
              initial={reducedMotion ? false : { height: 0, opacity: 0, filter: "blur(6px)" }}
              animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`${styles.chat} ${message.avatar ? styles.customer : ""}`}>
                {!message.avatar && <AP3KLogo showText={false} markClassName="!h-8 !w-8 !rounded-full !shadow-none" />}
                <span className={styles.bubble}><UiText>{message.text}</UiText></span>
                {message.avatar && <Image src={`/images/preview/conversation-0${message.avatar}.png`} width={32} height={32} alt="" className={styles.avatar} />}
              </div>
            </motion.div>;
          })}
        </div>
      </div>
      <h2><UiText>Create your first automation</UiText></h2>
      <p><UiText>Create a new DM automation for your Instagram account</UiText></p>
      <div className={styles.actions}>
        <Link href={`/dashboard/${slug}/automation/new`} className={styles.create}><UiText>New automation</UiText><ArrowRight size={18} aria-hidden="true" /></Link>
        <Link href="/help" className={styles.docs}><BookOpen size={17} aria-hidden="true" /><UiText>Read docs</UiText></Link>
      </div>
    </section>
  </div>;
}
