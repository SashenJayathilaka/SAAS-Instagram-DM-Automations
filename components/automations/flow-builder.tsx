"use client";
import { useEffect, useRef, useState } from "react";
import PolicyScanDialog from "./policy-scan-dialog";
import { mapFlowPolicy, applyFlowPolicy } from "@/lib/automation-policy-input";
import type { PolicyScanInput } from "@/lib/automation-policy";
import BasicFlowEditor from "./basic-flow-editor";
import UpgradeDialog from "./upgrade-dialog";
import Sidebar from "@/components/global/sidebar";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Diamond,
  Eye,
  GitBranch,
  Loader2,
  Menu,
  Pencil,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { saveAutomationFlow } from "@/actions/automation/flow";
import { generateAutomationFlow } from "@/actions/automation/flow-assistant";
import {
  templateById,
  templateFlow,
  templatePreset,
} from "@/lib/automation-flow/templates";
import {
  readFlowTriggers,
  type FlowTrigger,
} from "@/lib/automation-flow/triggers";
import { prepareFlowCanvas } from "@/lib/automation-flow/layout";
import { type Flow, validateFlow } from "@/lib/automation-flow/definition";
import { refreshSavedAutomation } from "@/lib/automation-query-cache";
import FlowCanvas from "./flow-canvas";
import FlowPreview, { needsSeparateFlowOpening } from "./flow-preview";
import FlowTriggerEditor, { triggerLabel } from "./flow-trigger-editor";
import FlowNodeEditor, { newFlowNode, NODE_NAMES } from "./flow-node-editor";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  slug: string;
  integrationId: string;
  templateId?: string;
  automation?: any;
  posts?: any[];
  postsLoading?: boolean;
  postsError?: string;
  refreshPosts: () => void;
  plan?: string;
  username?: string | null;
  avatar?: string | null;
};
type Document = {
  flow: Flow;
  triggers: FlowTrigger[];
  name: string;
  opening: string;
  openingButton: string;
  publicReply: string;
  openingEnabled: boolean;
};
const suggestions = [
  "When someone comments GUIDE, collect their email and deliver my guide in the DM. Ask me to add the guide link.",
  "When someone messages CONSULT, ask about their goal, collect their email, and tag them as a consultation lead.",
  "Reply to story mentions with a thank-you message, then ask whether they want product advice or help with an order.",
];
export default function FlowBuilder({
  slug,
  integrationId,
  templateId,
  automation,
  posts = [],
  postsLoading,
  postsError,
  refreshPosts,
  plan = "FREE",
  username,
  avatar,
}: Props) {
  const search = useSearchParams();
  const router = useRouter();
  const [basic, setBasic] = useState(search.get("editor") === "basic");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (basic) return;
    // Escape the dashboard shell's stacking context for the fullscreen editor.
    const shell = document.querySelector<HTMLElement>(".ap3k-page");
    const wasInert = shell?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (shell) shell.inert = true;
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => {
      if (shell) shell.inert = wasInert;
      document.body.style.overflow = previousOverflow;
    };
  }, [basic]);
  const queryClient = useQueryClient();
  const template = templateById(templateId);
  const preset = templatePreset(templateId);
  const [doc, setDoc] = useState<Document>(() => {
    const saved = automation?.listener?.flowDraft;
    const source = automation?.source ?? preset.source;
    const original: Flow =
      automation?.listener?.flowDefinition ??
      (templateId
        ? templateFlow(templateId)
        : { version: 1, entry: "", oncePerContact: false, nodes: [] });
    return {
      flow: prepareFlowCanvas(saved?.flow ?? original),
      triggers:
        saved?.triggers ??
        readFlowTriggers(automation?.listener?.flowTriggers) ??
        (automation
          ? [
              {
                id: "primary",
                source,
                storyTrigger: automation.storyTriggerType ?? "REPLY",
                keyword: automation.keywords?.[0]?.word ?? "",
                anyMessage: automation.triggerMode !== "SPECIFIC_KEYWORD",
                post: automation.posts?.[0] ?? null,
                postScope:
                  automation.posts?.[0]?.postid === "ANY" ? "all" : "specific",
              },
            ]
          : templateId
            ? [
                {
                  id: "primary",
                  ...preset,
                  post:
                    preset.postScope === "all"
                      ? { postid: "ANY", media: "", mediaType: "IMAGE" }
                      : null,
                },
              ]
            : []),
      name:
        saved?.name ??
        automation?.name ??
        template?.name ??
        `Untitled ${new Date().toLocaleDateString("en-GB")}`,
      opening:
        saved?.opening ??
        automation?.listener?.openingDmText ??
        preset.opening ??
        "Thanks for your interest! Tap below to continue.",
      openingButton:
        saved?.openingButton ??
        automation?.listener?.openingDmButtonText ??
        preset.openingButton ??
        "Continue",
      publicReply:
        saved?.publicReply ?? automation?.listener?.commentReply ?? (preset.source === "COMMENT" ? "{{username}} Thanks! Check your DMs for the next step. ✨" : ""),
      openingEnabled:
        saved?.openingEnabled ??
        automation?.listener?.openingDmEnabled ??
        Boolean(preset.opening),
    };
  });
  const [expanded, setExpanded] = useState<string | null>("trigger");
  const [id, setId] = useState<string | undefined>(automation?.id);
  const idRef = useRef(id);
  const revision = useRef<number>(
    automation?.listener?.flowDraft?.revision ??
      automation?.listener?.flowRevision ??
      0,
  );
  const [dirty, setDirty] = useState(false);
  const edits = useRef(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [scanInput,setScanInput]=useState<PolicyScanInput|null>(null);
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const [live, setLive] = useState(Boolean(automation?.active));
  const [past, setPast] = useState<Document[]>([]);
  const [future, setFuture] = useState<Document[]>([]);
  const [triggerPanel, setTriggerPanel] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<string | undefined>();
  const [assistant, setAssistant] = useState(search.get("assistant") === "1");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const aiBusy = useRef(false);
  const chatScroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chatScroll.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [aiMessages, generating, assistant]);
  const [aiWarning, setAiWarning] = useState("");
  const [preview, setPreview] = useState(false);
  const change = (next: Document, history = true) => {
    if (history) {
      setPast((p) => [...p.slice(-49), doc]);
      setFuture([]);
    }
    setDoc(next);
    edits.current++;
    setDirty(true);
    setError("");
  };
  const patch = (p: Partial<Document>) => change({ ...doc, ...p });
  const changeFlow = (flow: Flow) => patch({ flow });
  const undo = () => {
    if (!past.length) return;
    setFuture((f) => [doc, ...f]);
    setDoc(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    edits.current++;
    setDirty(true);
  };
  const redo = () => {
    if (!future.length) return;
    setPast((p) => [...p, doc]);
    setDoc(future[0]);
    setFuture((f) => f.slice(1));
    edits.current++;
    setDirty(true);
  };
  async function save(publish: boolean, skipScan = false) {
    if (publish && !["PRO", "BUSINESS"].includes(plan)) {
      setUpgradeOpen(true);
      return;
    }
    if (busyRef.current) return;
    const seq = edits.current;
    if (publish) {
      const checked = validateFlow(doc.flow);
      if (!checked.flow) {
        setError(checked.errors.join(" "));
        return;
      }
    }
    if(publish && !skipScan) { setScanInput(mapFlowPolicy(doc,integrationId)); return; }
    busyRef.current = true;
    setBusy(true);
    setError("");
    const primary = doc.triggers[0] ?? {
      source: "DM" as const,
      storyTrigger: "REPLY" as const,
      keyword: "",
      anyMessage: true,
      post: null,
    };
    try {
      const result = await saveAutomationFlow({
        id: idRef.current,
        revision: revision.current,
        integrationId,
        name: doc.name || "Untitled flow",
        active: publish,
        source: primary.source,
        storyTrigger: primary.storyTrigger,
        keyword: primary.keyword,
        anyMessage: primary.anyMessage,
        post: primary.post ?? null,
        triggers: doc.triggers,
        openingEnabled: doc.openingEnabled,
        opening: doc.opening,
        openingButton: doc.openingButton,
        publicReply: doc.publicReply,
        flow: doc.flow,
      });
      if (result.status !== 200 || !result.id) {
        setError(result.error ?? "Could not save this flow.");
        return;
      }
      const firstSave = !idRef.current;
      idRef.current = result.id;
      setId(result.id);
      if (firstSave && window.location.pathname.endsWith("/automation/new")) {
        const url = new URL(window.location.href);
        url.searchParams.set("edit", result.id);
        url.searchParams.set("type", "flow");
        window.history.replaceState(window.history.state, "", url.toString());
      }
      revision.current = result.revision ?? revision.current + 1;
      if (seq === edits.current) setDirty(false);
      setSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
      if (publish) setLive(true);
      await refreshSavedAutomation(queryClient, result.id);
      if (publish) {
        router.push(`/dashboard/${slug}/automation?published=${encodeURIComponent(result.id)}`);
        router.refresh();
      }
    } catch {
      setError("Could not save your changes. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!dirty || busy || error || !integrationId) return;
    const timer = setTimeout(() => void save(false), 1400);
    return () => clearTimeout(timer);
  }, [doc, dirty, busy, error, integrationId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function ask(text = prompt) {
    if (!text.trim() || aiBusy.current) return;
    if (!["PRO", "BUSINESS"].includes(plan)) { setUpgradeOpen(true); return; }
    aiBusy.current = true;
    const requestedRevision = edits.current;
    setAssistant(true);
    setGenerating(true);
    setPrompt("");
    setAiWarning("");
    const history = aiMessages
      .slice(-6)
      .map((m) => ({ ...m, content: m.content.slice(0, 2000) }));
    setAiMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const result = await generateAutomationFlow({
        integrationId,
        prompt: text,
        currentFlow: doc.flow.nodes.length ? doc.flow : undefined,
        history,
        currentTriggers: doc.triggers,
      });
      if (result.status !== 200 || !result.flow) {
        setAiMessages((m) => [
          ...m,
          {
            role: "assistant",
            content:
              result.error ?? "The flow could not be generated. Try again.",
          },
        ]);
        return;
      }
      if (edits.current !== requestedRevision) {
        setAiMessages(m => [...m, { role: "assistant", content: "You edited the flow while I was working, so I kept your latest changes. Send your request again to apply it to the updated flow." }]);
        return;
      }
      const triggers = result.trigger
        ? [
            {
              id: doc.triggers[0]?.id ?? "primary",
              source: result.trigger.source,
              storyTrigger: result.trigger.storyTrigger ?? "REPLY",
              keyword: result.trigger.keyword,
              anyMessage: result.trigger.anyMessage,
              post: result.trigger.source === doc.triggers[0]?.source ? doc.triggers[0]?.post ?? null : null,
              postScope: result.trigger.postScope ?? (result.trigger.source === doc.triggers[0]?.source ? doc.triggers[0]?.postScope : "specific"),
              sharedPost: result.trigger.sharedPost ?? (result.trigger.source === "DM" && doc.triggers[0]?.source === "DM" ? doc.triggers[0]?.sharedPost : false),
            } as FlowTrigger,
            ...doc.triggers.slice(1),
          ]
        : doc.triggers;
      change({
        ...doc,
        flow: prepareFlowCanvas(result.flow),
        triggers,
        name: result.name || doc.name,
      });
      setAiMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            result.summary ??
            "Your flow is ready on the canvas. Review it before publishing.",
        },
      ]);
      setAiWarning(result.warnings?.join(" ") ?? "");
    } catch {
      setAiMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "The assistant could not connect. Your existing flow is unchanged.",
        },
      ]);
    } finally {
      aiBusy.current = false;
      setGenerating(false);
    }
  }
  const updateTrigger = (t: FlowTrigger) =>
    patch({ triggers: doc.triggers.map((x) => (x.id === t.id ? t : x)) });
  const addTrigger = (t: FlowTrigger) => {
    if (doc.triggers.length >= 10) return;
    patch({ triggers: [...doc.triggers, t] });
    setEditingTrigger(t.id);
  };
  const triggerSummary = doc.triggers.map((t) => ({
    id: t.id,
    label: triggerLabel(t),
    detail: t.sharedPost
      ? "Post or reel shared to your inbox"
      : t.source === "STORY"
        ? `Story ${t.storyTrigger.toLowerCase()}`
        : t.anyMessage
          ? t.source === "COMMENT"
            ? "Any comment"
            : "Any message"
          : `Keyword is ${t.keyword || "…"}`,
  }));
  const headerButton =
    "grid h-11 w-11 shrink-0 place-items-center rounded-lg text-slate-500 light:text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/5";
  const toolDialogs=<>
    {scanInput && <PolicyScanDialog open onOpenChange={open=>{if(!open)setScanInput(null);}} input={scanInput} slug={slug} onPublish={()=>{setScanInput(null);void save(true,true);}} onApply={findings=>{change(applyFlowPolicy(doc,findings));setScanInput(null);}}/>}
  </>;
  if (basic) return <>
    {toolDialogs}
    <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    <BasicFlowEditor doc={doc} patch={patch} slug={slug} username={username} avatar={avatar}
      busy={busy || generating} live={live} error={error} save={active => void save(active)}
      expanded={expanded} setExpanded={setExpanded} posts={posts} postsLoading={postsLoading}
      postsError={postsError} refreshPosts={refreshPosts} updateTrigger={updateTrigger}
      addTrigger={addTrigger} openFlow={() => setBasic(false)} />
  </>;
  if (!mounted) return null;
  return createPortal(
    <>
    {toolDialogs}
    <div
      className="flow-editor-shell font-sans fixed inset-x-0 top-0 h-[100dvh] z-40 flex flex-col bg-[#f5f5f5] text-slate-950 dark:bg-[#0d1421] dark:text-slate-100"
      onKeyDown={(e) => {
        if (e.key === "Escape") setTriggerPanel(false);
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key === "z" &&
          !["INPUT", "TEXTAREA", "SELECT"].includes(
            (e.target as HTMLElement).tagName,
          )
        ) {
          e.preventDefault();
          e.shiftKey ? redo() : undo();
        }
      }}
    >
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <Sidebar slug={slug} />
      <div className="flex h-full min-w-0 flex-col transition-[margin] lg:ml-[76px] lg:peer-data-[expanded=true]:ml-[232px]">
        <header className="flex min-h-[60px] shrink-0 items-center gap-2 border-b border-slate-100 light:border-slate-200 bg-white px-3 dark:border-white/5 dark:bg-[#111827] sm:gap-3 sm:px-5">
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation"
                className={`${headerButton} lg:hidden`}
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(320px,88vw)] p-0 pt-10">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar
                slug={slug}
                drawer
                onNavigate={() => setNavigationOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Link
            href={`/dashboard/${slug}/automation`}
            className="hidden whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 sm:block"
          >
            {basic ? "Automations" : "Flow builder"}
          </Link>
          <span className="hidden text-slate-500 light:text-slate-600 dark:text-slate-400 sm:block">
            /
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input
              aria-label="Automation name"
              value={doc.name}
              maxLength={120}
              onChange={(e) => patch({ name: e.target.value })}
              className="min-w-0 max-w-[340px] flex-1 bg-transparent text-base sm:text-sm font-semibold outline-none focus:rounded focus:ring-2 focus:ring-violet-400"
            />
            <Pencil
              size={13}
              className="hidden shrink-0 text-slate-500 light:text-slate-600 dark:text-slate-400 sm:block"
            />
            <span
              className={`hidden rounded-md px-2 py-0.5 text-[10px] font-medium sm:block ${live ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-50 text-amber-600 light:text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"}`}
            >
              {live ? "Active" : "Draft"}
            </span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <button
              aria-label="Undo"
              disabled={!past.length}
              onClick={undo}
              className={headerButton}
            >
              <Undo2 size={16} />
            </button>
            <button
              aria-label="Redo"
              disabled={!future.length}
              onClick={redo}
              className={headerButton}
            >
              <Redo2 size={16} />
            </button>
            <span
              role="status"
              className="mx-2 inline-flex min-w-24 items-center gap-1 text-[10px] text-slate-500 light:text-slate-600 dark:text-slate-400"
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : !dirty ? (
                <Check size={12} />
              ) : null}
              {busy
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : savedAt
                    ? `Saved at ${savedAt}`
                    : "Draft"}
            </span>
          </div>
          <button
            aria-label="Preview flow"
            onClick={() => setPreview(true)}
            className={headerButton}
          >
            <Eye size={17} />
          </button>
          <button
            aria-label="Save draft"
            aria-busy={busy}
            disabled={busy}
            onClick={() => void save(false)}
            className={headerButton}
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          </button>
          <button
            onClick={() => void save(true)}
            disabled={busy || generating}
            className="flow-primary-button h-11 shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 sm:px-4"
          >
            {busy ? "Saving…" : "Publish"}
          </button>
        </header>
        {error && (
          <div
            role="alert"
            className="flex shrink-0 items-start gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-xs leading-5 text-red-700 dark:border-red-500/20 dark:bg-red-950 dark:text-red-200"
          >
            <span className="flex-1">{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {!integrationId && (
          <p className="bg-amber-50 p-3 text-center text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Connect your Instagram account to save and publish.
          </p>
        )}
        <main className="relative min-h-0 flex-1">
          {!basic && (
            <div className="absolute right-3 top-3 z-10 flex rounded-xl border border-slate-200 light:border-slate-300 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#192233] md:hidden">
              <button
                aria-label="Undo"
                disabled={!past.length}
                onClick={undo}
                className={headerButton}
              >
                <Undo2 size={16} />
              </button>
              <button
                aria-label="Redo"
                disabled={!future.length}
                onClick={redo}
                className={headerButton}
              >
                <Redo2 size={16} />
              </button>
            </div>
          )}
            <FlowCanvas
              flow={doc.flow}
              onChange={changeFlow}
              triggerPanelOpen={triggerPanel}
              onOpenStep={() => setTriggerPanel(false)}
              triggers={triggerSummary}
              onEditTrigger={(id) => {
                setEditingTrigger(id);
                setTriggerPanel(true);
              }}
            />
          {!basic && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
              className="flow-assistant-input absolute bottom-6 left-1/2 z-10 flex w-[min(354px,calc(100%-112px))] -translate-x-1/2 items-center gap-2 rounded-full border border-black/[.02] bg-white p-2 ps-4 dark:border-white/5 dark:bg-[#1b2334]"
            >
              <Sparkles
                size={19}
                className="shrink-0 text-violet-600 dark:text-violet-400"
              />
              <input
                aria-label="Describe the flow you want to build"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={4000}
                placeholder="Describe the flow you want to build…"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
              <button
                type="button"
                aria-label="Open the Flow Assistant"
                onClick={() => setAssistant(true)}
                className="p-1 text-slate-500 light:text-slate-600 dark:text-slate-400"
              >
                <Menu size={16} />
              </button>
              <button
                aria-label="Send to Flow Assistant"
                disabled={generating || !prompt.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-violet-600 to-blue-500 text-white disabled:opacity-40"
              >
                <ArrowUp size={19} />
              </button>
            </form>
          )}
          {triggerPanel && (
            <aside
              aria-label="Trigger settings"
              className="absolute inset-y-0 right-0 z-30 flex w-full max-w-none sm:max-w-[384px] flex-col border-l border-slate-200 light:border-slate-300 bg-white shadow-xl dark:border-white/10 dark:bg-[#111827]"
            >
              <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-slate-100 light:border-slate-200 px-5 dark:border-white/5">
                <Diamond size={17} />
                <h2 className="flex-1 text-sm font-semibold">Begin when…</h2>
                <button
                  aria-label="Close trigger settings"
                  onClick={() => setTriggerPanel(false)}
                  className="p-2"
                >
                  <X size={18} />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                <FlowTriggerEditor
                  trigger={doc.triggers.find((t) => t.id === editingTrigger)}
                  posts={posts}
                  postsLoading={postsLoading}
                  postsError={postsError}
                  refreshPosts={refreshPosts}
                  onChange={updateTrigger}
                  onAdd={addTrigger}
                  onRemove={() => {
                    patch({
                      triggers: doc.triggers.filter(
                        (t) => t.id !== editingTrigger,
                      ),
                    });
                    setEditingTrigger(undefined);
                  }}
                />
                <div className="space-y-4 border-t border-slate-100 light:border-slate-200 p-5 dark:border-white/10">
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>Run once per contact</span>
                    <input
                      type="checkbox"
                      checked={doc.flow.oncePerContact}
                      onChange={(e) =>
                        changeFlow({
                          ...doc.flow,
                          oncePerContact: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-violet-600"
                    />
                  </label>
                  {doc.triggers.some((t) => t.source === "COMMENT") && (
                    <>
                      <p className="text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
                        Comment flows start with a private reply and wait for a
                        button tap. A first step with one button supplies this
                        opening automatically.
                      </p>
                      <label className="block text-xs font-medium">
                        Opening message
                        <textarea
                          value={doc.opening}
                          maxLength={800}
                          onChange={(e) => patch({ opening: e.target.value })}
                          className="flow-editor-input"
                          rows={3}
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Opening button
                        <input
                          value={doc.openingButton}
                          maxLength={20}
                          onChange={(e) =>
                            patch({ openingButton: e.target.value })
                          }
                          className="flow-editor-input"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Public comment reply
                        <textarea
                          value={doc.publicReply}
                          maxLength={300}
                          onChange={(e) =>
                            patch({ publicReply: e.target.value })
                          }
                          className="flow-editor-input"
                          rows={2}
                        />
                      </label>
                    </>
                  )}
                </div>
                {editingTrigger && (
                  <button
                    className="mx-5 mb-5 text-xs font-semibold text-violet-600 dark:text-violet-300"
                    onClick={() => setEditingTrigger(undefined)}
                  >
                    + Add another trigger
                  </button>
                )}
              </div>
            </aside>
          )}
        </main>
        <Dialog open={assistant} onOpenChange={setAssistant}>
          <DialogContent className="flow-editor-dialog font-sans inset-y-0 left-auto right-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-[448px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-e-0 bg-white p-0 text-slate-950 dark:bg-[#111827] dark:text-slate-100 sm:rounded-none">
            <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-slate-100 light:border-slate-200 px-5 pe-14 dark:border-white/5">
              <Sparkles size={20} className="text-violet-500 light:text-violet-700" />
              <DialogTitle className="text-sm font-semibold">
                Flow Assistant
              </DialogTitle>
              <DialogDescription className="sr-only">
                Describe an automation and the assistant builds an editable
                draft on your canvas.
              </DialogDescription>
            </header>
            <div ref={chatScroll} role="log" aria-live="polite" aria-relevant="additions" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-5">
              {!aiMessages.length ? (
                <>
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-100 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10">
                      <Sparkles size={29} className="text-violet-500 light:text-violet-700" />
                    </span>
                    <h2 className="text-[19px] font-semibold">
                      How can I help you build?
                    </h2>
                    <p className="max-w-[300px] text-xs leading-[21px] text-slate-500 light:text-slate-600 dark:text-slate-400">
                      Describe an automation in plain words, or start from one
                      of the ideas below.
                    </p>
                  </div>
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 light:text-slate-600 dark:text-slate-400">
                    Try asking
                  </p>
                  <div className="space-y-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => void ask(s)}
                        disabled={generating}
                        className="w-full rounded-xl border border-black/[.06] bg-[#f9faf9] px-3.5 py-3 text-left text-xs leading-5 text-slate-500 light:text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-violet-500/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {aiMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl p-3 text-sm leading-6 ${m.role === "user" ? "ms-8 bg-violet-600 text-white" : "me-4 bg-slate-100 dark:bg-white/5"}`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {generating && (
                    <p
                      role="status"
                      className="flex items-center gap-2 text-xs text-violet-500 light:text-violet-700"
                    >
                      <Loader2 size={14} className="animate-spin" />
                      Building your flow…
                    </p>
                  )}
                  {aiWarning && (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      {aiWarning}
                    </p>
                  )}
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
              className="flex shrink-0 items-end gap-2 border-t border-slate-100 light:border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/5"
            >
              <textarea
                aria-label="Message to Flow Assistant"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(min-width: 768px)").matches) { e.preventDefault(); void ask(); } }}
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={4000}
                placeholder="Describe the flow you want to build…"
                className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 light:border-slate-300 bg-transparent p-3 text-base md:text-sm outline-none focus:border-violet-400 dark:border-white/10"
              />
              <button
                aria-label="Generate flow"
                disabled={generating || !prompt.trim()}
                className="grid h-11 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 text-white disabled:opacity-40"
              >
                {generating ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : (
                  <ArrowUp size={19} />
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={preview} onOpenChange={setPreview}>
          <DialogContent className="flow-editor-dialog max-h-[calc(100dvh-2rem)] max-w-[400px] overflow-y-auto bg-[#f0eef8] p-4 dark:bg-[#1d1b2e]">
            <DialogTitle>Preview your flow</DialogTitle>
            <DialogDescription>
              This simulation does not send messages to Instagram.
            </DialogDescription>
            <FlowPreview
              flow={doc.flow}
              triggers={doc.triggers}
              publicReply={doc.publicReply}
              opening={doc.opening}
              openingButton={doc.openingButton}
              username={username}
              avatar={avatar}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </>,
    document.body,
  );
}
