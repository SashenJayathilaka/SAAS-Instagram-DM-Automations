export type SeoResource = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  updatedAt?: string;
  sections: { title: string; intro?: string; items: string[] }[];
};

export const SEO_RESOURCES: SeoResource[] = [
  {
    slug: "instagram-comment-to-dm-launch-kit",
    eyebrow: "One post. One keyword. One useful link.",
    title: "Instagram Comment-to-DM Launch Kit",
    description: "Launch your first comment-to-DM campaign with complete creator and ecommerce examples, a live-account test checklist, and a simple way to measure results.",
    updatedAt: "2026-09-29",
    sections: [
      { title: "1. Choose a request people already make", intro: "Start with an Instagram Business or Creator account, one post or Reel, and a destination that works on a phone. These are example scripts, not results from customer campaigns.", items: ["Creator: deliver a checklist, recipe, training plan, or tutorial your audience has asked for. Pick one resource; do not promise several unrelated benefits.", "Store: link to a specific product, size guide, or collection. Make sure the page shows current stock, pricing, and delivery information.", "Use one keyword such as GUIDE or PRODUCT. Keep the keyword, post caption, trigger, and promised destination consistent."] },
      { title: "2. Copy a complete creator campaign", intro: "Example: a creator sharing a meal-planning checklist. Replace the resource and link with your real offer.", items: ["Caption: Want my weekly meal-planning checklist? Comment GUIDE and I’ll send the link by DM.", "Public reply: Check your DMs for the checklist. Use this only when your workflow also sends the promised message; avoid claiming delivery you have not verified.", "DM: Here’s the meal-planning checklist from the post. Tap below to open it and save a copy for your next grocery shop.", "Button: Get the checklist. Destination: the direct checklist page, not an unrelated homepage."] },
      { title: "3. Copy a complete ecommerce campaign", intro: "Example: a store explaining the fit of a jacket. Do not invent discounts or urgency.", items: ["Caption: Want the jacket details and size guide? Comment PRODUCT and I’ll send the product page by DM.", "Public reply: Check your DMs for the product link and size guide.", "DM: Here’s the jacket featured in the post. The page includes sizes, current availability, and the size guide. Reply if you need help choosing.", "Button: View the jacket. Destination: the exact jacket page. If the item sells out, update or pause the campaign."] },
      { title: "4. Build and test in AP3K", items: ["Create your AP3K account and connect the correct Instagram professional account through the supported authorization flow.", "Choose a comment-to-DM automation, select your post or Reel, and enter your keyword. Add the message and promised link, then review the entire flow before activating it.", "From a second Instagram account, leave the keyword comment. Check the inbox and message requests, then open the link in Instagram’s browser.", "Leave an unrelated comment and confirm the keyword automation ignores it. Check punctuation and capitalization cases that matter for your caption.", "If the test fails, review the account connection, selected post, trigger, and permissions. Do not promote the campaign until the real test works."] },
      { title: "5. Measure the outcome you actually want", intro: "For your Instagram promotion, measure comments → delivered DMs → destination visits → the intended action.", items: ["Add campaign tags to your destination link, for example utm_source=instagram&utm_medium=organic_social&utm_campaign=meal_checklist. Never put personal information into tracking parameters.", "Record a baseline and a review date. Compare the same offer and time window; do not treat a sent message as a click or a sale.", "Few keyword comments: improve the resource and caption. Failed delivery: fix the setup. Visits without action: inspect the destination, offer, and checkout.", "Change one meaningful element at a time. Small samples are directional feedback, not proof of a winning conversion rate."] },
      { title: "6. Your first campaign brief", items: ["Audience: Who already wants this resource or product?", "Offer: What exact page or file will the commenter receive?", "Post and keyword: Which post triggers the campaign, and what should people comment?", "Test: Who will check delivery and every link from a second account?", "Success: What final action matters, where will you measure it, and when will you review it?"] },
    ],
  },
  {
    slug: "instagram-comment-automation-checklist",
    eyebrow: "Launch checklist",
    title: "Instagram Comment Automation Checklist",
    description: "Launch Instagram comment-to-DM automation with a free checklist covering account setup, keyword tests, message delivery, mobile links and weekly reviews.",
    sections: [
      {
        title: "Before you build",
        items: [
          "Define the exact resource, answer, or next step the commenter will receive.",
          "Confirm the destination works on a phone and uses HTTPS.",
          "Choose one short keyword that is easy to spell and hard to trigger accidentally.",
          "Write a caption that states both the keyword and what the person will receive.",
        ],
      },
      {
        title: "Inside AP3K",
        items: [
          "Confirm the correct Instagram Business or Creator account is selected.",
          "Choose the intended post, Reel, or account-wide scope.",
          "Match the configured keyword to the caption exactly.",
          "Enable only the public reply and DM actions the campaign actually needs.",
          "Check every message, link, button label, and optional follow request.",
        ],
      },
      {
        title: "Real launch test",
        items: [
          "Comment from a second Instagram account after the automation is active.",
          "Confirm the public reply appears only when enabled.",
          "Check the inbox and message requests for the DM.",
          "Open every link inside Instagram’s in-app browser.",
          "Leave an unrelated comment and confirm a keyword campaign ignores it.",
        ],
      },
      {
        title: "Weekly review",
        items: [
          "Check Instagram connection health and any failed actions.",
          "Compare comments, trigger matches, sent actions, destination visits, and final outcomes separately.",
          "Repair stale links, outdated prices, unavailable products, and expired booking pages.",
          "Improve campaigns with weak outcomes before creating more overlapping automations.",
        ],
      },
    ],
  },
];

export function getSeoResource(slug: string) {
  return SEO_RESOURCES.find(resource => resource.slug === slug) ?? null;
}
