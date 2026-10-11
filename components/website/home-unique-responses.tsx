"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Link2 } from "lucide-react";
import { Inter } from "next/font/google";
import { usePublicUi as useUi } from "@/components/i18n/use-public-ui";
import styles from "./home-unique-responses.module.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const examples = [
  { user: "thechefspecial_me", creator: "carlatseventy", customer: "thereal_evelyn", photo: "commenter", brandPhoto: "creator", dmPhoto: "customer", reply: "Thanks, @thechefspecial_me! Your link is waiting in your DMs 🙌", dm: "Hey! So glad you reached out 😊 Tap below to get the link you asked for." },
  { user: "maya.builds", creator: "yourbrand", customer: "maya.builds", photo: "", brandPhoto: "", dmPhoto: "", reply: "Hey @maya.builds, thanks for commenting! Just sent the link to your DMs ✨", dm: "Your link is ready! ✨ I’ve sent it right here. Tap below and enjoy!" },
  { user: "thechefspecial_me", creator: "carlatseventy", customer: "thereal_evelyn", photo: "commenter", brandPhoto: "creator", dmPhoto: "customer", reply: "You got it, @thechefspecial_me! Check your inbox for the link 💜", dm: "Thanks for stopping by! 🙌 Here’s the link I promised. It’s all yours." },
];

function Avatar({ photo, brand = false }: { photo: string; brand?: boolean }) {
  return photo
    // Small local photos are used in the reference's Instagram conversation cards.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={`/images/unique-responses/${photo}.webp`} width={28} height={28} alt="" loading="lazy" className={styles.avatar} />
    : <span className={`${styles.avatar} ${brand ? styles.brandAvatar : styles.gradientAvatar}`} />;
}

export default function HomeUniqueResponses() {
  const tr = useUi();
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { amount: 0.15 });
  const reducedMotion = useReducedMotion();
  const [frame, setFrame] = useState({ index: 0, characters: 0 });
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (!visible || reducedMotion || !pageVisible) return;
    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      // Reveal the commenter first, type the response, then hold before cycling.
      if (tick >= 160) {
        tick = 0;
        setFrame(previous => ({ index: (previous.index + 1) % examples.length, characters: 0 }));
      } else {
        setFrame(previous => {
          const limit = Math.max(tr(examples[previous.index].reply).length, tr(examples[previous.index].dm).length);
          const next = Math.min(limit, Math.max(0, tick - 20) * 2);
          return previous.characters === next ? previous : { ...previous, characters: next };
        });
      }
    }, 40);
    return () => window.clearInterval(timer);
  }, [visible, reducedMotion, pageVisible, tr]);

  const characters = reducedMotion ? Infinity : frame.characters;
  return (
    <section ref={ref} id="unique-responses" className={`${styles.section} ${inter.className}`} aria-labelledby="unique-responses-title">
      <div className={styles.container}>
        <header className={styles.heading}>
          <span className={styles.eyebrow}><i />{tr("Unique every time")}</span>
          <h2 id="unique-responses-title">{tr("Send a unique response to every commenter")}</h2>
          <p>{tr("Copy-pasted replies look automated. AP3K varies both the public reply and the DM, so every commenter feels personally answered.")}</p>
        </header>
        <div className={styles.grid}>
          {(["reply", "dm"] as const).map(kind => (
            <article key={kind} className={styles.panel}>
              <div className={styles.stage} aria-hidden="true">
                {examples.map((example, index) => {
                  const position = (index - frame.index + examples.length) % examples.length;
                  const active = position === 0;
                  const reply = tr(example.reply);
                  const dm = tr(example.dm);
                  return (
                    <div key={index} className={`${styles.card} ${styles[`position${position}`]}`}>
                      <div className={`${styles.cardContent} ${active ? styles.activeContent : ""}`}>
                        {kind === "reply" ? <div className={styles.commentCard}>
                          <div className={styles.commentRow}>
                            <Avatar photo={example.photo} />
                            <div className={styles.commentBody}>
                              <div className={styles.user}><b>{example.user}</b><span>2m</span></div>
                              <p>{tr("drop the link please! 🙌")}</p>
                              <div className={styles.commentActions}><span>{tr("Reply")}</span><span>{tr("Like")}</span></div>
                            </div><span className={styles.heart}>♡</span>
                          </div>
                          <div className={`${styles.commentRow} ${styles.replyRow}`}>
                            <Avatar photo={example.brandPhoto} brand />
                            <div className={styles.commentBody}>
                              <div className={styles.user}><b>{example.creator}</b><span className={styles.ai}>✦ AI</span></div>
                              <p className={styles.typed}>{reply.slice(0, characters).split(/(@[A-Za-z0-9_.]+)/g).map((part, i) => part.startsWith("@") ? <span key={i} className={styles.mention}>{part}</span> : part)}{characters < reply.length && <span className={styles.cursor} />}</p>
                            </div>
                          </div>
                        </div> : <>
                          <div className={styles.dmHeader}><span className={styles.back}>‹</span><Avatar photo={example.dmPhoto} /><div className={styles.dmUser}><b>{example.customer}</b><span>{tr("Active now")}</span></div><span className={styles.version}>v{index + 1} / 10+</span></div>
                          <div className={styles.dmBody}><p className={styles.bubble}>{dm.slice(0, characters)}{characters < dm.length && <span className={styles.cursor} />}</p><span className={`${styles.linkButton} ${characters >= dm.length ? styles.linkVisible : ""}`}><Link2 size={13} />{tr("Get the link")}</span></div>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.copy}>
                <h3>{tr(kind === "reply" ? "AI Auto Reply" : "DM Variations")}</h3>
                {kind === "reply" ? <p><strong>{tr("A fresh public reply for every comment")}</strong>{" - "}{tr("AI writes each one in its own words, with the commenter’s real username swapped in.")}</p>
                  : <p><strong>{tr("10+ versions, varied automatically")}</strong>{" - "}{tr("Write your own or generate with AI, so your replies don’t all sound the same.")}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
