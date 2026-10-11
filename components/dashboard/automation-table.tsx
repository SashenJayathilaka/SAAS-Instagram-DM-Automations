"use client";
import { planPauseMessage } from "@/lib/automation-plan-policy";

import { useI18n } from "@/providers/i18n-provider";
import { translateUi } from "@/lib/i18n/translate";
import { MetricValue, UiMessage } from "@/components/i18n/dashboard-values";
import { UiText } from "@/components/i18n/localized-copy";
import {
  activateAutomation,
  deleteAutomation,
  duplicateAutomation,
} from "@/actions/automation";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { getCampaignModeLabel } from "@/lib/campaign-mode-label";
import { isMessagingReviewMode } from "@/lib/messaging-review-mode";
import { toast } from "sonner";
import { getBacktrackInfo } from "@/actions/automation-tools";
import SavedAutomationTools, { showPublishedTools, type AutomationTool } from "@/components/automations/saved-automation-tools";
import { MoreHorizontal, History, Image as ImageIcon, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type AutomationTableProps = {
  slug: string;
  automations: any[];
  showControls?: boolean;
  pageSize?: number;
};

type ReplySummary = {
  label: string;
  compactLabel: string;
  tone: "green" | "amber" | "slate";
};

export default function AutomationTable({
  slug,
  automations,
  showControls = true,
  pageSize = 12,
}: AutomationTableProps) {
  const { locale } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "active" | "name">("newest");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [publishedId,setPublishedId]=useState<string|null>(null);
  useEffect(()=>{
    const url=new URL(window.location.href);
    const id=url.searchParams.get("published");
    if(!id || !automations.some(a=>a.id===id))return;
    url.searchParams.delete("published");
    window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
    if(showPublishedTools(slug))setPublishedId(id);
  },[automations,slug]);
  const appReviewMode = isAppReviewMode();
  const messagingReviewMode = isMessagingReviewMode();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = automations.filter((automation) => {
      if (!needle) return true;
      const keywords = (automation.keywords ?? [])
        .map((keyword: any) => keyword.word)
        .join(" ");
      const post = automation.posts?.[0];
      return `${automation.name ?? ""} ${keywords} ${post?.caption ?? ""} ${post?.postid ?? ""}`
        .toLowerCase()
        .includes(needle);
    });

    return rows.sort((a, b) => {
      if (sort === "active")
        return Number(Boolean(b.active)) - Number(Boolean(a.active));
      if (sort === "name")
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      return (
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime()
      );
    });
  }, [automations, query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => setPage(1), [query, sort, automations.length]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function handleActivate(id: string, active: boolean) {
    try {
      const result = await activateAutomation(id, active);
      if (result.status === 200) {
        router.refresh();
        return true;
      }
      toast.error(String(result.data));
      return false;
    } catch {
      toast.error("Could not update this automation. Try again.");
      return false;
    }
  }

  function handleDuplicate(id: string) {
    startTransition(() => {
      void duplicateAutomation(id).then(() => router.refresh());
    });
  }

  function handleDelete(id: string) {
    if (
      !window.confirm(
        translateUi("Delete this automation? This removes it from your account.", locale),
      )
    )
      return;
    startTransition(() => {
      void deleteAutomation(id).then(() => router.refresh());
    });
  }

  return (
    <>
    {automations.some(a => planPauseMessage(a)) && <div role="status" className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
      <p className="font-semibold">Some automations were paused after your plan changed</p>
      <p className="mt-1 leading-relaxed">Your automations and contacts are saved. To change which automations run, pause an active automation and activate an eligible saved one. Paid features require a paid plan. Upgrading does not restart paused automations automatically.</p>
      <Link href={`/dashboard/${encodeURIComponent(slug)}/billing`} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-amber-950 px-3 font-semibold text-white dark:bg-amber-100 dark:text-amber-950">Review your plan</Link>
    </div>}
    {publishedId && <SavedAutomationTools automationId={publishedId} slug={slug} tool="published" onClose={()=>setPublishedId(null)}/>}
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 light:border-slate-300 bg-white shadow-sm transition-colors duration-fast dark:border-white/[0.12] dark:bg-[#111827] dark:shadow-ap3k-card sm:rounded-2xl">
      {showControls && (
        <div className="flex flex-col gap-2 border-b border-slate-200 light:border-slate-300 p-3 dark:border-white/10 sm:gap-3 sm:p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={translateUi("Search automations, keywords, or content…", locale)}
              className="ap3k-input h-10 rounded-xl pr-4 sm:h-11 sm:rounded-2xl"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "newest" | "active" | "name")
              }
              aria-label={translateUi("Sort automations", locale)}
              className="ap3k-select h-10 min-w-0 flex-1 rounded-xl px-3 text-xs font-bold sm:h-11 sm:rounded-2xl sm:text-sm"
            >
              <option value="newest"><UiText>{"Newest first"}</UiText></option>
              <option value="active"><UiText>{"Active first"}</UiText></option>
              <option value="name"><UiText>{"Name A–Z"}</UiText></option>
            </select>
            <span className="whitespace-nowrap rounded-xl border border-slate-200 light:border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 light:text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 sm:rounded-2xl sm:text-xs">
              {filtered.length
                ? <UiMessage source="{start}–{end} of {total}" values={{ start: <MetricValue value={(safePage - 1) * pageSize + 1} />, end: <MetricValue value={Math.min(safePage * pageSize, filtered.length)} />, total: <MetricValue value={filtered.length} /> }} />
                : <UiText>{"0 automations"}</UiText>}
            </span>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-200 dark:divide-white/10 xl:hidden">
        {paged.length === 0 ? (
          <EmptyRows />
        ) : (
          paged.map((automation) => (
            <CampaignMobileCard
              key={automation.id}
              slug={slug}
              automation={automation}
              appReviewMode={appReviewMode}
              messagingReviewMode={messagingReviewMode}
              isPending={isPending}
              onActivate={handleActivate}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <div className="hidden xl:block overflow-x-auto">
        <div className="grid min-w-[1100px] grid-cols-[minmax(190px,1.6fr)_minmax(78px,.55fr)_minmax(118px,.8fr)_minmax(86px,.55fr)_minmax(68px,.42fr)_minmax(68px,.42fr)_minmax(84px,.52fr)_minmax(148px,.85fr)] items-center gap-3 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.06em] text-slate-500 light:text-slate-600 dark:bg-white/[0.05] dark:text-slate-400">
          <span><UiText>{"Automation"}</UiText></span>
          <span><UiText>{"Channel"}</UiText></span>
          <span><UiText>{"Trigger"}</UiText></span>
          <span><UiText>{"Actions"}</UiText></span>
          <span><UiText>{"Runs"}</UiText></span>
          <span><UiText>{"Leads"}</UiText></span>
          <span><UiText>{"Status"}</UiText></span>
          <span className="text-right"><UiText>{"Manage"}</UiText></span>
        </div>
        <div className="divide-y divide-slate-100 light:divide-slate-200 dark:divide-white/10">
          {paged.length === 0 ? (
            <div className="p-4">
              <EmptyRows />
            </div>
          ) : (
            paged.map((automation) => (
              <CampaignDesktopRow
                key={automation.id}
                slug={slug}
                automation={automation}
                appReviewMode={appReviewMode}
                messagingReviewMode={messagingReviewMode}
                isPending={isPending}
                onActivate={handleActivate}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {filtered.length > pageSize && (
        <PaginationFooter
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      )}
    </div>
    </>
  );
}

function CampaignMobileCard({
  slug,
  automation,
  appReviewMode,
  messagingReviewMode,
  isPending,
  onActivate,
  onDuplicate,
  onDelete,
}: any) {
  const { locale } = useI18n();
  const post = automation.posts?.[0];
  const source = automationSource(automation);
  const isAny = post?.postid === "ANY";
  const runs =
    automation.metrics?.runs ?? automation.listener?.commentCount ?? 0;
  const leads =
    automation.metrics?.leads ??
    automation.leads?.length ??
    automation._count?.leads ??
    0;
  const isAnyComment = automation.triggerMode === "ANY_COMMENT";
  const mode = getCampaignModeLabel(
    automation.sendPrivateDm === false,
    appReviewMode,
    messagingReviewMode,
  );
  const status = campaignStatus(automation);


  return (
    <article
      onClick={(event) =>
        openAnalyticsRow(event, automationAnalyticsHref(slug, automation))
      }
      className="cursor-pointer px-3 py-2 transition-colors motion-reduce:transition-none hover:bg-slate-50 dark:hover:bg-white/[0.035] sm:px-4 sm:py-3"
      aria-label={automation.name || translateUi("Untitled automation", locale)}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Link
          href={automationAnalyticsHref(slug, automation)}
          aria-label={translateUi("Open {name}", locale).replace(
            "{name}",
            automation.name || translateUi("Automation", locale),
          )}
          className="shrink-0 pt-0.5"
        >
          <CampaignThumb post={post} isAny={isAny} source={source} />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={automationAnalyticsHref(slug, automation)}
            className="block truncate text-sm font-bold leading-5 text-slate-950 hover:text-pink-600 dark:text-white sm:text-base"
          >
            {automation.name ? (
              <bdi dir="auto">{automation.name}</bdi>
            ) : (
              <UiText>{"Untitled automation"}</UiText>
            )}
          </Link>
          {planPauseMessage(automation) && <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">{planPauseMessage(automation)}</p>}
          <p
            title={translateUi(mode.full, locale)}
            className="mt-0.5 truncate text-[11px] leading-4 text-slate-500 light:text-slate-600 dark:text-slate-400 sm:text-xs"
          >
            <UiText>
              {source === "STORY"
                ? "Story"
                : source === "DM"
                  ? "DM"
                  : isAny
                    ? "Any post"
                    : "Specific post"}
            </UiText>
            {" · "}
            <UiText>
              {source === "STORY"
                ? storyTriggerLabel(automation.storyTriggerType)
                : source === "DM"
                  ? automation.triggerMode === "ANY_MESSAGE"
                    ? "Any message"
                    : "Keyword"
                  : isAnyComment
                    ? "Any comment"
                    : "Keyword trigger"}
            </UiText>
          </p>
        </div>

        <AutomationActionsMenu
          slug={slug}
          automation={automation}
          isPending={isPending}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          compact
        />
      </div>

      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${status === "Enabled" ? "bg-emerald-500" : status === "Needs review" ? "bg-red-500" : status === "Draft" ? "bg-blue-500" : "bg-amber-500"}`} />
          <UiText>{status}</UiText>
        </span>
        <span className="min-w-0 flex-1 text-[11px] text-slate-500 dark:text-slate-400">
          <MetricValue value={runs} /> <UiText>{"Runs"}</UiText>
          {" · "}
          <MetricValue value={leads} /> <UiText>{"Leads"}</UiText>
        </span>
        <AutomationToggle
          active={Boolean(automation.active)}
          onToggle={(next) => onActivate(automation.id, next)}
          compact
        />
      </div>
    </article>
  );
}

function CampaignDesktopRow({
  slug,
  automation,
  appReviewMode,
  messagingReviewMode,
  isPending,
  onActivate,
  onDuplicate,
  onDelete,
}: any) {
  const post = automation.posts?.[0];
  const source = automationSource(automation);
  const isAny = post?.postid === "ANY";
  const runs =
    automation.metrics?.runs ?? automation.listener?.commentCount ?? 0;
  const leads =
    automation.metrics?.leads ??
    automation.leads?.length ??
    automation._count?.leads ??
    0;
  const isAnyComment = automation.triggerMode === "ANY_COMMENT";
  const mode = getCampaignModeLabel(
    automation.sendPrivateDm === false,
    appReviewMode,
    messagingReviewMode,
  );
  const modeLabel =
    source === "DM"
      ? automation.listener?.aiDmReplyEnabled
        ? "AI DM replies active"
        : "Saved DM replies active"
      : source === "STORY"
        ? "Story automation"
        : mode.full;
  const status = campaignStatus(automation);
  const replySummary = getReplySummary(automation);

  return (
    <div onClick={(event) => openAnalyticsRow(event, automationAnalyticsHref(slug, automation))} className="cursor-pointer grid min-w-[1100px] grid-cols-[minmax(190px,1.6fr)_minmax(78px,.55fr)_minmax(118px,.8fr)_minmax(86px,.55fr)_minmax(68px,.42fr)_minmax(68px,.42fr)_minmax(84px,.52fr)_minmax(148px,.85fr)] items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <CampaignThumb post={post} isAny={isAny} source={source} />
          <div className="min-w-0 flex-1">
            <Link
              href={automationAnalyticsHref(slug, automation)}
              className="block max-w-full truncate font-black text-slate-950 hover:text-pink-600 dark:text-white"
            >
              {automation.name ? <bdi dir="auto">{automation.name}</bdi> : <UiText>{"Untitled automation"}</UiText>}
            </Link>
            {planPauseMessage(automation) && <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">{planPauseMessage(automation)}</p>}
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
              <span className="min-w-0 break-words"><UiText>{modeLabel}</UiText>{source === "STORY" && <> · <UiText>{storyTriggerLabel(automation.storyTriggerType)}</UiText></>}</span>
              {automation.currentAccountLabel && (
                <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500 light:text-slate-600 dark:bg-white/[0.07] dark:text-slate-400 2xl:inline-flex">
                  <bdi dir="ltr">{automation.currentAccountLabel}</bdi>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <span className="ap3k-badge ap3k-badge-slate">
          <UiText>{source === "STORY" ? "Story" : source === "DM" ? "DM" : "Post"}</UiText>
        </span>
      </div>
      <div className="min-w-0">
        {source === "STORY" ? (
          <span className="ap3k-badge ap3k-badge-pink">
            <UiText>{storyTriggerLabel(automation.storyTriggerType)}</UiText>
          </span>
        ) : source === "DM" && automation.triggerMode === "ANY_MESSAGE" ? (
          <span className="ap3k-badge ap3k-badge-blue"><UiText>{"Any DM"}</UiText></span>
        ) : isAnyComment ? (
          <span className="ap3k-badge ap3k-badge-blue"><UiText>{"Any"}</UiText></span>
        ) : (automation.keywords ?? []).length ? (
          <span className="ap3k-badge ap3k-badge-pink">
            {appReviewMode && <><UiText>{"Keyword"}</UiText>: </>}<bdi dir="auto">{String((automation.keywords ?? [])[0]?.word ?? "")}</bdi>
          </span>
        ) : (
          <span className="ap3k-badge ap3k-badge-slate"><UiText>{"No trigger"}</UiText></span>
        )}
      </div>
      <div className="min-w-0">
        <ReplyPill summary={replySummary} compact />
      </div>
      <div className="font-black text-slate-950 dark:text-white"><MetricValue value={runs} /></div>
      <div className="font-black text-slate-950 dark:text-white"><MetricValue value={leads} /></div>
      <div className="min-w-0">
        <StatusPill status={status} />
      </div>
      <div className="flex items-center justify-end gap-2">
        <AutomationToggle
          active={Boolean(automation.active)}
          onToggle={(next) => onActivate(automation.id, next)}
        />
        <AutomationActionsMenu
          slug={slug}
          automation={automation}
          isPending={isPending}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function AutomationToggle({
  active,
  onToggle,
  compact = false,
}: {
  active: boolean;
  onToggle: (next: boolean) => Promise<boolean>;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const [checked, setChecked] = useState(active);
  const [saving, setSaving] = useState(false);

  useEffect(() => setChecked(active), [active]);

  async function toggle() {
    if (saving) return;
    const previous = checked;
    const next = !previous;
    setChecked(next);
    setSaving(true);
    const saved = await onToggle(next);
    if (!saved) setChecked(previous);
    setSaving(false);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={translateUi(checked ? "Pause automation" : "Start automation", locale)}
      title={translateUi(checked ? "Pause automation" : "Start automation", locale)}
      disabled={saving}
      onClick={() => void toggle()}
      className={[
        "relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-out motion-reduce:transition-none",
        compact ? "h-11 w-11" : "h-7 w-12",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111827]",
        saving ? "cursor-wait opacity-70" : "cursor-pointer",
      ].join(" ")}
    >
      <span aria-hidden="true" className={`relative block rounded-full border transition-colors duration-200 motion-reduce:transition-none ${compact ? "h-6 w-11" : "h-7 w-12"} ${checked ? "border-emerald-500 bg-emerald-500 dark:border-emerald-400" : "border-slate-300 bg-slate-200 dark:border-white/10 dark:bg-white/[0.12]"}`}>
        <span className={`absolute left-[2px] top-[2px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out motion-reduce:transition-none ${compact ? "h-[18px] w-[18px]" : "h-5 w-5"} ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function AutomationActionsMenu({
  slug,
  automation,
  isPending,
  onDuplicate,
  onDelete,
  compact = false,
}: {
  slug: string;
  automation: any;
  isPending: boolean;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const [tool,setTool]=useState<AutomationTool|null>(null);
  const viewMedia=async()=>{
    const tab=window.open("about:blank","_blank");
    if(tab)tab.opener=null;
    try {
      const info=await getBacktrackInfo(automation.id);
      if(info.ok && info.media.length===1 && info.media[0].permalink && tab) { tab.location.replace(info.media[0].permalink); return; }
    } catch { /* The dialog provides a retryable error state. */ }
    tab?.close(); setTool("media");
  };
  const commentSource=automation.source === "COMMENT" || (automation.listener?.flowTriggers||[]).some((t:any)=>t.source==="COMMENT");
  return (
    <>
    {tool && <SavedAutomationTools key={`${automation.id}:${tool}`} automationId={automation.id} slug={slug} tool={tool} onClose={()=>setTool(null)}/>}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={translateUi("More automation actions", locale)}
          className={[
            "inline-flex shrink-0 items-center justify-center border border-slate-200 light:border-slate-300 bg-white text-slate-500 light:text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white",
            compact ? "h-11 w-11 rounded-xl border-transparent bg-transparent dark:border-transparent dark:bg-transparent" : "h-8 w-8 rounded-lg",
          ].join(" ")}
        >
          <MoreHorizontal className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={7} className="w-56 max-w-[calc(100vw-2rem)] rounded-xl p-1.5 [&_[role=menuitem]]:min-h-11">
        {commentSource && <DropdownMenuItem disabled={!automation.active} onSelect={()=>setTool("backtrack")}><History className="mr-2 h-4 w-4"/>Backtrack comments</DropdownMenuItem>}
        {commentSource && <DropdownMenuItem onSelect={()=>void viewMedia()}><ImageIcon className="mr-2 h-4 w-4"/>View Media</DropdownMenuItem>}
        <DropdownMenuItem onSelect={()=>setTool("scan")}><ShieldCheck className="mr-2 h-4 w-4"/>Run safety check</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={automationEditHref(slug, automation)}>
            <UiText>{automation.needsReview || automation.stalePost ? "Review setup" : "Edit automation"}</UiText>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={automationAnalyticsHref(slug, automation)}>
            <UiText>{"Analytics"}</UiText>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => onDuplicate(automation.id)}
        >
          <UiText>{"Duplicate automation"}</UiText>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isPending}
          onSelect={() => onDelete(automation.id)}
          className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10"
        >
          <UiText>{"Delete automation"}</UiText>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}

function PaginationFooter({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 light:border-slate-300 px-4 py-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-xs font-bold text-slate-500 light:text-slate-600 dark:text-slate-400">
        <UiMessage source="{start}–{end} of {total}" values={{ start: <MetricValue value={(page - 1) * pageSize + 1} />, end: <MetricValue value={Math.min(page * pageSize, total)} />, total: <MetricValue value={total} /> }} /> · <UiText>{"Automations"}</UiText>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="ap3k-table-action disabled:cursor-not-allowed disabled:opacity-40"
        ><UiText>{"Previous"}</UiText></button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={[
              "h-8 min-w-8 rounded-xl px-2 text-xs font-black transition-all duration-200",
              item === page
                ? "bg-rf-pink text-white shadow-ap3k-glow"
                : "border border-slate-200 light:border-slate-300 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-rf-pink/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
            ].join(" ")}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="ap3k-table-action disabled:cursor-not-allowed disabled:opacity-40"
        ><UiText>{"Next"}</UiText></button>
      </div>
    </div>
  );
}

function CampaignThumb({
  post,
  isAny,
  source,
  size = "sm",
}: {
  post: any;
  isAny: boolean;
  source: string;
  size?: "sm" | "lg";
}) {
  const { locale } = useI18n();
  const sizeClass = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  if (post?.media && !isAny) {
    return (
      <Image
        src={post.media}
        alt={post.caption ?? translateUi("Automation post", locale)}
        width={48}
        height={48}
        unoptimized
        className={`${sizeClass} flex-shrink-0 rounded-xl object-cover`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} grid flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-50 via-pink-50 to-indigo-50 text-xs font-black text-pink-600 light:text-pink-700 dark:border dark:border-white/10 dark:bg-[#0b1020] dark:bg-none dark:text-pink-300`}
    >
      {source === "STORY" ? "ST" : source === "DM" ? "DM" : isAny ? "∞" : "AP"}
    </div>
  );
}

function EmptyRows() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 light:border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500 light:text-slate-600 dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-slate-400"><UiText>{"No automations match your search."}</UiText></div>
  );
}

function campaignStatus(automation: any) {
  if (automation.archivedAt) return "Archived";
  if (automation.needsReview) return "Needs review";
  if (planPauseMessage(automation)) return "Plan paused";
  if (
    !automation.listener ||
    (automationSource(automation) === "COMMENT" && !automation.posts?.length)
  )
    return "Draft";
  return automation.active ? "Enabled" : "Paused";
}

function automationSource(automation: any) {
  return automation.source === "STORY" || automation.source === "DM"
    ? automation.source
    : "COMMENT";
}

function storyTriggerLabel(value: string) {
  if (value === "REACTION") return "Reaction";
  if (value === "REPLY") return "Reply";
  return "Mention";
}

function automationAnalyticsHref(slug: string, automation: any) {
  return `/dashboard/${encodeURIComponent(slug)}/automation/${encodeURIComponent(automation.id)}/analytics`;
}

function automationEditHref(slug: string, automation: any) {
  const source = automationSource(automation).toLowerCase();
  return `/dashboard/${slug}/automation/new?edit=${automation.id}&type=${source}`;
}

function StatusPill({ status }: { status: string }) {
  const classes =
    status === "Enabled"
      ? "ap3k-badge-green"
      : status === "Needs review"
        ? "ap3k-badge-red"
        : status === "Draft"
          ? "ap3k-badge-blue"
          : "ap3k-badge-amber";
  return (
    <span className={`ap3k-badge whitespace-normal break-words ${classes}`}><UiText>{status}</UiText></span>
  );
}

function getReplySummary(automation: any): ReplySummary {
  const hasCommentReply = Boolean(
    automation.listener?.commentReply ||
    automation.listener?.commentReply2 ||
    automation.listener?.commentReply3,
  );
  const hasDm =
    automation.sendPrivateDm !== false && Boolean(automation.listener?.prompt);
  const activeTone =
    automation.active && !automation.needsReview ? "green" : "amber";

  if (hasCommentReply && hasDm)
    return { label: "Comment + DM", compactLabel: "Both", tone: activeTone };
  if (hasCommentReply)
    return {
      label: "Comment reply",
      compactLabel: "Comment",
      tone: activeTone,
    };
  if (hasDm) return { label: "DM", compactLabel: "DM", tone: activeTone };
  return { label: "Not set", compactLabel: "Off", tone: "slate" };
}

function ReplyPill({
  summary,
  compact = false,
}: {
  summary: ReplySummary;
  compact?: boolean;
}) {
  const { locale } = useI18n();
  const toneClass =
    summary.tone === "green"
      ? "ap3k-badge-green"
      : summary.tone === "amber"
        ? "ap3k-badge-amber"
        : "ap3k-badge-slate";
  return (
    <span
      title={translateUi(summary.label, locale)}
      className={`ap3k-badge whitespace-normal break-words ${toneClass}`}
    >
      <UiText>{compact ? summary.compactLabel : summary.label}</UiText>
    </span>
  );
}

function openAnalyticsRow(event: React.MouseEvent<HTMLElement>, href: string) {
  const target = event.target as HTMLElement;
  if (event.defaultPrevented || target.closest("a,button,input,select,[role=menuitem],[role=menu]") || window.getSelection()?.toString()) return;
  const link = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>("a")).find(item => item.getAttribute("href") === href);
  link?.click();
}
