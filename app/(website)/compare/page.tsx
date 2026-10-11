import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import WebsiteNav from "@/components/global/website-nav";
import WebsiteFooter from "@/components/global/website-footer";
import { COMPARISONS, comparisonPath } from "@/lib/comparisons";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import s from "@/components/website/comparison.module.css";
export function generateMetadata() {
  return localizedMetadata(
    {
      title: "Compare Instagram Automation Tools | AP3K",
      description:
        "Compare AP3K with ManyChat, CreatorFlow, LinkDM and other creator tools. Understand features, usage limits and which workflow fits your business.",
    },
    "/compare",
    "en",
  );
}
export default function CompareIndex() {
  return (
    <div className={s.page}>
      <WebsiteNav />
      <main className={s.main} lang="en" translate="no">
        <Breadcrumbs items={[{ name: "Compare", path: "/compare" }]} />
        <header className={s.indexHero}>
          <span className={s.eyebrow}>FIND YOUR FIT</span>
          <h1>
            Your workflow.
            <br />
            <span>The right tool.</span>
          </h1>
          <p>
            Compare AP3K with Instagram automation tools, creator storefronts
            and broader business platforms. Start with the job you need done,
            then compare the actual experience.
          </p>
          <div className={s.actions}>
            <Link href="/sign-up" className={s.primary}>
              Try AP3K Free <ArrowRight size={18} />
            </Link>
            <Link
              href="/tutorials/instagram-comment-to-dm"
              className={s.secondary}
            >
              <Play size={17} /> Watch AP3K in action
            </Link>
          </div>
        </header>
        <h2>All comparisons</h2>
        <div className={s.relatedGrid}>
          {COMPARISONS.map((page) => (
            <Link
              className={s.relatedCard}
              href={comparisonPath(page)}
              key={page.slug}
            >
              <strong>
                AP3K vs {page.name}
                <ArrowRight size={17} aria-hidden="true" />
              </strong>
              <span>{page.focus}</span>
            </Link>
          ))}
        </div>
        <section className={s.finalCta}>
          <h2>See how AP3K fits.</h2>
          <p>
            Start free with one account and 500 automated actions per month.
          </p>
          <div className={s.actions}>
            <Link href="/sign-up" className={s.primary}>
              Join for free <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <WebsiteFooter />
    </div>
  );
}
