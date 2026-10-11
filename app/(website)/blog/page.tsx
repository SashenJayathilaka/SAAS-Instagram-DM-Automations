import { blogArchiveCopy } from "@/lib/blog-archive-metadata";
import { blogSans, blogSerif } from "@/components/website/blog-fonts";
import AP3KLogo from "@/components/global/ap3k-logo";
import BlogCover from "@/components/website/blog-cover";
import s from "@/components/website/public-pages.module.css";
import { notFound, redirect } from "next/navigation";
import { getEditorialArchive, blogPaginationItems, getBlogDirectory } from "@/lib/blog-archive";
import e from "@/components/website/blog-editorial.module.css";
import { Search, ArrowLeft, ArrowRight } from "lucide-react";
import { blogPagePath, getBlogPage } from "@/lib/blog-pagination";
import { getServerLocale } from "@/lib/i18n/server";
import { localizePublicPath } from "@/lib/i18n/config";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import { getPublishedPosts } from "@/lib/editorial-server";

export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";

const pageMetadata: Metadata = {
  title: "AP3K Blog — Instagram Growth & DM Marketing",
  description:
    "Practical guides for Instagram comment automation, DMs, creator lead generation, triggers and campaign strategy.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "AP3K Blog — Instagram Automation Guides",
    description:
      "Practical guides for turning Instagram comments into conversations and leads.",
    url: "https://ap3k.com/blog",
    type: "website",
    images: ["https://ap3k.com/opengraph-image"],
  },
  twitter: { card: "summary_large_image", images: ["https://ap3k.com/opengraph-image"] },
};
type Props = {
  searchParams: Promise<{ page?: string | string[]; q?: string | string[] }>;
};
export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const copy = blogArchiveCopy(getServerLocale());
  const query =
    typeof searchParams.q === "string"
      ? searchParams.q.trim().slice(0, 120)
      : "";
  if (query)
    return {
      ...localizedMetadata({ ...pageMetadata, title: copy.title, description: copy.description }, "/blog"),
      robots: { index: false, follow: true },
    };
  const pagination = getBlogPage(
    searchParams.page,
    getEditorialArchive(await getPublishedPosts()).posts.length,
  );
  if (!pagination) return { robots: { index: false, follow: true } };
  const pageCopy = blogArchiveCopy(getServerLocale(), pagination.page);
  return localizedMetadata(
    {
      ...pageMetadata,
      title: pageCopy.title,
      description: pageCopy.description,
      openGraph: { ...pageMetadata.openGraph, title: pageCopy.title, description: pageCopy.description },
    },
    blogPagePath(pagination.page),
  );
}

export default async function BlogPage(props: Props) {
  const searchParams = await props.searchParams;
  const query =
    typeof searchParams.q === "string"
      ? searchParams.q.trim().slice(0, 120)
      : "";
  const { posts: allPosts, featured } = getEditorialArchive(await getPublishedPosts(), query);
  const pagination = getBlogPage(searchParams.page, allPosts.length);
  if (!pagination) notFound();
  if (searchParams.page === "1")
    redirect(
      localizePublicPath(
        query ? `/blog?q=${encodeURIComponent(query)}` : "/blog",
        getServerLocale(),
      ),
    );
  const locale = getServerLocale();
  const copy = blogArchiveCopy(locale, pagination.page);
  const posts = (
    locale === "en"
      ? allPosts
      : [
          ...allPosts.filter((p) => !p.contentLocale),
          ...allPosts.filter((p) => p.contentLocale),
        ]
  ).slice(pagination.start, pagination.end);
  const featuredOnPage = featured.filter(item => !posts.some(post => post.slug === item.slug)).slice(0, 2);
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.heading,
    inLanguage: locale,
    url: `https://ap3k.com${localizePublicPath(blogPagePath(pagination.page), locale)}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: Array.from(new Map([...(!query && pagination.page === 1 ? featuredOnPage : []), ...posts].map(post => [post.slug, post])).values()).map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://ap3k.com${localizePublicPath(`/blog/${post.slug}`, post.contentLocale ?? locale)}`,
      })),
    },
  };

  const pageHref = (page: number) => localizePublicPath(
    `${blogPagePath(page)}${query ? `${page === 1 ? "?" : "&"}q=${encodeURIComponent(query)}` : ""}`, locale);
  const card = (post: (typeof posts)[number], index: number) => (
    <article
      key={post.slug}
      lang={post.contentLocale}
      translate={post.contentLocale ? "no" : undefined}
      className={e.card}
    >
      <Link
        href={localizePublicPath(
          `/blog/${post.slug}`,
          post.contentLocale ?? locale,
        )}
        prefetch={false}
      >
        <BlogCover post={post} priority={index < 2} />

        <h3>{post.title}</h3>
      </Link>
      <p className="mt-3 text-xs font-semibold text-violet-700 dark:text-violet-300">{post.category}</p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{post.description}</p>
      <div className={s.byline}>
        <AP3KLogo
          showText={false}
          markClassName="h-6 w-6 rounded-full shadow-none"
        />
        <span>
          AP3K ·{" "}
          <time dateTime={post.publishedAt}>
            {new Intl.DateTimeFormat(locale, {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(`${post.publishedAt}T00:00:00Z`))}
          </time>
        </span>
      </div>

    </article>
  );
  return (
    <LocalizedCopy>
      <div className={`${s.page} ${blogSans.className} ${blogSans.variable} ${blogSerif.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collection).replace(/</g, "\\u003c"),
          }}
        />
        <WebsiteNav current="blog" />
        <main className={e.archive}>
          <header className={e.hero}>
            <AP3KLogo showText={false} markClassName="h-[63px] w-[63px] mx-auto mb-8" />
            <h1>{copy.heading}</h1>
            <p>
              {copy.intro}
            </p>
          </header>
          {!query && pagination.page === 1 && featuredOnPage.length > 0 && (
            <section>
              <h2>Featured Posts</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Read from our top picks
              </p>
              <div className={e.featuredGrid}>{featuredOnPage.map(card)}</div>
            </section>
          )}
          <form
            action={localizePublicPath("/blog", locale)}
            method="get"
            className={e.search}
          >
            <Search aria-hidden="true" size={20} />
            <label htmlFor="blog-search" className="sr-only">
              Search blogs
            </label>
            <input
              id="blog-search"
              type="search"
              name="q"
              defaultValue={query}
              maxLength={120}
              placeholder="Search blogs"
              className={e.searchInput}
            />
            <button type="submit" className={s.button}>
              Search
            </button>
          </form>
          <section>
            <h2 className={!query ? "sr-only" : undefined}>
              {query
                ? `Results for “${query}”`
                : pagination.page === 1
                  ? "Latest articles"
                  : `Articles · Page ${pagination.page}`}
            </h2>
            {posts.length === 0 && (
              <p className="my-6 text-sm">
                No articles matched. Try a broader search or{" "}
                <Link href="/blog" className="underline">
                  browse all articles
                </Link>
                .
              </p>
            )}
            <div className={e.grid}>{posts.map(card)}</div>
          </section>
          {pagination.pages > 1 && <nav className={e.pagination} aria-label="Blog pagination">
            {pagination.page > 1 && <Link href={pageHref(pagination.page - 1)} aria-label="Previous page"><ArrowLeft size={16} /><span>Previous</span></Link>}
            {blogPaginationItems(pagination.page, pagination.pages).map((page, index) => page === "gap"
              ? <span key={`gap-${index}`} aria-hidden="true">…</span>
              : <Link key={page} href={pageHref(page)} prefetch={false} aria-label={`Page ${page}`} aria-current={page === pagination.page ? "page" : undefined}>{page}</Link>)}
            {pagination.page < pagination.pages && <Link href={pageHref(pagination.page + 1)} aria-label="Next page"><span>Next</span><ArrowRight size={16} /></Link>}
          </nav>}
          {!query && pagination.page === 1 && <section className="mt-12 rounded-2xl border border-slate-200 p-5 sm:p-8 dark:border-white/10" aria-labelledby="all-guides-title">
            <h2 id="all-guides-title">Browse all guides by topic</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Find setup instructions, campaign examples and troubleshooting guides without paging through the archive.</p>
            <div className="mt-5 space-y-3">
              {getBlogDirectory(allPosts).map(group => <details key={group.category} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <summary className="cursor-pointer font-semibold">{group.category} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({group.articles.length})</span></summary>
                <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {group.articles.map(post => <li key={post.slug} lang={post.contentLocale} translate={post.contentLocale ? "no" : undefined}>
                    <Link href={localizePublicPath(`/blog/${post.slug}`, post.contentLocale ?? locale)} prefetch={false} className="inline-block py-1 text-sm leading-6 text-violet-700 underline decoration-violet-300 underline-offset-4 hover:decoration-current dark:text-violet-300">{post.title}</Link>
                  </li>)}
                </ul>
              </details>)}
            </div>
          </section>}
        </main>
        <WebsiteFooter />
      </div>
    </LocalizedCopy>
  );
}
