import { TutorialVideo } from "@/components/docs/tutorial-video";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import { getServerLocale } from "@/lib/i18n/server";
import { translateUi } from "@/lib/i18n/translate";
import LocalizedCopy from "@/components/i18n/localized-copy";
import WebsiteFooter from "@/components/global/website-footer";
import WebsiteNav from "@/components/global/website-nav";
import styles from "./public-pages.module.css";
import type { CommercialPage } from "@/lib/commercial-pages";
import { localizePublicPath } from "@/lib/i18n/config";
import Link from "next/link";

export default function CommercialLandingPage({
  page,
}: {
  page: CommercialPage;
}) {
  const locale = page.contentLocale ?? getServerLocale();
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: translateUi(faq.question, locale),
      acceptedAnswer: {
        "@type": "Answer",
        text: translateUi(faq.answer, locale),
      },
    })),
  };
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AP3K",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: locale,
    url: `https://ap3k.com${localizePublicPath(`/${page.slug}`, locale)}`,
    description: translateUi(page.description, locale),
    featureList: page.workflow.map((item) => translateUi(item.title, locale)),
  };

  return (
    <LocalizedCopy>
      <div className={`${styles.page} ${styles.commercialPage}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productSchema).replace(/</g, "\\u003c"),
          }}
        />
        <WebsiteNav />
        <main
          className={`${styles.article} ${styles.commercialArticle}`}
          lang={page.contentLocale}
          translate={page.contentLocale ? "no" : undefined}
        >
          <Breadcrumbs
            items={[{ name: page.eyebrow, path: `/${page.slug}` }]}
          />
          <span className={styles.badge}>{page.eyebrow}</span>
          <h1>{page.title}</h1>
          <p>{page.description}</p>
          <p>{page.proof}</p>
          <h2>How it works</h2>
          <ol>
            {page.workflow.map((item) => (
              <li key={item.title}>
                <strong>{item.title}.</strong> {item.body}
              </li>
            ))}
          </ol>
          <h2>Make every conversation useful</h2>
          {page.useCases.map((item) => (
            <section className={styles.contentSection} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </section>
          ))}
          <h2>See the conversation</h2>
          <p>
            Choose a clear trigger and deliver what your post promises. This
            tutorial shows how to build and publish the campaign in AP3K.
          </p>
          <TutorialVideo />
          <h2>Before you activate</h2>
          <ul>
            {page.limitations.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
          <div id="pricing" className={styles.note}>
            <p>
              <strong>Start free with AP3K.</strong> Connect one Instagram
              account, run up to five active automations and send 500 automated
              actions each month. <Link href="/pricing">Compare plans →</Link>
            </p>
          </div>
          <h2>Frequently asked questions</h2>
          {page.faqs.map((faq) => (
            <section className={styles.contentSection} key={faq.question}>
              <h3>{faq.question}</h3>
              <p>{faq.answer}</p>
            </section>
          ))}
          <h2>Related guides</h2>
          <div className={styles.related}>
            {page.tutorials.map((tutorial) => (
              <Link key={tutorial.slug} href={`/blog/${tutorial.slug}`}>
                {tutorial.title} →
              </Link>
            ))}
            <Link href="/docs/post-automation/post-automation-templates">
              Comment-to-DM message templates →
            </Link>
            <Link href="/compare">Compare Instagram automation tools →</Link>
          </div>
          <section className={styles.cta}>
            <h2>Put your next conversation on autopilot.</h2>
            <p>
              Start with one campaign. Test it, then let AP3K handle the
              replies.
            </p>
            <Link href="/sign-up" className={styles.button}>
              Join for free
            </Link>
          </section>
        </main>
        <WebsiteFooter />
      </div>
    </LocalizedCopy>
  );
}
