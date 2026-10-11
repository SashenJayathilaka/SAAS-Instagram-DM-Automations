"use client";
import { useUi } from "@/components/i18n/use-ui";
import { UiMessage } from "@/components/i18n/dashboard-values";
import { UiText } from "@/components/i18n/localized-copy";
import { addAiKnowledgeAction, clearAiPlaygroundAction, deleteAiKnowledgeAction, saveAiWorkspaceAction, savePlaygroundMessageAsKnowledgeAction, testAiWorkspaceAction } from "@/actions/ai-workspace";
import { AI_PROTECTION_CATEGORIES, AI_REPLY_TONES, aiToneLabel, type AiProtectionAction, type AiProtectionRules, type AiReplyTone } from "@/lib/ai-reply-config";
import type { AiKnowledgeItem } from "@/lib/ai-workspace";
import { BookOpen, Bot, Check, Loader2, MessageCircle, MessagesSquare, Plus, RotateCcw, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type Dispatch, type SetStateAction } from "react";

type Profile = {
  aiRepliesEnabled: boolean;
  aiCommentsEnabled: boolean;
  role: string;
  brandVoice: string;
  guardrails: string;
  defaultTone: AiReplyTone;
  protectionRules: AiProtectionRules;
  knowledge: AiKnowledgeItem[];
};

type PlaygroundMessage = { id: string; role: string; content: string; createdAt: Date | string };

const tabs = ["Overview", "Knowledge", "Behavior", "Playground"] as const;
type Tab = (typeof tabs)[number];

const protectionLabels: Record<(typeof AI_PROTECTION_CATEGORIES)[number], [string, string]> = {
  INSULTS_HATE: ["Insults & hate speech", "Vulgar language, slurs, threats, or harassment"],
  CRITIQUE_NEGATIVE: ["Critique & negative feedback", "Comments criticizing your content, product, or brand"],
  UNANSWERABLE: ["Unanswerable questions", "Questions the shared knowledge cannot answer"],
  BEGGING_SOLICITATION: ["Begging & solicitation", "Requests for money, gifts, free products, or donations"],
};

export default function Ap3kAiConsole({ integrationId = "", slug, initial, plan, initialPlaygroundMessages = [], lastConfiguredAt }: { integrationId?: string; slug: string; initial: Profile; plan: string; initialPlaygroundMessages?: PlaygroundMessage[]; lastConfiguredAt?: Date | string | null }) {
  const tr = useUi();
  const router = useRouter();
  const unlocked = plan === "PRO" || plan === "BUSINESS";
  const [tab, setTab] = useState<Tab>("Overview");
  const [profile, setProfile] = useState(initial);
  const [playgroundMessages, setPlaygroundMessages] = useState(initialPlaygroundMessages);
  const [tested, setTested] = useState(initialPlaygroundMessages.some(item => item.role === "assistant" && (!lastConfiguredAt || new Date(item.createdAt).getTime() >= new Date(lastConfiguredAt).getTime())));
  const updateKnowledge = (knowledge: AiKnowledgeItem[]) => {
    setProfile(current => ({ ...current, knowledge }));
    setTested(false);
    router.refresh();
  };
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const save = () => {
    setNotice(null);
    startSave(async () => {
      const form = new FormData(); form.set("integrationId", integrationId);
      form.set("aiRepliesEnabled", String(profile.aiRepliesEnabled));
      form.set("aiCommentsEnabled", String(profile.aiCommentsEnabled));
      form.set("role", profile.role);
      form.set("brandVoice", profile.brandVoice);
      form.set("guardrails", profile.guardrails);
      form.set("defaultTone", profile.defaultTone);
      form.set("protectionRules", JSON.stringify(profile.protectionRules));
      try {
        const result = await saveAiWorkspaceAction(form);
        setNotice(result.data);
        if (result.status === 200) { setTested(false); router.refresh(); }
      } catch { setNotice("Could not save your changes. Please try again."); }
    });
  };

  const complete = [profile.knowledge.length > 0, profile.role.trim().length > 0, tested].filter(Boolean).length;

  return (
    <main className="mx-auto w-full max-w-[1480px] py-5 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ap3k-kicker"><UiText>{"Intelligence center"}</UiText></p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl"><UiText>{"AP3K AI"}</UiText></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Teach AI your business once, then use it safely in selected comment and DM automations."}</UiText></p>
        </div>
        <button type="button" onClick={save} disabled={saving || !unlocked} aria-busy={saving} className="ap3k-gradient-button inline-flex min-h-11 items-center justify-center gap-2 px-5 text-sm disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}<UiText>{" Save changes"}</UiText></button>
      </header>

      {!unlocked ? <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-violet-400/25 bg-violet-500/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-950 dark:text-white"><UiText>{"AP3K AI is included with Pro and Business"}</UiText></p><p className="mt-1 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Upgrade to enable AI comments, AI DM replies, knowledge, and the playground."}</UiText></p></div><Link href={`/dashboard/${slug}/billing`} className="rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-black text-white"><UiText>{"View plans"}</UiText></Link></div> : null}

      <nav aria-label={tr('AP3K AI sections')} className="mt-5 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 light:border-slate-300 bg-white p-1.5 dark:border-white/10 dark:bg-white/[0.04] sm:flex sm:w-fit">
        {tabs.map((item) => <button key={item} type="button" aria-pressed={tab === item} onClick={() => setTab(item)} className={`ap3k-control min-h-11 min-w-0 rounded-xl px-1 py-2.5 text-[11px] font-semibold tracking-tight sm:px-4 sm:text-sm ${tab === item ? "bg-slate-950 text-white shadow dark:bg-white dark:text-slate-950" : "text-slate-500 light:text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"}`}><UiText>{item}</UiText></button>)}
      </nav>

      <section className="mt-4 min-h-[520px] rounded-2xl border border-slate-200 light:border-slate-300 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1220] sm:p-7">
        {tab === "Overview" ? <Overview profile={profile} tested={tested} complete={complete} unlocked={unlocked} onOpen={setTab} /> : null}
        {tab === "Knowledge" ? <Knowledge integrationId={integrationId} items={profile.knowledge} unlocked={unlocked} onChange={updateKnowledge} /> : null}
        {tab === "Behavior" ? <Behavior profile={profile} setProfile={setProfile} unlocked={unlocked} /> : null}
        {tab === "Playground" ? <Playground integrationId={integrationId} unlocked={unlocked} ready={profile.knowledge.length > 0} initialMessages={playgroundMessages} onMessagesChange={setPlaygroundMessages} onTested={setTested} onKnowledge={updateKnowledge} /> : null}
      </section>
      {notice ? <p role="status" className="mt-3 rounded-xl border border-slate-200 light:border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"><UiText>{notice}</UiText></p> : null}
    </main>
  );
}

function Overview({ profile, tested, complete, unlocked, onOpen }: { profile: Profile; tested: boolean; complete: number; unlocked: boolean; onOpen: (tab: Tab) => void }) {
  return <div className="mx-auto max-w-4xl"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/12 text-violet-500 light:text-violet-700"><Sparkles className="h-5 w-5" /></span><div><h2 className="text-xl font-black"><UiText>{"AI reply setup"}</UiText></h2><p className="mt-1 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiMessage source="{count} of 3 setup steps complete" values={{ count: complete }} /></p></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]"><div className="h-full origin-left rounded-full bg-violet-600 transition-transform duration-base rtl:origin-right" style={{ transform: `scaleX(${complete / 3})` }} /></div><div className="mt-7 space-y-3"><SetupRow done={profile.knowledge.length > 0} icon={BookOpen} title="Share business knowledge" detail="Add accurate products, services, policies, and FAQs." action="Open knowledge" onClick={() => onOpen("Knowledge")} /><SetupRow done={Boolean(profile.role.trim())} icon={Bot} title="Set voice and behavior" detail="Control tone, role, guardrails, and comment protection." action="Open behavior" onClick={() => onOpen("Behavior")} /><SetupRow done={tested} icon={MessagesSquare} title="Test a customer question" detail="Save your changes, then check a real response before enabling AI in an automation." action="Open playground" onClick={() => onOpen("Playground")} /></div><div className="mt-8"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"AI skills"}</UiText></p><div className="mt-3 grid gap-3 md:grid-cols-2">{[{ title: "AI Replies", icon: MessagesSquare, detail: "AI replies to DMs using the knowledge you share." }, { title: "AI Comments", icon: MessageCircle, detail: "AI responds to safe, positive comments in your tone." }].map(skill => <div key={skill.title} className="flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4"><skill.icon className="h-5 w-5 text-violet-500 light:text-violet-700"/><div><p className="font-semibold"><UiText>{skill.title}</UiText></p><p className="mt-1 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{skill.detail}</UiText></p><p className="mt-2 text-xs text-violet-600 dark:text-violet-300"><UiText>{unlocked ? "Choose in your automations" : "Available on Pro and Business"}</UiText></p></div></div>)}</div><p className="mt-3 text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"AI uses your saved settings. Review test answers for accuracy, then choose AI in each automation where you want it to reply. A successful test does not guarantee every future answer."}</UiText></p></div></div>;
}

function Knowledge({ integrationId, items, unlocked, onChange }: { integrationId: string; items: AiKnowledgeItem[]; unlocked: boolean; onChange: (knowledge: AiKnowledgeItem[]) => void }) {
  const tr = useUi();
  const [visibleItems, setVisibleItems] = useState(items); const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [notice, setNotice] = useState<string | null>(null); const [pending, start] = useTransition();
  const add = () => start(async () => { const form = new FormData(); form.set("integrationId", integrationId); form.set("title", title); form.set("content", content); const result = await addAiKnowledgeAction(form); setNotice(result.data); if (result.status === 200) { setTitle(""); setContent(""); setVisibleItems(result.knowledge); onChange(result.knowledge); } });
  return <div className="mx-auto max-w-5xl"><Header icon={BookOpen} title="Knowledge" detail="Share only facts you want AI to use. Short, focused notes produce clearer answers." /><div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"><div className="rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]"><label htmlFor="ai-knowledge-topic" className="text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Topic"}</UiText></label><input id="ai-knowledge-topic" value={title} disabled={!unlocked} onChange={(e) => setTitle(e.target.value)} placeholder={tr('Pricing, delivery, course details…')} className="ap3k-input mt-2 w-full rounded-xl px-4 py-3 text-sm" /><label htmlFor="ai-knowledge-facts" className="mt-4 block text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Facts AI may use"}</UiText></label><textarea id="ai-knowledge-facts" value={content} disabled={!unlocked} onChange={(e) => setContent(e.target.value)} rows={10} maxLength={5000} dir="auto" placeholder={tr('Add exact, current information. Include what AP3K should say when details are unknown.')} className="ap3k-textarea mt-2 w-full rounded-xl px-4 py-3 text-sm" /><button type="button" onClick={add} disabled={pending || !unlocked || !title.trim() || !content.trim()} aria-busy={pending} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white disabled:opacity-35">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}<UiText>{" Add knowledge"}</UiText></button>{notice ? <p className="mt-3 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{notice}</UiText></p> : null}</div><div><div className="mb-3 flex items-center justify-between"><p className="font-black"><UiText>{"Saved knowledge"}</UiText></p><span className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">{visibleItems.length}/12</span></div>{visibleItems.length ? <div className="space-y-2">{visibleItems.map((item) => <article key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 light:border-slate-300 p-4 dark:border-white/10"><div className="min-w-0 flex-1"><h3 className="font-black">{item.title}</h3><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-500 light:text-slate-600 dark:text-slate-400">{item.content}</p></div><button type="button" aria-label={`${tr("Delete")} ${item.title}`} onClick={() => start(async () => { const result = await deleteAiKnowledgeAction(item.id, integrationId); setNotice(result.data); if (result.status === 200) { setVisibleItems(result.knowledge); onChange(result.knowledge); } })} className="ap3k-control grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 light:text-slate-600 hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></article>)}</div> : <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-200 light:border-slate-300 text-center dark:border-white/10"><div><BookOpen className="mx-auto h-7 w-7 text-slate-400 light:text-slate-600" /><p className="mt-3 font-black"><UiText>{"No knowledge yet"}</UiText></p><p className="mt-1 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Add your first reliable business note."}</UiText></p></div></div>}</div></div></div>;
}

function Behavior({ profile, setProfile, unlocked }: { profile: Profile; setProfile: (value: Profile) => void; unlocked: boolean }) {
  return <div className="mx-auto max-w-4xl"><Header icon={Bot} title="Behavior" detail="One voice and safety policy is shared by every AI-enabled automation." /><div className="mt-6 space-y-5"><Field label="AI role" value={profile.role} disabled={!unlocked} onChange={(role) => setProfile({ ...profile, role })} maxLength={120} /><TextField label="Brand voice & persona" value={profile.brandVoice} disabled={!unlocked} onChange={(brandVoice) => setProfile({ ...profile, brandVoice })} maxLength={1600} /><div><p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Default tone"}</UiText></p><div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">{AI_REPLY_TONES.map((tone) => <button key={tone} type="button" disabled={!unlocked} aria-pressed={profile.defaultTone === tone} onClick={() => setProfile({ ...profile, defaultTone: tone })} className={`rounded-lg px-2 py-3 text-xs font-black ${profile.defaultTone === tone ? "bg-white text-violet-600 shadow dark:bg-violet-500/20 dark:text-violet-200" : "text-slate-500 light:text-slate-600 dark:text-slate-400"}`}><UiText>{aiToneLabel(tone)}</UiText></button>)}</div></div><TextField label="Guardrails & escalation" value={profile.guardrails} disabled={!unlocked} onChange={(guardrails) => setProfile({ ...profile, guardrails })} maxLength={2400} /><div><div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /><p className="text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Comment protection"}</UiText></p></div><div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 light:border-slate-300 dark:divide-white/10 dark:border-white/10">{AI_PROTECTION_CATEGORIES.map((category) => { const [title, detail] = protectionLabels[category]; const canDelete = category !== "UNANSWERABLE"; return <div key={category} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="text-sm font-black"><UiText>{title}</UiText></p><p className="mt-1 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{detail}</UiText></p></div>{canDelete ? <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">{(["SKIP", "DELETE"] as AiProtectionAction[]).map((action) => <button key={action} type="button" disabled={!unlocked} onClick={() => setProfile({ ...profile, protectionRules: { ...profile.protectionRules, [category]: action } })} className={`rounded-lg px-3 py-2 text-[10px] font-black ${profile.protectionRules[category] === action ? action === "DELETE" ? "bg-red-500 text-white" : "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-white" : "text-slate-500 light:text-slate-600 dark:text-slate-400"}`}><UiText>{action === "SKIP" ? "Skip reply" : "Delete"}</UiText></button>)}</div> : <span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-500 light:text-slate-600 dark:bg-white/[0.05]"><UiText>{"Skip reply"}</UiText></span>}</div>; })}</div></div></div></div>;
}

function Playground({ integrationId, unlocked, ready, initialMessages, onMessagesChange, onTested, onKnowledge }: { integrationId: string; unlocked: boolean; ready: boolean; initialMessages: PlaygroundMessage[]; onMessagesChange: Dispatch<SetStateAction<PlaygroundMessage[]>>; onTested: (value: boolean) => void; onKnowledge: (knowledge: AiKnowledgeItem[]) => void }) {
  const tr = useUi();
  const [message, setMessage] = useState("");
  const messages = initialMessages;
  const setMessages = onMessagesChange;
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () => {
    const prompt = message.trim();
    if (!prompt || pending || !unlocked) return;
    setMessage("");
    setNotice(null);
    const optimistic: PlaygroundMessage = { id: `pending-${Date.now()}`, role: "user", content: prompt, createdAt: new Date() };
    setMessages((current) => [...current, optimistic]);
    start(async () => {
      try {
      const result = await testAiWorkspaceAction(prompt, integrationId);
      if (result.status === 200 && result.userMessage && result.assistantMessage) {
        onTested(true);
        setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), result.userMessage!, result.assistantMessage!]);
      } else {
        if ("userMessage" in result && result.userMessage) {
          setMessages((current) => [...current.filter((item) => item.id !== optimistic.id), result.userMessage!]);
        }
        onTested(false);
        setNotice(result.data);
      }
      } catch {
        setMessages(current => current.filter(item => item.id !== optimistic.id));
        setMessage(prompt);
        onTested(false);
        setNotice("The test could not be completed. Please try again.");
      }
    });
  };

  const clear = () => start(async () => {
    const result = await clearAiPlaygroundAction(integrationId);
    if (result.status === 200) { setMessages([]); onTested(false); }
    setNotice(result.data);
  });

  return <div className="mx-auto flex min-h-[540px] max-w-3xl flex-col">
    <div className="flex items-start justify-between gap-4"><Header icon={MessagesSquare} title="Playground" detail="Test your saved knowledge, voice, and guardrails in a persistent conversation." />{messages.length ? <button type="button" onClick={clear} disabled={pending} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black text-slate-500 light:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/[0.06]"><RotateCcw className="h-3.5 w-3.5" /><UiText>{" Clear"}</UiText></button> : null}</div>
    {!ready ? <p className="mt-5 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"><UiText>{"Add at least one knowledge note for a meaningful test."}</UiText></p> : null}
    <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-slate-50/70 p-3 dark:bg-white/[0.02] sm:p-4">
      {!messages.length ? <div className="grid min-h-[280px] place-items-center text-center"><div><Sparkles className="mx-auto h-7 w-7 text-violet-500 light:text-violet-700" /><p className="mt-3 font-black"><UiText>{"Ask a customer-style question"}</UiText></p><p className="mt-1 text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Your conversation is saved. Tests count toward the monthly AI limit."}</UiText></p></div></div> : null}
      {messages.map((item) => <div key={item.id} className={`group w-fit max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "ms-auto rounded-br-md bg-violet-600 text-white" : "rounded-bl-md bg-white text-slate-800 shadow-sm dark:bg-white/[0.07] dark:text-slate-100"}`}><span className="mb-1 block text-[10px] font-black uppercase tracking-wider opacity-70"><UiText>{item.role === "user" ? "You" : "AP3K AI"}</UiText></span><span className="whitespace-pre-wrap">{item.content}</span>{item.role === "user" && !item.id.startsWith("pending-") ? <button type="button" onClick={() => start(async () => { const result = await savePlaygroundMessageAsKnowledgeAction(item.id, integrationId); setNotice(result.data); if (result.status === 200) onKnowledge(result.knowledge); })} className="mt-2 block text-[10px] font-black underline decoration-white/40 underline-offset-2"><UiText>{"Save as business knowledge"}</UiText></button> : null}</div>)}
      {pending ? <div className="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-slate-500 light:text-slate-600 shadow-sm dark:bg-white/[0.07]"><Loader2 className="h-3.5 w-3.5 animate-spin" /><UiText>{" Thinking…"}</UiText></div> : null}
    </div>
    {notice ? <p role="status" className="mt-3 text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{notice}</UiText></p> : null}
    <div className="mt-3 flex gap-2 rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.03]"><input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} disabled={!unlocked || pending} maxLength={1000} placeholder={tr('Ask a customer question…')} className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none" /><button type="button" onClick={send} disabled={!unlocked || !message.trim() || pending} aria-label={tr('Send test')} className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-35">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div>
    <p className="mt-2 text-[10px] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Chats are private to this workspace. Only facts you explicitly save are added to Knowledge."}</UiText></p>
  </div>;
}

function SetupRow({ done, icon: Icon, title, detail, action, onClick }: { done: boolean; icon: typeof Bot; title: string; detail: string; action: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 light:border-slate-300 p-3 text-start sm:gap-4 sm:p-4 transition hover:border-violet-400/40 dark:border-white/10"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-10 sm:w-10 ${done ? "bg-emerald-500/15 text-emerald-500" : "bg-slate-100 text-slate-400 light:text-slate-600 dark:bg-white/[0.05]"}`}>{done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold sm:text-base"><UiText>{title}</UiText></span><span className="mt-1 block text-xs leading-5 sm:text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{detail}</UiText></span></span><span className="hidden text-xs font-black text-violet-500 light:text-violet-700 sm:block"><UiText>{action}</UiText></span></button>; }
function SkillCard({ enabled, disabled, icon: Icon, title, detail, onToggle }: { enabled: boolean; disabled: boolean; icon: typeof Bot; title: string; detail: string; onToggle: () => void }) { return <button type="button" role="switch" aria-checked={enabled} disabled={disabled} onClick={onToggle} className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition disabled:opacity-50 ${enabled ? "border-violet-400/35 bg-violet-500/[0.07]" : "border-slate-200 light:border-slate-300 dark:border-white/10"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500 light:text-violet-700"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-black"><UiText>{title}</UiText></span><span className="mt-1 block text-xs leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{detail}</UiText></span></span><span className={`relative mt-1 h-7 w-12 shrink-0 rounded-full ${enabled ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-700"}`}><span className={`absolute start-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-base ${enabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"}`} /></span></button>; }
function Header({ icon: Icon, title, detail }: { icon: typeof Bot; title: string; detail: string }) { return <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500 light:text-violet-700"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black"><UiText>{title}</UiText></h2><p className="mt-1 text-sm leading-6 text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{detail}</UiText></p></div></div>; }
function Field({ label, value, onChange, disabled, maxLength }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; maxLength: number }) { return <label className="block"><span className="text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{label}</UiText></span><input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} maxLength={maxLength} className="ap3k-input mt-2 w-full rounded-xl px-4 py-3 text-sm" /></label>; }
function TextField({ label, value, onChange, disabled, maxLength }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; maxLength: number }) { return <label className="block"><span className="flex justify-between text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:text-slate-400"><span><UiText>{label}</UiText></span><span>{value.length}/{maxLength}</span></span><textarea value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} maxLength={maxLength} rows={5} dir="auto" className="ap3k-textarea mt-2 w-full rounded-xl px-4 py-3 text-sm" /></label>; }
