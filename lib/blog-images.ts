import importedCovers from "./content/imported-blog/covers.json";
import editorialSlugs from "./content/editorial-october-slugs.json";
import { getEditorialPhoto } from "./blog-photography";
import type { BlogPost } from './blog';
import { TUTORIAL_SCREENSHOTS, tutorialImageSrc } from './tutorial-content';
import covers from './content/blog-cover-manifest.json';

export type ArticleImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit?: string;
  source?: string;
};
export function getArticleImage(
  post: Pick<BlogPost, 'slug' | 'title' | 'visual' | 'cover'>,
): ArticleImage {
  if (post.cover) {
    const image = TUTORIAL_SCREENSHOTS[post.cover];
    return {
      src: tutorialImageSrc(post.cover),
      alt: image.caption,
      width: image.width,
      height: image.height,
    };
  }
  const imported = (importedCovers as Record<string, ArticleImage>)[post.slug];
  if (Object.prototype.hasOwnProperty.call(importedCovers, post.slug)) return imported;
  const cover = Object.prototype.hasOwnProperty.call(covers, post.slug)
    ? (covers as Record<string, { src: string; alt: string }>)[post.slug]
    : undefined;
  if (cover) return { ...cover, width: 1200, height: 675 };
  if (editorialSlugs.includes(post.slug)) return getEditorialPhoto(post);
  // Newly published CMS articles get their own safe title cover until an editor
  // adds the article to the reviewed diagram catalogue. No unrelated stock photo.
  return {
    src: `/api/blog-cover?title=${encodeURIComponent(post.title.slice(0, 160))}`,
    alt: `AP3K article: ${post.title}`,
    width: 1200,
    height: 675,
  };
}
export const articleImageUrl = (image: ArticleImage) =>
  image.src.startsWith('https://') ? image.src : `https://ap3k.com${image.src}`;
