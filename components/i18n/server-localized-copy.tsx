import 'server-only';
import type { ReactNode } from 'react';
import { getServerLocale } from '@/lib/i18n/server';
import { localizeCopyTree } from '@/lib/i18n/localize-copy-tree';

/** Translate static page copy without shipping the full catalog to the browser. */
export default function ServerLocalizedCopy({ children }: { children: ReactNode }) {
  return <>{localizeCopyTree(children, getServerLocale())}</>;
}
