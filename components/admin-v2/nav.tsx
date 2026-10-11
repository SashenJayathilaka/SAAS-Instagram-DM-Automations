"use client";
import Link from "next/link";
import ThemeToggle from "@/components/global/theme-toggle";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleGauge,
  CreditCard,
  ExternalLink,
  FileSearch,
  Instagram,
  MailCheck,
  Menu,
  PanelLeftClose,
  Search,
  ShieldCheck,
  Sparkles,
  ScrollText,
  Stethoscope,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

const groups = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/admin/overview", icon: CircleGauge },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "AI assistant", href: "/admin/assistant", icon: Sparkles },
    ],
  },
  {
    label: "Customers & operations",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Instagram accounts", href: "/admin/accounts", icon: Instagram },
      { label: "Automations", href: "/admin/campaigns", icon: Workflow },
      { label: "Billing", href: "/admin/billing", icon: CreditCard },
      { label: "Referral withdrawals", href: "/admin/referrals", icon: CreditCard },
      { label: "Email Center", href: "/admin/emails", icon: MailCheck },
      { label: "Acquisition", href: "/admin/acquisition", icon: MailCheck },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Content studio", href: "/admin/content", icon: BookOpen },
      { label: "SEO workspace", href: "/admin/seo", icon: FileSearch },
    ],
  },
  {
    label: "Reliability",
    items: [
      { label: "Diagnostics", href: "/admin/diagnostics", icon: Stethoscope },
      { label: "Activity", href: "/admin/activity", icon: Activity },
      { label: "Audit", href: "/admin/audit", icon: ScrollText },
      { label: "System & Safety", href: "/admin/system", icon: ShieldCheck },
    ],
  },
];
export function AdminV2Nav({
  email,
  environment = "Protected",
}: {
  email?: string | null;
  environment?: string;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(false),
    [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    document
      .querySelector(".admin-shell")
      ?.setAttribute("data-collapsed", String(collapsed));
  }, [collapsed]);
  const current = groups
    .flatMap((g) => g.items)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const navigation = (compact = false) => (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.label}>
          <p
            className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground ${compact ? "sr-only" : ""}`}
          >
            {g.label}
          </p>
          <nav aria-label={g.label} className="space-y-1">
            {g.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  title={compact ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${active ? "bg-violet-500/15 text-violet-700 dark:text-violet-200" : "text-muted-foreground dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-100"}`}
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!compact && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </section>
      ))}
    </div>
  );
  return (
    <>
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0f17] px-3 py-5 lg:flex ${collapsed ? "w-[76px]" : "w-[248px]"}`}
      >
        <Link href="/admin/overview" className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-sm font-bold text-white">
            A3
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">AP3K</p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400">Owner workspace</p>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          onClick={() => setSearch(true)}
          aria-label="Search admin workspace"
          className="mt-6 justify-start gap-3 px-3 text-muted-foreground dark:text-slate-400"
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-xs">Quick navigation</span>
              <kbd className="text-[10px]">⌘ K</kbd>
            </>
          )}
        </Button>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          {navigation(collapsed)}
        </div>
        <div className="mt-4 space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
          {!collapsed && (
            <div className="px-3">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                {environment}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">
                {email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-muted-foreground dark:text-slate-400"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <PanelLeftClose
              className={`h-4 w-4 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>
      <div className="admin-topbar sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0b0e16]/95 px-4 backdrop-blur-md sm:px-6 lg:ml-[248px]">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            className="lg:hidden"
            size="icon"
            variant="ghost"
            aria-label="Open admin navigation"
            onClick={() => setMobile(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Workspace
          </span>
          <ChevronRight className="hidden h-3 w-3 text-muted-foreground sm:block" />
          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
            {current?.label || "Administration"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <span className="hidden rounded-md border border-slate-200 dark:border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400 sm:block">
            {environment}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Search admin workspace"
            onClick={() => setSearch(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              Open app
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
      <Dialog open={mobile} onOpenChange={setMobile}>
        <DialogContent className="admin-dialog inset-y-0 left-0 right-auto top-0 flex h-[100dvh] max-h-[100dvh] w-[min(88vw,320px)] translate-x-0 translate-y-0 flex-col rounded-none border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0f17] p-5 text-slate-950 dark:text-white">
          <DialogTitle>AP3K workspace</DialogTitle>
          <DialogDescription className="sr-only">
            Owner administration navigation
          </DialogDescription>
          <div className="min-h-0 flex-1 overflow-y-auto">{navigation()}</div>
          <p className="truncate text-xs text-muted-foreground dark:text-slate-400">{email}</p>
        </DialogContent>
      </Dialog>
      <Dialog open={search} onOpenChange={setSearch}>
        <DialogContent className="admin-dialog overflow-hidden border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-0 text-slate-950 dark:text-white">
          <DialogTitle className="sr-only">Search admin workspace</DialogTitle>
          <DialogDescription className="sr-only">
            Navigate to an admin section
          </DialogDescription>
          <Command>
            <CommandInput placeholder="Where do you want to go?" />
            <CommandList>
              <CommandEmpty>No matching sections.</CommandEmpty>
              {groups.map((g) => (
                <CommandGroup heading={g.label} key={g.label}>
                  {g.items.map((i) => (
                    <CommandItem
                      key={i.href}
                      value={i.label}
                      onSelect={() => {
                        setSearch(false);
                        router.push(i.href);
                      }}
                    >
                      <i.icon className="mr-3 h-4 w-4" />
                      {i.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
