"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  CirclePlay,
  GitBranch,
  Layers3,
  LayoutGrid,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TEMPLATES, templateEditorType } from "@/lib/automation-flow/templates";
import { UiText } from "@/components/i18n/localized-copy";

const quick = [
  {
    name: "Post automation",
    description: "Replies when someone comments on a post or reel",
    type: "comment",
    Icon: Clapperboard,
    color: "from-violet-500 to-blue-500",
  },
  {
    name: "Story automation",
    description: "Replies to story replies and reactions",
    type: "story",
    Icon: CirclePlay,
    color: "from-fuchsia-500 to-violet-500",
  },
  {
    name: "Chat automation",
    description: "Replies to keywords sent in DMs",
    type: "dm",
    Icon: MessageCircle,
    color: "from-orange-400 to-pink-500",
  },
];
export default function AutomationTypePicker({ slug }: { slug: string }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const go = (type: string, query = "") =>
    router.push(`/dashboard/${slug}/automation/new?type=${type}${query}`);
  const matches = TEMPLATES.filter(
    (t) =>
      (filter === "all" || t.group === filter) &&
      `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const card =
    "group bg-white text-left shadow-[0_4px_16px_rgba(15,15,18,0.09)] transition duration-150 hover:shadow-[0_6px_20px_rgba(15,15,18,0.13)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-[#1b2334] dark:shadow-none dark:hover:bg-[#242e44]";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) router.push(`/dashboard/${slug}/automation`);
      }}
    >
      <DialogContent
        className={`font-sans flex max-h-[92svh] w-full flex-col gap-0 overflow-hidden border-0 bg-[#f2f2f2] p-0 text-[#111] dark:bg-[#111827] dark:text-slate-100 max-md:bottom-0 max-md:left-0 max-md:top-auto max-md:max-w-full max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-b-none max-md:rounded-t-[26px] md:w-[92vw] md:rounded-[30px] ${templates ? "md:max-w-[896px]" : "md:max-w-[620px]"}`}
      >
        <header className="flex shrink-0 items-center gap-3 px-[22px] pb-5 pt-[26px] pe-16">
          {templates && (
            <button
              aria-label="Back to new automation"
              onClick={() => setTemplates(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white shadow-sm dark:bg-slate-800"
            >
              <ArrowLeft size={17} />
            </button>
          )}
          <div>
            <p className="text-[13px] text-slate-500 light:text-slate-600 dark:text-slate-400">
              <UiText>{templates ? "New automation" : "Create"}</UiText>
            </p>
            <DialogTitle className="mt-0.5 text-[23px] font-bold tracking-[-.23px]">
              <UiText>{templates ? "Templates" : "New automation"}</UiText>
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Choose a quick automation, an advanced flow, or browse ready-made
            templates.
          </DialogDescription>
        </header>
        {templates ? (
          <>
            <div className="flex shrink-0 flex-col gap-3 px-[22px] pb-5 sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-4 py-3 dark:bg-slate-800">
                <Search
                  size={16}
                  className="text-slate-500 light:text-slate-600 dark:text-slate-400"
                />
                <input
                  aria-label="Search templates"
                  placeholder={`Search ${TEMPLATES.length} templates…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base outline-none md:text-[13px]"
                />
              </label>
              <div
                role="tablist"
                aria-label="Template type"
                className="flex w-fit rounded-full bg-black/[.04] p-1 dark:bg-white/5"
              >
                {["all", "basic", "flow"].map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={filter === v}
                    onClick={() => setFilter(v)}
                    className={`rounded-full px-4 py-2 text-xs capitalize transition ${filter === v ? "bg-white shadow-sm dark:bg-slate-700" : "text-slate-500 light:text-slate-600 dark:text-slate-400"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-[22px] pb-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {matches.map((t) => {
                  const Icon =
                    t.group === "flow"
                      ? GitBranch
                      : t.trigger === "story"
                        ? CirclePlay
                        : t.trigger === "dm"
                          ? MessageCircle
                          : Clapperboard;
                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        go(
                          templateEditorType(t.id),
                          `&template=${t.id}${t.group === "basic" ? "&editor=basic" : ""}`,
                        )
                      }
                      className={`${card} flex min-h-[168px] flex-col items-start rounded-[20px] p-4`}
                    >
                      <h3 className="text-[14px] font-semibold leading-[21px]">
                        <UiText>{t.name}</UiText>
                      </h3>
                      <p className="mt-2 flex-1 text-[12px] leading-[18px] text-[#83838a] dark:text-slate-400">
                        <UiText>{t.description}</UiText>
                      </p>
                      <div className="mt-4 flex w-full items-center gap-2 text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400">
                        <Icon size={17} className="text-violet-500 light:text-violet-700" />
                        <span>
                          {t.group === "flow"
                            ? "Flow"
                            : t.id === "shared-post" || t.trigger === "comment"
                              ? "Post automation"
                              : t.trigger === "story"
                                ? "Story automation"
                                : "Chat automation"}
                        </span>
                        {t.popular && (
                          <span className="ms-auto rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                            Popular
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {!matches.length && (
                <p className="py-12 text-center text-sm text-slate-500 light:text-slate-600">
                  No templates match your search.
                </p>
              )}
            </div>
            <footer className="flex shrink-0 justify-between border-t border-black/5 px-[22px] py-4 text-xs text-slate-500 light:text-slate-600 dark:border-white/5 dark:text-slate-400">
              <span>Showing {matches.length} of {TEMPLATES.length} templates</span>
              <span>Scroll for more</span>
            </footer>
          </>
        ) : (
          <div className="min-h-0 overflow-y-auto overscroll-contain px-[22px] pb-5">
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-base font-bold">Quick automations</h2>
              <span className="text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400">
                ready in a minute
              </span>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              {quick.map(({ name, description, type, Icon, color }) => (
                <button
                  key={type}
                  onClick={() => go(type)}
                  className={`${card} flex flex-1 items-center gap-[13px] rounded-[20px] px-[15px] py-4 md:flex-col md:items-start md:gap-0 md:rounded-[22px]`}
                >
                  <span
                    className={`grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-gradient-to-br text-white ${color}`}
                  >
                    <Icon size={23} />
                  </span>
                  <span className="min-w-0 md:mt-3">
                    <strong className="block text-sm font-semibold">
                      {name}
                    </strong>
                    <span className="mt-1 block text-[11.5px] leading-[1.45] text-slate-500 light:text-slate-600 dark:text-slate-400">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mb-3 mt-[26px] flex items-baseline gap-2 px-1">
              <h2 className="text-base font-bold">Advanced flows</h2>
              <span className="text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400">
                multi-step, full control
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  title: "Flow builder",
                  subtitle: "Drag and connect the steps yourself",
                  ai: false,
                  Icon: GitBranch,
                },
                {
                  title: "AI assisted flow builder",
                  subtitle: "Describe your goal, we build the flow",
                  ai: true,
                  Icon: Sparkles,
                },
              ].map(({ title, subtitle, ai, Icon }) => (
                <button
                  key={title}
                  onClick={() => go("flow", ai ? "&assistant=1" : "")}
                  className={`${card} flex w-full items-center gap-3.5 rounded-[22px] p-4`}
                >
                  <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <Icon size={23} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold">
                      {title}
                      {ai && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          FASTEST
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-slate-500 light:text-slate-600 dark:text-slate-400">
                      {subtitle}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="text-slate-500 light:text-slate-600 dark:text-slate-400"
                  />
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-0.5 border-t border-black/[.07] pt-3 dark:border-white/10">
              {[
                {
                  Icon: Layers3,
                  title: "Set up a conversation starter",
                  sub: "buttons shown before someone messages you",
                  run: () => go("starters"),
                },
                {
                  Icon: LayoutGrid,
                  title: "Browse templates",
                  sub: `${TEMPLATES.length} ready-made automations`,
                  run: () => setTemplates(true),
                },
              ].map(({ Icon, title, sub, run }) => (
                <button
                  key={title}
                  onClick={run}
                  className="flex min-h-11 w-full items-center gap-[11px] rounded-xl px-1.5 py-2 text-left transition hover:bg-black/[.03] dark:hover:bg-white/5"
                >
                  <Icon size={17} className="shrink-0 text-slate-500 light:text-slate-600" />
                  <span className="flex-1 text-[12.5px] text-slate-700 dark:text-slate-300">
                    {title}{" "}
                    <span className="text-slate-500 light:text-slate-600 dark:text-slate-400">
                      · {sub}
                    </span>
                  </span>
                  <ArrowRight
                    size={14}
                    className="shrink-0 text-slate-500 light:text-slate-600 dark:text-slate-400"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
