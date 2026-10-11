import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HOME_FAQ } from '@/lib/i18n/home-faq';
import { SUPPORTED_LOCALES } from '@/lib/i18n/config';
import HomeFaq from './home-faq';

const state = vi.hoisted(() => ({ locale: 'en' as 'en' | 'fr' | 'es' | 'de' | 'pt' }));
vi.mock('next/font/google', () => ({ Inter: () => ({ className: 'font-inter' }) }));
vi.mock('@/providers/i18n-provider', () => ({ useI18n: () => ({ locale: state.locale }) }));

describe('homepage FAQ progressive enhancement', () => {
  for (const locale of SUPPORTED_LOCALES) {
    it(`server-renders every ${locale} answer inside a native disclosure`, () => {
      state.locale = locale;
      const html = renderToStaticMarkup(<HomeFaq />);
      const copy = HOME_FAQ[locale];
      expect(html.match(/<details\b/g)).toHaveLength(copy.items.length);
      expect(html.match(/<summary\b/g)).toHaveLength(copy.items.length);
      expect(html).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/);
      for (const [question, answer] of copy.items) {
        const questionHtml = renderToStaticMarkup(<span>{question}</span>);
        const answerText = renderToStaticMarkup(<div>{answer}</div>).slice(5, -6);
        expect(html).toContain(questionHtml);
        expect(html).toContain(answerText);
      }
    });
  }
});
