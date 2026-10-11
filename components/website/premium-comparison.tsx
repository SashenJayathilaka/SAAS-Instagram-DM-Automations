import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Play, MessageCircle, Users } from "lucide-react";
import WebsiteNav from "@/components/global/website-nav";
import WebsiteFooter from "@/components/global/website-footer";
import AP3KLogo from "@/components/global/ap3k-logo";
import Breadcrumbs from "@/components/seo/breadcrumbs";
import { PLAN_CARDS } from "@/lib/billing-plans";
import { POST_AUTOMATION_VIDEO } from "@/lib/tutorial-video";
import {
  COMPARISONS,
  comparisonPath,
  type Comparison,
} from "@/lib/comparisons";
import HomeShowcase from "./home-showcase";
import HomeSetup from "./home-setup";
import s from "./comparison.module.css";

const manychatRows = [
  [
    "Best fit",
    "Instagram campaigns, replies and lead capture",
    "Conversations across multiple messaging channels",
  ],
  [
    "Instagram comment → DM",
    "Post and Reel triggers; keyword or any comment",
    "Comment-triggered automations and DM links",
  ],
  [
    "Usage model",
    "Successful automated actions: each sent public reply or DM",
    "Monthly active contacts: people interacted with",
  ],
  [
    "Free plan",
    "500 actions/month · 1 account · 5 active automations",
    "25 active contacts/month · up to 4 live triggers",
  ],
  [
    "Contact collection",
    "Email and phone capture + Contacts CSV on Pro and Business",
    "Contact collection and tags on Essential and above",
  ],
  [
    "AI replies",
    "Pro and Business, within monthly AI allowances",
    "AI-powered conversations on Pro and above",
  ],
  [
    "Custom workflows",
    "Visual Flow Builder publishing on paid plans",
    "Custom automation builder; availability varies by plan",
  ],
  [
    "Channels & team",
    "Instagram account workspaces; up to 6 accounts on Business",
    "Multiple channels, users and inbox seats by plan",
  ],
];
const manychatFaqs = [
  [
    "Is AP3K a free ManyChat alternative for Instagram?",
    "You can start with AP3K Free: one Instagram account, five active automations and 500 successful automated actions per month. No credit card is required. Contact collection, follow gates, follow-ups, AI replies and custom Flow publishing require an eligible paid plan.",
  ],
  [
    "Does AP3K replace every ManyChat feature?",
    "No. AP3K focuses on Instagram. If you need WhatsApp, Messenger or other messaging channels in the same workspace, evaluate ManyChat against those requirements. Compare the actual customer journey you need, rather than a checklist alone.",
  ],
  [
    "Are 500 actions the same as 500 contacts?",
    "No. One successful public reply counts as one action, and one successful DM counts as another. A person receiving both uses two actions. Extra automated messages add actions; failed or skipped sends do not count. ManyChat measures active contacts differently.",
  ],
  [
    "Can I import my existing ManyChat flows?",
    "There is no automatic ManyChat flow import in AP3K. Rebuild one campaign as a draft, review every message and link, turn off overlapping rules in the previous tool, then publish and test the replacement from another Instagram account.",
  ],
  [
    "Can I collect an email and phone number in AP3K?",
    "Pro and Business can request email and phone details in supported automations. Captured fields are saved to the contact. Use Contacts to filter records and Download CSV to export them. Test invalid answers and the final DM as well as the first prompt.",
  ],
  [
    "Will either platform guarantee Instagram delivery?",
    "No. Instagram permissions, account eligibility, messaging rules and usage limits still apply. Test a complete conversation from another account and inspect activity. A preview is not proof that Instagram delivered a message.",
  ],
];
export default function PremiumComparison({ page }: { page: Comparison }) {
  const isManychat = page.slug === "manychat";
  const path = comparisonPath(page);
  const rows = isManychat
    ? manychatRows
    : page.rows.map((row) => [row.feature, row.ap3k, row.other]);
  const faqs = isManychat
    ? manychatFaqs
    : [
        [
          `Is AP3K a ${page.name} alternative?`,
          `For Instagram comment replies, link delivery and lead capture, AP3K is an option to evaluate. ${page.decision}`,
        ],
        ["Can I test AP3K before paying?", manychatFaqs[0][1]],
        [
          `Does AP3K replace every ${page.name} feature?`,
          `AP3K focuses on Instagram conversations. ${page.name} focuses on ${page.focus.toLowerCase()}. ${page.strength}`,
        ],
        [
          "Can I keep my existing website or store?",
          "Yes. Add your existing HTTPS destination to an AP3K message button. The destination can be a product, guide, booking page or link hub. AP3K does not replace the checkout or automatically import data from an external form.",
        ],
        [
          "Can I move an existing campaign to AP3K?",
          "AP3K does not automatically import another platform’s flows. Rebuild one campaign as a draft, review every message and link, turn off overlapping rules in the previous tool, then publish and test the replacement from another Instagram account.",
        ],
        [
          "Can I collect an email and phone number in AP3K?",
          manychatFaqs[4][1],
        ],
        ["Will automation guarantee Instagram delivery?", manychatFaqs[5][1]],
      ];
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${page.name} vs AP3K: find your fit`,
      description: page.description,
      datePublished: "2026-09-27",
      dateModified: "2026-10-06",
      author: {
        "@type": "Organization",
        name: "AP3K",
        url: "https://ap3k.com/about",
      },
      mainEntityOfPage: `https://ap3k.com${path}`,
      image: "https://ap3k.com/images/docs/dashboard.webp",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(([name, text]) => ({
        "@type": "Question",
        name,
        acceptedAnswer: { "@type": "Answer", text },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: POST_AUTOMATION_VIDEO.title,
      description: POST_AUTOMATION_VIDEO.description,
      thumbnailUrl: POST_AUTOMATION_VIDEO.thumbnail,
      uploadDate: POST_AUTOMATION_VIDEO.uploaded,
      duration: POST_AUTOMATION_VIDEO.duration,
      embedUrl: POST_AUTOMATION_VIDEO.embed,
    },
  ];
  return (
    <div className={s.page}>
      <WebsiteNav />
      <main className={s.main} lang="en" translate="no">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
        <Breadcrumbs
          items={[
            { name: "Compare", path: "/compare" },
            { name: `${page.name} vs AP3K`, path },
          ]}
        />
        <header className={s.hero}>
          <div>
            <span className={s.eyebrow}>{page.name.toUpperCase()} VS AP3K</span>
            <h1>
              {page.name} vs AP3K.
              <br />
              <span>Find your fit.</span>
            </h1>
            <p className={s.lead}>{page.description}</p>
            <div className={s.actions}>
              <Link className={s.primary} href="/sign-up">
                Start with AP3K Free <ArrowRight size={18} />
              </Link>
              <a className={s.secondary} href="#tutorial">
                <Play size={17} /> Watch the walkthrough
              </a>
            </div>
            <p className={s.micro}>
              <Check size={15} /> No credit card · 500 automated actions each
              month
            </p>
          </div>
          <div className={s.choiceCard}>
            <div className={s.brandRow}>
              <AP3KLogo markClassName="h-10 w-10" />
              <span className={s.versus}>vs</span>
              {isManychat ? (
                <Image
                  src="/images/brands/manychat.svg"
                  alt="ManyChat"
                  width={151}
                  height={28}
                  className={s.manychatLogo}
                />
              ) : (
                <span className={s.competitorName}>{page.name}</span>
              )}
            </div>
            <div className={s.choice}>
              <span className={s.choiceIcon}>
                <MessageCircle size={22} />
              </span>
              <div>
                <strong>Focused on Instagram?</strong>
                <p>
                  Explore AP3K for comments, Story replies, DMs and lead
                  capture.
                </p>
              </div>
            </div>
            <div className={s.choice}>
              <span className={s.choiceIcon}>
                <Users size={22} />
              </span>
              <div>
                <strong>{page.focus}</strong>
                <p>
                  Compare {page.name} against the workflow your business needs.
                </p>
              </div>
            </div>
            <div className={s.cardFoot}>
              Compare one real campaign. Choose with evidence.
            </div>
          </div>
        </header>
        <nav className={s.jumpNav} aria-label="Comparison sections">
          <a href="#decision">Find your fit</a>
          <a href="#features">Feature comparison</a>
          <a href="#pricing">Plans & usage</a>
          <a href="#tutorial">See AP3K in action</a>
          <a href="#migration">Switching checklist</a>
          <a href="#faq">FAQs</a>
        </nav>
        <section className={s.section} id="decision">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>START WITH YOUR GOAL</span>
            <h2>Where each tool fits.</h2>
            <p>{page.decision}</p>
          </div>
          <div className={s.decisionGrid}>
            <article className={s.decisionCard}>
              <span className={s.eyebrow}>THE INSTAGRAM WORKFLOW</span>
              <h3>Choose AP3K for the conversation.</h3>
              <p>
                Respond to comments, Story interactions and DMs. Deliver links
                to the website, checkout or booking tool you already use.
              </p>
              <ul>
                <li>Keyword or any-comment triggers</li>
                <li>Public replies and private link delivery</li>
                <li>Paid contact capture, AI replies and custom flows</li>
              </ul>
              <Link href="/docs" className={s.inlineLink}>
                Explore AP3K documentation <ArrowRight size={16} />
              </Link>
            </article>
            <article className={s.decisionCard}>
              <span className={s.eyebrow}>{page.focus}</span>
              <h3>Consider {page.name} for your wider needs.</h3>
              <p>{page.overview}</p>
              <p>{page.strength}</p>
            </article>
          </div>
        </section>
        <section
          className={s.showcaseSection}
          aria-label="Explore AP3K automation features"
        >
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>EXPLORE THE AP3K EXPERIENCE</span>
            <h2>Turn the next interaction into a useful conversation.</h2>
            <p>
              Explore example journeys below, then watch the real editor in
              action. Follow gates, follow-ups and contact collection require
              Pro or Business.
            </p>
          </div>
          <HomeShowcase locale="en" autoPlay={false} contained />
          <p className={s.demoNote}>
            Swipe on mobile or select a feature on desktop. Illustrative
            examples. Actual delivery depends on your settings, plan and
            Instagram eligibility.
          </p>
        </section>
        <section className={s.section} id="features">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>THE PRACTICAL DIFFERENCES</span>
            <h2>Compare the workflow, not just the price.</h2>
            <p>
              Compare your channels, required steps and how usage is counted. A
              storefront, an agency CRM and an Instagram automation workspace
              solve different parts of the journey.
            </p>
          </div>
          <div
            className={s.tableWrap}
            tabIndex={0}
            role="region"
            aria-label={`AP3K and ${page.name} feature comparison, scroll horizontally on smaller screens`}
          >
            <table>
              <caption>
                AP3K vs {page.name} ·{" "}
                <span className={s.scrollHint}>
                  Scroll to compare on small screens
                </span>
              </caption>
              <thead>
                <tr>
                  <th scope="col">What matters</th>
                  <th scope="col">AP3K</th>
                  <th scope="col">{page.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, ap3k, competitor]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{ap3k}</td>
                    <td>{competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={s.micro}>
            Provider plans can vary by account, billing country and date.{" "}
            <a
              href={page.sources[0].href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Check {page.name}’s current offer ↗
            </a>
          </p>
        </section>
        <section className={s.section} id="tutorial">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>WATCH THE ACTUAL PRODUCT</span>
            <h2>From a comment to a DM, step by step.</h2>
            <p>
              See the post picker, triggers, public reply and DM link in the
              AP3K walkthrough.
            </p>
          </div>
          <div className={s.video}>
            <iframe
              src="https://www.youtube-nocookie.com/embed/SSOYGbfwLUQ?rel=0"
              title="AP3K tutorial: set up Instagram comment-to-DM automation"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className={s.tutorialFoot}>
            <p>Prefer written steps? Open the setup guide and follow along.</p>
            <Link
              href="/docs/post-automation/create-instagram-comment-to-dm-automation"
              className={s.secondary}
            >
              Read the setup guide <ArrowRight size={17} />
            </Link>
          </div>
          <div className={s.setupSection}>
            <HomeSetup locale="en" comparison />
          </div>
        </section>
        <section className={s.section} id="pricing">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>BUDGET FOR YOUR REAL CAMPAIGN</span>
            <h2>Clear plans. Different units of usage.</h2>
            <p>
              {isManychat
                ? "AP3K counts successful automated actions. ManyChat counts active contacts. Those numbers are not interchangeable."
                : `Budget for the messages your AP3K campaign sends, then compare the same journey with ${page.name}’s current offer. Contacts, DMs, actions and storefront subscriptions measure different things.`}
            </p>
          </div>
          <div className={s.plans}>
            {PLAN_CARDS.map((plan) => (
              <div
                key={plan.id}
                className={plan.featured ? s.featuredPlan : s.plan}
              >
                <span className={s.eyebrow}>{plan.name}</span>
                <p className={s.price}>
                  ${plan.monthlyPrice}
                  <span>/month</span>
                </p>
                <p>
                  {plan.annualPrice
                    ? `$${plan.annualPrice} billed yearly ($${plan.annualPrice / 12}/month equivalent)`
                    : "Start without a credit card"}
                </p>
                <ul>
                  <li>
                    {plan.replyLimit.toLocaleString("en-US")} automated actions
                    / month
                  </li>
                  <li>
                    {plan.id === "FREE"
                      ? "1 account · 5 active automations"
                      : plan.id === "PRO"
                        ? "3 accounts · unlimited active automations"
                        : "6 accounts · unlimited active automations"}
                  </li>
                  <li>
                    {plan.id === "FREE"
                      ? "Public replies and DMs"
                      : plan.id === "PRO"
                        ? "500 AI replies / month"
                        : "2,000 AI replies / month"}
                  </li>
                </ul>
                <Link
                  href={plan.id === "FREE" ? "/sign-up" : "/pricing"}
                  className={s.secondary}
                >
                  {plan.id === "FREE" ? "Start free" : "Explore plan"}
                  <ArrowRight size={17} />
                </Link>
              </div>
            ))}
          </div>
          <div className={s.usage}>
            <div>
              <span className={s.eyebrow}>AN ILLUSTRATION, NOT A FORECAST</span>
              <h3>200 people. One public reply + one DM each.</h3>
              <p>
                That is 400 successful AP3K actions. Another DM to each person
                adds 200 actions. Monthly allowances reset monthly, including on
                annual billing.
              </p>
            </div>
            <div className={s.equation}>
              <strong>200 × 2</strong>
              <span>400 actions</span>
            </div>
          </div>
          <Link
            href={
              isManychat
                ? "/blog/manychat-vs-ap3k-pricing-for-instagram"
                : "/pricing"
            }
            className={s.inlineLink}
          >
            Understand plans and usage <ArrowRight size={17} />
          </Link>
        </section>
        <section className={s.productSection}>
          <div>
            <span className={s.eyebrow}>YOUR INSTAGRAM WORKSPACE</span>
            <h2>Keep the conversation connected.</h2>
            <p>
              Manage automations, inspect activity and work with captured
              contacts in AP3K. Account activity and feature availability depend
              on your workspace and plan.
            </p>
            <Link href="/help/workspace-tour" className={s.secondary}>
              Explore the workspace <ArrowRight size={17} />
            </Link>
          </div>
          <Link href="/help/workspace-tour">
            <Image
              src="/images/docs/dashboard.webp"
              alt="Current AP3K dashboard with Post, Story and Chat shortcuts and Instagram performance"
              width={1363}
              height={936}
              sizes="(max-width: 760px) 92vw, 700px"
            />
          </Link>
        </section>
        <section className={s.section} id="migration">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>A CONTROLLED SWITCH</span>
            <h2>Move one campaign before moving everything.</h2>
          </div>
          <ol className={s.migration}>
            {[
              [
                "Map the existing journey",
                "Record the post, keyword, public reply, opening DM, optional gates, final message and destination.",
              ],
              [
                "Rebuild it as a draft",
                "Check plan eligibility and each step. AP3K does not automatically import another platform’s flows.",
              ],
              [
                "Avoid overlapping live rules",
                "Turn off the old campaign before activating its replacement on the same interaction.",
              ],
              [
                "Test and inspect delivery",
                "Use another Instagram account. Check messages, links, collected fields and skipped or failed actions.",
              ],
            ].map(([title, body], i) => (
              <li key={title}>
                <span>{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            className={s.secondary}
            href={
              isManychat
                ? "/docs/migrating-from-manychat/rebuild-your-automations"
                : "/docs/post-automation/create-instagram-comment-to-dm-automation"
            }
          >
            Open the setup guide <ArrowRight size={17} />
          </Link>
        </section>
        <section className={s.section} id="faq">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>BEFORE YOU CHOOSE</span>
            <h2>Your questions, answered.</h2>
          </div>
          <div className={s.faqs}>
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={s.finalCta}>
          <AP3KLogo markClassName="h-10 w-10" />
          <h2>Start with one useful conversation.</h2>
          <p>
            Choose a post, deliver what you promised, and test the experience
            from comment to click.
          </p>
          <div className={s.actions}>
            <Link className={s.primary} href="/sign-up">
              Create your free AP3K account <ArrowRight size={18} />
            </Link>
            <Link className={s.secondary} href="/pricing">
              Compare AP3K plans
            </Link>
          </div>
        </section>
        <section className={s.section} aria-labelledby="related-comparisons">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>KEEP EXPLORING</span>
            <h2 id="related-comparisons">
              Compare the rest of your shortlist.
            </h2>
          </div>
          <div className={s.relatedGrid}>
            {COMPARISONS.filter((item) => item.slug !== page.slug).slice(0, 3).map(
              (item) => (
                <Link
                  className={s.relatedCard}
                  href={comparisonPath(item)}
                  key={item.slug}
                >
                  <strong>
                    AP3K vs {item.name}
                    <ArrowRight size={17} aria-hidden="true" />
                  </strong>
                  <span>{item.focus}</span>
                </Link>
              ),
            )}
          </div>
          <Link className={s.secondary} href="/compare">View all comparisons <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
        <aside className={s.methodology}>
          <h2>Sources & methodology</h2>
          <p>
            Published by AP3K. Updated October 6, 2026. Competitor descriptions
            are based on official product pages, originally reviewed{" "}
            {isManychat ? "October 6" : "September 27"}, 2026. This is not
            hands-on testing of every competitor plan. Confirm current features
            and terms with the provider before subscribing. Product names and
            logos identify the compared services; no affiliation or endorsement
            is implied.
          </p>
          <ul>
            {page.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noopener noreferrer">
                  {source.label} ↗
                </a>
              </li>
            ))}
          </ul>
          <Link href="/compare">Explore all comparisons →</Link>
        </aside>
      </main>
      <WebsiteFooter />
    </div>
  );
}
