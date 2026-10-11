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
          sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 960px) 50vw, 800px"
          priority={priority}
          className={post.cover ? "!object-contain" : undefined}
        />
      </div>
      {credit && image.src.startsWith("/images/blog/editorial/") && (
        <figcaption className={s.credit}>Original AP3K editorial illustration</figcaption>
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
