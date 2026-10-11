export type HelpArticle = {
  contentLocale?: "en";
  slug: string;
  category: "Getting started" | "Instagram" | "Automations" | "AP3K AI" | "Inbox" | "Billing" | "Account & privacy";
  title: string;
  summary: string;
  steps: string[];
};

export const AP3K_HELP_ARTICLES: HelpArticle[] = [
  {
    contentLocale: "en",
    slug: "workspace-tour", category: "Getting started", title: "Home dashboard",
    summary: "Explore the connected account, automation shortcuts, performance, contacts, Inbox, billing and settings.",
    steps: ["Use the account selector in the sidebar when you manage more than one Instagram profile.", "Manage account opens the connection controls. View all opens the full automation list."],
  },
  {
    contentLocale: "en",
    slug: "automation-types", category: "Automations", title: "Choose an automation type",
    summary: "Choose Post automation, Story automation, Chat automation or Flow automation according to where the interaction starts.",
    steps: ["Comment automation: a comment on a post or Reel can trigger a public reply, a DM, or both.", "Story automation: choose the supported story interaction, such as a mention, emoji reaction, or text reply.", "DM automation: respond to a new incoming message containing a keyword, or to any eligible message."],
  },
  {
    slug: "connect-instagram",
    category: "Getting started",
    title: "Connect Instagram",
    summary: "Connect one Instagram Business or Creator account through Meta's official authorization flow.",
    steps: ["Open Instagram Account from the workspace menu.", "Choose Connect Instagram and approve the requested Meta permissions.", "After authorization, return to the dashboard. Open Manage account and check the connected username, Comments ready and DMs ready badges.", "Personal Instagram accounts must first be changed to a professional Business or Creator account."],
  },
  {
    slug: "reconnect-instagram",
    category: "Instagram",
    title: "Reconnect or add an Instagram account",
    summary: "Reconnect to restore an existing connection. Use Add Instagram account to connect a different profile.",
    steps: ["Open Instagram Account and select Reconnect Instagram.", "Sign in to the intended Meta account and approve every required permission.", "Free includes 1 Instagram account, Pro includes 3, and Business includes 6. Each account has separate automations, contacts, inbox, analytics, and AI knowledge. Monthly reply and AI allowances are shared across your subscription.", "Reconnecting restores the same account. Use the account menu to add another account; existing accounts and automations stay unchanged."],
  },
  {
    slug: "create-automation",
    category: "Automations",
    title: "Create a comment automation",
    summary: "Choose a post or Reel, define the trigger, then enable only the actions you need.",
    steps: ["Select Create automation.", "Choose the Instagram post or Reel and a keyword or Any Comment trigger.", "In Actions, enable a public reply, AI reply, or DM separately.", "Opening DM is optional. A final DM can be sent directly, and can include up to three labeled links.", "Review the Post, Comments, and DM preview, then publish."],
  },
  {
    slug: "opening-final-dm",
    category: "Automations",
    title: "Opening DM, follow request, and final DM",
    summary: "When Send a DM is enabled, write the delivery message. Opening DM and follow request are optional.",
    steps: ["Opening DM starts the private conversation with a button; leave it off to send the final DM directly.", "Follow request can ask a person to follow before AP3K sends the final link.", "Final DM contains the message and up to three button labels and destination URLs.", "Use the phone preview to check the complete flow before publishing."],
  },
  {
    slug: "automation-troubleshooting",
    category: "Automations",
    title: "Why an automation did not reply",
    summary: "Check the trigger, activation state, Instagram connection, and usage before changing a live flow.",
    steps: ["Confirm the automation is Live and attached to the post or Reel you tested.", "For a keyword trigger, use a comment containing the saved keyword; Any Comment accepts every eligible comment.", "Open Instagram Account and verify that comment and DM permissions are ready.", "Check Billing for remaining automated-reply and AI-reply usage.", "Avoid repeatedly testing with an old comment; create a new eligible comment after publishing changes."],
  },
  {
    slug: "ai-setup",
    category: "AP3K AI",
    title: "Set up AP3K AI",
    summary: "AP3K AI is available on Pro and Business and can be enabled independently for comments and DMs.",
    steps: ["Open AP3K AI and add focused, accurate knowledge notes.", "Set the role, brand voice, tone, guardrails, and comment-protection choices.", "Test answers in Playground, then explicitly save useful business facts to Knowledge.", "Choose AI in each eligible automation. Business knowledge and behavior customize its responses; no workspace master switch is required.", "AI replies count toward the plan's monthly AI allowance."],
  },
  {
    slug: "ai-safety",
    category: "AP3K AI",
    title: "AI safety and comment protection",
    summary: "Control how AI treats abuse, criticism, unanswerable questions, and solicitation.",
    steps: ["AP3K treats Instagram content as untrusted and never as system instructions.", "Choose Skip reply or Delete for supported problem categories.", "Unanswerable questions are skipped rather than guessed.", "Keep product, price, availability, refund, and policy information current in Knowledge.", "Review AI behavior before enabling it on a live automation."],
  },
  {
    slug: "ai-knowledge",
    category: "AP3K AI",
    title: "Teach AI about your business",
    summary: "Knowledge gives AI approved facts; Behavior controls how those facts are communicated.",
    steps: ["Create short knowledge notes for products, services, prices, locations, hours, shipping, refunds, and common questions.", "Keep each note focused and remove outdated facts.", "Use Playground to test realistic customer questions across multiple turns.", "A playground chat is remembered, but it does not change live Knowledge unless you select Save as business knowledge.", "Never save passwords, API keys, payment-card data, or private customer information."],
  },
  {
    slug: "inbox",
    category: "Inbox",
    title: "Use the Instagram Inbox",
    summary: "Read conversations, search contacts, and send a manual reply from the connected account.",
    steps: ["Open Inbox and choose a conversation.", "Search by Instagram username when needed.", "Use Refresh if a new message has not appeared yet.", "Manual replies require a healthy Instagram connection and are subject to Meta messaging rules."],
  },
  {
    slug: "contacts-leads",
    category: "Inbox",
    title: "Contacts and leads",
    summary: "Contacts records the Instagram people who interact with your connected automations.",
    steps: ["Open Contacts to search people captured by AP3K. Use Last interacted on, Created on, Email and Phone filters.", "Pro and Business can collect email and phone in supported automations and export filtered Contacts using Download CSV. Both fields update the same contact.", "A lead is counted when an eligible automation captures the interaction defined by the flow.", "A captured contact is not a confirmed sale. Use your store or booking system to verify purchases and bookings.", "Open an Inbox conversation to review message context and reply manually.", "Use automation analytics to compare comments, public replies, DMs, and leads."],
  },
  {
    slug: "plans-usage",
    category: "Billing",
    title: "Plans, usage, and AI limits",
    summary: "Free is $0; Pro and Business add monthly reply capacity and AP3K AI.",
    steps: ["Free includes 500 automated actions per month, 1 Instagram account, and up to 5 active automations.", "Free does not include AI replies.", "Pro includes 5,000 automated actions and 500 AI replies per month.", "Business includes 20,000 automated actions and 2,000 AI replies per month.", "One successful public comment reply or DM counts as one automated action.", "Open Billing to see current usage; paid subscribers use Manage billing for plan, payment, invoices, or cancellation."],
  },
  {
    slug: "billing-troubleshooting",
    category: "Billing",
    title: "Billing and subscription help",
    summary: "Checkout and subscription changes are handled securely by Stripe.",
    steps: ["Choose a plan and billing interval on Billing.", "Complete payment in Stripe Checkout.", "Use Manage billing for payment methods, invoices, plan changes, and cancellation.", "If access does not update after payment, refresh Billing and contact support with the invoice email—never send card details."],
  },
  {
    slug: "refer-earn",
    category: "Billing",
    title: "Refer friends and earn commissions",
    summary: "Share the tracked referral link shown in Refer & earn and follow qualification progress there.",
    steps: ["Copy your personal link from Refer & earn.", "Your friend must create a new AP3K account through that link, connect Instagram, and complete an eligible paid invoice.", "Referral links offer 30% for up to 11 qualifying paid months. Personalized discount codes have separate plan and follower requirements; review the current program terms.", "Self-referrals, duplicates, refunds, disputes, fraud, and accounts without a connected Instagram profile do not qualify."],
  },
  {
    slug: "privacy-delete",
    category: "Account & privacy",
    title: "Privacy, disconnection, and account deletion",
    summary: "Control the Instagram connection and permanently remove AP3K data from Settings.",
    steps: ["Use Instagram Account to reconnect or remove the connected profile.", "Use Settings to manage sign-in and permanent account deletion.", "Permanent deletion removes campaigns, Instagram connection, leads, activity, billing profile link, and the AP3K account.", "AP3K never needs your Instagram password, card details, one-time code, or raw API key in support chat."],
  },
];

export function ap3kSupportKnowledge() {
  return AP3K_HELP_ARTICLES.map((article) => [article.category, article.title, article.summary, ...article.steps].join("\n")).join("\n\n---\n\n");
}
