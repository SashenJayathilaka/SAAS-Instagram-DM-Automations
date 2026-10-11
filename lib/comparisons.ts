export type Comparison = {
  slug: string;
  name: string;
  focus: string;
  description: string;
  overview: string;
  strength: string;
  decision: string;
  rows: { feature: string; ap3k: string; other: string }[];
  sources: { label: string; href: string }[];
};
// Official product pages reviewed September 27, 2026. Avoid stale competitor price claims.
export const COMPARISONS: Comparison[] = [
  {
    slug: "manychat",
    name: "ManyChat",
    focus: "Multi-channel conversations",
    description:
      "Looking for a ManyChat alternative for Instagram? Compare AP3K’s free plan, comment-to-DM automation, AI replies and migration steps with ManyChat.",
    overview:
      "ManyChat combines chat marketing across several messaging channels. Its plans now use monthly active contacts, with channel and team access varying by plan. That makes the channel mix and contact definition important when comparing a quote with AP3K’s successful-action allowance.",
    strength:
      "ManyChat is a strong candidate when Instagram shares a campaign with WhatsApp, Messenger or other supported channels. Its team inbox and broader conversation tools can justify managing a larger workspace.",
    decision:
      "Choose AP3K when the work is centered on Instagram and you want to budget for replies and DMs. Choose ManyChat when coordinating conversations across channels is a core requirement.",
    rows: [
      {
        feature: "Main focus",
        ap3k: "Instagram comments, DMs and lead capture",
        other: "Multi-channel chat marketing",
      },
      {
        feature: "Usage model",
        ap3k: "Successful automated actions per month",
        other: "Monthly active contacts; plan-dependent limits",
      },
      {
        feature: "AI",
        ap3k: "AI replies on Pro and Business",
        other: "AI-powered conversations on selected paid plans",
      },
      {
        feature: "Team workflow",
        ap3k: "Instagram account workspaces",
        other: "Plan-dependent users and inbox seats",
      },
    ],
    sources: [
      {
        label: "ManyChat plans and features",
        href: "https://manychat.com/pricing",
      },
    ],
  },
  {
    slug: "creatorflow",
    name: "CreatorFlow",
    focus: "Creator link delivery and email capture",
    description:
      "AP3K vs CreatorFlow: compare Instagram link delivery, email collection, account capacity and monthly usage before choosing your tool.",
    overview:
      "CreatorFlow focuses on delivering links after Instagram interactions and capturing email addresses before delivery. Its official site describes a contact CRM and CSV export for connecting collected emails with an email platform.",
    strength:
      "CreatorFlow is worth considering when email-first link delivery is the central campaign. Its published free allowance is expressed in DMs, so compare that with the public replies and DMs your AP3K campaign will send.",
    decision:
      "Test the same lead magnet in each product. Check the email prompt, the experience after an invalid answer and the final link before deciding which editor fits your team.",
    rows: [
      {
        feature: "Focus",
        ap3k: "Instagram campaigns and custom conversations",
        other: "Instagram link delivery and email capture",
      },
      {
        feature: "Email collection",
        ap3k: "Email capture in supported automations",
        other: "Email-before-link collection on paid plans",
      },
      {
        feature: "Free allowance",
        ap3k: "500 automated actions per month",
        other: "500 DMs per month, per official site",
      },
      {
        feature: "More complex flows",
        ap3k: "Canvas publishing on Pro and Business",
        other: "Evaluate the editor against your required branches",
      },
    ],
    sources: [
      {
        label: "CreatorFlow product and plan details",
        href: "https://creatorflow.so/",
      },
    ],
  },
  {
    slug: "linkdm",
    name: "LinkDM",
    focus: "Social comment-to-DM campaigns",
    description:
      "Compare AP3K with LinkDM for Instagram comment replies, story interactions, link delivery and multi-account campaigns.",
    overview:
      "LinkDM offers AutoDM tools for Instagram posts, Reels and story replies. Its product page also lists Facebook comment automation. If your audience is active on both networks, that extra channel may matter more than a small difference in subscription price.",
    strength:
      "LinkDM offers an established set of creator-oriented entry points. Its official pricing describes a DM-based allowance, so a like-for-like evaluation should separate public comment replies from private message sends.",
    decision:
      "Choose based on the interactions you actually receive. AP3K suits an Instagram-focused workspace; include Facebook in the trial if that channel is part of your LinkDM shortlist.",
    rows: [
      {
        feature: "Instagram post and Reel comments",
        ap3k: "Supported comment-to-DM triggers",
        other: "Post AutoDM and Reels AutoDM",
      },
      {
        feature: "Stories",
        ap3k: "Supported story interactions",
        other: "Story replies and mention tools",
      },
      {
        feature: "Facebook",
        ap3k: "Instagram-focused automation",
        other: "Facebook AutoDM listed",
      },
      {
        feature: "Allowances",
        ap3k: "Successful actions",
        other: "DM sends; check the selected plan",
      },
    ],
    sources: [
      { label: "LinkDM official features", href: "https://www.linkdm.com/" },
    ],
  },
  {
    slug: "zorcha",
    name: "Zorcha",
    focus: "Instagram follow and link campaigns",
    description:
      "AP3K vs Zorcha: compare comment replies, follow requests, lead collection and the practical details of an Instagram campaign.",
    overview:
      "Zorcha advertises Instagram comment-to-DM replies, an Ask for a Follow step and data collection forms. These tools target a familiar creator workflow: offer a resource in a post, then continue the interaction privately.",
    strength:
      "Zorcha is a relevant candidate for creators whose priority is a follow request or a simple data collection step. Validate current limits and plan access in its product before treating a marketing headline as the full offer.",
    decision:
      "Try a follower and a non-follower through your campaign. Compare how each tool explains the request, handles a recheck and delivers the resource before choosing a platform.",
    rows: [
      {
        feature: "Comment-to-DM",
        ap3k: "Keywords or any eligible comment",
        other: "Instagram comment auto-response",
      },
      {
        feature: "Follow request",
        ap3k: "Follow-check step in supported automations",
        other: "Ask for a Follow automation",
      },
      {
        feature: "Lead collection",
        ap3k: "Email capture and contact tracking",
        other: "Data collection forms",
      },
      {
        feature: "AI and custom flows",
        ap3k: "Paid AI tools and canvas publishing",
        other: "Confirm the current plan in the product",
      },
    ],
    sources: [
      {
        label: "Zorcha official feature overview",
        href: "https://zorcha.com/",
      },
    ],
  },
  {
    slug: "linktree",
    name: "Linktree",
    focus: "Link-in-bio and Instagram Auto-Replies",
    description:
      "Compare AP3K and Linktree for Instagram Auto-Replies, link delivery and the difference between a messaging tool and a creator storefront.",
    overview:
      "Linktree combines a link-in-bio destination with Instagram Auto-Replies. Its official feature page describes sending offers and mailing-list links through automated replies, with campaign send and click reporting.",
    strength:
      "Linktree makes sense when you also need a public link hub and want those destinations beside your social tools. AP3K can send a Linktree URL, so the two products can also serve different parts of the same journey.",
    decision:
      "If your link hub already works, you can keep it and add AP3K for conversations. If you want a combined link-in-bio and automation subscription, evaluate Linktree’s current plan coverage.",
    rows: [
      {
        feature: "Core product",
        ap3k: "Instagram conversation automation",
        other: "Link-in-bio plus creator tools",
      },
      {
        feature: "Instagram replies",
        ap3k: "Public replies and DMs",
        other: "Instagram Auto-Replies",
      },
      {
        feature: "Destination",
        ap3k: "Your own HTTPS links",
        other: "Link hub and promoted links",
      },
      {
        feature: "Campaign reporting",
        ap3k: "Sends, leads and automation activity",
        other: "Auto-Reply send and click reporting",
      },
    ],
    sources: [
      {
        label: "Linktree Instagram Auto-Replies",
        href: "https://linktr.ee/features/instagram-auto-reply",
      },
    ],
  },
  {
    slug: "beacons-ai",
    name: "Beacons",
    focus: "Creator business and link-in-bio tools",
    description:
      "AP3K vs Beacons: understand where Instagram messaging fits alongside a creator storefront, media kit and digital product business.",
    overview:
      "Beacons presents itself as a creator business hub with a customizable link-in-bio page, product and course sales, and partnership tools. That is a broader purchasing decision than choosing only an Instagram reply editor.",
    strength:
      "Beacons is worth evaluating if selling digital products and preparing a media kit are priorities. Review its current messaging features separately rather than assuming the storefront plan covers every automation you need.",
    decision:
      "Keep the store you prefer and send people to it from AP3K. Compare Beacons as a complete business toolkit if consolidating your storefront and creator tools is the main goal.",
    rows: [
      {
        feature: "Primary job",
        ap3k: "Respond to Instagram interactions",
        other: "Manage a creator business and public link hub",
      },
      {
        feature: "Product selling",
        ap3k: "Send links to your existing checkout",
        other: "Digital products, merchandise and courses",
      },
      {
        feature: "Partnership tools",
        ap3k: "Campaign and contact management",
        other: "Media kit and brand partnership tools",
      },
      {
        feature: "Messaging coverage",
        ap3k: "Instagram automation is the core product",
        other: "Check current automation access before subscribing",
      },
    ],
    sources: [
      {
        label: "Beacons official product overview",
        href: "https://beacons.ai/",
      },
    ],
  },
  {
    slug: "high-level",
    name: "HighLevel",
    focus: "CRM, funnels and agency operations",
    description:
      "Compare AP3K and HighLevel for Instagram conversations, CRM workflows and agency operations. Choose the scope your business needs.",
    overview:
      "HighLevel combines CRM, sales pipelines, websites, funnels, calendars and conversations in a broad business platform. Its consolidated conversation stream includes Instagram alongside other communication channels.",
    strength:
      "HighLevel is a strong candidate when a lead needs to move through a sales pipeline, booking sequence and wider marketing system. Teams already using it should test their existing workflow before adding another subscription.",
    decision:
      "Choose AP3K for a focused Instagram workflow. Consider HighLevel when customer records, appointments and multiple communication channels need to run in a single operating system.",
    rows: [
      {
        feature: "Scope",
        ap3k: "Instagram automation workspace",
        other: "CRM and business operating system",
      },
      {
        feature: "Conversations",
        ap3k: "Instagram comments and DMs",
        other: "Multi-channel conversation stream",
      },
      {
        feature: "Funnels and appointments",
        ap3k: "Links to your existing pages",
        other: "Built-in funnels, calendars and pipelines",
      },
      {
        feature: "Setup decision",
        ap3k: "Start with one Instagram campaign",
        other: "Map the broader business workflow",
      },
    ],
    sources: [
      {
        label: "HighLevel official platform overview",
        href: "https://www.gohighlevel.com/",
      },
    ],
  },
  {
    slug: "stan-autodm",
    name: "Stan AutoDM",
    focus: "DMs connected to a Stan Store",
    description:
      "AP3K vs Stan AutoDM: compare an independent Instagram automation workspace with the messaging tools bundled into Stan Store.",
    overview:
      "Stan AutoDM is integrated with Stan Store. Stan describes it as included in its subscriptions, with keyword-triggered DMs that direct followers to store products, freebies, bookings and other offers.",
    strength:
      "For an existing Stan customer, the bundled tool is a sensible first option to test. The relevant comparison is the whole subscription and store workflow, not simply the extra cost of its DM feature.",
    decision:
      "Use Stan AutoDM when the Stan storefront is the center of your business and its campaign options fit. Consider AP3K when you want a dedicated Instagram workspace connected to destinations you already use.",
    rows: [
      {
        feature: "Product relationship",
        ap3k: "Independent automation subscription",
        other: "Bundled with Stan Store subscriptions",
      },
      {
        feature: "Campaign",
        ap3k: "Keyword-triggered comments and DMs",
        other: "Keyword-triggered AutoDM",
      },
      {
        feature: "Destination",
        ap3k: "Your own HTTPS destination",
        other: "Stan Store products and offers",
      },
      {
        feature: "Starting point",
        ap3k: "Free plan with 500 actions per month",
        other: "Evaluate your Stan subscription",
      },
    ],
    sources: [
      {
        label: "Stan AutoDM official guide",
        href: "https://stan.store/blog/stan-autodm/",
      },
    ],
  },
  {
    slug: "wishlink",
    name: "Wishlink",
    focus: "Creator commerce and monetization",
    description:
      "AP3K vs Wishlink: compare Instagram conversation automation with a creator commerce platform and choose the right role for each.",
    overview:
      "Wishlink focuses on creator monetization in India and connections between creators, audiences and shopping. Evaluate it in the context of the brands and commercial relationships you want to work with.",
    strength:
      "Wishlink may be useful when creator commerce is your primary business model. Affiliate availability, supported brands and the commercial terms matter alongside any messaging tools.",
    decision:
      "Use AP3K to deliver your selected links and manage Instagram responses. Compare Wishlink for its creator-commerce ecosystem; these are different decisions that can be complementary.",
    rows: [
      {
        feature: "Primary focus",
        ap3k: "Instagram replies, DMs and lead capture",
        other: "Creator commerce and monetization",
      },
      {
        feature: "Audience",
        ap3k: "Creators and businesses using Instagram",
        other: "Creator-commerce market in India",
      },
      {
        feature: "Commerce relationship",
        ap3k: "Bring your own offer and destination",
        other: "Evaluate supported brands and creator terms",
      },
      {
        feature: "Automation evaluation",
        ap3k: "Test the free campaign editor",
        other: "Confirm current messaging access with Wishlink",
      },
    ],
    sources: [
      {
        label: "Wishlink official platform",
        href: "https://www.wishlink.com/",
      },
    ],
  },
  {
    slug: "superprofile",
    name: "SuperProfile",
    focus: "Creator storefront and AutoDM",
    description:
      "Compare AP3K and SuperProfile for Instagram AutoDM, lead magnets, digital products and a creator business workflow.",
    overview:
      "SuperProfile combines AutoDM with a link-in-bio store, lead magnets and monetization tools. Its product range includes digital products, courses, events and one-to-one coaching.",
    strength:
      "SuperProfile is worth considering when you want the destination and the campaign in a creator toolkit. Check the checkout experience and the format of the product you sell as well as the incoming DM flow.",
    decision:
      "Choose AP3K if your website, store or booking tool is already in place and Instagram responses are the missing part. Consider SuperProfile when you also want to build those creator-business destinations.",
    rows: [
      {
        feature: "Core scope",
        ap3k: "Instagram automation",
        other: "Creator toolkit with AutoDM",
      },
      {
        feature: "Lead capture",
        ap3k: "Email collection and contact tracking",
        other: "Lead magnets and collection forms",
      },
      {
        feature: "Selling products",
        ap3k: "Send customers to your checkout",
        other: "Digital products, courses and events",
      },
      {
        feature: "Public destination",
        ap3k: "Works with your existing links",
        other: "Link-in-bio storefront",
      },
    ],
    sources: [
      {
        label: "SuperProfile official tools",
        href: "https://superprofile.bio/",
      },
    ],
  },
  {
    slug: "linktodm",
    name: "LinktoDM",
    focus: "Instagram DM campaigns",
    description:
      "Compare AP3K with LinktoDM for Instagram comments, DMs, follow requests, lead capture and campaign setup.",
    overview:
      "LinktoDM provides Instagram automation for comments and DMs, including follow requests and contact collection. Its solution pages group those tools around growing followers, increasing sales and engagement.",
    strength:
      "LinktoDM is a relevant choice to trial for a straightforward Instagram campaign. Compare the final recipient experience and the plan’s account and message allowances using the same campaign on both tools.",
    decision:
      "AP3K brings campaign editing, AI-assisted copy and custom flows into an Instagram workspace. Try your real trigger and destination on each product, then compare the capacity you need for a normal month.",
    rows: [
      {
        feature: "Focus",
        ap3k: "Instagram conversation automation",
        other: "Instagram DM automation",
      },
      {
        feature: "Goals",
        ap3k: "Link delivery, leads and engagement",
        other: "Followers, sales and engagement",
      },
      {
        feature: "AP3K capacity",
        ap3k: "1, 3 or 6 connected accounts by plan",
        other: "Review current plan allowances",
      },
      {
        feature: "Custom setup",
        ap3k: "Templates and paid canvas publishing",
        other: "Evaluate the available campaign editor",
      },
    ],
    sources: [
      { label: "LinktoDM product overview", href: "https://linktodm.com/" },
    ],
  },
];
export const comparisonPath = (page: Comparison) =>
  page.slug === "manychat" ? "/manychat-alternative" : `/compare/${page.slug}`;
export const getComparison = (slug: string) =>
  COMPARISONS.find((page) => page.slug === slug);
