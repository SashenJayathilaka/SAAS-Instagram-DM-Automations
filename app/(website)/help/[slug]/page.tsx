import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WebsiteNav from "@/components/global/website-nav";
import WebsiteFooter from "@/components/global/website-footer";
import HelpArticleView from "@/components/help/help-article";
import { AP3K_HELP_ARTICLES } from "@/lib/ap3k-help";
import { helpArticleSections } from "@/lib/help-article-content";
import { localizedMetadata } from "@/lib/i18n/page-metadata";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return AP3K_HELP_ARTICLES.map(({ slug }) => ({ slug })); }
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const article = AP3K_HELP_ARTICLES.find(item => item.slug === params.slug);
  if (!article) notFound();
  return localizedMetadata({ title: `${article.title} | AP3K`, description: article.summary }, `/help/${article.slug}`);
}
export default async function HelpArticlePage(props: Props) {
  const params = await props.params;
  const article = AP3K_HELP_ARTICLES.find(item => item.slug === params.slug);
  if (!article) notFound();
  return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#050816] dark:text-white"><WebsiteNav /><main className="px-4 pb-16 pt-6 sm:px-8 sm:pb-24 sm:pt-10"><HelpArticleView article={article} sections={helpArticleSections(article.slug)} /></main><WebsiteFooter /></div>;
}
