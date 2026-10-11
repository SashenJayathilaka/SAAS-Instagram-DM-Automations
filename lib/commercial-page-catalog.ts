import { EXPANSION_COMMERCIAL_PAGES } from "./content/expansion/commercial";
export type CommercialPage = {
  contentLocale?: "en";
  updatedAt?: string;
  seoTitle?: string;
  keywords?: string[];
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  keyword: string;
  media: string;
  video: string;
  mediaAlt: string;
  theme: "violet" | "blue" | "fuchsia" | "rose" | "cyan" | "indigo" | "pink" | "emerald" | "orange";
  proof: string;
  workflow: { title: string; body: string }[];
  useCases: { title: string; body: string }[];
  limitations: string[];
  faqs: { question: string; answer: string }[];
  tutorials: { title: string; slug: string }[];
};

const sharedLimits = [
  "AP3K requires an Instagram Business or Creator account connected through Instagram authorization.",
  "Automations respond to eligible new interactions after activation; they do not process old comments retroactively.",
  "Each successfully sent public reply and each successfully sent DM counts as one automated action.",
];

export const COMMERCIAL_PAGES: CommercialPage[] = [
  ...EXPANSION_COMMERCIAL_PAGES,
  {
    slug: "instagram-dm-automation",
    eyebrow: "Instagram DM automation",
    title: "Automate Instagram DMs Without Complicated Flows",
    description: "Send useful, timely Instagram DMs after comments, story interactions, or incoming messages—and see every delivery in one clear workspace.",
    keyword: "GUIDE",
    media: "/images/docs/flow.webp",
    video: "/media/instagram-features_04.mp4",
    mediaAlt: "AP3K product example showing a story interaction becoming an Instagram DM",
    theme: "violet",
    proof: "Use a supported trigger, write the message once, and let AP3K deliver the follow-up while intent is fresh.",
    workflow: [
      { title: "Connect Instagram", body: "Authorize one Business or Creator account without sharing its password." },
      { title: "Choose the trigger", body: "Start from a comment, story interaction, or eligible incoming DM." },
      { title: "Write the DM", body: "Send plain text or add one clear HTTPS link button." },
      { title: "Test and activate", body: "Run a real test from another account, then monitor delivery activity." },
    ],
    useCases: [
      { title: "Deliver lead magnets", body: "Send the exact guide, checklist, or resource promised in a post." },
      { title: "Route product interest", body: "Move high-intent questions to a product, booking, or pricing page." },
      { title: "Handle repeat questions", body: "Give fast answers while keeping the conversation available in Inbox." },
    ],
    limitations: [...sharedLimits, "Instagram delivery and messaging windows remain subject to Meta platform rules and account permissions."],
    faqs: [
      { question: "Can an automated DM include a clickable link?", answer: "Yes. Add a complete HTTPS destination and a short button label such as Get the Guide or View Product." },
      { question: "Can I send only a DM without a public reply?", answer: "Yes. Comment reply and Send a DM are separate actions, so you can enable only the DM." },
      { question: "How do I know whether the DM was sent?", answer: "AP3K records campaign activity, successful sends, failures, and skipped actions so you can diagnose the result." },
    ],
    tutorials: [
      { title: "Automate Instagram DMs from comments", slug: "automate-instagram-dms-from-comments" },
      { title: "Send a link after an Instagram comment", slug: "send-link-instagram-dm-after-comment" },
    ],
  },
  {
    slug: "instagram-comment-automation",
    eyebrow: "Instagram comment automation",
    title: "Reply to Instagram Comments While Interest Is Fresh",
    description: "Match a keyword or any eligible new comment, publish a natural public reply, and optionally continue the conversation in DM.",
    keyword: "PRICE",
    media: "/images/docs/replies.webp",
    video: "/media/instagram-features_01.mp4",
    mediaAlt: "AP3K product example showing Instagram comments and automated replies",
    theme: "blue",
    proof: "Keep the public acknowledgment and private follow-up independent, so every campaign does only what the audience expects.",
    workflow: [
      { title: "Pick a post or Reel", body: "Limit the automation to specific media or listen across eligible posts." },
      { title: "Set the comment rule", body: "Use a clear keyword or Any Comment when every response should qualify." },
      { title: "Choose public and private actions", body: "Enable a comment reply, a DM, or both—each starts off disabled." },
      { title: "Review real activity", body: "See incoming comments, matches, replies, DMs, and leads in context." },
    ],
    useCases: [
      { title: "Launch posts", body: "Acknowledge every eligible launch comment without copying the same reply all day." },
      { title: "Keyword offers", body: "Ask followers to comment PRICE, MENU, GUIDE, or another intent-rich keyword." },
      { title: "Community engagement", body: "Use varied saved replies or paid AI comment replies in your configured tone." },
    ],
    limitations: [...sharedLimits, "Avoid overlapping automations on the same post unless their keywords are deliberately distinct."],
    faqs: [
      { question: "Does AP3K reply to every old comment?", answer: "No. It reacts to eligible new comment events received after the automation is active." },
      { question: "Can I add reply variations?", answer: "Yes. Saved public-reply variations help repeated acknowledgments feel less mechanical." },
      { question: "Can AP3K reply to its own comments?", answer: "No. Self-authored and duplicate events are ignored to prevent loops." },
    ],
    tutorials: [
      { title: "Keyword vs Any Comment", slug: "instagram-comment-automation-keyword-vs-any-comment" },
      { title: "Automate every Instagram comment", slug: "automate-every-instagram-comment" },
    ],
  },
  {
    slug: "instagram-comment-to-dm",
    eyebrow: "Instagram comment to DM automation",
    title: "Instagram Comment to DM Automation That Delivers the Link",
    description: "Automatically turn an eligible Instagram comment into a public acknowledgement, a private DM, or both—then deliver the exact link or resource promised in the post.",
    keyword: "LINK",
    media: "/images/docs/message.webp",
    video: "/media/smm-templates_03.mp4",
    mediaAlt: "AP3K comment-to-DM example with an Instagram link button",
    theme: "fuchsia",
    proof: "A short comment-to-DM flow is easier to test, easier to understand, and more trustworthy for the person receiving it.",
    workflow: [
      { title: "Make one promise", body: "Tell people exactly what to comment and what they will receive." },
      { title: "Match the same keyword", body: "Configure AP3K with the word used in the caption." },
      { title: "Deliver value first", body: "Put the promised resource in the first DM with one obvious button." },
      { title: "Track the outcome", body: "Review matched comments, successful actions, and captured lead context." },
    ],
    useCases: [
      { title: "Comment LINK", body: "Send a product, course, article, or offer page without manual inbox work." },
      { title: "Comment BOOK", body: "Deliver a scheduling page while the prospect is actively interested." },
      { title: "Comment GUIDE", body: "Turn educational content into a measurable lead-magnet flow." },
    ],
    limitations: [...sharedLimits, "The destination should be mobile-friendly and match the promise made in the Instagram post."],
    faqs: [
      { question: "Do I need a public reply before the DM?", answer: "No. The public reply is optional. Use it only when acknowledging the request improves the experience." },
      { question: "Why does one flow sometimes use two actions?", answer: "A successful public reply is one action and a successful DM is another. A DM-only flow uses one action." },
      { question: "Can the link button open my own website?", answer: "Yes. Use a valid HTTPS URL for your guide, store, booking page, or other promised destination." },
    ],
    tutorials: [
      { title: "DM links after comments", slug: "send-link-instagram-dm-after-comment" },
      { title: "Comment reply vs DM", slug: "instagram-comment-reply-vs-dm" },
    ],
  },
  {
    slug: "instagram-auto-reply",
    eyebrow: "Instagram auto reply",
    title: "Create Instagram Auto Replies That Stay Clear and Human",
    description: "Respond to the right comments and DMs with saved messages or paid AI—while keeping triggers, tone, and delivery limits under your control.",
    keyword: "DETAILS",
    media: "/images/docs/replies.webp",
    video: "/media/smm-features_02.mp4",
    mediaAlt: "Instagram auto reply product example created with AP3K",
    theme: "rose",
    proof: "AP3K separates deterministic automation from AI, so a predictable saved reply never silently turns into generated copy.",
    workflow: [
      { title: "Choose the channel", body: "Decide whether the reply belongs under the post or inside the DM conversation." },
      { title: "Define intent", body: "Use a keyword for precise intent or a broader rule for community replies." },
      { title: "Write or generate", body: "Use saved copy, variations, or paid AI configured with knowledge and behavior." },
      { title: "Protect the experience", body: "Test the wording and review activity before scaling to more posts." },
    ],
    useCases: [
      { title: "Frequently asked questions", body: "Reply quickly to recurring questions about pricing, availability, or access." },
      { title: "Campaign acknowledgments", body: "Confirm a request publicly, then continue privately when appropriate." },
      { title: "Brand-safe AI", body: "On paid plans, use knowledge, tone, and guardrails for DM or comment replies." },
    ],
    limitations: [...sharedLimits, "Free includes saved replies but no AI generation; AI usage is metered separately on paid plans."],
    faqs: [
      { question: "Is AI required for auto replies?", answer: "No. Saved replies and variations work without AI and are included on Free." },
      { question: "Can AI answer comments and DMs?", answer: "Yes on paid plans. AP3K AI can be enabled for eligible comment or DM reply workflows." },
      { question: "Can I pause an auto reply?", answer: "Yes. Deactivate the automation to stop new interactions from entering it." },
    ],
    tutorials: [
      { title: "Create a keyword campaign", slug: "create-instagram-keyword-campaign" },
      { title: "Troubleshoot comment automation", slug: "instagram-comment-automation-not-working" },
    ],
  },
  {
    slug: "instagram-story-automation",
    eyebrow: "Instagram Story automation",
    title: "Continue Instagram Story Interest in the DMs",
    description: "Turn eligible story interactions into organized DM follow-up for launches, resources, registrations, and product interest.",
    keyword: "STORY",
    media: "/images/docs/trigger.webp",
    video: "/media/instagram-features_03.mp4",
    mediaAlt: "AP3K Instagram Story interaction and DM automation example",
    theme: "cyan",
    proof: "Keep the response close to the story context and give people one useful next step instead of a generic message.",
    workflow: [
      { title: "Connect a professional account", body: "Authorize the Instagram Business or Creator profile used for the story." },
      { title: "Choose an eligible story trigger", body: "Configure the interaction AP3K should listen for." },
      { title: "Prepare the DM", body: "Answer the story context directly and add a destination only when needed." },
      { title: "Review conversations", body: "Use Inbox and activity data to continue valuable responses manually." },
    ],
    useCases: [
      { title: "Event registration", body: "Move story interest to a registration or waitlist page." },
      { title: "Product launches", body: "Send details when someone engages with launch content." },
      { title: "Creator resources", body: "Deliver a guide or lesson related to the story people just saw." },
    ],
    limitations: [...sharedLimits, "Available story triggers depend on the events and permissions Instagram exposes to the connected account."],
    faqs: [
      { question: "Can Story automation send a link?", answer: "Yes, when the configured DM supports a valid HTTPS link button." },
      { question: "Does it work with personal Instagram accounts?", answer: "No. AP3K supports Instagram Business and Creator accounts." },
      { question: "Can I see the reply in AP3K?", answer: "Eligible conversations and automation activity are available from the AP3K workspace." },
    ],
    tutorials: [
      { title: "How AP3K works step by step", slug: "how-ap3k-works-step-by-step" },
      { title: "Connect Instagram to AP3K", slug: "connect-instagram-to-ap3k" },
    ],
  },
  {
    slug: "manychat-alternative",
    eyebrow: "Focused ManyChat alternative",
    title: "A Simpler Instagram Automation Alternative",
    description: "AP3K is built for teams that want focused Instagram comment, story, and DM automation without learning a broad multi-channel flow builder.",
    keyword: "START",
    media: "/images/docs/create.webp",
    video: "/media/templates_03-v2.mp4",
    mediaAlt: "AP3K focused Instagram automation product experience",
    theme: "indigo",
    proof: "Choose AP3K when a clear four-step Instagram workflow matters more than operating a broad cross-channel marketing platform.",
    workflow: [
      { title: "Connect Instagram", body: "Start with one Business or Creator account per AP3K workspace." },
      { title: "Select content and trigger", body: "Choose the post, story, keyword, or eligible interaction." },
      { title: "Enable only needed actions", body: "Public reply, opening DM, follow request, and final DM remain explicit choices." },
      { title: "Measure delivery", body: "Track comments, actions, leads, failures, and usage without navigating a visual flow graph." },
    ],
    useCases: [
      { title: "Creators", body: "Deliver guides, courses, affiliate links, and launch information from comments." },
      { title: "Coaches", body: "Move intent from a post into a booking or qualification conversation." },
      { title: "Instagram-first brands", body: "Automate focused product and customer-interest workflows." },
    ],
    limitations: [...sharedLimits, "AP3K is Instagram-focused and is not presented as a feature-for-feature replacement for every multi-channel platform."],
    faqs: [
      { question: "Is AP3K a complete ManyChat clone?", answer: "No. AP3K intentionally focuses on understandable Instagram automations, inbox activity, leads, and optional AI." },
      { question: "Does AP3K have a Free plan?", answer: "Yes. Free includes 500 automated actions per month, one connected Instagram account, and up to five active automations." },
      { question: "Can I import ManyChat flows?", answer: "No automatic importer is currently offered. AP3K campaigns are created in its simpler step-by-step builder." },
    ],
    tutorials: [
      { title: "How AP3K works", slug: "how-ap3k-works-step-by-step" },
      { title: "Build your first keyword campaign", slug: "create-instagram-keyword-campaign" },
    ],
  },
  {
    slug: "instagram-automation-for-creators",
    eyebrow: "Instagram automation for creators",
    title: "Turn Creator Engagement Into Follow-Up That Scales",
    description: "Deliver guides, links, launch details, and answers from Instagram comments and stories without spending the day repeating the same DM.",
    keyword: "CREATOR",
    media: "/images/docs/message.webp",
    video: "/media/templates_05.mp4",
    mediaAlt: "Creator Instagram automation example with a direct-message link",
    theme: "pink",
    proof: "Keep the audience experience personal by automating the repeated delivery step while preserving the conversation for real replies.",
    workflow: [
      { title: "Choose one offer", body: "Tie the automation to one Reel, resource, product, or launch." },
      { title: "Write a visible CTA", body: "Ask followers to comment a word that matches the automation trigger." },
      { title: "Send the promised next step", body: "Use a concise DM and a specific button such as Get the Guide." },
      { title: "Learn from results", body: "Compare received comments, matches, sent actions, and leads." },
    ],
    useCases: [
      { title: "Digital products", body: "Send course, template, newsletter, or membership information." },
      { title: "Affiliate campaigns", body: "Deliver a relevant product link only after a clear request." },
      { title: "Audience growth", body: "Turn high-performing content into a repeatable conversion path." },
    ],
    limitations: [...sharedLimits, "Automation should deliver the stated value promptly; avoid unrelated gates that make the interaction feel deceptive."],
    faqs: [
      { question: "Can a creator account connect directly?", answer: "Yes. AP3K supports eligible Instagram Creator and Business accounts." },
      { question: "Can I create different automations for different Reels?", answer: "Yes. Free supports up to five active automations; paid plans support unlimited active automations." },
      { question: "Can I export leads?", answer: "Lead export is available on paid plans." },
    ],
    tutorials: [
      { title: "Turn Instagram comments into leads", slug: "turn-instagram-comments-into-leads" },
      { title: "Send a link after a comment", slug: "send-link-instagram-dm-after-comment" },
    ],
  },
  {
    slug: "instagram-automation-for-coaches",
    eyebrow: "Instagram automation for coaches",
    title: "Move Coaching Interest From Comments to Conversation",
    description: "Use Instagram comments as a clear intent signal, then send the right resource, application, or booking step by DM.",
    keyword: "COACHING",
    media: "/images/docs/flow.webp",
    video: "/media/smm-templates_02.mp4",
    mediaAlt: "Instagram coaching lead automation and DM example",
    theme: "emerald",
    proof: "A useful coaching flow answers the immediate request before asking the prospect to book or share more information.",
    workflow: [
      { title: "Choose a high-intent post", body: "Use content that naturally leads to a guide, consultation, or program question." },
      { title: "Set a precise keyword", body: "Match the CTA in the caption, such as COACHING, PLAN, or BOOK." },
      { title: "Deliver a relevant DM", body: "Share the promised detail and one appropriate next step." },
      { title: "Continue personally", body: "Use AP3K Inbox and lead context when a human reply is more valuable." },
    ],
    useCases: [
      { title: "Discovery calls", body: "Send a scheduling page after a clear booking request." },
      { title: "Program information", body: "Deliver curriculum, eligibility, or pricing details consistently." },
      { title: "Lead magnets", body: "Turn educational posts into guide and checklist delivery." },
    ],
    limitations: [...sharedLimits, "Do not use automated messages to make guarantees or replace professional medical, legal, or financial advice."],
    faqs: [
      { question: "Can AP3K qualify coaching leads?", answer: "AP3K can deliver the first step and record lead context. Complex qualification should remain clear, consensual, and appropriate for the offer." },
      { question: "Can I link to Calendly or another scheduler?", answer: "Yes. Add the complete HTTPS booking URL as the DM button destination." },
      { question: "Can I take over the conversation?", answer: "Yes. Automation handles configured actions; you can continue relevant conversations from the inbox." },
    ],
    tutorials: [
      { title: "Turn comments into leads", slug: "turn-instagram-comments-into-leads" },
      { title: "Comment reply vs DM", slug: "instagram-comment-reply-vs-dm" },
    ],
  },
  {
    slug: "instagram-automation-for-ecommerce",
    eyebrow: "Instagram automation for ecommerce",
    title: "Connect Product Comments to the Right Buying Step",
    description: "Respond to product interest on Instagram, send the correct page by DM, and track which campaign created the lead.",
    keyword: "SHOP",
    media: "/images/docs/message.webp",
    video: "/media/ecom-features_01.mp4",
    mediaAlt: "Instagram ecommerce comment-to-product-link automation example",
    theme: "orange",
    proof: "Make the destination match the product shown in the post so the customer lands on the answer they expected.",
    workflow: [
      { title: "Select the product content", body: "Scope the automation to the correct post or Reel." },
      { title: "Match buying intent", body: "Use SHOP, SIZE, PRICE, or another keyword that fits the caption." },
      { title: "Send the exact destination", body: "Link directly to the product, collection, size guide, or offer." },
      { title: "Review campaign quality", body: "Track delivery and leads, then improve weak calls-to-action." },
    ],
    useCases: [
      { title: "Product drops", body: "Send the product page when shoppers request the link." },
      { title: "Size and fit", body: "Deliver a size guide or answer repeated product questions." },
      { title: "Restocks and launches", body: "Move interested commenters to the latest availability page." },
    ],
    limitations: [...sharedLimits, "AP3K does not replace your storefront, inventory system, checkout, or order-support workflow."],
    faqs: [
      { question: "Can AP3K complete checkout in Instagram DMs?", answer: "No. AP3K can deliver the appropriate storefront link; checkout remains on your commerce platform." },
      { question: "Can each product post use a different link?", answer: "Yes. Configure each automation with the message and HTTPS destination relevant to that product." },
      { question: "Can AI answer product questions?", answer: "Paid plans can use AP3K AI with the knowledge you provide, but critical pricing and availability should stay current in your source material." },
    ],
    tutorials: [
      { title: "Send links in Instagram DMs", slug: "send-link-instagram-dm-after-comment" },
      { title: "Troubleshoot automation delivery", slug: "instagram-comment-automation-not-working" },
    ],
  },
];

export const COMMERCIAL_SLUGS = COMMERCIAL_PAGES.map((page) => page.slug);

export function getCommercialPage(slug: string) {
  return COMMERCIAL_PAGES.find((page) => page.slug === slug) ?? null;
}
