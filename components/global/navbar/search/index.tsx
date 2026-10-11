"use client";

import { Input } from "@/components/ui/input";
import type { WorkspaceSearchItem, WorkspaceSearchResults } from "@/lib/workspace-search";
import { Loader2, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/providers/i18n-provider";

const EMPTY_RESULTS: WorkspaceSearchResults = { campaigns: [], keywords: [], leads: [] };

type SearchResponse = {
  results?: WorkspaceSearchResults;
  error?: { message?: string };
};

type SearchSection = {
  label: string;
  items: WorkspaceSearchItem[];
};

export default function Search() {
  const { t } = useI18n();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResults>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const sections = useMemo<SearchSection[]>(() => [
    { label: t("automations"), items: results.campaigns },
    { label: t("keywords"), items: results.keywords },
    { label: t("leads"), items: results.leads },
  ], [results, t]);
  const allItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const trimmedQuery = query.trim();
  const canSearch = trimmedQuery.length >= 2;
  const hasResults = allItems.length > 0;

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!canSearch) {
      setResults(EMPTY_RESULTS);
      setError(null);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    setIsOpen(true);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmedQuery });
        const response = await fetch(`/api/dashboard/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as SearchResponse;

        if (requestId !== requestIdRef.current) return;
        if (!response.ok || !payload.results) {
          throw new Error(payload.error?.message || t("searchUnavailable"));
        }

        setResults(payload.results);
        setActiveIndex(-1);
      } catch (caught) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setResults(EMPTY_RESULTS);
        setError(caught instanceof Error ? caught.message : t("searchUnavailable"));
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [canSearch, trimmedQuery, t]);

  function navigateTo(item: WorkspaceSearchItem) {
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(item.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!hasResults || (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter")) return;

    if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        navigateTo(allItems[activeIndex]);
      }
      return;
    }

    event.preventDefault();
    setIsOpen(true);
    setActiveIndex((current) => {
      if (event.key === "ArrowDown") return current >= allItems.length - 1 ? 0 : current + 1;
      return current <= 0 ? allItems.length - 1 : current - 1;
    });
  }

  let itemIndex = -1;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-x-2 rounded-xl border border-slate-200 light:border-slate-300 bg-white/70 px-3 py-0.5 shadow-sm focus-within:border-pink-300 focus-within:ring-2 focus-within:ring-pink-100 dark:border-white/10 dark:bg-white/[0.035] dark:focus-within:border-rf-blue/60 dark:focus-within:ring-rf-blue/20">
        {isLoading ? (
          <Loader2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin text-rf-pink" />
        ) : (
          <SearchIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400 light:text-slate-600 dark:text-slate-500" />
        )}
        <Input
          value={query}
          maxLength={100}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => canSearch && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && canSearch}
          aria-controls="workspace-search-results"
          aria-activedescendant={activeIndex >= 0 ? `workspace-search-result-${activeIndex}` : undefined}
          className="h-9 min-w-0 flex-1 border-none bg-transparent px-0 text-sm text-slate-950 shadow-none outline-none ring-0 placeholder:text-slate-400 light:placeholder:text-slate-600 focus:ring-0 dark:bg-transparent dark:text-slate-50 dark:placeholder:text-slate-500"
        />
      </div>

      {isOpen && canSearch && (
        <div
          id="workspace-search-results"
          role="listbox"
          aria-label={t("searchResults")}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(420px,70vh)] min-w-0 overflow-y-auto rounded-2xl border border-slate-200 light:border-slate-300 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#101827]"
        >
          {isLoading && !hasResults ? (
            <p role="status" className="px-3 py-5 text-center text-sm font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400">{t("searching")}</p>
          ) : error ? (
            <p role="alert" className="px-3 py-5 text-center text-sm font-semibold text-red-600 dark:text-red-300">{error}</p>
          ) : !hasResults ? (
            <p role="status" className="px-3 py-5 text-center text-sm font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400">{t("noResults")}: “{trimmedQuery}”.</p>
          ) : (
            sections.map((section) => section.items.length > 0 && (
              <div key={section.label} role="group" aria-label={section.label} className="py-1">
                <p className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 light:text-slate-600 dark:text-slate-500">{section.label}</p>
                {section.items.map((item) => {
                  itemIndex += 1;
                  const index = itemIndex;
                  return (
                    <button
                      key={item.id}
                      id={`workspace-search-result-${index}`}
                      type="button"
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => navigateTo(item)}
                      className={`flex min-h-11 w-full min-w-0 flex-col justify-center rounded-xl px-3 py-2.5 text-left transition-colors ${
                        activeIndex === index
                          ? "bg-pink-50 text-slate-950 dark:bg-rf-pink/10 dark:text-white"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="w-full truncate text-sm font-black">{item.title}</span>
                      <span className="mt-0.5 w-full truncate text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">{item.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
