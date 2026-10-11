import { ImageResponse } from 'next/og';
import { createElement } from 'react';

export const runtime = 'edge';
/** Bounded, text-only fallback for new CMS posts. Existing articles use local WebP. */
export async function GET(request: Request) {
  const title = new URL(request.url).searchParams.get('title')?.trim().slice(0, 160);
  if (!title) return new Response('Article title required', { status: 400 });
  return new ImageResponse(
    createElement('div', {
      style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#151120', borderTop: '8px solid #8b5cf6', padding: '64px', color: '#fbf8ff', fontFamily: 'sans-serif' },
    },
    createElement('div', { style: { display: 'flex', color: '#c4b5fd', fontSize: 27, marginBottom: 62 } }, 'AP3K  /  FIELD NOTES'),
    createElement('div', { style: { display: 'flex', fontSize: title.length > 95 ? 48 : 60, lineHeight: 1.14, fontWeight: 700, maxWidth: 1050 } }, title),
    createElement('div', { style: { display: 'flex', marginTop: 'auto', color: '#b9adc9', fontSize: 25 } }, 'Practical Instagram automation guides')),
    { width: 1200, height: 675, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' } },
  );
}
