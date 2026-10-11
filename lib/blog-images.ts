import { getEditorialPhoto } from "./blog-photography";
import type { BlogPost } from './blog';

export type ArticleImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit?: string;
  source?: string;
};
/** Covers share a maintained original photo collection. Instructional screenshots stay in article sections. */
export function getArticleImage(post: Pick<BlogPost, 'slug' | 'title' | 'visual' | 'cover'>): ArticleImage {
  return getEditorialPhoto(post);
}
export const articleImageUrl = (image: ArticleImage) =>
  image.src.startsWith('https://') ? image.src : `https://ap3k.com${image.src}`;
