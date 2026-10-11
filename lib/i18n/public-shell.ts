import copy from './public-shell-copy.json';
import type { Locale } from './config';

// Generated from reviewed translations; regenerate after changing public labels:
// npx tsx scripts/generate-public-shell-copy.ts
export function translatePublicShell(source: string, locale: Locale): string {
  if (locale === 'en') return source;
  const key = source.replace(/\s+/g, ' ').trim();
  const translated = (copy[locale] as Record<string, string>)[key];
  if (!translated) return source;
  return `${source.match(/^\s*/)?.[0] ?? ''}${translated}${source.match(/\s*$/)?.[0] ?? ''}`;
}
