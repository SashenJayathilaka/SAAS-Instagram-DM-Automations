"use client";

import { useCallback } from 'react';
import { useI18n } from '@/providers/i18n-provider';
import { translatePublicShell } from '@/lib/i18n/public-shell';

export function usePublicUi() {
  const { locale } = useI18n();
  return useCallback((source: string) => translatePublicShell(source, locale), [locale]);
}
