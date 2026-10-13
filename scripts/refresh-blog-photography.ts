import { readFile, writeFile } from 'node:fs/promises';
import { BLOG_POSTS } from '../lib/blog';
import imported from '../lib/content/imported-blog/index.json';
import { getEditorialPhoto } from '../lib/blog-photography';

// Retain instructional /images/docs captures and remove repeated decorative photos.
async function main() {
  const covers: Record<string, ReturnType<typeof getEditorialPhoto>> = {};
  let removed = 0;
  for (const source of imported) {
    covers[source.slug] = getEditorialPhoto(BLOG_POSTS.find(p => p.slug === source.slug) ?? source);
    const path = `lib/content/imported-blog/${source.slug}.html`;
    const decorative = /<img\b[^>]*src="\/images\/blog\/(?:imported|original)\/[^" ]+"[^>]*>/g;
    let html = await readFile(path, 'utf8');
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/g, figure => {
      if (!figure.includes('/images/blog/original/') && !figure.includes('/images/blog/imported/')) return figure;
      if (figure.includes('/images/docs/')) return figure;
      removed += [...figure.matchAll(decorative)].length;
      return '';
    });
    html = html.replace(decorative, () => { removed++; return ''; });
    await writeFile(path, html.trimEnd() + '\n');
  }
  await writeFile('lib/content/imported-blog/covers.json', JSON.stringify(covers, null, 2) + '\n');
  console.log({ removed, importedCovers: Object.keys(covers).length });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
