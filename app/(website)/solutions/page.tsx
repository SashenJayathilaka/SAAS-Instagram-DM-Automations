import Link from "next/link";
import WebsiteNav from "@/components/global/website-nav";
import WebsiteFooter from "@/components/global/website-footer";
import { SOLUTIONS } from "@/lib/solutions";
import { localizedMetadata } from "@/lib/i18n/page-metadata";
import s from "@/components/website/public-pages.module.css";
export function generateMetadata() {
  return localizedMetadata(
    {
      title: "Instagram Automation Solutions | AP3K",
      description:
        "Grow your Instagram audience, deliver product links and keep conversations moving with AP3K automation workflows.",
    },
    "/solutions",
    "en",
  );
}
export default function SolutionsIndex() {
  return (
    <div className={s.page}>
      <WebsiteNav />
      <main className={s.article} lang="en" translate="no">
        <span className={s.badge}>SOLUTIONS</span>
        <h1>Choose an Instagram automation for your goal.</h1>
        <p>
          Start with the outcome you want, then choose a useful Instagram
          interaction to automate.
        </p>
        <h2>Start with the interaction, not the message</h2>
        <p>A comment on a Reel, a reply to a Story and a direct message are different entry points. Choose the matching automation type before writing your response. For the first campaign, use one clear offer and one destination so you can test the complete journey.</p>
        <section>
          <h3>Deliver a guide or product link from a comment</h3>
          <p>Use <Link href="/instagram-comment-to-dm">Instagram comment-to-DM automation</Link> when your caption asks people to comment a keyword such as GUIDE or LINK. Match that word, send the promised destination and decide whether a public acknowledgment is useful. Do not treat every comment as a request for an unrelated promotion.</p>
        </section>
        <section>
          <h3>Answer a Story interaction or incoming DM</h3>
          <p>Choose a Story rule for eligible Story replies and mentions, or a Chat rule for an incoming direct message. Read the <Link href="/instagram-dm-automation">Instagram DM automation overview</Link> before deciding which entry point fits. Test from another Instagram account; the phone preview alone does not establish delivery.</p>
        </section>
        <section>
          <h3>Respond publicly without starting a private conversation</h3>
          <p>Use <Link href="/instagram-comment-automation">public comment automation</Link> for an acknowledgment or a response that belongs under the post. A successful public reply and a successfully delivered DM are separate events. Select the actions that match what the person actually asked for.</p>
        </section>
        <h2>Explore your business outcome</h2>
        {SOLUTIONS.map((page) => (
          <section key={page.slug}>
            <h2>
              <Link href={`/solutions/${page.slug}`}>{page.label} →</Link>
            </h2>
            <p>{page.description}</p>
          </section>
        ))}
        <h2>Keep the first test measurable</h2>
        <p>Define success before publishing: a requested link delivered, a relevant contact captured, a booking or a purchase. Message totals are not the same as sales. Check the destination on mobile, leave a fresh matching comment, and review successful, failed and skipped actions. Add optional steps only after the simple path works.</p>
        <p>The <Link href="/tutorials/instagram-comment-to-dm">video walkthrough</Link> and <Link href="/blog/instagram-comment-to-dm-automation">comment-to-DM setup checklist</Link> cover that first test. Check <Link href="/pricing">current plans and allowances</Link> before adding contact collection, AI or advanced workflows. Comparing products? Start with <Link href="/manychat-alternative">AP3K versus ManyChat for Instagram</Link>.</p>
        <section className={s.cta}>
          <Link href="/sign-up" className={s.button}>
            Join for free
          </Link>
        </section>
      </main>
      <WebsiteFooter />
    </div>
  );
}
