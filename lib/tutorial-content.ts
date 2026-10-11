import type { BlogPost, BlogSection } from "./blog";

export const TUTORIAL_LABELS = {
  enlarge: "Enlarge screenshot",
  original: "Open full-size image",
  zoom: "Zoom in",
  fit: "Fit to screen",
  hint: "Tap any screenshot to enlarge it. Screens show an example account; your activity and available plan details may differ.",
  guides: "Learn AP3K with real screenshots",
  read: "Read the illustrated guide",
  category: "Illustrated tutorials",
  pan: "Zoom in, then scroll across the image to read the details.",
};

export const TUTORIAL_SCREENSHOTS = {
  "trigger": {file:"trigger",width:1363,height:936,title:"Comment triggers",caption:"Choose the keyword, matching behavior and repeat-delivery rule in AP3K."},
  "delay-controls": {file:"delay",width:1363,height:936,title:"Automation delay controls",caption:"Enable the delay control for the intended automation step."},
  "collect-email": {file:"collect",width:1363,height:936,title:"Collect Email",caption:"Configure the email collection question before final delivery."},
  "collect-phone": {file:"phone",width:1363,height:936,title:"Collect Phone",caption:"Configure phone collection and review the recipient conversation."},
  "follow-gate": {file:"follow",width:1363,height:936,title:"Ask to follow",caption:"Review the follow request before the final DM."},
  "chat": {file:"chat",width:1363,height:936,title:"Incoming DM automation",caption:"Configure a Chat automation for eligible incoming Instagram DMs."},
  "message": {file:"message",width:1363,height:936,title:"Final DM",caption:"Review the final message and its link buttons."},
  "dm-message": {file:"message",width:1363,height:936,title:"DM message and link buttons",caption:"Write a final DM and configure its button label and destination in AP3K."},
  "instagram-ready": {"file":"account","width":1363,"height":936,"title":"Instagram connection readiness","caption":"The connected @ap3kautomation profile with Comments ready and DMs ready badges."},
  "instagram-account": {"file":"account","width":1363,"height":936,"title":"Instagram account health and controls","caption":"Manage the @ap3kautomation profile, connection readiness and Instagram performance."},
  "dashboard": {"file":"dashboard","width":1363,"height":936,"title":"Home dashboard","caption":"The @ap3kautomation dashboard with post, Story and chat automation shortcuts."},
  "automation-types": {"file":"create","width":1363,"height":936,"title":"Choose an automation type","caption":"Choose Post, Story, Chat or Flow automation in AP3K."},
  "automations": {"file":"automations","width":1363,"height":936,"title":"Manage automations","caption":"Filter All, Basic or Flow automations and review triggers, successful runs and enabled status."},
  "contacts": {"file":"contacts","width":1363,"height":936,"title":"Contacts and conversation sources","caption":"Contacts filters and CSV export. An empty search hides contact details in this example."},
  "ai-overview": {"file":"ai-overview","width":1363,"height":936,"title":"AI Overview and readiness","caption":"AI is available inside eligible automations; business knowledge and behavior customize its answers."},
  "ai-knowledge": {"file":"ai-knowledge","width":1363,"height":936,"title":"AI Knowledge notes","caption":"Add reliable facts under Topic and Facts AI may use."},
  "ai-behavior": {"file":"ai-behavior","width":1353,"height":929,"title":"AI voice, tone and guardrails","caption":"Choose an AI role, brand voice, default tone and comment-protection policy."},
  "ai-playground": {"file":"ai-playground","width":1363,"height":936,"title":"Test in AI Playground","caption":"Test saved business knowledge, voice and guardrails before using AI in live conversations."},
  "inbox": {"file":"inbox","width":1363,"height":936,"title":"Instagram Inbox","caption":"The @ap3kautomation Inbox, ready for incoming conversations."},
  "billing": {"file":"billing","width":1353,"height":929,"title":"Billing and monthly usage","caption":"Monthly usage and plan capacities. This demonstration workspace has internal Business access; customer billing details differ."},
  "referrals": {"file":"referrals","width":1353,"height":929,"title":"Refer and earn","caption":"Referral links, commission examples and personalized-code eligibility in AP3K."},
  "settings": {"file":"settings","width":1353,"height":337,"title":"Appearance and language","caption":"Appearance and display language have separate controls. Account details are outside this screenshot."},
} as const;
export type TutorialScreenshotId = keyof typeof TUTORIAL_SCREENSHOTS;
export function tutorialImageSrc(id: TutorialScreenshotId) { return `/images/docs/${TUTORIAL_SCREENSHOTS[id].file}.webp`; }

export const INSTAGRAM_CONNECTION_SECTIONS: BlogSection[] = [
  { heading: "1. Start from the welcome screen", paragraphs: ["Use an Instagram Business or Creator account that you are authorized to manage. On the AP3K welcome screen, choose Let's connect your Instagram. I'll explore first lets you look around, but automations still need a connected Instagram account before they can run."] },
  { heading: "2. Open Connect Instagram", paragraphs: ["Choose Connect Instagram to open the official Instagram authorization flow. Select the intended professional profile and review access before continuing."] },
  { heading: "3. Choose the account and review access", paragraphs: ["Read the username on Instagram's permission screen before continuing. AP3K-IG is the app name shown in this example. Profile and media access is marked required. Leave comment access enabled for comment triggers and replies, and message access enabled for DMs, then choose Allow to continue or Cancel to stop.", "Confirm that the same intended Instagram username appears before and after authorization."] },
  { heading: "4. Check connection and permission readiness", screenshot: "instagram-ready", paragraphs: ["After Instagram returns you to the AP3K dashboard, check the username and open Manage account. Review Comments ready and DMs ready on the connected profile. A healthy connection does not publish an automation for you.", "If an expected capability is missing, use Reconnect Instagram, review the account and access choices, and return to check again. Once ready, create an automation and test it with a fresh interaction from another Instagram account."] },
  { heading: "5. Manage the connected Instagram account", screenshot: "instagram-account", paragraphs: ["Your Instagram shows the connected profile and readiness badges. Refresh profile updates profile information; Reconnect Instagram renews the authorization. Choose a reporting period in Performance to read followers, posts, comments, leads, DMs, and reply rate. These example totals are not a promise of results.", "Expand Connection settings for Manage connection or Remove Instagram account. Removal permanently deletes that profile's automations, contacts, inbox, analytics, and AI knowledge; your other connected accounts stay unchanged. Use reconnect to repair access, and remove an account only when you intend to delete its AP3K data."] },
];

const base = {
  publishedAt: "2026-09-20", updatedAt: "2026-10-02", category: TUTORIAL_LABELS.category,
  readingTime: "8 min read", visual: "workflow" as const,
  contentLocale: "en" as const,
  visualAlt: "AP3K workflow connecting Instagram interactions with replies and direct messages",
  visualCaption: "Follow the real AP3K workspace screens alongside the instructions in this guide.",
};

export const ILLUSTRATED_POSTS: BlogPost[] = [
  {
    ...base, slug: "ap3k-workspace-visual-guide", cover: "dashboard",
    title: "Your AP3K Workspace: A Complete Visual Guide",
    description: "Explore the AP3K dashboard, automations, contacts, Inbox, billing, referrals, and settings with real screenshots and practical instructions.",
    keywords: ["AP3K tutorial", "AP3K dashboard", "Instagram automation"],
    intro: "Use this tour to find your way around AP3K after connecting Instagram. Start with Home, check your automations, then follow the conversation through Contacts and Inbox. The final sections explain your subscription and account controls.",
    sections: [
      { heading: "1. Read your Home dashboard", screenshot: "dashboard", paragraphs: ["Check the Instagram username in the account card and sidebar before reading the results. Use Last 24h, Last 7d, This month, or Last 30d to choose the reporting period. Followers, Posts, Comments, Leads, and Replies describe different parts of your activity; leads are not confirmed purchases."], bullets: ["Use the account selector in the sidebar when you manage more than one Instagram profile.", "Manage account opens the connection controls. View all opens the full automation list."] },
      { heading: "2. Find and manage an automation", screenshot: "automations", paragraphs: ["Open Automations from the sidebar. Search by automation name, keyword, or content, then choose All, Basic or Flow to narrow the list. Read the Trigger and Actions columns together: a keyword decides when a flow starts, while the actions describe what it sends."], bullets: ["Edit opens the configuration. Pause stops a live flow; Start resumes a paused flow.", "Runs and Leads are separate counters. Create Automation starts a new flow."] },
      { heading: "3. Find people in Contacts", screenshot: "contacts", paragraphs: ["Open Contacts and search by Instagram username. Filter by Last interacted on, Created on, Email or Phone. Pro and Business can use Download CSV to export the matching contacts. Open chat, when available, continues in Inbox. A contact is not proof of a sale; the example search hides personal contact details."] },
      { heading: "4. Continue a conversation in Inbox", screenshot: "inbox", paragraphs: ["Search conversations, select a person in the chat list, and read the thread before replying. The selected conversation shows its source and previous messages. Write in the reply box and choose Send; Enter sends and Shift + Enter starts a new line. Use Refresh if recent activity is missing.", "Manual replies depend on the Instagram connection and messaging eligibility. A contact entry alone does not guarantee that you can send a message."] },
      { heading: "5. Check your plan and usage", screenshot: "billing", paragraphs: ["Open Billing to see your current plan, subscription status, renewal date, and usage. Automated actions and AI replies have separate allowances. One successful public reply or DM counts as one action; sending both uses two, and additional messages use additional actions. Playground tests count toward the AI allowance.", "Use the Monthly or Annual selector when comparing plans. Paid subscribers use Manage or cancel subscription to open the billing portal. Read the current details in your own workspace rather than treating the example screenshot's balance, price, or renewal date as your account information."] },
      { heading: "6. Track invitations in Refer & earn", screenshot: "referrals", paragraphs: ["Copy your own invite link from Refer & earn and share it with a friend. Track clicks, signups and paid subscriptions separately. Follow the progress cards and referral activity to see which stage each invitation has reached.", "Read Eligibility and rules before expecting a reward. Referral-link commissions depend on successful qualifying payments. Personalized discount codes have separate plan and follower requirements. Read the current program terms; signup alone is not a commission. Use your own link, not the one pictured here."] },
      { heading: "7. Set appearance, email, and account preferences", screenshot: "settings", paragraphs: ["In Settings, choose Light or Dark in Appearance and set your display language in its separate section under Appearance. Manage sign-in settings opens your authentication controls. Under Email notifications, select the optional messages you want and choose Save email preferences. Essential security, connection, usage, support, and billing emails remain enabled.", "The Danger zone is for permanent account deletion, including automations, Instagram data, leads, and the sign-in account. To pause an automation, use Pause in Automations instead of deleting your account."] },
    ],
  },
  {
    ...base, slug: "create-ap3k-automation-visual-guide", cover: "automation-types",
    title: "Create an AP3K Automation: Comments, Stories, and DMs",
    description: "Choose the right AP3K automation type, configure a comment or message trigger, review your replies, and check the live flow with this visual guide.",
    keywords: ["AP3K tutorial", "Instagram comment automation", "Instagram DM automation"],
    intro: "An automation starts with an interaction, checks your trigger, and runs the actions you enabled. Begin with one clear goal: deliver a requested link, acknowledge a comment, or answer an incoming message. Connect the intended professional Instagram account before building the flow.",
    sections: [
      { heading: "1. Choose where the conversation starts", screenshot: "automation-types", paragraphs: ["Open Automations and select New automation. Choose Post, Story or Chat for a basic workflow, or Flow for a visual branching conversation."], bullets: ["Comment automation: a comment on a post or Reel can trigger a public reply, a DM, or both.", "Story automation: choose the supported story interaction, such as a mention, emoji reaction, or text reply.", "DM automation: respond to a new incoming message containing a keyword, or to any eligible message."] },
      { heading: "2. Set the trigger and write the response", paragraphs: ["For a comment flow, name the automation, choose its post scope, and select Specific keyword or Any comment. If your caption asks people to comment GUIDE, configure that keyword. Turn on Reply to comment, Send a DM, or both, then replace sample messages with your own copy.", "For a story or DM flow, choose the relevant interaction or message rule in its builder, then write the response and any link buttons. Story and DM flows respond privately; they are not public comment replies."], bullets: ["Opening DM is optional in a comment flow. Leave it off when you want to send the final DM directly.", "If you enable a follow request or another optional step, test that complete path before publishing.", "Check every button label and destination URL. The final DM supports up to three labeled links."] },
      { heading: "3. Preview, publish, and test", paragraphs: ["Use the builder's phone preview to read the experience as a customer. Check the selected account, trigger, enabled actions, messages, and links, then publish. Test with a fresh, eligible interaction from another Instagram account after activation. For a comment flow, verify the public reply and DM separately.", "If a reply is missing, confirm the flow is Live, the interaction matches the saved rule, the Instagram connection is ready, and your usage allowance is available. Correct one issue and test with a new interaction."] },
      { heading: "4. Review the live automation", screenshot: "automations", paragraphs: ["Return to Automations and find the new flow. Confirm the channel, trigger, enabled actions, and Enabled status. Watch Runs and Leads as interactions arrive. Use Edit to change the setup or Pause to stop it. Check Inbox for the resulting conversation and Home for the wider account totals."] },
    ],
  },
  {
    ...base, slug: "set-up-ap3k-ai-visual-guide", cover: "ai-overview", visual: "workflow",
    title: "Set Up AP3K AI: Knowledge, Behavior, and Playground",
    description: "Set up AP3K AI with a four-screen tutorial: review readiness, add business knowledge, choose behavior, and test answers before enabling live replies.",
    keywords: ["AP3K tutorial", "AP3K AI", "Instagram AI replies"],
    intro: "Open AI Assistant in the sidebar to reach AP3K AI. The four tabs form a practical setup sequence: Overview, Knowledge, Behavior, and Playground. Prepare and test your answers before enabling AI in selected automations. AI features require a plan that includes them.",
    sections: [
      { heading: "1. Review readiness in Overview", screenshot: "ai-overview", paragraphs: ["Read Your AI readiness to see what remains to prepare. Open knowledge takes you to business facts; Open behavior takes you to voice and response rules. AI is ready automatically for eligible automations; add business knowledge and behavior instructions to customize its responses.", "Choose AI in each automation that should use it. Updating workspace knowledge does not turn saved-message automations into AI campaigns. Use Save changes after editing the configuration."] },
      { heading: "2. Add reliable business knowledge", screenshot: "ai-knowledge", paragraphs: ["In Knowledge, give each note a clear Topic and fill in Facts AI may use. Choose Add knowledge, check that the note appears under Saved knowledge, and save your changes. Keep separate notes for services, prices, delivery, policies, and frequently asked questions so updates stay simple.", "Use exact, current facts and say what the assistant should do when information is unknown. The empty state in the screenshot means no knowledge has been added yet. Do not add passwords, payment details, or private customer information."] },
      { heading: "3. Choose voice and response boundaries", screenshot: "ai-behavior", paragraphs: ["In Behavior, describe the AI role and your brand voice. Choose Fun, Friendly, or Professional as the default tone. In Guardrails & escalation, explain when to avoid guessing and when to offer human help. Keep these instructions consistent with your saved business facts.", "Review Comment protection deliberately. Skip reply and Delete are different actions: deleting affects the Instagram comment. Review the current selection for each category; a screenshot is not a recommended moderation policy. Choose what suits your moderation policy, then save."] },
      { heading: "4. Test in Playground before going live", screenshot: "ai-playground", paragraphs: ["Add at least one knowledge note, save the setup, then ask a realistic customer question in Playground. Try a follow-up and a question your notes do not answer. Check accuracy, tone, and whether the assistant respects your boundaries. Update Knowledge or Behavior and test again if needed.", "Playground conversations are saved, but they do not become live business knowledge automatically. Save useful facts explicitly as knowledge. Tests use your monthly AI allowance. When the results are ready, select the AI option in the intended automation, save, and test the live flow."] },
    ],
  },
];

// Attach the same reviewed screenshots to the matching knowledge-base topics.
export const HELP_TUTORIALS: Record<string, { screenshots: TutorialScreenshotId[]; guide: string }> = {
  "connect-instagram": { screenshots: ["instagram-account"], guide: "connect-instagram-to-ap3k" },
  "reconnect-instagram": { screenshots: ["instagram-ready", "instagram-account"], guide: "connect-instagram-to-ap3k" },
  "workspace-tour": { screenshots: ["dashboard"], guide: "ap3k-workspace-visual-guide" },
  "automation-types": { screenshots: ["automation-types"], guide: "create-ap3k-automation-visual-guide" },
  "create-automation": { screenshots: ["automations", "dm-message"], guide: "create-ap3k-automation-visual-guide" },
  "ai-setup": { screenshots: ["ai-overview"], guide: "set-up-ap3k-ai-visual-guide" },
  "ai-knowledge": { screenshots: ["ai-knowledge", "ai-playground"], guide: "set-up-ap3k-ai-visual-guide" },
  "ai-safety": { screenshots: ["ai-behavior"], guide: "set-up-ap3k-ai-visual-guide" },
  "contacts-leads": { screenshots: ["contacts"], guide: "ap3k-workspace-visual-guide" },
  inbox: { screenshots: ["inbox"], guide: "ap3k-workspace-visual-guide" },
  "plans-usage": { screenshots: ["billing"], guide: "ap3k-workspace-visual-guide" },
  "refer-earn": { screenshots: ["referrals"], guide: "ap3k-workspace-visual-guide" },
  "privacy-delete": { screenshots: ["settings"], guide: "ap3k-workspace-visual-guide" },
};
