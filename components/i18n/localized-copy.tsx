"use client";

import { type ReactNode } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { localizeCopyTree } from "@/lib/i18n/localize-copy-tree";
export { localizeCopyTree } from "@/lib/i18n/localize-copy-tree";

export default function LocalizedCopy({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <>{localizeCopyTree(children, locale)}</>;
}

// Safe for a single UI label; the caller explicitly excludes user content.
export function UiText({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  return <>{localizeCopyTree(children, locale)}</>;
}
