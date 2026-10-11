import Link from "next/link";
import { requireOwnerAdmin } from "@/lib/admin";
import { getPublishedPosts } from "@/lib/editorial-server";
import { editorialChecks } from "@/lib/editorial";
import { AdminPageHeader } from "@/components/admin-v2/page-header";
import { COMMERCIAL_PAGES } from "@/lib/commercial-pages";
import { Button } from "@/components/ui/button";

export default async function SeoPage() {
  await requireOwnerAdmin();
  const posts = await getPublishedPosts();
  const review = posts.map((post) => ({
    post,
    issues: editorialChecks(post).filter((c) => !c.ok),
  }));
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Search visibility"
        title="SEO workspace"
        description="Control article search titles, descriptions and indexing. Find editorial gaps without confusing a checklist with Google rankings."
        actions={
          <Button asChild>
            <Link href="/admin/analytics">Search performance →</Link>
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Indexable articles", posts.filter((p) => !p.noIndex).length],
          ["Noindex articles", posts.filter((p) => p.noIndex).length],
          [
            "Articles to review",
            review.filter((p) => p.issues.length > 0).length,
          ],
        ].map(([label, value]) => (
          <div key={label} className="admin-panel">
            <p className="text-sm text-muted-foreground dark:text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="admin-panel space-y-3">
          <h2 className="font-semibold">Indexing safeguards</h2>
          <p className="text-sm leading-6 text-muted-foreground dark:text-slate-400">
            Admin, authentication and private application routes stay outside
            the sitemap. Drafts are owner-only. Unpublished posts return 404.
            Noindex articles remain readable but are excluded from the sitemap.
          </p>
          <div className="flex gap-4 text-sm text-violet-700 dark:text-violet-300">
            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
              View sitemap ↗
            </a>
            <a href="/robots.txt" target="_blank" rel="noreferrer">
              View robots.txt ↗
            </a>
          </div>
        </div>
        <div className="admin-panel space-y-3">
          <h2 className="font-semibold">What you control here</h2>
          <p className="text-sm leading-6 text-muted-foreground dark:text-slate-400">
            Article title, search title, description, keywords, content,
            imagery, publication and noindex. Canonical URLs follow the stable
            slug; article schema is generated automatically. Global routing and
            robots rules remain protected in code.
          </p>
          <Link
            href="/admin/content"
            className="inline-block text-sm text-violet-700 dark:text-violet-300"
          >
            Open content studio →
          </Link>
        </div>
      </div>
      <section className="admin-panel">
        <h2 className="font-semibold">Editorial opportunities</h2>
        <p className="mt-2 text-xs text-muted-foreground dark:text-slate-400">
          Suggestions to review, not technical errors or a promise of higher
          rankings.
        </p>
        <div className="mt-5 divide-y divide-slate-200 dark:divide-white/10">
          {review
            .filter((r) => r.issues.length)
            .map(({ post, issues }) => (
              <Link
                key={post.slug}
                href={`/admin/content/${post.slug}`}
                className="block py-4 hover:text-violet-700 dark:hover:text-violet-300"
              >
                <h3 className="text-sm font-semibold">{post.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground dark:text-slate-400">
                  {issues.map((c) => c.label).join(" · ")}
                </p>
              </Link>
            ))}
          {review.every((r) => !r.issues.length) && (
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              No checklist gaps found. Keep monitoring real search performance.
            </p>
          )}
        </div>
      </section>
      <section className="admin-panel">
        <h2 className="font-semibold">Commercial landing pages</h2>
        <p className="mt-2 text-xs text-muted-foreground dark:text-slate-400">
          Code-managed pages preserve their product logic and structured
          metadata. Review the live experience here.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {COMMERCIAL_PAGES.map((p) => (
            <a
              key={p.slug}
              href={`/${p.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-sm text-slate-800 dark:text-slate-300 hover:border-violet-400/40"
            >
              /{p.slug} ↗
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
