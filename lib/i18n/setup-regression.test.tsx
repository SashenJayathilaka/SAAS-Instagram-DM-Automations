vi.mock("next/font/google", () => ({ Inter: () => ({className:"font-inter"}) }));
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SUPPORTED_LOCALES, type Locale } from "./config";
import { SETUP_ROWS } from "./setup-copy";
import { translateUi } from "./translate";
import WizardPage from "@/components/automations/automation-setup-page";
import MessageAutomationPreview from "@/components/automations/message-automation-preview";
import type { WizardData, WizardStep } from "@/hooks/use-wizard";

let locale: Locale = "en";
let step: WizardStep = 1;
const data: WizardData = {
  campaignName: "Save こんにちは", post: { postid: "ANY", media: "", mediaType: "IMAGE", caption: "Any post - triggers on all Instagram posts" },
  triggerMode: "SPECIFIC_KEYWORD", keywords: ["hello こんにちは"], matchingMode: "CONTAINS",
  publicReplyEnabled: true, publicReply: "Keep my reply unchanged", publicReply2: "", publicReply3: "",
  sendPrivateDm: true, dmMessage: "Keep my DM unchanged", linkButtons: [{ label: "Save", url: "https://example.com" }],
  openingDmEnabled: true, openingDmText: "Keep my opener", openingDmButtonText: "Continue",
  followGateRequired: true, followRequestDmText: "Keep my follow request", followRequestButtonText: "Following",
  aiReplyEnabled: false, aiReplyTone: "FRIENDLY", aiReplyInstructions: "", aiProtectionRules: {} as WizardData["aiProtectionRules"], active: true,
};
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({children}: any) => <>{children}</>, DialogContent: ({children}: any) => <section>{children}</section>, DialogTitle: ({children}: any) => <h1>{children}</h1>, DialogDescription: ({children}: any) => <p>{children}</p> }));
vi.mock("@/components/global/language-switcher", () => ({default:()=>null}));
vi.mock("@/components/global/theme-toggle", () => ({default:()=>null}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/actions/automation", () => ({ saveMessageAutomation: vi.fn() }));
vi.mock("@/actions/ai-workspace", () => ({ getAiWorkspace: vi.fn() }));
vi.mock("@/hooks/use-wizard", () => ({ useWizard: () => ({ step, data, update: vi.fn(), next: vi.fn(), back: vi.fn(), goTo: vi.fn(), canAdvance: () => true, activate: vi.fn(), isSubmitting: false, error: null }) }));
vi.mock("@/hooks/user-queries", () => ({
  useQueryAutomationPosts: () => ({ data: { data: { data: [] } } }), useQueryWebhookHealth: () => ({}), useQueryAutomations: () => ({}),
  useQueryUser: () => ({ data: { data: { integrations: [{ id: "fixture", name: "INSTAGRAM", token: "fixture", instagramUsername: "boudofi" }], subscription: { plan: "FREE" } } } }),
}));
vi.mock("@/lib/app-review-mode", () => ({ isAppReviewMode: () => true }));
vi.mock("@/lib/messaging-review-mode", () => ({ isMessagingReviewMode: () => false, applyMessagingReviewCampaignDefaults: (value: unknown) => value }));
const plain = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

describe("automation setup localization", () => {
  it("keeps complete catalogs and substitution tokens in all supported languages", () => {
    expect(new Set(SETUP_ROWS.map(r => r[0])).size).toBe(SETUP_ROWS.length);
    for (const row of SETUP_ROWS) {
      expect(row).toHaveLength(5);
      const tokens = row[0].match(/\{\w+\}/g)?.sort() ?? [];
      for (const text of row) { expect(text.trim()).not.toBe(""); expect(text.match(/\{\w+\}/g)?.sort() ?? []).toEqual(tokens); }
    }
  });
  it("renders the accordion editor in every language without translating customer content", () => {
    for (locale of SUPPORTED_LOCALES) {
      const html=renderToStaticMarkup(<WizardPage params={{slug:"fixture"}} searchParams={{type:"comment"}}/>);
      const text=plain(html);
      for (const heading of ["Setup Triggers and Public Reply","Setup Direct Message"]) {
        expect(text).toContain(translateUi(heading,locale));
        if(locale!=="en")expect(text).not.toContain(heading);
      }
      expect(html).toContain('value="Save こんにちは"');
      expect(html).not.toContain("Review &amp; Activate");
    }
  });
  it("renders the actual type picker and both message entry screens without English headings", () => {
    for (locale of SUPPORTED_LOCALES) {
      const picker = plain(renderToStaticMarkup(<WizardPage params={{ slug: "fixture" }} />));
      for (const label of ["New automation"]) expect(picker).toContain(translateUi(label, locale));
      expect(picker).not.toContain("Start from scratch");
      for (const type of ["story", "dm"]) {
        const text = plain(renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><WizardPage params={{ slug: "fixture" }} searchParams={{ type }} /></QueryClientProvider>));
        const heading = "Setup Triggers";
        expect(text).toContain(translateUi(heading, locale));
        if (locale !== "en") expect(text).not.toContain(heading);
      }
    }
  });
  it("translates generated preview events while preserving customer messages, keywords and button labels", () => {
    for (locale of SUPPORTED_LOCALES) {
      const html = renderToStaticMarkup(<MessageAutomationPreview source="DM" step={2} trigger="MENTION" triggerMode="SPECIFIC_KEYWORD" keywords={["hello こんにちは"]} message="Keep my DM unchanged" linkButtons={[{ label: "Save", url: "https://example.com" }]} followGateRequired followRequestDmText="Keep my follow request" followRequestButtonText="Following" />);
      expect(html).toContain("hello こんにちは"); expect(html).toContain("Keep my DM unchanged"); expect(html).toContain("Keep my follow request"); expect(html).toContain('dir="auto"');
      expect(plain(html)).toContain(translateUi("Follow", locale));
    }
  });
});
