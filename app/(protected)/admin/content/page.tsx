import Link from "next/link";
import { Plus, ArrowUpRight, FileText } from "lucide-react";
import { requireOwnerAdmin } from "@/lib/admin";
import { client } from "@/lib/prisma";
import { BLOG_POSTS, type BlogPost } from "@/lib/blog";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { Button } from "@/components/ui/button";

export default async function ContentPage(
  props: {
    searchParams: Promise<{ q?: string; status?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  await requireOwnerAdmin();
  const rows = await client.editorialPost.findMany({
    orderBy: { updatedAt: "desc" },
  });
  const map = new Map(
    BLOG_POSTS.map((post) => [
      post.slug,
      { post, status: "Published", version: 0 },
    ]),
  );
  rows.forEach((r) =>
    map.set(r.slug, {
      post: r.draft as BlogPost,
      status: r.hidden
        ? "Unpublished"
        : r.published
          ? JSON.stringify(r.draft) === JSON.stringify(r.published)
            ? "Published"
            : "Draft changes"
          : "Draft",
      version: r.version,
    }),
  );
  const all = Array.from(map.values());
  const q =
    typeof searchParams.q === "string"
      ? searchParams.q.toLowerCase().slice(0, 120)
      : "";
  const filtered = all.filter(
    (r) =>
      (!q ||
        `${r.post.title} ${r.post.slug} ${r.post.category}`
          .toLowerCase()
          .includes(q)) &&
      (!searchParams.status || r.status === searchParams.status),
  );
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Growth workspace"
        title="Content studio"
        description="Your entire article library. Draft safely, preview, then publish when ready."
        actions={
          <Button asChild>
            <Link href="/admin/content/new">
              <Plus className="mr-2 h-4 w-4" />
              New article
            </Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Articles", all.length],
          [
            "Drafts & pending edits",
            all.filter((r) => r.status.startsWith("Draft")).length,
          ],
          [
            "Published",
            all.filter(
              (r) => r.status === "Published" || r.status === "Draft changes",
            ).length,
          ],
        ].map(([label, value]) => (
          <div key={label} className="admin-panel">
            <p className="text-sm text-muted-foreground dark:text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <form className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="content-search">
          Search articles
        </label>
        <input
          id="content-search"
          className="admin-input min-w-0 flex-1"
          name="q"
          defaultValue={q}
          placeholder="Search articles, categories or URLs"
          maxLength={120}
        />
        <select
          name="status"
          aria-label="Publication status"
          defaultValue={searchParams.status || ""}
          className="admin-input !w-auto"
        >
          <option value="">All statuses</option>
          {["Published", "Draft", "Draft changes", "Unpublished"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button variant="outline">Filter</Button>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.025] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
          <span>Article / search visibility</span>
          <span>State</span>
        </div>
        {filtered.length ? (
          filtered.map(({ post, status }) => (
            <Link
              key={post.slug}
              href={`/admin/content/${post.slug}`}
              className="group flex items-center gap-4 border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#10141e] p-5 last:border-0 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
            >
              <FileText className="hidden h-5 w-5 shrink-0 text-violet-700 dark:text-violet-300 sm:block" />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                  {post.title}
                </h2>
                <p className="mt-1 break-all text-xs text-muted-foreground dark:text-slate-400">
                  /blog/{post.slug} ·{" "}
                  {post.noIndex ? "Noindex" : "Indexing allowed"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${status === "Published" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-800 dark:text-amber-200"}`}
              >
                {status}
              </span>
              <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </Link>
          ))
        ) : (
          <p className="p-8 text-sm text-muted-foreground dark:text-slate-400">
            No articles match these filters.
          </p>
        )}
      </div>
    </div>
  );
}
