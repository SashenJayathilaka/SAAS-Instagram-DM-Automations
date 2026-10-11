import { PRACTICAL_PRODUCT_GUIDES } from "./content/practical-product-guides";
import { LAUNCH_MEASUREMENT_GUIDES } from "./content/launch-measurement-guides";
import { SEO_COMPARISON_POSTS } from "./content/seo-comparisons";
import importedPosts from "./content/imported-blog/index.json";
import { OCTOBER_EDITORIAL } from "./content/editorial-october";
import { EXPANSION_POSTS } from "./content/expansion";
import type { BlogVisualVariant } from "@/components/website/blog-visual";
import { COMMENT_DM_POSTS } from "./content/comment-dm";
import growthPosts from "./content/growth/en.json";
import { ILLUSTRATED_POSTS, INSTAGRAM_CONNECTION_SECTIONS, type TutorialScreenshotId } from "./tutorial-content";

export type BlogSection = {
  video?: boolean;
  table?: { headers: string[]; rows: string[][] };
  links?: { label: string; href: string }[];
  screenshot?: TutorialScreenshotId;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  steps?: { title: string; body: string }[];
};

export type BlogPost = {
  importedArchive?: boolean;
  author?: string;
  subtitle?: string;
  seoTitle?: string;
  noIndex?: boolean;
  contentLocale?: "en";
  related?: string[];
  wordCount?: number;
  cover?: TutorialScreenshotId;
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  readingTime: string;
  category: string;
  keywords: string[];
  visual: BlogVisualVariant;
  visualAlt: string;
  visualCaption: string;
  intro: string;
  sections: BlogSection[];
};

export const LEGACY_BLOG_POSTS: BlogPost[] = [
  ...PRACTICAL_PRODUCT_GUIDES,
  ...LAUNCH_MEASUREMENT_GUIDES,
  COMMENT_DM_POSTS[0],
  ...OCTOBER_EDITORIAL,
  ...EXPANSION_POSTS,
  ...COMMENT_DM_POSTS.slice(1),
  ...ILLUSTRATED_POSTS,
  ...growthPosts as BlogPost[],
  {
    slug: "automate-instagram-dms-from-comments",
    title: "How to Automate Instagram DMs From Comments",
    description: "A practical guide to turning Instagram comments into automated DMs using comment triggers, reply actions, and a professional account workflow.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-22",
    readingTime: "7 min read",
    category: "Instagram Automation",
    keywords: ["automate Instagram DMs", "Instagram comment automation", "Instagram DM automation"],
    visual: "workflow",
    visualAlt: "Diagram showing an Instagram comment moving through AP3K into a public reply and direct message",
    visualCaption: "A comment starts the flow; AP3K checks the trigger and runs the actions configured in the campaign.",
    intro: "Comment-to-DM automation gives creators and businesses a fast way to respond when someone shows intent on a post or Reel. Instead of manually checking comments and sending the same message repeatedly, a campaign can watch for a trigger and send the configured DM automatically.",
    sections: [
      {
        heading: "What comment-to-DM automation does",
        screenshot: "instagram-ready",
        paragraphs: [
          "A comment-triggered campaign starts with an Instagram Business or Creator account and a post or Reel. When a new comment matches the campaign trigger, the automation can reply under the post, send a DM to the commenter, or do both.",
          "The useful part is not simply sending a message. It is connecting a visible signal of interest—such as GUIDE, PRICE, BOOK, or any new comment—to a consistent follow-up action.",
        ],
      },
      {
        heading: "Choose the right trigger",
        links: [{ label: "Instagram Comment Automation: Keyword vs Any Comment", href: "/blog/instagram-comment-automation-keyword-vs-any-comment" }],
        paragraphs: ["There are two simple trigger patterns that cover most creator workflows:"],
        bullets: [
          "Keyword trigger: run the campaign only when the comment contains or matches a word you configured.",
          "Any Comment trigger: run the campaign for every eligible new comment on the selected content.",
        ],
      },
      {
        heading: "Decide what happens after the comment",
        paragraphs: [
          "Keep the actions understandable. A Comment reply appears publicly under the Instagram post. A DM goes to the commenter's Instagram inbox. Use a Comment reply when you want to acknowledge the user publicly, and use a DM when the next step contains a guide, offer, booking link, or information that belongs in a conversation.",
          "AP3K lets a campaign use either action or both, so the workflow can match the goal instead of forcing one response pattern.",
        ],
      },
      {
        heading: "Build a clean first campaign",
        screenshot: "automations",
        links: [{ label: "Read the illustrated guide", href: "/help/create-automation" }],
        paragraphs: ["A reliable first campaign is intentionally small. Pick one post, use one clear keyword, write one useful DM, test from another Instagram account, then confirm the activity before expanding the campaign."],
        bullets: [
          "Choose the Instagram post or Reel.",
          "Set a keyword or Any Comment trigger.",
          "Choose Reply to comment, Send a DM, or both.",
          "Review the message and activate the campaign.",
          "Test with a real comment from another Instagram account.",
        ],
      },
      {
        heading: "Measure outcomes, not only messages",
        screenshot: "dashboard",
        paragraphs: [
          "A useful automation dashboard should show whether comments arrived, triggers matched, actions were sent, and leads were captured. That makes it possible to distinguish a weak call-to-action from a technical delivery problem.",
          "Start with a simple campaign you can understand end to end. Once it performs consistently, duplicate the pattern for other posts, keywords, and offers.",
        ],
      },
    ],
  },
  {
    slug: "instagram-comment-automation-keyword-vs-any-comment",
    title: "Instagram Comment Automation: Keyword vs Any Comment",
    description: "Learn when to use keyword triggers and when to automate every eligible Instagram comment, with practical campaign examples.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-09-22",
    readingTime: "6 min read",
    category: "Campaign Strategy",
    keywords: ["Instagram keyword automation", "Any Comment Instagram", "Instagram comment trigger"],
    visual: "keyword",
    visualAlt: "Diagram comparing an Instagram keyword comment with an automated DM action",
    visualCaption: "Keyword campaigns connect a clear call-to-action in the post with a predictable follow-up.",
    intro: "The trigger determines which comments enter an automation. Choosing between a keyword and Any Comment sounds small, but it changes who receives the next action and how precisely a campaign reflects user intent.",
    sections: [
      {
        heading: "Use a keyword when intent matters",
        paragraphs: ["Keyword triggers are a strong fit when the post asks people to comment a specific word. They reduce accidental matches and make the call-to-action easy to measure."],
        bullets: ["GUIDE for a downloadable resource", "PRICE for pricing information", "BOOK for a booking or consultation flow", "LINK when the promised next step is delivered in a DM"],
      },
      {
        heading: "Use Any Comment when every response deserves follow-up",
        paragraphs: ["Any Comment is useful when the campaign should acknowledge or follow up with everyone who comments, regardless of the exact words they use. It works well for broad announcements, launches, and community posts where requiring a keyword would feel unnatural."],
      },
      {
        heading: "Avoid overlapping campaigns",
        screenshot: "automations",
        paragraphs: ["If several campaigns listen to the same content, keep their triggers intentional. Overlapping rules make analytics harder to read and can create an experience where users receive more actions than expected."],
      },
      {
        heading: "A simple decision rule",
        links: [{ label: "How to Automate Instagram DMs From Comments", href: "/blog/automate-instagram-dms-from-comments" }, { label: "Read the illustrated guide", href: "/help/create-automation" }],
        paragraphs: ["If your caption tells people exactly what to comment, use that keyword. If the promise applies to everyone who joins the conversation, use Any Comment. Then keep the Comment reply and DM directly related to that promise."],
      },
    ],
  },
  {
    slug: "instagram-comment-reply-vs-dm",
    title: "Instagram Comment Reply vs DM: Which Should You Automate?",
    description: "Understand the difference between automated Instagram Comment replies and DMs, and when to use one action or both.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    readingTime: "6 min read",
    category: "Instagram Automation",
    keywords: ["Instagram comment reply automation", "Instagram DM automation", "comment reply vs DM"],
    visual: "dm-link",
    visualAlt: "Diagram showing an Instagram request followed by a direct message and link button",
    visualCaption: "The public reply acknowledges the request; the DM delivers the useful next step privately.",
    intro: "A Comment reply and a DM solve different parts of the same conversation. Treating them as two clear customer actions makes campaign design easier than thinking in API terminology such as public and private replies.",
    sections: [
      {
        heading: "What a Comment reply is",
        paragraphs: ["A Comment reply is posted beneath the original Instagram comment. It is useful for acknowledging the person, confirming that the request was seen, or telling them to check their inbox."],
      },
      {
        heading: "What a DM is",
        paragraphs: ["A DM is sent to the commenter in Instagram's messaging experience. It is the better place for a longer response, a resource, or a link button configured in the campaign."],
      },
      {
        heading: "When to use both",
        paragraphs: ["Use both when the public acknowledgement improves the comment experience and the real value is delivered in the DM. A short Comment reply such as “Sent—check your DMs” can set the expectation while the inbox message contains the useful next step."],
      },
      {
        heading: "Keep reply volume in mind",
        paragraphs: ["In AP3K, each successfully sent Comment reply and each successfully sent DM counts as one automated action. If one matching comment triggers both actions, that campaign run uses two automated actions. Failed or skipped actions do not count."],
      },
    ],
  },
  {
    slug: "turn-instagram-comments-into-leads",
    title: "How to Turn Instagram Comments Into Leads",
    description: "A practical framework for using Instagram comment triggers, DMs, and lead tracking to turn engagement into measurable follow-up.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    readingTime: "8 min read",
    category: "Growth",
    keywords: ["Instagram lead generation", "Instagram comments leads", "Instagram automation leads"],
    visual: "analytics",
    visualAlt: "Diagram showing Instagram comments becoming trigger matches and trackable leads",
    visualCaption: "Measure the path from engagement to matched intent and captured opportunities.",
    intro: "A high comment count is useful, but the business value comes from what happens next. A comment can become a lead when the campaign recognizes intent, delivers the promised follow-up, and records enough context to continue the relationship.",
    sections: [
      {
        heading: "Start with an offer people can request",
        paragraphs: ["The strongest comment-to-lead campaigns have a clear reason to respond. A guide, checklist, price list, booking page, product information, or launch notification gives the commenter a concrete next step."],
      },
      {
        heading: "Make the call-to-action specific",
        paragraphs: ["Tell people exactly what to do: comment GUIDE, comment PRICE, or leave a comment to receive the next step. The trigger in the automation should mirror the language in the post."],
      },
      {
        heading: "Use the DM to continue the conversation",
        paragraphs: ["The DM should deliver what the post promised quickly. Avoid adding unrelated steps before providing value. If a link is needed, use the campaign's DM link button so the next action is clear."],
      },
      {
        heading: "Track campaign-level results",
        screenshot: "contacts",
        paragraphs: ["Look at comments received, trigger matches, sent actions, campaign runs, and captured leads together. That context helps you improve the content and call-to-action instead of treating every performance problem as an automation problem."],
      },
      {
        heading: "Scale the patterns that work",
        paragraphs: ["Once a campaign consistently attracts the right comments and sends the right follow-up, reuse the structure on future content. Keep each campaign understandable enough that you can tell why it exists and what result it is supposed to create."],
      },
    ],
  },
  {
    slug: "instagram-automation-business-creator-accounts",
    title: "Instagram Automation for Business and Creator Accounts",
    description: "What professional Instagram accounts need for comment-triggered automation, and how to prepare a clean campaign workflow.",
    publishedAt: "2026-08-27",
    updatedAt: "2026-08-27",
    readingTime: "6 min read",
    category: "Getting Started",
    keywords: ["Instagram Business automation", "Instagram Creator automation", "Instagram professional account automation"],
    visual: "connect",
    visualAlt: "Diagram showing an Instagram professional account being authorized and connected to AP3K",
    visualCaption: "AP3K starts with an authorized Instagram Business or Creator account.",
    intro: "Instagram automation tools that use supported platform APIs are built around professional accounts. For AP3K, that means connecting an Instagram Business or Creator account, then creating campaigns for its posts and Reels.",
    sections: [
      {
        heading: "Use a professional Instagram account",
        paragraphs: ["Before building campaigns, make sure the Instagram account is a Business or Creator account and that the person connecting it is authorized to grant the requested access."],
      },
      {
        heading: "Connect through Instagram authorization",
        paragraphs: ["AP3K uses an Instagram authorization flow rather than asking for an Instagram password. The connected account supplies the media and comment context used by the campaign."],
      },
      {
        heading: "Build campaigns around real content",
        paragraphs: ["Choose a post or Reel that has a clear call-to-action. Then set the trigger and actions. A campaign can reply to the matching comment, send a DM, or do both."],
      },
      {
        heading: "Keep the connection healthy",
        paragraphs: ["If Instagram access needs to be renewed, reconnect the account before testing campaigns. A clean connection plus a simple test campaign makes troubleshooting much easier than changing several settings at once."],
      },
    ],
  },
  {
    slug: "how-ap3k-works-step-by-step",
    title: "How AP3K Works: A Step-by-Step Instagram Automation Tutorial",
    description: "Learn how AP3K connects to Instagram, watches comments, checks triggers, sends replies and DMs, and records campaign activity step by step.",
    publishedAt: "2026-08-30",
    updatedAt: "2026-08-30",
    readingTime: "10 min read",
    category: "AP3K Tutorial",
    keywords: ["how AP3K works", "AP3K tutorial", "Instagram comment automation tutorial", "Instagram DM automation step by step"],
    visual: "workflow",
    visualAlt: "Complete AP3K workflow from Instagram comment through trigger matching to automated reply and DM",
    visualCaption: "The AP3K workflow has three understandable parts: listen for a comment, check the campaign trigger, then run the selected actions.",
    intro: "AP3K turns a new Instagram comment into a controlled follow-up workflow. You choose where the campaign listens, what kind of comment should trigger it, and whether the person receives a public reply, a DM, or both. This guide walks through the complete setup without hiding the important decisions behind technical language.",
    sections: [
      {
        heading: "Before you create a campaign",
        paragraphs: [
          "Use an Instagram Business or Creator account and prepare a post or Reel with a clear call-to-action. The easiest campaign to understand is one where the caption promises something specific, such as a guide, price list, booking page, or product link.",
          "Decide what success means before configuring the automation. A campaign designed to deliver a guide should not use the same message as a campaign designed to answer a pricing question.",
        ],
        bullets: ["A connected Instagram Business or Creator account", "A post or Reel with a clear offer", "A keyword such as GUIDE, PRICE, or LINK—or a reason to respond to every comment", "The reply or DM you want the commenter to receive"],
      },
      {
        heading: "Create the campaign in four steps",
        screenshot: "automation-types",
        paragraphs: ["The AP3K campaign builder keeps setup in four stages so you can review the complete customer experience before it goes live."],
        steps: [
          { title: "Name the campaign and choose content", body: "Give the campaign a recognizable name, then select Any post or one specific Instagram post or Reel." },
          { title: "Choose the comment trigger", body: "Use Specific keyword when the caption asks people to comment a word. Use Any comment when every eligible commenter should enter the flow." },
          { title: "Configure the actions", body: "Turn on Reply to comment, Send a DM, or both. Edit the example copy so it delivers exactly what the post promised." },
          { title: "Review and activate", body: "Check the account, content scope, trigger, reply variations, DM message, and link button before saving the campaign as active." },
        ],
      },
      {
        heading: "What happens after someone comments",
        paragraphs: [
          "When an eligible comment arrives, AP3K identifies campaigns connected to that Instagram account and content scope. It checks whether the campaign listens for any comment or whether the comment contains one of the configured keywords.",
          "If the trigger matches, AP3K runs the enabled actions. A public reply appears beneath the comment. A DM is delivered privately. If a link button is configured, it accompanies the DM when the supported Instagram message format is available.",
        ],
      },
      {
        heading: "Test before promoting the campaign",
        paragraphs: ["Use a second Instagram account to leave a real comment. Confirm the public reply, check the inbox, open the button, and review the campaign activity in AP3K. One realistic test is more useful than changing several settings without knowing which part failed."],
        bullets: ["The test comment appears on the correct post or Reel", "The expected trigger matches", "The public reply is natural and relevant", "The DM contains the promised value", "The button opens the correct HTTPS destination", "The campaign activity records the run"],
      },
      {
        heading: "Improve one variable at a time",
        paragraphs: ["Once the full flow works, improve the caption, keyword, reply, DM, or offer individually. This keeps the campaign measurable and makes it possible to identify why performance changes."],
      },
    ],
  },
  {
    slug: "connect-instagram-to-ap3k",
    contentLocale: "en",
    cover: "instagram-account",
    title: "How to Connect Instagram to AP3K",
    description: "A step-by-step guide to connecting an Instagram Business or Creator account to AP3K and preparing it for comment and DM automation.",
    publishedAt: "2026-08-30",
    updatedAt: "2026-09-20",
    readingTime: "7 min read",
    category: "Getting Started",
    keywords: ["connect Instagram to AP3K", "connect Instagram Business account", "Instagram Creator account automation", "Instagram automation setup"],
    visual: "connect",
    visualAlt: "Instagram professional account authorization flow connecting to AP3K",
    visualCaption: "The connection uses Instagram authorization so AP3K can access the account information required for campaigns.",
    intro: "Connecting Instagram is the foundation of every AP3K campaign. The connection tells AP3K which professional account owns the posts, comments, and campaign activity. Follow this checklist before creating your first automation.",
    sections: INSTAGRAM_CONNECTION_SECTIONS,
  },
  {
    slug: "create-instagram-keyword-campaign",
    title: "How to Create an Instagram Keyword Automation Campaign",
    description: "Create an Instagram keyword campaign that detects words in comments and automatically sends a relevant public reply, DM, or link.",
    publishedAt: "2026-08-30",
    updatedAt: "2026-08-30",
    readingTime: "9 min read",
    category: "Campaign Tutorial",
    keywords: ["Instagram keyword automation", "Instagram comment keyword trigger", "comment keyword send DM", "automated Instagram keyword reply"],
    visual: "keyword",
    visualAlt: "Instagram comment containing the word GUIDE triggering an AP3K direct message",
    visualCaption: "The keyword in the caption and the keyword in AP3K should describe the same user intent.",
    intro: "A keyword campaign runs only when a comment contains a word you configured. It is the most controlled way to deliver a guide, link, price list, discount, or booking page because the commenter takes a clear action first.",
    sections: [
      {
        heading: "Choose a keyword people will remember",
        paragraphs: ["Use a short word directly connected to the offer. Avoid generic words that may appear in unrelated conversations. The best keyword is visible in the caption and easy to type."],
        bullets: ["GUIDE for a resource or checklist", "PRICE for pricing details", "BOOK for an appointment or consultation", "LINK for a promised page", "MENU for a restaurant or service menu"],
      },
      {
        heading: "Write the Instagram call-to-action",
        paragraphs: ["Tell people exactly what to comment and what they will receive. For example: Comment GUIDE and I’ll send the checklist in your DMs. This sets a clear expectation and makes campaign results easier to understand."],
      },
      {
        heading: "Configure the campaign",
        paragraphs: ["Create a new AP3K campaign and follow these steps:"],
        steps: [
          { title: "Choose the post or Reel", body: "Select the content containing the keyword call-to-action, or use Any post if the same keyword should work across the account." },
          { title: "Select Specific keyword", body: "Add the keyword exactly as you present it to the audience. AP3K checks whether the comment contains that keyword." },
          { title: "Edit the public replies", body: "Keep up to three natural variations so repeated campaign responses do not look mechanical." },
          { title: "Write the DM", body: "Deliver the promised value immediately and add a clear button title if the next step uses a link." },
          { title: "Activate and test", body: "Comment from a second account using the keyword in a natural sentence and confirm the complete flow." },
        ],
      },
      {
        heading: "Use reply variations intelligently",
        paragraphs: ["Variations should communicate the same outcome. Do not write three different promises. Examples such as “Thanks! Please see DMs,” “Sent you a message! Check it out,” and “Nice! Check your DMs” acknowledge the commenter without changing the campaign meaning."],
      },
      {
        heading: "Avoid keyword campaign mistakes",
        bullets: ["Do not hide the keyword only inside the automation; show it in the post", "Do not use an unrelated DM", "Do not send a broken or unfinished destination link", "Do not activate several overlapping campaigns without testing", "Do not judge results before confirming that real comments reach the campaign"],
        paragraphs: ["A controlled keyword campaign should be easy to explain in one sentence: when someone comments this word, they receive this response."],
      },
    ],
  },
  {
    slug: "automate-every-instagram-comment",
    title: "How to Automate Every Instagram Comment With Any Comment",
    description: "Learn how to use an Any Comment trigger to reply to every eligible Instagram comment, send DMs, and avoid an overly aggressive automation experience.",
    publishedAt: "2026-08-30",
    updatedAt: "2026-08-30",
    readingTime: "8 min read",
    category: "Campaign Tutorial",
    keywords: ["automate every Instagram comment", "Instagram Any Comment automation", "auto reply to all Instagram comments", "send DM to Instagram commenters"],
    visual: "any-comment",
    visualAlt: "Any new Instagram comment entering AP3K and triggering configured campaign actions",
    visualCaption: "Any Comment removes the keyword requirement, so every eligible comment in the campaign scope can run the same actions.",
    intro: "Any Comment is the broadest AP3K trigger. Instead of looking for GUIDE, PRICE, or another word, the campaign can react to every eligible comment in its post scope. That power is useful only when the same follow-up genuinely makes sense for everyone.",
    sections: [
      {
        heading: "When Any Comment is the right choice",
        paragraphs: ["Use Any Comment for launches, announcements, giveaways, community posts, or content where every commenter should receive the same acknowledgement or next step. Use a keyword instead when the comments contain different kinds of intent."],
      },
      {
        heading: "Set up the campaign",
        steps: [
          { title: "Choose a narrow post scope", body: "Start with one specific post or Reel so you can observe the experience before applying the rule more broadly." },
          { title: "Select Any comment", body: "The campaign no longer requires the commenter to type a particular word." },
          { title: "Choose the actions", body: "Decide whether everyone needs a public acknowledgement, a private DM, or both." },
          { title: "Write universally relevant copy", body: "The message must make sense for a question, compliment, emoji, or short response." },
          { title: "Test different comment styles", body: "Try a sentence, an emoji, and a simple compliment from another account before launch." },
        ],
        paragraphs: ["Keep the first campaign small enough to monitor. Broad automation without a clear purpose creates noise rather than value."],
      },
      {
        heading: "Write a response that fits every commenter",
        paragraphs: ["Avoid copy that assumes every commenter requested a specific guide unless the post itself promises that guide to everyone. A safe public acknowledgement can be short, while the DM explains the next step clearly."],
      },
      {
        heading: "Watch reply volume",
        paragraphs: ["A campaign that replies publicly and sends a DM performs two actions for each successful run. Any Comment can therefore consume more automated-action volume than a narrow keyword campaign. Review campaign activity and plan scope accordingly."],
      },
      {
        heading: "Switch to a keyword when intent becomes mixed",
        paragraphs: ["If people begin asking unrelated questions or only some commenters should receive the offer, the campaign is too broad. Replace Any Comment with a specific keyword and update the caption so the audience understands how to trigger it."],
      },
    ],
  },
  {
    slug: "send-link-instagram-dm-after-comment",
    title: "How to Send a Link in an Instagram DM After a Comment",
    description: "Build a comment-to-DM campaign that delivers a guide, product page, booking URL, or other link with a clear Instagram message button.",
    publishedAt: "2026-08-30",
    updatedAt: "2026-08-30",
    readingTime: "8 min read",
    category: "DM Strategy",
    keywords: ["send link Instagram DM after comment", "Instagram comment to DM link", "Instagram DM button automation", "automatic Instagram link message"],
    visual: "dm-link",
    visualAlt: "Instagram comment request followed by an automated direct message with a Get the Link button",
    visualCaption: "A good link campaign delivers the promise in one message with one obvious next action.",
    intro: "Links are often the real destination of a comment automation campaign. The comment shows interest; the DM delivers the guide, booking page, product details, menu, or offer. The best flow is short enough that the commenter immediately understands what to do next.",
    sections: [
      {
        heading: "Match the link to the post promise",
        paragraphs: ["If the caption promises a checklist, the button should open that checklist—not a generic homepage. Message-to-destination consistency improves trust and makes campaign analytics more meaningful."],
      },
      {
        heading: "Create the comment-to-link flow",
        steps: [
          { title: "Choose a trigger", body: "Use a keyword such as LINK or GUIDE when people must request the resource, or Any Comment when the same destination is relevant to everyone." },
          { title: "Enable Send a DM", body: "Write a concise message such as “Here’s the link I promised! 🎁” and adapt it to the offer." },
          { title: "Name the button", body: "Use a specific action such as Get the Link, Download Guide, View Pricing, or Book Now." },
          { title: "Add the destination", body: "Paste the complete HTTPS URL and open it yourself on mobile before activation." },
          { title: "Test delivery", body: "Trigger the campaign from another Instagram account and confirm both the DM copy and destination." },
        ],
        paragraphs: ["The button title is editable. Keep it short enough to scan and specific enough that the user knows what will open."],
      },
      {
        heading: "Write DM copy that delivers value first",
        paragraphs: ["Do not bury the promised resource behind several unrelated questions. Confirm the request, explain the link in one sentence, and make the next action obvious."],
        bullets: ["Guide: “Here’s the guide you asked for. Use the button below to open it.”", "Pricing: “Here are the current pricing details. Tap View Pricing to compare options.”", "Booking: “Choose a time that works for you using the Book Now button.”", "Product: “Here’s the product page with the details from the Reel.”"],
      },
      {
        heading: "Check the destination before every major launch",
        paragraphs: ["Broken redirects, expired pages, and desktop-only landing pages waste the attention the campaign earned. Test the final URL on a phone, confirm loading speed, and ensure the page immediately matches the DM promise."],
      },
    ],
  },
  {
    slug: "instagram-comment-automation-not-working",
    title: "Instagram Comment Automation Not Working? A Step-by-Step Checklist",
    description: "Troubleshoot Instagram comment automation by checking account connection, post scope, triggers, actions, campaign status, DMs, and test conditions.",
    publishedAt: "2026-08-30",
    updatedAt: "2026-08-30",
    readingTime: "10 min read",
    category: "Troubleshooting",
    keywords: ["Instagram comment automation not working", "Instagram DM automation not sending", "Instagram keyword trigger not working", "AP3K troubleshooting"],
    visual: "troubleshoot",
    visualAlt: "AP3K troubleshooting flow checking a test comment, diagnosing campaign settings, and restoring automation",
    visualCaption: "Troubleshooting is fastest when you reproduce one real comment and check the flow in order.",
    intro: "When an Instagram automation does not respond, changing every setting at once makes the cause harder to find. Use one real test comment and inspect the workflow from connection to trigger to action. This checklist isolates the most common campaign setup problems in a sensible order.",
    sections: [
      {
        heading: "1. Confirm the Instagram connection",
        paragraphs: ["Open the AP3K account or integration area and verify that the intended Instagram username is connected. If the connection is missing or access needs renewal, reconnect before changing the campaign."],
      },
      {
        heading: "2. Check the campaign status and post scope",
        screenshot: "automations",
        paragraphs: ["Confirm the campaign is active. Then check whether it listens to Any post or one specific post or Reel. A perfectly written keyword will not run if the comment is left on content outside the campaign scope."],
      },
      {
        heading: "3. Reproduce the trigger exactly",
        paragraphs: ["For a keyword campaign, leave a comment that naturally contains the configured word. For Any Comment, use a normal eligible comment. Test from another Instagram account rather than replying as the connected account."],
        bullets: ["Correct post or Reel", "Campaign active", "Keyword spelled as configured", "Comment created after activation", "Test sent from another account"],
      },
      {
        heading: "4. Inspect each action separately",
        paragraphs: ["A public reply and a DM are separate actions. Confirm which toggles are enabled and whether the message fields contain real text. If a public reply appears but the DM does not, focus on DM access and message configuration rather than rebuilding the trigger."],
      },
      {
        heading: "5. Validate the DM link",
        paragraphs: ["If the DM is delivered but the button fails, check that the destination is a complete HTTPS URL and the button title is present. Open the destination outside Instagram to rule out a broken page."],
      },
      {
        heading: "6. Review campaign activity",
        paragraphs: ["Use AP3K activity and campaign details to determine whether the comment arrived, the trigger matched, and the actions were attempted. This separates a content-scope problem from a delivery problem."],
      },
      {
        heading: "7. Retest after one correction",
        paragraphs: ["Fix one identified issue, then create a new real comment. Reusing an old comment may not reproduce the same event. If the second test works, document the cause before expanding the campaign."],
      },
    ],
  },
  {
    contentLocale: "en",
    slug: "instagram-post-scheduler-vs-instagram-automation",
    title: "Instagram Post Scheduler vs Instagram Automation: What Each Tool Does",
    description: "Compare Instagram post scheduling with comment, DM and lead automation so you can choose the right tool without expecting one product to do both jobs.",
    publishedAt: "2026-09-23",
    updatedAt: "2026-09-23",
    readingTime: "7 min read",
    category: "Instagram Automation",
    keywords: ["post scheduler Instagram", "scheduling app for Instagram", "scheduling tool for Instagram", "automate Instagram posts", "Instagram automation tool"],
    visual: "workflow",
    visualAlt: "Comparison of an Instagram publishing calendar and a comment-to-DM automation workflow",
    visualCaption: "Scheduling publishes content; engagement automation responds after an eligible interaction. Many teams need both workflows.",
    intro: "An Instagram post scheduler and an Instagram automation tool solve different problems. A scheduler prepares and publishes content on a calendar. A comment or DM automation tool responds after someone interacts. AP3K focuses on the second job, so it should not be presented as a post scheduler.",
    related: ["compare-instagram-dm-automation-tools", "automate-instagram-dms-from-comments", "turn-instagram-comments-into-leads"],
    sections: [
      {
        heading: "What an Instagram scheduling tool does",
        paragraphs: ["A scheduling app for Instagram helps plan captions, media and publishing times. Depending on the product and account eligibility, it may publish posts, Reels or Stories automatically, provide a content calendar and support approval workflows. Its job happens before or at publication time."],
        bullets: ["Organize a content calendar", "Prepare captions and creative", "Choose a publication date and time", "Coordinate reviews before content goes live"],
      },
      {
        heading: "What Instagram engagement automation does",
        paragraphs: ["Engagement automation starts after a qualifying event. A new comment can match a keyword, receive a public reply and trigger a private DM with the promised information. Incoming messages or eligible story interactions can also begin a configured workflow. Its job is response and follow-up, not publishing."],
        bullets: ["Match a keyword or eligible comment", "Send a public reply, DM or both", "Deliver a guide, product page or booking link", "Record activity and lead context"],
      },
      {
        heading: "Can AP3K automate Instagram posts?",
        paragraphs: ["AP3K does not schedule or publish Instagram posts. It automates supported comment, story and DM workflows after content is live. If you need a post scheduler for Instagram, use a dedicated publishing product or Meta's own available publishing tools, then connect AP3K for the follow-up campaign."],
      },
      {
        heading: "Use both tools as one campaign system",
        paragraphs: ["Plan the post in your scheduling tool, include one clear call to action in the caption, and publish it. In AP3K, select the relevant content, use the same keyword, configure the reply and DM, then test from another Instagram account. The handoff works because the caption promise and automation trigger match."],
        steps: [
          { title: "Plan", body: "Schedule a post with one offer and one clear comment keyword." },
          { title: "Configure", body: "Create the corresponding AP3K automation before the campaign begins." },
          { title: "Test", body: "Leave a fresh comment from another account and confirm both delivery and destination." },
          { title: "Review", body: "Compare post engagement with automation matches, sends and leads." },
        ],
      },
      {
        heading: "How to choose the right category of tool",
        paragraphs: ["Choose scheduling first when inconsistent publishing is the main problem. Choose Instagram DM automation when repeated manual replies and link delivery consume time. Use both when you already publish consistently and want each campaign to continue from public engagement into a measurable private follow-up."],
        links: [{ label: "Compare Instagram DM automation tools", href: "/blog/compare-instagram-dm-automation-tools" }, { label: "See AP3K pricing", href: "/pricing" }],
      },
    ],
  },
  {
    contentLocale: "en",
    slug: "instagram-auto-responder-quick-reply-guide",
    title: "Instagram Auto Responder and Quick Reply Messages: A Practical Guide",
    description: "Learn when to use Instagram quick replies, saved responses and automated messages, with examples for comments, DMs, links and human handoff.",
    publishedAt: "2026-09-23",
    updatedAt: "2026-09-23",
    readingTime: "8 min read",
    category: "Instagram Automation",
    keywords: ["Instagram auto responder", "auto responder for IG", "Instagram autoresponder", "quick reply message for Instagram", "automated Instagram messaging", "Instagram auto reply"],
    visual: "dm-link",
    visualAlt: "Instagram quick reply and automated direct message examples arranged by customer intent",
    visualCaption: "The best response is specific to the request, short enough to scan and easy to hand over to a person.",
    intro: "Quick replies and autoresponders are related, but they are not the same. A quick reply helps a person send saved text faster. An Instagram auto responder sends a configured message when an eligible trigger occurs. Use the lightest option that gives the customer a useful answer without pretending a human typed it live.",
    related: ["instagram-comment-reply-vs-dm", "ai-instagram-dm-autoresponder", "send-link-instagram-dm-after-comment"],
    sections: [
      {
        heading: "Quick reply, saved reply and auto responder",
        paragraphs: ["A quick or saved reply still needs a person to choose and send it. An automated reply runs from a rule such as a comment keyword, any eligible new comment or a supported incoming interaction. AI replies generate language from configured knowledge and guardrails. These choices have different risk, cost and review needs."],
      },
      {
        heading: "Write a useful quick reply message for Instagram",
        paragraphs: ["Start by confirming the request, give the answer or promised resource, and offer one clear next step. Avoid long greetings, several competing buttons and vague claims such as 'we will get back to you soon' when the automation can deliver the information immediately."],
        bullets: ["Guide request: “Here’s the checklist you asked for. Tap below to open it.”", "Booking request: “Choose a time that works for you using the booking link.”", "Product request: “Here is the product page from the Reel, including current details.”", "Support handoff: “I have the context. A person needs to review this next.”"],
      },
      {
        heading: "Choose the right trigger",
        paragraphs: ["Use a keyword when the post asks people to comment a specific word. Use Any Comment only when every normal response should receive the same follow-up. Keep unrelated comments from receiving an offer they did not request, and avoid overlapping automations that can produce duplicate messages."],
      },
      {
        heading: "Separate public replies from automated DMs",
        paragraphs: ["A public Instagram auto reply acknowledges the person under the post. A DM can deliver private details or a link. They are separate actions in AP3K, so enable only what the campaign needs. Sending both also uses two automated actions when both are delivered successfully."],
      },
      {
        heading: "Know when a person should take over",
        paragraphs: ["Use a human response for complaints, sensitive personal information, complex purchasing questions and anything the saved message or knowledge base cannot answer reliably. Automation should make the first useful step faster; it should not trap someone in a loop."],
        links: [{ label: "Build an Instagram auto reply", href: "/instagram-auto-reply" }, { label: "Compare comment replies and DMs", href: "/blog/instagram-comment-reply-vs-dm" }],
      },
    ],
  },
  {
    contentLocale: "en",
    slug: "instagram-lead-generation-comments-dms-vs-lead-ads",
    title: "Instagram Lead Generation: Comments and DMs vs Lead Ads",
    description: "Compare organic Instagram comment-to-DM lead generation with Instagram lead ads, including intent, setup, tracking and follow-up differences.",
    publishedAt: "2026-09-23",
    updatedAt: "2026-09-23",
    readingTime: "8 min read",
    category: "Instagram Growth",
    keywords: ["Instagram lead generation", "Instagram leads", "Instagram lead generation ads", "Instagram lead ads", "lead ads on Instagram", "automated Instagram messaging"],
    visual: "analytics",
    visualAlt: "Comparison of organic Instagram comment leads and paid Instagram lead ad responses",
    visualCaption: "Organic comment-to-DM campaigns and paid lead ads can support the same funnel, but they begin with different user actions.",
    intro: "Instagram lead generation can begin with organic engagement or paid advertising. A comment-to-DM campaign follows up after someone comments on your content. An Instagram lead ad asks a person to submit information through an advertising experience. They are different acquisition paths, and AP3K should not be described as an ad buying or lead-form platform.",
    related: ["turn-instagram-comments-into-leads", "instagram-dm-sales-funnel", "comment-to-dm-conversion-funnel"],
    sections: [
      {
        heading: "How organic comment-to-DM lead generation works",
        paragraphs: ["Publish useful content with a clear invitation such as 'Comment GUIDE and I will send the checklist.' When a new eligible comment matches, the automation can acknowledge it publicly and deliver the resource in a DM. The comment is the intent signal; the DM is the delivery channel."],
      },
      {
        heading: "How Instagram lead ads work",
        paragraphs: ["Lead ads are paid campaigns created and managed through Meta's advertising products. They can collect information or begin a messaging experience depending on the campaign setup. Budget, targeting, creative, consent language and ad reporting live in the advertising platform—not in AP3K."],
      },
      {
        heading: "Compare intent, cost and data",
        paragraphs: ["Organic comment campaigns depend on content reach and visible engagement. Lead ads buy distribution and can reach people who do not follow the account. Compare cost per qualified conversation rather than total comments or form fills alone. Define what counts as a lead before the campaign so the dashboard does not become a collection of unrelated interactions."],
        bullets: ["Organic: content engagement is the entry point", "Lead ads: paid distribution is the entry point", "DM automation: useful for immediate delivery and conversation", "Lead forms: useful when structured fields are required"],
      },
      {
        heading: "Build a clean organic Instagram lead flow",
        steps: [
          { title: "Offer one useful next step", body: "Choose a guide, booking page, product detail or other destination that matches the post." },
          { title: "Use a clear keyword", body: "Make the caption and AP3K trigger use the same memorable word." },
          { title: "Deliver before qualifying", body: "Send the promised value before asking several additional questions." },
          { title: "Track the right outcome", body: "Review matched comments, successful sends, leads and destination performance separately." },
        ],
        paragraphs: ["A high comment count is not automatically a strong lead campaign. The message must arrive, the destination must work on mobile and the person must understand the next step."],
      },
      {
        heading: "Use honest labels across the funnel",
        paragraphs: ["Call an interaction a lead only when it meets the definition your business chose. Do not describe AP3K as an Instagram lead ads manager, post scheduler or full CRM. It automates supported Instagram interactions and records lead context; advertising, checkout and broader customer management remain separate systems."],
        links: [{ label: "Turn Instagram comments into leads", href: "/blog/turn-instagram-comments-into-leads" }, { label: "Explore Instagram automation for creators", href: "/instagram-automation-for-creators" }],
      },
    ],
  },
];

const importedSlugs = new Set(importedPosts.map(post => post.slug));
export const BLOG_POSTS: BlogPost[] = [...SEO_COMPARISON_POSTS, ...importedPosts as BlogPost[], ...LEGACY_BLOG_POSTS.filter(post => !importedSlugs.has(post.slug))].map(post => ({ ...post, author: "AP3K" }));

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

/** Keep fully translated guides first in localized libraries. */
export function getBlogPostsForLocale(locale: string): BlogPost[] {
  if (locale === "en") return BLOG_POSTS;
  return [...BLOG_POSTS.filter(post => !post.contentLocale), ...BLOG_POSTS.filter(post => post.contentLocale)];
}
