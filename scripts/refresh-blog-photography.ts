import { readFile, writeFile } from 'node:fs/promises';
import { BLOG_POSTS } from '../lib/blog';
import imported from '../lib/content/imported-blog/index.json';
import { editorialPhoto, getEditorialPhoto, type EditorialPhotoTheme } from '../lib/blog-photography';

// Migration of trusted bundled HTML; real /images/docs instructional captures stay intact.
async function main() {
  const covers: Record<string, ReturnType<typeof getEditorialPhoto>> = {};
  const companion: Record<EditorialPhotoTheme, EditorialPhotoTheme[]> = {
    commerce: ['conversation', 'analytics', 'laptop'], creator: ['creator-mobile', 'planning', 'conversation'],
    photography: ['planning', 'conversation', 'laptop'], fitness: ['conversation', 'planning', 'support'],
    analytics: ['agency', 'planning', 'laptop'], planning: ['creator', 'agency', 'laptop'],
    support: ['planning', 'conversation', 'laptop'], conversation: ['creator', 'support', 'laptop'],
    educator: ['creator', 'planning', 'conversation'], agency: ['analytics', 'planning', 'support'],
    'creator-mobile': ['creator', 'conversation', 'planning'], laptop: ['agency', 'support', 'conversation'],
  };
  let replaced = 0;
  for (const source of imported) {
    const post = BLOG_POSTS.find(p => p.slug === source.slug) ?? source;
    const cover = getEditorialPhoto(post);
    const theme = cover.src.split('/ap3k-')[1].replace('.webp', '') as EditorialPhotoTheme;
    covers[source.slug] = cover;
    const path = `lib/content/imported-blog/${source.slug}.html`;
    let ordinal = 0;
    let html = (await readFile(path, 'utf8')).replace(/<img\b[^>]*>/g, tag => {
      if (!/\/images\/blog\/(imported|original)\//.test(tag)) return tag;
      const image = editorialPhoto(companion[theme][ordinal++ % companion[theme].length]);
      replaced++;
      return `<img alt="${image.alt}" decoding="async" loading="lazy" width="1600" height="900" src="${image.src}" srcset="${image.src.replace('.webp','-800.webp')} 800w, ${image.src} 1600w" sizes="(max-width: 800px) calc(100vw - 40px), 800px"/>`;
    });
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/g, figure => figure.includes('/images/blog/original/')
      ? figure.replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/g, '<figcaption>Original AI-generated AP3K editorial image.</figcaption>') : figure);
    await writeFile(path, html);
  }
  await writeFile('lib/content/imported-blog/covers.json', JSON.stringify(covers, null, 2)+'\n');
  console.log({ replaced, importedCovers: Object.keys(covers).length });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
