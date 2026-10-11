import Image from "next/image";
import type { BlogPost } from "@/lib/blog";
import { getArticleImage } from "@/lib/blog-images";
import s from "./public-pages.module.css";
export default function BlogCover({
  post,
  priority = false,
  credit = false,
}: {
  post: Pick<BlogPost, "slug" | "title" | "visual" | "cover">;
  priority?: boolean;
  credit?: boolean;
}) {
  const image = getArticleImage(post);
  return (
    <figure>
      <div className={s.cover} style={credit ? { aspectRatio: `${image.width} / ${image.height}`, borderRadius: 26 } : undefined}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={credit ? "(max-width: 940px) calc(100vw - 40px), 900px" : "(max-width: 900px) calc(100vw - 40px), 420px"}
          priority={priority}
        />
      </div>
      {credit && image.src.startsWith("/images/blog/original/") && (
        <figcaption className={s.credit}>Original AI-generated AP3K editorial image</figcaption>
      )}
      {credit && image.credit && (
        <figcaption className={s.credit}>
          Photo by{" "}
          <a href={image.source} target="_blank" rel="noopener noreferrer">
            {image.credit} / Unsplash
          </a>
        </figcaption>
      )}
    </figure>
  );
}
