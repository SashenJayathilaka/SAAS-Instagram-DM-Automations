import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import CommentEditor, { type CommentEditorProps } from "./comment-editor";
import { PublicReplyComposer } from "./copy-composer";
import { useWizard, type WizardData } from "@/hooks/use-wizard";

vi.mock("next/font/google", () => ({ Inter: () => ({ className: "font-inter" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/i18n/use-ui", () => ({ useUi: () => (value: string) => value }));
vi.mock("@/providers/i18n-provider", () => ({ useI18n: () => ({ locale: "en" }) }));
vi.mock("@/actions/automation", () => ({ saveCampaign: vi.fn() }));
vi.mock("@/actions/automation-copy", () => ({ generateAutomationCopyAction: vi.fn() }));

function initialDraft(automationId?: string, templateId?: string) {
  let draft: WizardData | undefined;
  function Probe() { draft = useWizard("owner", automationId, "instagram", templateId).data; return null; }
  renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}><Probe /></QueryClientProvider>);
  return draft!;
}
function editor(overrides: Partial<CommentEditorProps> = {}) {
  const props: CommentEditorProps = {
    slug: "owner", data: initialDraft(), update: vi.fn(), onSave: vi.fn(), saving: false, error: null,
    editingActive: false, posts: [], postsLoading: false, postsFetching: false, refreshPosts: vi.fn(),
    connected: true, accountLoading: false, accountError: false, retryAccount: vi.fn(), followUpsReady: true,
    aiAvailable: false, paid: false, commentOnly: false, ...overrides,
  };
  return renderToStaticMarkup(<CommentEditor {...props} />);
}

describe("comment editor initial state and publication errors", () => {
  it("starts new comment drafts with a usable AI prompt without changing saved-automation hydration defaults", () => {
    expect(initialDraft()).toMatchObject({ aiReplyEnabled: true, publicReplyEnabled: false });
    expect(initialDraft().aiReplyInstructions).toContain("Username");
    expect(initialDraft("saved-automation")).toMatchObject({ aiReplyEnabled: false, publicReplyEnabled: false, aiReplyInstructions: "" });
  });
  it("initializes templates before the editor renders, without inheriting generic draft settings", () => {
    expect(initialDraft(undefined, "comment-leads")).toMatchObject({ campaignName: "Collect email/phone from comments", emailCaptureEnabled: true, phoneCaptureEnabled: true, openingDmEnabled: true, aiReplyEnabled: false });
    expect(initialDraft(undefined, "all-posts")).toMatchObject({ post: { postid: "ANY" }, triggerMode: "ANY_COMMENT" });
    expect(initialDraft("existing", "comment-leads").emailCaptureEnabled).toBe(false);
  });
  it("does not expose a delay control until enabled, but restores configured delays", () => {
    const fresh = editor();
    expect(fresh).toContain('aria-label="Enable delay" aria-checked="false"');
    expect(fresh).not.toContain("Add delay");
    const delayed = editor({ data: { ...initialDraft(), deliveryDelaySeconds: 120 } });
    expect(delayed).toContain('aria-label="Enable delay" aria-checked="true"');
    expect(delayed).toContain("2 minutes");
  });
  it("shows no preemptive upgrade message to a free user", () => {
    const html = editor();
    expect(html).not.toContain("AI only available on paid plans.");
    expect(html).not.toContain("Upgrade to Pro to publish AI replies");
    expect(html).toContain("AI auto reply");
  });
  it("renders the paid-plan error in the reply heading when publication is rejected", () => {
    expect(editor({ error: "AI only available on paid plans." })).toContain("AI only available on paid plans.");
  });
  it("keeps the prompt and samples available before publishing and marks a rejected prompt inline", () => {
    const props = {
      replies: [], onRepliesChange: vi.fn(), ai: true, prompt: "Thank Username warmly.",
      onPromptChange: vi.fn(), context: { integrationId: "instagram", available: true }, onPreview: vi.fn(),
    };
    const draft = renderToStaticMarkup(<PublicReplyComposer {...props} />);
    expect(draft).toContain("Regenerate prompt");
    expect(draft).toContain("Preview replies");
    expect(draft).not.toContain("AI only available on paid plans.");
    const rejected = renderToStaticMarkup(<PublicReplyComposer {...props} publishLocked />);
    expect(rejected).toContain('role="alert"');
    expect(rejected).toContain("AI only available on paid plans.");
  });
});
