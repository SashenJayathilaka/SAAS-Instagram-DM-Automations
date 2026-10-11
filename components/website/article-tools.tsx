import { Facebook, Linkedin } from 'lucide-react';
import icons from '@/lib/content/imported-blog/summary-icons.json';
import styles from './blog-editorial.module.css';

export function ArticleSummary({ slug }: { slug: string }) {
  const prompt = encodeURIComponent(`Summarize this page and list the key takeaways: https://ap3k.com/blog/${slug}`);
  const tools = [
    ['ChatGPT', `https://chatgpt.com/?q=${prompt}`],
    ['Gemini', `https://www.google.com/search?udm=50&q=${prompt}`],
    ['Claude', `https://claude.ai/new?q=${prompt}`],
    ['Perplexity', `https://www.perplexity.ai/search/new?q=${prompt}`],
    ['Grok', `https://grok.com/?q=${prompt}`],
  ];
  return <aside className={styles.summaryTools} aria-label="Summarize this article">
    <span>Summarize with</span>
    <div>{tools.map(([name, href]) => <a key={name} href={href} target="_blank" rel="nofollow noopener noreferrer">
      <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: (icons as Record<string, string>)[name] || '' }} />{name}
    </a>)}</div>
  </aside>;
}

export function ArticleShare({ slug, title }: { slug: string; title: string }) {
  const url = encodeURIComponent(`https://ap3k.com/blog/${slug}`);
  return <section className={styles.shareTools} aria-label="Share this article">
    <p>SHARE THIS ARTICLE</p>
    <div>
      <a href={`https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent(title)}`} aria-label="Share on X (Twitter)" target="_blank" rel="noopener noreferrer">𝕏</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} aria-label="Share on Facebook" target="_blank" rel="noopener noreferrer"><Facebook size={20} /></a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} aria-label="Share on LinkedIn" target="_blank" rel="noopener noreferrer"><Linkedin size={20} /></a>
    </div>
  </section>;
}
