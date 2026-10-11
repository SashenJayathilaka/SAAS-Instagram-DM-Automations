"use client";
import { LocalizedInput, LocalizedButton, LocalizedTextarea } from "@/components/i18n/localized-controls";


import { useI18n } from "@/providers/i18n-provider";
import { useTimeZone } from "@/providers/time-zone-provider";
import { translateUi } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import { UiText } from "@/components/i18n/localized-copy";
import { getInboxConversations, getInboxMessages, sendInboxReply } from "@/actions/inbox";
import {
  ArrowDownUp,
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  Clock3,
  Inbox,
  Instagram,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Send,
  Smile,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConversationFilter = "all" | "unread" | "recent";
type ConversationSort = "newest" | "oldest";

export default function InboxClient({ initialConversationId }: { initialConversationId?: string }) {
  const { locale } = useI18n();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId ?? null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [sort, setSort] = useState<ConversationSort>("newest");
  const [refreshing, setRefreshing] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [foldersExpanded, setFoldersExpanded] = useState(false);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const lastConversationRef = useRef<string | null>(null);
  const lastMessageRef = useRef<string | null>(null);

  const selected = useMemo(() => conversations.find((item) => item.id === selectedId), [conversations, selectedId]);
  const unreadTotal = useMemo(() => conversations.filter((item) => Number(item.unreadCount || 0) > 0).length, [conversations]);
  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = conversations.filter((conversation) => {
      if (filter === "unread" && !conversation.unreadCount) return false;
      if (filter === "recent" && Date.now() - new Date(conversation.lastMessageAt).getTime() > 24 * 60 * 60 * 1000) return false;
      if (!needle) return true;
      return `${conversation.recipientUsername ?? ""} ${conversation.recipientIgId ?? ""} ${conversation.messages?.[0]?.content ?? ""}`.toLowerCase().includes(needle);
    });
    return rows.sort((a, b) => {
      const difference = new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      return sort === "newest" ? difference : -difference;
    });
  }, [conversations, filter, query, sort]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getInboxConversations();
      if (result.status !== 200 || !Array.isArray(result.data)) throw new Error("Unavailable");
      const rows = result.data;
      setConversations(rows);
      setListError(null);
      setSelectedId((current) => {
        if (current && rows.some((row) => row.id === current)) return current;
        if (initialConversationId && rows.some((row) => row.id === initialConversationId)) return initialConversationId;
        return window.matchMedia("(min-width: 768px)").matches ? rows[0]?.id ?? null : null;
      });
    } catch { setListError("Could not load conversations. Please refresh to try again."); }
    finally { setLoading(false); }
  }, [initialConversationId]);

  const refreshAll = useCallback(async (showProgress = false) => {
    if (showProgress) setRefreshing(true);
    try {
    const [conversationResult, messageResult] = await Promise.all([
      getInboxConversations(),
      selectedId ? getInboxMessages(selectedId) : Promise.resolve(null),
    ]);
    if (conversationResult.status === 200 && Array.isArray(conversationResult.data)) {
      setConversations(conversationResult.data);
      setListError(null);
    }
    if (messageResult?.status === 200 && Array.isArray(messageResult.data)) {
      setMessages(messageResult.data);
      setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, unreadCount: 0 } : conversation));
    }
    } catch { if (showProgress) setListError("Could not refresh conversations. Please try again."); }
    finally { if (showProgress) setRefreshing(false); }
  }, [selectedId]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshAll(false);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshAll]);
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    setLoadingMessages(true);
    setError(null);
    void getInboxMessages(selectedId).then((result) => {
      setMessages(result.status === 200 && Array.isArray(result.data) ? result.data : []);
      setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, unreadCount: 0 } : conversation));
      setLoadingMessages(false);
    });
  }, [selectedId]);
  useEffect(() => {
    const viewport = messagesViewportRef.current;
    const latest = messages[messages.length - 1];
    if (!viewport || loadingMessages || !latest) return;
    const conversationChanged = lastConversationRef.current !== selectedId;
    const messageChanged = lastMessageRef.current !== latest.id;
    const nearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 180;
    if (conversationChanged || (messageChanged && (nearBottom || latest.direction === "OUTBOUND"))) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: conversationChanged ? "auto" : "smooth" });
    }
    lastConversationRef.current = selectedId;
    lastMessageRef.current = latest.id;
  }, [loadingMessages, messages, selectedId]);

  const send = async () => {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    const message = draft.trim();
    const result = await sendInboxReply(selectedId, message);
    if (result.status === 200) {
      setDraft("");
      const refreshed = await getInboxMessages(selectedId);
      setMessages(refreshed.status === 200 && Array.isArray(refreshed.data) ? refreshed.data : []);
      await loadConversations();
    } else {
      setError(typeof result.data === "string" ? result.data : "Message could not be sent.");
    }
    setSending(false);
  };

  return (
    <div className="mt-3 flex h-[calc(100dvh-6rem)] min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 light:border-slate-300 bg-[#f5f6fa] text-slate-950 shadow-sm dark:border-white/10 dark:bg-[#050816] dark:text-white lg:h-[calc(100dvh-3.5rem)] sm:min-h-[360px]">
      <header className={["shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 light:border-slate-300 bg-white/95 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-[#080c18]/95 sm:px-4 sm:py-3 lg:flex-nowrap lg:gap-3", selectedId ? "hidden md:flex" : "flex"].join(" ")}>
        <div className="min-w-0 flex-1 lg:min-w-32 lg:flex-none"><p className="text-xs font-black uppercase tracking-[0.2em] text-rf-purple sm:text-xs"><UiText>{"Instagram"}</UiText></p><h1 className="text-lg font-black tracking-tight sm:text-xl"><UiText>{"Inbox"}</UiText></h1></div>
        <label className="relative order-3 w-full lg:order-none lg:mx-auto lg:max-w-xl">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 light:text-slate-600" />
          <LocalizedInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" className="ap3k-input w-full rounded-xl py-2.5 ps-11 pe-4 text-sm sm:py-3" />
        </label>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <span className="hidden text-xs font-bold text-emerald-600 light:text-emerald-700 dark:text-emerald-300 sm:inline"><UiText>{"Updates automatically"}</UiText></span>
          <LocalizedButton type="button" onClick={() => void refreshAll(true)} aria-label="Refresh conversations and messages" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 light:border-slate-300 bg-white text-slate-500 light:text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/10 sm:h-11 sm:w-11"><RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></LocalizedButton>
        </div>
      </header>

      <div className={["grid min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#0d1220] md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]", foldersExpanded ? "xl:grid-cols-[176px_320px_minmax(0,1fr)]" : "xl:grid-cols-[64px_320px_minmax(0,1fr)]"].join(" ")}>
        <nav aria-label="Inbox folders" className="hidden min-h-0 border-e border-slate-200 light:border-slate-300 bg-slate-50/70 p-2 dark:border-white/10 dark:bg-white/[0.02] xl:flex xl:flex-col">
          <LocalizedButton type="button" onClick={() => setFoldersExpanded((value) => !value)} aria-label={foldersExpanded ? "Collapse inbox folders" : "Expand inbox folders"} title={foldersExpanded ? "Collapse folders" : "Expand folders"} className="mb-3 grid h-10 w-full place-items-center rounded-xl border border-slate-200 light:border-slate-300 text-slate-500 light:text-slate-600 transition hover:bg-white hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white">{foldersExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}</LocalizedButton>
          <LocalizedButton type="button" title="All chats" aria-label="All chats" onClick={() => setFilter("all")} className={folderClass(filter === "all", foldersExpanded)}><Inbox className="h-4 w-4 shrink-0" />{foldersExpanded ? <><span className="flex-1 text-start"><UiText>{"All chats"}</UiText></span><span>{conversations.length}</span></> : null}</LocalizedButton>
          <LocalizedButton type="button" title="Unread" aria-label="Unread" onClick={() => setFilter("unread")} className={folderClass(filter === "unread", foldersExpanded)}><Instagram className="h-4 w-4 shrink-0" />{foldersExpanded ? <><span className="flex-1 text-start"><UiText>{"Unread"}</UiText></span><span>{unreadTotal}</span></> : null}</LocalizedButton>
          <LocalizedButton type="button" title="Recent" aria-label="Recent" onClick={() => setFilter("recent")} className={folderClass(filter === "recent", foldersExpanded)}><Clock3 className="h-4 w-4 shrink-0" />{foldersExpanded ? <span className="flex-1 text-start"><UiText>{"Recent"}</UiText></span> : null}</LocalizedButton>
        </nav>

        <aside className={["min-h-0 flex-col overflow-hidden border-e border-slate-200 light:border-slate-300 dark:border-white/10", selectedId ? "hidden md:flex" : "flex"].join(" ")}>
          <div className="flex h-14 items-center gap-2 border-b border-slate-200 light:border-slate-300 px-3 dark:border-white/10">
            <label className="relative">
              <span className="sr-only"><UiText>{"Conversation folder"}</UiText></span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as ConversationFilter)} className="appearance-none rounded-lg border border-slate-200 light:border-slate-300 bg-transparent py-2 ps-3 pe-8 text-xs font-bold text-slate-600 outline-none dark:border-white/10 dark:text-slate-300">
                <option value="all"><UiText>{"All chats"}</UiText></option><option value="unread"><UiText>{"Unread"}</UiText></option><option value="recent"><UiText>{"Recent"}</UiText></option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            </label>
            <button type="button" onClick={() => setSort((value) => value === "newest" ? "oldest" : "newest")} className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-slate-400 light:text-slate-600 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><ArrowDownUp className="h-3.5 w-3.5" /> <UiText>{sort === "newest" ? "Newest" : "Oldest"}</UiText></button>
          </div>
          {listError && <p role="alert" className="px-4 py-3 text-xs text-amber-700 dark:text-amber-300"><UiText>{listError}</UiText></p>}
          {conversations.length >= 100 && <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400"><UiText>Showing your 100 most recent conversations.</UiText></p>}
          {loading ? <div className="grid flex-1 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-rf-purple" /></div> : filteredConversations.length === 0 ? <EmptyInbox filtered={Boolean(query || filter === "unread")} /> : <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{filteredConversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} selected={selectedId === conversation.id} onClick={() => setSelectedId(conversation.id)} />)}</div>}
        </aside>

        <main className={["min-h-0 overflow-hidden flex-col bg-white dark:bg-[#0d1220]", selectedId ? "flex" : "hidden md:flex"].join(" ")}>
          {!selected ? <EmptyInbox /> : (
            <>
              <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 light:border-slate-300 px-3 dark:border-white/10 sm:h-[72px] sm:px-4">
                <button type="button" aria-label={translateUi("Back", locale)} onClick={() => setSelectedId(null)} className="ap3k-control grid h-11 w-11 place-items-center rounded-lg border border-slate-200 light:border-slate-300 md:hidden dark:border-white/10"><ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" /></button>
                <Avatar src={selected.profilePictureUrl} name={selected.recipientUsername || "IG"} size="lg" />
                <div className="min-w-0"><p className="truncate text-sm font-black">{displayName(selected)}</p><p className="flex items-center gap-1.5 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"><Instagram className="h-3.5 w-3.5 text-pink-500" /><UiText>{" Instagram · "}</UiText><UiText>{isReplyWindowOpen(selected.lastInboundAt) ? "Reply window open" : "Reply window closed"}</UiText></p></div>
                <span className="ms-auto hidden rounded-full bg-rf-purple/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-rf-purple sm:inline-flex">{selected.automation?.source ?? "manual"}</span>
              </header>

              <div ref={messagesViewportRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#faf5ff_0,transparent_42%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,rgba(109,40,217,0.12)_0,transparent_42%)] sm:px-7">
                <div className="mx-auto mb-7 flex max-w-sm flex-col items-center text-center"><Avatar src={selected.profilePictureUrl} name={selected.recipientUsername || "IG"} size="xl" /><p className="mt-3 text-sm font-black">{displayName(selected)}</p><p className="text-xs text-slate-400 light:text-slate-600"><UiText>{"Instagram conversation"}</UiText></p>{selected.automation?.name ? <span className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 light:text-slate-600 dark:bg-white/10 dark:text-slate-300"><UiText>{"Started by "}</UiText>{selected.automation.name}</span> : null}</div>
                {loadingMessages ? <Loader2 className="m-auto h-5 w-5 animate-spin text-rf-purple" /> : <MessageTimeline messages={messages} avatarUrl={selected.profilePictureUrl} name={selected.recipientUsername || "IG"} />}
              </div>

              <footer className="border-t border-slate-200 light:border-slate-300 bg-white p-3 dark:border-white/10 dark:bg-[#0d1220] sm:p-4">
                {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300"><UiText>{error}</UiText></p>}
                <div className="rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 p-2 transition focus-within:border-rf-purple/60 focus-within:ring-2 focus-within:ring-rf-purple/10 dark:border-white/10 dark:bg-white/[0.035]">
                  <LocalizedTextarea value={draft} maxLength={1000} rows={2} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={isReplyWindowOpen(selected.lastInboundAt) ? "Reply to this Instagram conversation…" : "Instagram's 24-hour reply window is closed"} disabled={!isReplyWindowOpen(selected.lastInboundAt)} className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400 light:placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60" />
                  <div className="relative flex items-center gap-1 border-t border-slate-200 light:border-slate-300 pt-2 dark:border-white/10">
                    <LocalizedButton type="button" onClick={() => setEmojiOpen((value) => !value)} aria-expanded={emojiOpen} aria-label="Add emoji" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 light:text-slate-600 hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"><Smile className="h-4 w-4" /></LocalizedButton>
                    {emojiOpen && <div className="absolute bottom-10 start-0 z-20 flex flex-wrap gap-1 rounded-xl border border-slate-200 light:border-slate-300 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#171d2b]">{["😊","👍","❤️","✨","🔥","🎁","🙏","👏"].map((emoji) => <button key={emoji} type="button" onClick={() => { setDraft((value) => `${value}${emoji}`); setEmojiOpen(false); }} className="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-slate-100 dark:hover:bg-white/10">{emoji}</button>)}</div>}
                    <span className="ms-auto hidden text-xs text-slate-400 light:text-slate-600 sm:inline"><UiText>{"Enter to send · Shift + Enter for a new line"}</UiText></span><button type="button" onClick={() => void send()} disabled={sending || !draft.trim() || !isReplyWindowOpen(selected.lastInboundAt)} className="ms-2 inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 px-4 text-xs font-black text-white shadow-sm disabled:opacity-35">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="hidden sm:inline"><UiText>{"Send"}</UiText></span></button>
                  </div>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function ConversationRow({ conversation, selected, onClick }: { conversation: any; selected: boolean; onClick: () => void }) {
  const latest = conversation.messages?.[0];
  const { locale } = useI18n();
  const preview = latest?.mediaUrl ? mediaLabel(latest.messageType) : latest?.content ?? "New conversation";
  return <button type="button" onClick={onClick} className={["flex w-full items-start gap-3 border-b border-slate-100 light:border-slate-200 p-4 text-start transition dark:border-white/[0.07]", selected ? "bg-violet-50 dark:bg-violet-500/10" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"].join(" ")}><Avatar src={conversation.profilePictureUrl} name={conversation.recipientUsername || "IG"} size="lg" /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-sm font-black">{displayName(conversation)}</span><span className="ms-auto shrink-0 text-xs text-slate-400 light:text-slate-600">{relativeTime(conversation.lastMessageAt, locale)}</span></span><span className={conversation.unreadCount ? "mt-1 block truncate text-xs font-bold text-slate-800 dark:text-white" : "mt-1 block truncate text-xs text-slate-500 light:text-slate-600 dark:text-slate-400"}>{preview}</span><span className="mt-2 flex items-center gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-500 light:text-slate-600 dark:bg-white/[0.07] dark:text-slate-400">{conversation.automation?.source ?? "manual"}</span>{conversation.unreadCount > 0 ? <span className="ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-rf-purple px-1 text-xs font-black text-white">{conversation.unreadCount}</span> : <CheckCheck className="ms-auto h-3.5 w-3.5 text-rf-purple/70" />}</span></span></button>;
}

function MessageTimeline({ messages, avatarUrl, name }: { messages: any[]; avatarUrl?: string | null; name: string }) {
  const { locale } = useI18n();
  const { timeZone } = useTimeZone();
  if (!messages.length) return <p className="m-auto text-sm text-slate-400 light:text-slate-600"><UiText>{"No messages in this conversation yet."}</UiText></p>;
  let previousDay = "";
  return <div className="space-y-3">{messages.map((message) => {
    const day = formatDay(message.createdAt, locale, timeZone);
    const showDay = day !== previousDay;
    previousDay = day;
    const outbound = message.direction === "OUTBOUND";
    return <div key={message.id}>{showDay ? <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /><span className="text-xs font-bold uppercase tracking-wider text-slate-400 light:text-slate-600">{day}</span><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /></div> : null}<div className={outbound ? "flex justify-end" : "flex items-end gap-2"}>{!outbound ? <Avatar src={avatarUrl} name={name} size="sm" /> : null}<div className={["max-w-[82%] overflow-hidden text-sm leading-6 shadow-sm", outbound ? "rounded-[1.25rem] rounded-ee-sm bg-violet-700 text-white" : "rounded-[1.25rem] rounded-es-sm bg-slate-100 text-slate-900 dark:bg-[#222836] dark:text-slate-100"].join(" ")}><MessageMedia message={message} /><div className="px-4 py-2.5"><p className="whitespace-pre-wrap break-words" dir="auto">{message.content}</p><p className={outbound ? "mt-1 text-end text-xs text-white/80" : "mt-1 text-xs text-slate-400 light:text-slate-600"}>{formatClock(message.createdAt, locale, timeZone)}<UiText>{outbound ? " · Sent" : ""}</UiText></p></div></div></div></div>;
  })}</div>;
}

function MessageMedia({ message }: { message: any }) {
  const mediaUrl = safeInstagramMediaUrl(message.mediaUrl);
  if (!mediaUrl) return null;
  const isVideo = /VIDEO|REEL/i.test(message.messageType ?? "");
  if (isVideo) {
    return <video src={mediaUrl} controls preload="metadata" playsInline className="max-h-72 w-full bg-black object-contain" aria-label="Instagram video attachment" />;
  }
  return <div className="relative h-52 w-64 max-w-full bg-black/10"><Image src={mediaUrl} alt="Instagram image attachment" fill sizes="256px" className="object-cover" unoptimized /></div>;
}

function Avatar({ src, name, size }: { src?: string | null; name: string; size: "sm" | "lg" | "xl" }) {
  const dimensions = size === "sm" ? "h-7 w-7 text-xs" : size === "xl" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";
  return <span className={`relative grid ${dimensions} shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 font-black uppercase text-white ring-2 ring-white shadow-sm dark:ring-[#0d1220]`}>{src ? <Image src={src} alt={`${name} profile picture`} fill sizes={size === "sm" ? "28px" : size === "xl" ? "64px" : "44px"} className="object-cover" unoptimized /> : name.replace(/^@/, "").slice(0, 1)}</span>;
}

function EmptyInbox({ filtered = false }: { filtered?: boolean }) { return <div className="grid min-h-64 place-items-center p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rf-purple/10 text-rf-purple"><Inbox className="h-6 w-6" /></span><p className="mt-4 font-black"><UiText>{filtered ? "No matching chats" : "No conversations yet"}</UiText></p><p className="mt-1 max-w-xs text-sm text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{filtered ? "Try a different search or show all chats." : "New Instagram DMs and story interactions will appear here automatically."}</UiText></p></div></div>; }
function folderClass(active: boolean, expanded: boolean) { return ["mb-1 flex min-h-10 w-full items-center rounded-xl text-xs font-black transition", expanded ? "gap-2 px-3 py-2.5" : "justify-center px-0 py-2.5", active ? "bg-slate-200 text-slate-950 dark:bg-white/10 dark:text-white" : "text-slate-500 light:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"].join(" "); }
function displayName(conversation: any) { return conversation.recipientUsername ? `@${conversation.recipientUsername.replace(/^@/, "")}` : "Instagram user"; }
function mediaLabel(messageType?: string) { return /VIDEO|REEL/i.test(messageType ?? "") ? "Video attachment" : "Image attachment"; }
function safeInstagramMediaUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const allowed = url.protocol === "https:" && (url.hostname.endsWith(".cdninstagram.com") || url.hostname.endsWith(".fbcdn.net"));
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}
function isReplyWindowOpen(value?: string | Date | null) { if (!value) return false; const date = new Date(value); return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() <= 24 * 60 * 60 * 1000; }
function relativeTime(value: string | Date, locale: Locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  return minutes < 1 ? format.format(0, "second") : minutes < 60 ? format.format(-minutes, "minute") : minutes < 1440 ? format.format(-Math.floor(minutes / 60), "hour") : format.format(-Math.floor(minutes / 1440), "day");
}
function formatDay(value: string | Date, locale: Locale, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const dateKey = date.toLocaleDateString("en-CA", { timeZone });
  const todayKey = today.toLocaleDateString("en-CA", { timeZone });
  if (dateKey === todayKey) return translateUi("Today", locale);
  const year = date.toLocaleDateString("en", { year: "numeric", timeZone });
  const currentYear = today.toLocaleDateString("en", { year: "numeric", timeZone });
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: year === currentYear ? undefined : "numeric", timeZone });
}
function formatClock(value: string | Date, locale: Locale, timeZone: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone });
}
