"use client";
import { MentionText } from "./mention-text";
import type { ReactNode } from "react";
import { Link2 } from "lucide-react";
import styles from "./editor-preview.module.css";

type PreviewLink = { label: string; url: string };
export default function InstagramPreviewMessage({
  text,
  incoming,
  notice,
  image,
  cards,
  links,
  options,
  onReply,
  onLink,
  avatar,
  username,
  children,
}: {
  text: string;
  incoming?: boolean;
  notice?: boolean;
  image?: string;
  cards?: {
    title: string;
    subtitle: string;
    image: string;
    links: PreviewLink[];
  }[];
  links?: PreviewLink[];
  options?: string[];
  onReply?: (text: string) => void;
  onLink?: () => void;
  avatar?: string | null;
  username?: string | null;
  children?: ReactNode;
}) {
  if (notice)
    return (
      <p className={styles.interaction} dir="auto">
        {text}
      </p>
    );
  const linkButton = (link: PreviewLink, index: number) => (
    <button
      type="button"
      key={index}
      className={styles.button}
      onClick={onLink}
      disabled={!onLink}
      title={link.url || undefined}
    >
      <Link2 size={12} />
      <bdi>{link.label || "Get the Link"}</bdi>
    </button>
  );
  return (
    <div className={incoming ? styles.outboundRow : styles.messageRow}>
      {!incoming && (
        <span className={styles.messageAvatar}>
          <span className={styles.avatar}>
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              (username?.replace(/^@/, "") || "A").slice(0, 1).toUpperCase()
            )}
          </span>
        </span>
      )}
      <div className={incoming ? styles.outbound : styles.message}>
        {image && (
          <img
            className={styles.flowProduct}
            src={image}
            alt="Product preview"
          />
        )}
        {text && <p dir="auto"><MentionText text={text}/></p>}
        {cards && (
          <div className={styles.carousel} aria-label="Preview carousel cards">
            {cards.map((card, index) => (
              <article className={styles.carouselCard} key={index}>
                {card.image && (
                  <img src={card.image} alt={card.title || "Product preview"} />
                )}
                <strong dir="auto">{card.title || "Product title"}</strong>
                <small dir="auto">{card.subtitle}</small>
                {card.links.map(linkButton)}
              </article>
            ))}
          </div>
        )}
        {links?.map(linkButton)}
        {options?.map((label, index) => (
          <button
            key={index}
            type="button"
            className={styles.button}
            disabled={!onReply}
            onClick={() => onReply?.(label)}
            dir="auto"
          >
            {label}
          </button>
        ))}
        {children}
      </div>
    </div>
  );
}
