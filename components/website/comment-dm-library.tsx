import Link from "next/link";
import { COMMENT_DM_HUB, COMMENT_DM_POSTS } from "@/lib/content/comment-dm";

/** Crawlable topic navigation, rendered on the server without loading every article in a client widget. */
export default function CommentDmLibrary({ expanded = false }: { expanded?: boolean }) {
  const groups = Array.from(new Set(COMMENT_DM_POSTS.map(post => post.category)));
  return (
    <aside lang="en" dir="ltr" translate="no" className="my-10 rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-400/20 dark:bg-violet-400/[0.06] sm:p-7">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
        {expanded ? "Explore the comment-to-DM library" : <Link href={COMMENT_DM_HUB} prefetch={false} className="underline decoration-violet-300 underline-offset-4">Instagram comment to DM automation</Link>}
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">A practical guide and 49 focused articles covering setup, messages, campaign ideas, troubleshooting, and measurement. These new guides are available in English.</p>
      {expanded ? <div className="mt-6 grid gap-7 sm:grid-cols-2">
        {groups.map(group => <section key={group}>
          <h3 className="font-bold">{group}</h3>
          <ul className="mt-3 space-y-2">
            {COMMENT_DM_POSTS.filter(post => post.category === group && `/blog/${post.slug}` !== COMMENT_DM_HUB).map(post => <li key={post.slug}>
              <Link href={`/blog/${post.slug}`} prefetch={false} className="inline-block py-1 text-sm leading-6 text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-violet-700 focus-visible:outline-violet-500 dark:text-slate-300 dark:hover:text-violet-300">{post.title}</Link>
            </li>)}
          </ul>
        </section>)}
      </div> : <Link href={COMMENT_DM_HUB} prefetch={false} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500">Start with the practical guide →</Link>}
    </aside>
  );
}
