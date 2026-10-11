import WorkspacePreview from "@/components/website/workspace-preview";
import Link from "next/link";
import { notFound } from "next/navigation";
import WebsiteNav from "@/components/global/website-nav";
import WebsiteFooter from "@/components/global/website-footer";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import { SOLUTIONS } from "@/lib/solutions";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import s from "@/components/website/public-pages.module.css";
export function generateStaticParams() {
  return SOLUTIONS.map((page) => ({ slug: page.slug }));
}
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const page = SOLUTIONS.find((item) => item.slug === params.slug);
  return page
    ? localizedMetadata(
        {
          title: `${page.label} with Instagram Automation | AP3K`,
          description: page.description,
          openGraph: { images: ["https://ap3k.com/opengraph-image"] },
        },
        `/solutions/${page.slug}`,
        "en",
      )
    : {};
}
export default async function SolutionPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const page = SOLUTIONS.find((item) => item.slug === params.slug);
  if (!page) notFound();
  return (
    <div className={`${s.page} ${s.commercialPage}`}>
      <WebsiteNav />
      <main
        className={`${s.article} ${s.commercialArticle}`}
        lang="en"
        translate="no"
      >
        <Breadcrumbs
          items={[
            { name: "Solutions", path: "/solutions" },
            { name: page.label, path: `/solutions/${page.slug}` },
          ]}
        />
        <span className={s.badge}>INSTAGRAM AUTOMATION</span>
        <h1>{page.title}</h1>
        <p>{page.intro}</p>
        <WorkspacePreview />
        {page.sections.map((section) => (
          <section className={s.contentSection} key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            {section.bullets && (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section className={s.contentSection}>
          <h2>Set it up in AP3K</h2>
          <ol>
            {page.steps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}.</strong> {step.body}
              </li>
            ))}
          </ol>
        </section>
        <h2>Frequently asked questions</h2>
        {page.faq.map((item) => (
          <section className={s.contentSection} key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </section>
        ))}
        <h2>Keep exploring</h2>
        <div className={s.related}>
          <Link href={page.related}>Explore the workflow →</Link>
          <Link href="/blog">Read Instagram automation guides →</Link>
          {SOLUTIONS.filter((item) => item.slug !== page.slug).map((item) => (
            <Link key={item.slug} href={`/solutions/${item.slug}`}>
              {item.label} →
            </Link>
          ))}
        </div>
        <section className={s.cta}>
          <h2>Start with one useful conversation.</h2>
          <p>Try AP3K free with 500 automated actions each month.</p>
          <Link href="/sign-up" className={s.button}>
            Join for free
          </Link>
        </section>
      </main>
      <WebsiteFooter />
    </div>
  );
}
