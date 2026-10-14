import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Locale } from "./config";
import { FULLY_TRANSLATED_LOCALES } from "./config";

const state = vi.hoisted(() => ({ locale: "en" as Locale, tab: "Knowledge" }));
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: state.locale }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/ai-workspace", () => ({}));
vi.mock("react", async (original) => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "Overview" ? state.tab : initial) };
});
import Ap3kAiConsole from "@/components/ai/ap3k-ai-console";
import { LocalizedInput, LocalizedTextarea } from "@/components/i18n/localized-controls";

const profile = { aiRepliesEnabled: false, aiCommentsEnabled: false, role: "", brandVoice: "", guardrails: "", defaultTone: "FRIENDLY" as const, protectionRules: { INSULTS_HATE: "SKIP", CRITIQUE_NEGATIVE: "SKIP", UNANSWERABLE: "SKIP", BEGGING_SOLICITATION: "SKIP" } as const, knowledge: [] };

describe("AI localization without changing business knowledge", () => {
  it("renders every AI panel in all supported languages", () => {
    const labels = { Overview: "AI reply setup", Knowledge: "No knowledge yet", Behavior: "Default tone", Playground: "Your conversation is saved. Tests count toward the monthly AI limit." };
    for (const [tab, label] of Object.entries(labels)) {
      state.tab = tab;
      for (const locale of FULLY_TRANSLATED_LOCALES) {
        state.locale = locale;
        const html = renderToStaticMarkup(<Ap3kAiConsole slug="test" initial={profile} plan="PRO" />);
        expect(html.includes(label), `${locale}/${tab}`).toBe(locale === "en");
        expect(html).not.toMatch(/ZXQ|ZXXQ|ZQQ/);
      }
    }
  });
  it("preserves saved customer text and restores English placeholders", () => {
    const value = "Knowledge こんにちは — Save changes";
    for (const locale of ["de", "fr", "en", "pt", "en"] as Locale[]) {
      state.locale = locale;
      const html = renderToStaticMarkup(<><LocalizedInput value={value} readOnly placeholder="Pricing, delivery, course details…" /><LocalizedTextarea value={value} readOnly placeholder="Ask a customer question…" /></>);
      expect(html).toContain(value);
      expect(html.includes('placeholder="Pricing, delivery, course details…"')).toBe(locale === "en");
      state.tab = "Knowledge";
      const knowledge = renderToStaticMarkup(<Ap3kAiConsole slug="test" initial={{ ...profile, knowledge: [{ id: "note-1", title: "Save changes", content: value }] }} plan="PRO" />);
      expect(knowledge).toContain(value);
      expect(knowledge).toContain(">Save changes</h3>");
    }
  });
});
