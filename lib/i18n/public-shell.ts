import copy from './public-shell-copy.json';
import type { Locale } from './config';

const localizedCopy = copy as Partial<Record<Locale, Record<string, string>>>;

// Generated from reviewed translations; regenerate after changing public labels:
// npx tsx scripts/generate-public-shell-copy.ts
export function translatePublicShell(source: string, locale: Locale): string {
  if (locale === 'en') return source;
  const key = source.replace(/\s+/g, ' ').trim();
  const translated = localizedCopy[locale]?.[key];
  if (!translated) return source;
  return `${source.match(/^\s*/)?.[0] ?? ''}${translated}${source.match(/\s*$/)?.[0] ?? ''}`;
}
