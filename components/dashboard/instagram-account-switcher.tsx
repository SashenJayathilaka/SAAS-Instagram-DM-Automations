"use client";

import { createPortal } from "react-dom";
import { UiText } from "@/components/i18n/localized-copy";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Loader2, Lock, Plus, Settings } from "lucide-react";
import { getInstagramAccountMenu, switchInstagramAccount } from "@/actions/instagram-accounts";
import { getInstagramConnectUrl } from "@/actions/integration";
import { useI18n } from "@/providers/i18n-provider";
import { ACCOUNT_SWITCHER_COPY } from "@/lib/i18n/account-switcher-copy";
import InstagramAvatar from "@/components/dashboard/instagram-avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function InstagramAccountSwitcher({ slug, expanded = true }: { slug: string; expanded?: boolean }) {
  const { locale } = useI18n();
  const copy = ACCOUNT_SWITCHER_COPY[locale];
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["instagram-account-menu", slug], queryFn: getInstagramAccountMenu });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = data?.accounts.find((account) => account.id === data.selectedId);
  const atLimit = data && data.limit !== "unlimited" && data.used >= data.limit;

  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === "ap3k-account-changed") window.location.assign(`/dashboard/${slug}`);
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [slug]);

  async function switchTo(id: string) {
    if (busy || id === data?.selectedId) return;
    if (/\/automation\/(new|[^/]+\/edit)/.test(pathname) && !window.confirm(copy.draft)) return;
    setBusy(true); setError("");
    try {
      const result = await switchInstagramAccount(id);
      if (!result.ok) throw new Error();
      await queryClient.cancelQueries();
      queryClient.clear();
      window.localStorage.setItem("ap3k-account-changed", `${id}:${Date.now()}`);
      // A fresh document discards cached forms, conversations and in-flight
      // requests from the previous account, including account-specific drafts.
      const section = pathname.split("/")[3];
      const safe = ["automation", "contacts", "inbox", "ai", "account"].includes(section) ? `/${section}` : "";
      window.location.assign(`/dashboard/${slug}${safe}`);
    } catch { setError(copy.failed); setBusy(false); }
  }

  async function connect() {
    setBusy(true); setError("");
    try {
      const result = await getInstagramConnectUrl();
      if (result.status !== 200 || !result.url) throw new Error();
      window.location.assign(result.url);
    } catch { setError(copy.failed); setBusy(false); }
  }

  return <div className="relative mt-4" dir="ltr">
    <DropdownMenu dir="ltr">
      <DropdownMenuTrigger disabled={busy} aria-busy={busy} aria-label={copy.accounts} className={`flex w-full items-center rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 text-start outline-none transition hover:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-white/10 dark:bg-white/[0.06] ${expanded ? "gap-2 p-2.5" : "justify-center p-0.5"}`}>
        <InstagramAvatar src={selected?.profilePictureUrl} username={selected?.instagramUsername} size="sm" />
        {expanded && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{selected?.instagramUsername ? <bdi dir="ltr">@{selected.instagramUsername}</bdi> : copy.empty}</span><span className="mt-0.5 block text-[11px] font-bold text-violet-700 dark:text-violet-300"><UiText>{data?.plan === "BUSINESS" ? "Business" : data?.plan === "PRO" ? "Pro" : "Free"}</UiText> · {data?.used ?? 0}/{data?.limit ?? 1}</span></span>}
        {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : expanded && <ChevronDown className="h-4 w-4 shrink-0" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[100] w-72 max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>{copy.accounts}</DropdownMenuLabel>
        <div className="max-h-64 overflow-y-auto">
          {data?.accounts.map((account) => <DropdownMenuItem key={account.id} disabled={busy} onSelect={() => account.planLocked ? window.location.assign(`/dashboard/${slug}/billing`) : void switchTo(account.id)} className={`gap-2 py-2 ${account.id === data.selectedId ? "bg-accent" : ""}`}>
            <InstagramAvatar src={account.profilePictureUrl} username={account.instagramUsername} size="sm" />
            <span className="min-w-0 flex-1"><bdi dir="ltr" className="block truncate">@{account.instagramUsername ?? "Instagram"}</bdi>{(account.planLocked || account.status === "DISCONNECTED") && <span className="text-xs text-slate-500 light:text-slate-600">{account.planLocked ? copy.locked : copy.disconnected}</span>}</span>
            {account.planLocked ? <Lock className="h-4 w-4" /> : account.id === data.selectedId && <Check className="h-4 w-4 text-violet-500 light:text-violet-700" />}
          </DropdownMenuItem>)}
        </div>
        <DropdownMenuSeparator />
        {selected?.status === "CONNECTED" && <DropdownMenuItem asChild><Link href={`/dashboard/${slug}/account`} className="gap-2"><Settings className="h-4 w-4" />{copy.manage}</Link></DropdownMenuItem>}
        {data?.additionsEnabled && (atLimit ? <DropdownMenuItem asChild><Link href={`/dashboard/${slug}/${data.plan === "BUSINESS" ? "account" : "billing"}`} className="gap-2 text-violet-600"><Plus className="h-4 w-4 shrink-0" />{data.plan === "BUSINESS" ? copy.manage : copy.upgrade}</Link></DropdownMenuItem> : <DropdownMenuItem disabled={busy || !data} onSelect={() => void connect()} className="gap-2 text-violet-600"><Plus className="h-4 w-4" />{copy.add}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
    {error && <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>}
    {busy && createPortal(<div role="status" className="fixed inset-0 z-[110] flex items-center justify-center gap-3 bg-white/90 text-sm font-bold backdrop-blur-sm dark:bg-slate-950/90"><Loader2 className="h-5 w-5 animate-spin" />{copy.switching}</div>, document.body)}
  </div>;
}
