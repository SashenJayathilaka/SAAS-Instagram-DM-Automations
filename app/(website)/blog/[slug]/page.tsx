import ProductVideo from "@/components/website/product-video";
import { QUICK_DEMO_POSTS } from "@/lib/product-videos";
import { TutorialVideo } from "@/components/docs/tutorial-video";
import { ArticleSummary, ArticleShare } from "@/components/website/article-tools";
import { blogSans, blogSerif } from "@/components/website/blog-fonts";
import { getImportedArticleHtml } from "@/lib/imported-blog-server";
import AP3KLogo from "@/components/global/ap3k-logo";
import e from "@/components/website/blog-editorial.module.css";
import BlogCover from "@/components/website/blog-cover";
import { getArticleImage, articleImageUrl } from "@/lib/blog-images";
import s from "@/components/website/public-pages.module.css";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import { COMMERCIAL_PAGES } from "@/lib/commercial-pages";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import { getServerLocale } from "@/lib/i18n/server";
import { translateUi } from "@/lib/i18n/translate";
import { localizePublicPath } from "@/lib/i18n/config";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import TutorialScreenshot from "@/components/website/tutorial-screenshot";
import TutorialGuides from "@/components/website/tutorial-guides";
import {
  GrowthSectionSources,
} from "@/components/website/growth-guide-extras";
import { BLOG_POSTS } from "@/lib/blog";
import { getPublishedPost, getPublishedPosts } from "@/lib/editorial-server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const SITE_URL = "https://ap3k.com";

const ENGLISH_SEO_TITLES: Record<string, string> = {
  "instagram-comment-to-dm-automation":
    "Instagram Comment-to-DM Automation Guide | AP3K",
  "compare-instagram-dm-automation-tools":
    "Instagram DM Automation Tools Compared | AP3K",
  "troubleshoot-instagram-comment-dm-automation":
    "Fix Instagram Comment-to-DM Automation | AP3K",
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const post = await getPublishedPost(params.slug);
  if (!post) return {};
  const cover = getArticleImage(post);
  const socialImage = articleImageUrl(cover);
  const locale = post.contentLocale ?? getServerLocale();
  const seoTitle =
    post.seoTitle ||
    (locale === "en" && ENGLISH_SEO_TITLES[post.slug]
      ? ENGLISH_SEO_TITLES[post.slug]
      : `${post.title} | AP3K`);

  const metadata = localizedMetadata(
    {
      title: seoTitle,
      description: post.description,
      keywords: post.keywords,
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        type: "article",
        title: seoTitle,
        description: post.description,
        url: `${SITE_URL}/blog/${post.slug}`,
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        siteName: "AP3K",
        images: [
          {
            url: socialImage,
            width: cover.width,
            height: cover.height,
            alt: translateUi(cover.alt, locale),
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description: post.description,
        images: [socialImage],
      },
    },
    `/blog/${post.slug}`,
    post.contentLocale,
  );
  if (post.noIndex) metadata.robots = { index: false, follow: true };
  if (post.contentLocale === "en")
    metadata.alternates = {
      canonical: `${SITE_URL}/blog/${post.slug}`,
      languages: {
        en: `${SITE_URL}/blog/${post.slug}`,
        "x-default": `${SITE_URL}/blog/${post.slug}`,
      },
    };
  return metadata;
}

export default async function BlogPostPage(props: Props) {
  const params = await props.params;
  const post = await getPublishedPost(params.slug);
  if (!post) notFound();
  // A saved language preference does not make the canonical English URL a
  // localized route. Redirect only actual prefixes to avoid a redirect loop.
  if (
    post.contentLocale === "en" &&
    /^\/(fr|es|de|pt)\//.test((await headers()).get("x-ap3k-request-path") || "")
  )
    permanentRedirect(`/blog/${post.slug}`);
  const publicPosts = (await getPublishedPosts()).filter(p => !p.noIndex);
  const importedHtml = post.importedArchive ? await getImportedArticleHtml(post.slug) : null;

  const related = post.related
    ? publicPosts.filter((item) => post.related?.includes(item.slug))
    : publicPosts
        .filter((item) => item.slug !== post.slug)
        .map((item) => ({
          item,
          score:
            Number(item.category === post.category) * 3 +
            item.keywords.filter((keyword) => post.keywords.includes(keyword))
              .length,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ item }) => item);
  const products = COMMERCIAL_PAGES.filter((page) =>
    page.tutorials.some((guide) => guide.slug === post.slug),
  );
  const locale = post.contentLocale ?? getServerLocale();
  const cover = getArticleImage(post);
  const articleImage = articleImageUrl(cover);
  const articleImageWidth = cover.width;
  const articleImageHeight = cover.height;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: translateUi(post.title, locale),
    description: translateUi(post.description, locale),
    inLanguage: post.contentLocale ?? locale,
    articleSection: post.category,
    ...(post.wordCount ? { wordCount: post.wordCount } : {}),
    isPartOf: { "@type": "Blog", "@id": `${SITE_URL}/blog`, name: "AP3K Blog" },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${SITE_URL}${localizePublicPath(`/blog/${post.slug}`, locale)}`,
    author: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "AP3K",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "AP3K",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
        width: 512,
        height: 512,
      },
    },
    image: {
      "@type": "ImageObject",
      url: articleImage,
      width: articleImageWidth,
      height: articleImageHeight,
    },
    keywords: post.keywords.map((key) => translateUi(key, locale)).join(", "),
  };

  return (
    <LocalizedCopy>
      <div className={`${s.page} ${blogSans.className} ${blogSans.variable} ${blogSerif.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <WebsiteNav current="blog" />
        <main>
          <article
            className={`${s.article} ${s.blogArticle}`}
            lang={post.contentLocale}
            dir={post.contentLocale ? "ltr" : undefined}
            translate={post.contentLocale ? "no" : undefined}
          >
            <header className={s.articleHeader}>
              <Breadcrumbs
                items={[
                  { name: "Blog", path: "/blog" },
                  { name: post.title, path: `/blog/${post.slug}` },
                ]}
              />
              {!post.importedArchive && <span className={s.badge}>{post.category}</span>}
              <h1>{post.title}</h1>
              <p>{post.subtitle || post.description}</p>
              <div className={s.byline}>
                <span>
                  By <Link href="/about">AP3K</Link>
                </span>
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
                {post.updatedAt !== post.publishedAt && <span>Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time></span>}
                <span>{post.readingTime}</span>
              </div>
            </header>
            <div className="mt-7">
              <BlogCover post={post} priority credit />
            </div>
            {post.importedArchive && <ArticleSummary slug={post.slug} />}
            <details className={e.mobileContents} open={post.importedArchive || undefined}>
              <summary>Table of contents <span aria-hidden="true" className="ml-auto">⌄</span></summary>
              <ol>
                {post.sections.map((section, index) => (
                  <li key={section.heading}>
                    <a href={`#section-${index + 1}`}>
                      {section.heading.replace(/^\d+\.\s*/, "")}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
            <div className={e.readingLayout}>
            <div className={e.articleBody}>
            {importedHtml ? <div className={e.importedBody} dangerouslySetInnerHTML={{ __html: importedHtml }} /> : <>
            <p className="mb-8">{post.intro}</p>

            {post.sections.map((section, index) => (
              <section
                id={`section-${index + 1}`}
                key={section.heading}
                className="scroll-mt-24"
              >
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.steps && (
                  <ol>
                    {section.steps.map((item) => (
                      <li key={item.title}>
                        <strong>{item.title}.</strong> {item.body}
                      </li>
                    ))}
                  </ol>
                )}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {section.links && (
                  <ul>
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} prefetch={false}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {section.table && <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/15" role="region" tabIndex={0} aria-label={section.heading}><table className="w-full min-w-[640px] text-left text-sm"><thead><tr>{section.table.headers.map(h => <th key={h} scope="col" className="min-w-[140px] bg-violet-50 p-4 dark:bg-violet-500/10">{h}</th>)}</tr></thead><tbody>{section.table.rows.map((row,i) => <tr key={i}>{row.map((cell,j) => j === 0 ? <th key={j} scope="row" className="min-w-[140px] border-t border-slate-200 p-4 dark:border-white/10">{cell}</th> : <td key={j} className="min-w-[140px] border-t border-slate-200 p-4 dark:border-white/10">{cell}</td>)}</tr>)}</tbody></table></div>}
                {section.video && <TutorialVideo />}{index === 0 && QUICK_DEMO_POSTS.has(post.slug) && <ProductVideo />}
                <GrowthSectionSources slug={post.slug} index={index} />
                {section.screenshot && (
                  <TutorialScreenshot id={section.screenshot} />
                )}
              </section>
            ))}
            {post.cover && <TutorialGuides />}
            </>}
            <div className="mt-10 border-t border-slate-200 pt-5 dark:border-white/10">
              <span className={s.credit}>
                Updated{" "}
                <time dateTime={post.updatedAt}>
                  {formatDate(post.updatedAt)}
                </time>
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.keywords.map((keyword) => (
                  <span key={keyword} className={s.badge}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <section className={s.cta}>
              <h2>Turn the next comment into a conversation.</h2>
              <p>
                Choose a clear trigger, write a useful response and try your
                first AP3K campaign.
              </p>
              {products.length > 0 && (
                <p>
                  {products.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/${page.slug}`}
                      className="mr-4"
                    >
                      {page.eyebrow} →
                    </Link>
                  ))}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-5">
                <Link href="/sign-up" className={s.button}>Join for free</Link>
                <Link href={localizePublicPath("/pricing", locale)}>Compare plans</Link>
              </div>
            </section>
            <ArticleShare slug={post.slug} title={post.title} />
            <div className={e.author}>
              <AP3KLogo showText={false} markClassName="h-12 w-12 shrink-0 rounded-xl" />
              <div><strong>AP3K</strong><p>Practical ideas for creators and businesses building better Instagram conversations.</p></div>
            </div>
            </div>
            <nav className={e.contentsRail} aria-label="On this page"><div><strong>On this page</strong>
              <ol>
                {post.sections.map((section, index) => (
                  <li key={section.heading}>
                    <a href={`#section-${index + 1}`}>
                      {section.heading.replace(/^\d+\.\s*/, "")}
                    </a>
                  </li>
                ))}
              </ol>
            </div></nav>
            </div>
          </article>
          <section className={`${e.archive} pb-16`}>
            <h2>Related articles</h2>
            <div className={e.grid}>
              {related.slice(0, 4).map((item) => (
                <article
                  className={e.card}
                  key={item.slug}
                  lang={item.contentLocale}
                  translate={item.contentLocale ? "no" : undefined}
                >
                  <Link
                    href={localizePublicPath(
                      `/blog/${item.slug}`,
                      item.contentLocale ?? locale,
                    )}
                    prefetch={false}
                  >
                    <BlogCover post={item} />
                    <h3>{item.title}</h3>
                  </Link>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
        <WebsiteFooter />
      </div>
    </LocalizedCopy>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(getServerLocale(), {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
