"use client";

import { useCallback } from "react";
import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";

// For explicit interface labels and placeholders, never customer-written data.
export function useUi() {
  const { locale } = useI18n();
  return useCallback((source: string) => translateUi(source, locale), [locale]);
}
