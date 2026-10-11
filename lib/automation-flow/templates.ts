import type { Flow, FlowNode } from "./definition";
export type Template = {
  id: string;
  name: string;
  description: string;
  goal: "followers" | "engagement" | "traffic";
  trigger: "comment" | "dm" | "story" | "live";
  type: "comment" | "affiliate" | "story" | "dm" | "ai" | "flow";
  /** Catalog grouping is independent of which execution engine a preset needs. */
  group?: "basic" | "flow";
  popular?: boolean;
  pro?: boolean;
  unavailable?: string;
  keyword: string;
  steps: string[];
};
/** Ready-to-edit presets. Owner-specific destinations are supplied before publication. */
export const TEMPLATES: Template[] = [
  { id: "comment-links", name: "Auto-DM from comments", description: "Send a DM when people comment on a post or reel", goal: "traffic", trigger: "comment", type: "comment", group: "basic", popular: true, keyword: "link", steps: ["Choose a post or Reel", "Match a comment keyword", "Send your content DM"] },
  { id: "all-dms", name: "Respond to all your DMs", description: "Welcome anyone who sends you a direct message.", goal: "engagement", trigger: "dm", type: "dm", group: "basic", popular: true, keyword: "", steps: ["Receive any DM", "Send your welcome message"] },
  { id: "followers", name: "Grow followers from comments", description: "Ask users to follow your account before sharing your content.", goal: "followers", trigger: "comment", type: "comment", group: "basic", popular: true, keyword: "link", steps: ["Receive a comment", "Ask for a follow", "Verify their follow", "Send your content"] },
  { id: "all-posts", name: "Auto-DM on all posts and reels", description: "Send a DM to all users who comment on any of your posts or reels.", goal: "traffic", trigger: "comment", type: "comment", group: "basic", keyword: "", steps: ["Listen on all posts and Reels", "Receive a comment", "Send your content DM"] },
  { id: "next-post", name: "Auto-DM on next post or reel", description: "Send a DM to all users who comment on your next post or reel when it get published.", goal: "traffic", trigger: "comment", type: "comment", group: "basic", keyword: "", steps: ["Wait for your next post or Reel", "Receive a comment on that post", "Send your content DM"] },
  { id: "comment-leads", name: "Collect email/phone from comments", description: "Send a DM in response to a comment and guide users to submit their email or phone number before sharing your content.", goal: "engagement", trigger: "comment", type: "flow", group: "basic", pro: true, keyword: "link", steps: ["Receive a comment", "Start a DM conversation", "Collect their email", "Collect their phone", "Send your content"] },
  { id: "shared-post", name: "Auto-DM when someone shares your Post or Reel", description: "Send message whenever someone shares your post or reel directly to your inbox.", goal: "engagement", trigger: "dm", type: "dm", group: "basic", keyword: "", steps: ["Someone shares a post or Reel to your inbox", "Send your saved response"] },
  { id: "story-mentions", name: "Respond to story mentions", description: "Send a thank you message, offer, or link whenever someone mentions you in their story.", goal: "engagement", trigger: "story", type: "story", group: "basic", keyword: "", steps: ["Someone mentions you in their story", "Send your thank-you DM"] },
  { id: "dm-leads", name: "Capture leads from DMs", description: "Reply to incoming DM’s leads and guide them to submit their email or phone number.", goal: "engagement", trigger: "dm", type: "flow", group: "basic", pro: true, keyword: "connect", steps: ["Match connect in a DM", "Collect their email", "Collect their phone", "Collect their name", "Confirm their details"] },
  { id: "dm-sales", name: "Sell products or services from DMs", description: "List products or services and guide users to purchase them directly from your DMs.", goal: "traffic", trigger: "dm", type: "flow", group: "basic", pro: true, keyword: "Hello", steps: ["Match Hello in a DM", "Ask what they need", "Route to tips or products"] },
  { id: "follow-up", name: "Re-engage with follow-up message", description: "Send a follow up message using specific conditions and time delays to bring back users who stopped responding.", goal: "engagement", trigger: "comment", type: "flow", group: "basic", pro: true, keyword: "link", steps: ["Share your link", "Wait for your chosen delay", "Check whether they clicked", "Follow up only when they have not clicked"] },
  { id: "comment-opener", name: "Auto-DM from comments with an opener message", description: "Send a introductory opener message when people comment on a post or reel and user can click on button to receive actual content DM.", goal: "traffic", trigger: "comment", type: "comment", group: "basic", keyword: "link", steps: ["Receive a comment", "Send an opening DM", "Wait for the button click", "Send your content DM"] },
  { id: "product-carousel", name: "Auto DM product link carousel", description: "Send up to ten clickable links in one automated message when someone comments or sends your selected keyword.", goal: "traffic", trigger: "comment", type: "flow", group: "basic", pro: true, keyword: "link", steps: ["Match your keyword", "Customize your product cards", "Send your clickable carousel"] },
  { id: "comment-delay", name: "Comment to DM after Delay", description: "Send an automated DM to users after they comment with a timed delay", goal: "traffic", trigger: "comment", type: "flow", group: "flow", pro: true, keyword: "link", steps: ["Receive a link comment", "Ask them to tap Get info", "Wait 10 seconds", "Send the details"] },
  { id: "ask-to-follow", name: "Ask to follow", description: "Prompt users to follow your account before sharing gated details", goal: "followers", trigger: "comment", type: "flow", group: "flow", pro: true, keyword: "link", steps: ["Ask for a follow", "Wait for Yes, I followed", "Wait 30 seconds", "Check their follow", "Share details or ask them again"] },
  { id: "dm-qualifier", name: "DM Qualifier", description: "Automatically identify and segment creators and brands in your inbox", goal: "engagement", trigger: "dm", type: "flow", group: "flow", pro: true, keyword: "collab", steps: ["Receive a collab DM", "Ask creator or brand", "Check their follower count", "Send the matching response"] },
  { id: "consultation-flow", name: "Qualify consultation requests", description: "Find out what a lead needs, collect their email, and save their request for your team.", goal: "engagement", trigger: "dm", type: "flow", group: "flow", pro: true, keyword: "CONSULT", steps: ["Receive CONSULT", "Ask what they need", "Collect email", "Save the request"] },
  { id: "story-feedback-flow", name: "Collect customer feedback", description: "Turn story replies into useful feedback and route customers who need help.", goal: "engagement", trigger: "story", type: "flow", group: "flow", pro: true, keyword: "FEEDBACK", steps: ["Receive FEEDBACK on a story", "Ask about their experience", "Capture feedback or a support request", "Tag the conversation"] },
  { id: "resource-flow", name: "Deliver a guide and follow up", description: "Collect an email, deliver your guide in the DM, and follow up only if its link was not opened.", goal: "traffic", trigger: "comment", type: "flow", group: "flow", pro: true, keyword: "GUIDE", steps: ["Receive GUIDE on your post", "Open the conversation", "Collect email", "Deliver your guide", "Follow up after 30 minutes if not clicked"] },

];

export type TemplatePreset = {
  source: "COMMENT" | "DM" | "STORY";
  storyTrigger: "REPLY" | "MENTION" | "REACTION";
  postScope: "specific" | "all" | "next";
  sharedPost?: boolean;
  keyword: string;
  anyMessage: boolean;
  opening?: string;
  openingButton?: string;
  followGateRequired?: boolean;
};

/** Trigger settings live alongside the graph so selecting a card applies real rules. */
export function templatePreset(id?: string): TemplatePreset {
  const template = templateById(id);
  const preset: TemplatePreset = {
    source: template?.trigger === "comment" ? "COMMENT" : template?.trigger === "story" ? "STORY" : "DM",
    storyTrigger: id === "story-mentions" ? "MENTION" : "REPLY",
    postScope: id === "all-posts" ? "all" : id === "next-post" ? "next" : "specific",
    keyword: template?.keyword ?? "",
    anyMessage: !template?.keyword,
  };
  if (id === "shared-post") preset.sharedPost = true;
  if (id === "followers" || id === "follow-freebie") preset.followGateRequired = true;
  if (id === "comment-opener") {
    preset.opening = "Thanks for your interest! Tap below to get the details.";
    preset.openingButton = "Get info";
  }
  return preset;
}

// Historical links and saved template IDs continue to resolve, but are not extra cards.
const LEGACY_TEMPLATES: Template[] = [
  {
    id: "comment-links",
    name: "Auto-DM links from comments",
    description:
      "Turn a comment on your post or Reel into a personal DM with your link.",
    goal: "traffic",
    trigger: "comment",
    type: "comment",
    popular: true,
    keyword: "LINK",
    steps: [
      "Choose a post or Reel",
      "Match a comment keyword",
      "Send an opening DM",
      "Deliver your link after they reply",
    ],
  },
  {
    id: "story-leads",
    name: "Generate leads with stories",
    description: "Start a conversation when someone replies to your story.",
    goal: "engagement",
    trigger: "story",
    type: "story",
    keyword: "",
    steps: [
      "Choose a story interaction",
      "Write your response",
      "Add your destination link",
    ],
  },
  {
    id: "all-dms",
    name: "Respond to all your DMs",
    description:
      "Welcome people to your inbox with a helpful message and next step.",
    goal: "engagement",
    trigger: "dm",
    type: "dm",
    keyword: "",
    steps: [
      "Someone sends a DM",
      "Send your saved response",
      "Offer a useful link",
    ],
  },
  {
    id: "followers",
    name: "Grow followers from comments",
    description: "Invite a follow before sharing your free resource.",
    goal: "followers",
    trigger: "comment",
    type: "comment",
    keyword: "GUIDE",
    steps: [
      "Match a comment",
      "Send an opening DM",
      "Ask for a follow",
      "Check the follow and send your link",
    ],
  },
  {
    id: "affiliate",
    name: "Send affiliate product links",
    description:
      "Show a product photo, title, and links to your affiliate collaborations.",
    goal: "traffic",
    trigger: "comment",
    type: "affiliate",
    keyword: "SHOP",
    steps: [
      "Match a comment",
      "Get a reply to the opening DM",
      "Send your product card",
    ],
  },
  {
    id: "ai",
    name: "Automate conversations with AI",
    description:
      "Answer questions, collect information, and recommend your offer.",
    goal: "engagement",
    trigger: "dm",
    type: "ai",
    pro: true,
    keyword: "",
    steps: [
      "Set a conversation goal",
      "Add business context",
      "Test a conversation",
      "Choose the DM trigger",
    ],
  },
  {
    id: "product",
    name: "Auto-reply to comment in DM",
    description: "Share a product card from a comment on your post or Reel.",
    goal: "traffic",
    trigger: "comment",
    type: "affiliate",
    keyword: "PRODUCT",
    steps: ["Choose a post", "Match the keyword", "Send the product and links"],
  },
  {
    id: "dm-links",
    name: "Auto-send links in DM",
    description: "Send the right link when someone messages a keyword.",
    goal: "traffic",
    trigger: "dm",
    type: "dm",
    keyword: "LINK",
    steps: ["Match a DM keyword", "Send a message with a link"],
  },
  {
    id: "follow-freebie",
    name: "Follow first, then freebie",
    description: "Verify a follow before delivering your freebie.",
    goal: "followers",
    trigger: "comment",
    type: "comment",
    keyword: "FREEBIE",
    steps: [
      "Receive a comment",
      "Start the DM conversation",
      "Check their follow",
      "Share the freebie",
    ],
  },
  {
    id: "email",
    name: "Grow your email list",
    description:
      "Collect an email in a DM and deliver a free resource. Includes a skip path.",
    goal: "engagement",
    trigger: "dm",
    type: "flow",
    pro: true,
    keyword: "EBOOK",
    steps: [
      "Match EBOOK in a DM",
      "Ask for an email",
      "Validate and save their reply",
      "Deliver the resource",
    ],
  },
  {
    id: "giveaway",
    name: "Run a giveaway",
    description:
      "Accept one entry per person and route them through a configurable random split.",
    goal: "engagement",
    trigger: "comment",
    type: "flow",
    pro: true,
    keyword: "WIN",
    steps: [
      "Receive a WIN comment",
      "Ask them to enter in the DM",
      "Record one entry per person",
      "Send the random outcome",
    ],
  },
  {
    id: "youtube",
    name: "Grow your YouTube",
    description:
      "Invite interested Instagram viewers to your video or channel.",
    goal: "traffic",
    trigger: "comment",
    type: "comment",
    keyword: "VIDEO",
    steps: [
      "Match a comment",
      "Start the conversation",
      "Send your YouTube link",
    ],
  },
  {
    id: "ai-questions",
    name: "Recognize questions in DM with AI",
    description: "Use your business context to answer incoming questions.",
    goal: "engagement",
    trigger: "dm",
    type: "ai",
    pro: true,
    keyword: "",
    steps: [
      "Add FAQ context",
      "Set response boundaries",
      "Test questions in preview",
    ],
  },
  {
    id: "collabs",
    name: "Get more collabs from Story replies",
    description:
      "Ask a brand what it needs and guide it to your collaboration offer.",
    goal: "engagement",
    trigger: "story",
    type: "flow",
    pro: true,
    keyword: "",
    steps: [
      "Receive a story reply",
      "Ask about the collaboration",
      "Share the matching offer",
    ],
  },
  {
    id: "coupons",
    name: "Give coupons in stories",
    description:
      "Send a discount link after someone interacts with your story.",
    goal: "traffic",
    trigger: "story",
    type: "story",
    keyword: "",
    steps: [
      "Choose the story interaction",
      "Write your coupon message",
      "Add your shop link",
    ],
  },
  {
    id: "whatsapp",
    name: "Go from Instagram to WhatsApp",
    description:
      "Invite someone to continue the conversation through your WhatsApp link.",
    goal: "traffic",
    trigger: "dm",
    type: "dm",
    keyword: "WHATSAPP",
    steps: [
      "Match a DM keyword",
      "Send your wa.me link",
      "They choose whether to open WhatsApp",
    ],
  },
  {
    id: "sell-reels",
    name: "Sell from Reel comments",
    description: "Turn product questions under a Reel into a product-card DM.",
    goal: "traffic",
    trigger: "comment",
    type: "affiliate",
    keyword: "SHOP",
    steps: [
      "Choose your Reel",
      "Match the shopping keyword",
      "Send the product card",
    ],
  },
  {
    id: "rsvp",
    name: "Turn comments into RSVPs",
    description:
      "Ask about attendance, collect an email, and send the registration link.",
    goal: "engagement",
    trigger: "comment",
    type: "flow",
    pro: true,
    keyword: "JOIN",
    steps: [
      "Match a JOIN comment",
      "Ask if they want to attend",
      "Collect their email",
      "Send the registration link",
    ],
  },
  {
    id: "quiz",
    name: "Qualify with a quiz",
    description:
      "Ask a question and route each answer to a different recommendation.",
    goal: "engagement",
    trigger: "dm",
    type: "flow",
    pro: true,
    keyword: "QUIZ",
    steps: [
      "Match a DM keyword",
      "Ask a multiple-choice question",
      "Save the answer",
      "Send the matching recommendation",
    ],
  },
  {
    id: "course",
    name: "DM your course like a closer",
    description: "Learn their experience level and share the course that fits.",
    goal: "traffic",
    trigger: "dm",
    type: "flow",
    pro: true,
    keyword: "COURSE",
    steps: [
      "Receive a COURSE DM",
      "Ask their experience level",
      "Recommend the right course",
    ],
  },
  {
    id: "story-faq",
    name: "Answer FAQs from story replies",
    description:
      "Offer a short menu of common questions with a different answer for each.",
    goal: "engagement",
    trigger: "story",
    type: "flow",
    pro: true,
    keyword: "",
    steps: [
      "Receive a story reply",
      "Show the FAQ options",
      "Send the selected answer",
    ],
  },
  ...[
    "Gamify Instagram live",
    "Send offers in DMs during Live",
    "Trigger DMs during IG Live",
  ].map((name, i): Template => ({
    id: `live-${i}`,
    name,
    description: "Start conversations from Instagram Live comments.",
    goal: "engagement",
    trigger: "live",
    type: "flow",
    pro: true,
    keyword: "LIVE",
    unavailable:
      "Instagram Live triggers are not connected to AP3K yet. This template cannot be activated.",
    steps: ["Live comment trigger", "Send the requested information"],
  })),
  {
    id: "sms",
    name: "Grow an SMS list",
    description: "Direct interested people to your SMS signup page.",
    goal: "engagement",
    trigger: "dm",
    type: "dm",
    keyword: "SMS",
    steps: [
      "Receive an SMS keyword",
      "Send your signup-page link",
      "Collect SMS consent on that page",
    ],
  },
];
export function templateById(id?: string) {
  return TEMPLATES.find((t) => t.id === id) ?? LEGACY_TEMPLATES.find((t) => t.id === id);
}
const message = (
  id: string,
  label: string,
  text: string,
  x: number,
  y: number,
  next: string | null = null,
): FlowNode => ({ id, kind: "message", label, text, links: [], x, y, next });

function referenceTemplateFlow(id?: string): Flow | null {
  if (!TEMPLATES.some((template) => template.id === id)) return null;
  const flow = (entry: string, nodes: FlowNode[]): Flow => ({ version: 1, entry, oncePerContact: false, nodes });
  if (id === "consultation-flow") return flow("need", [
    { id: "need", kind: "capture", label: "Understand their goal", text: "Thanks for your interest in a consultation! What would you like help with?", field: "consultation_goal", next: "email", skip: null, x: 100, y: 180 },
    { id: "email", kind: "email", label: "Collect contact email", text: "What email address can our team use to contact you about your request?", next: "tag", skip: null, x: 520, y: 180 },
    { id: "tag", kind: "tag", label: "Mark consultation lead", tag: "consultation_requested", next: "done", x: 940, y: 180 },
    message("done", "Confirm request", "Thanks! Your consultation request and contact details have been saved. You can add any other details here.", 1360, 180),
  ]);
  if (id === "story-feedback-flow") return flow("experience", [
    { id: "experience", kind: "question", label: "Ask about their experience", text: "Thanks for sharing your feedback! How can we help?", field: "feedback_type", options: [{ label: "Share feedback", next: "feedback" }, { label: "I need help", next: "help" }], x: 100, y: 180 },
    { id: "feedback", kind: "capture", label: "Capture feedback", text: "What worked well, and what could we improve?", field: "customer_feedback", next: "thanks", skip: null, x: 520, y: 80 },
    { id: "help", kind: "capture", label: "Understand the issue", text: "Please describe the issue so our team can review it. Don’t include passwords or payment details.", field: "support_request", next: "tag", skip: null, x: 520, y: 400 },
    { id: "tag", kind: "tag", label: "Mark support request", tag: "support_requested", next: "thanks", x: 940, y: 400 },
    message("thanks", "Confirm feedback saved", "Thank you! Your response has been saved in this conversation for our team to review.", 1360, 180),
  ]);
  if (id === "resource-flow") return flow("email", [
    { id: "email", kind: "email", label: "Collect email", text: "What’s your email address? I’ll save it with your contact details, then share the guide right here.", next: "guide", skip: "guide", x: 100, y: 180 },
    { id: "guide", kind: "message", label: "Deliver the guide", text: "Here’s the guide you requested! Tap below to open it.", links: [{ label: "Read the guide", url: "" }], next: "wait", x: 520, y: 180 },
    { id: "wait", kind: "delay", label: "Wait 30 minutes", seconds: 1800, next: "clicked", x: 940, y: 180 },
    { id: "clicked", kind: "condition", label: "Check guide link", field: "_linkClicked", operator: "eq", equals: "true", yes: "end", no: "reminder", x: 1360, y: 180 },
    { id: "end", kind: "end", label: "Guide opened", x: 1780, y: 80 },
    message("reminder", "Offer help", "Did you get a chance to open the guide above? Reply here if you have any questions.", 1780, 400),
  ]);
  if (id === "followers") return flow("checkFollow", [
    { id: "checkFollow", kind: "condition", label: "Check follow status", field: "_followsBusiness", operator: "eq", equals: "true", yes: "delivery", no: "askFollow", x: 100, y: 180 },
    { id: "askFollow", kind: "question", label: "Ask to follow", text: "Follow this account to get the link, then tap below so we can check your follow.", field: "followConfirmation", options: [{ label: "I followed", next: "checkFollow" }], x: 480, y: 420 },
    { id: "delivery", kind: "message", label: "Send your content", text: "Thanks for following! Here is the link you requested.", links: [{ label: "Get the link", url: "" }], next: null, x: 860, y: 80 },
  ]);
  if (id === "comment-delay") return flow("opener", [
    { id: "opener", kind: "question", label: "Opening message", text: "Thanks for your comment! Tap below and I’ll send the details.", field: "requestedDetails", options: [{ label: "Get info", next: "delay" }], x: 100, y: 180 },
    { id: "delay", kind: "delay", label: "Wait 10 seconds", seconds: 10, next: "details", x: 480, y: 180 },
    message("details", "Send details", "Thanks for waiting! What would you like to know?", 860, 180),
  ]);
  if (id === "ask-to-follow") return flow("follow", [
    { id: "follow", kind: "question", label: "Ask to follow", text: "Hey glad you reached out. Please follow us to unlock full details", field: "followConfirmation", options: [{ label: "Yes, I followed", next: "delay" }], x: 100, y: 180 },
    { id: "delay", kind: "delay", label: "Wait 30 seconds", seconds: 30, next: "checkFollow", x: 480, y: 180 },
    { id: "checkFollow", kind: "condition", label: "If user followed me", field: "_followsBusiness", operator: "eq", equals: "true", yes: "details", no: "retryFollow", x: 860, y: 180 },
    message("details", "Send gated details", "Thanks for following. Here is everything you need", 1240, 80),
    { id: "retryFollow", kind: "question", label: "Ask again", text: "Follow us and message again to continue", field: "followConfirmation", options: [{ label: "Yes, I followed", next: "delay" }], x: 1240, y: 420 },
  ]);
  if (id === "dm-qualifier") return flow("qualifier", [
    { id: "qualifier", kind: "question", label: "Creator or brand", text: "Are you a creator or brand", field: "contactType", options: [{ label: "Creator", next: "creatorCount" }, { label: "Brand", next: "brandCount" }], x: 100, y: 300 },
    { id: "creatorCount", kind: "condition", label: "Creator followers > 1000", field: "_followerCount", operator: "gt", equals: "1000", yes: "creatorAccepted", no: "creatorDeclined", x: 480, y: 100 },
    { id: "brandCount", kind: "condition", label: "Brand followers > 500", field: "_followerCount", operator: "gt", equals: "500", yes: "brandAccepted", no: "brandDeclined", x: 480, y: 640 },
    message("creatorAccepted", "Qualified creator", "Thanks we will review your profile", 860, 80),
    message("creatorDeclined", "Creator requirement", "Thanks for your interest! This collaboration is for creators with more than 1,000 followers. You’re welcome to check back as your account grows.", 860, 350),
    message("brandAccepted", "Qualified brand", "Great, can I have your contact details. I'll reach out shortly", 860, 640),
    message("brandDeclined", "Brand response", "Oops, we are currently not open for collabs.", 860, 910),
  ]);
  if (id === "comment-leads" || id === "dm-leads") {
    const nodes: FlowNode[] = [
      { id: "email", kind: "email", label: "Collect email", text: id === "dm-leads" ? "What email address can our team use to contact you about your request?" : "What’s your email address? I’ll save it with your contact details and share the resource here.", next: "phone", skip: null, x: 100, y: 180 },
      { id: "phone", kind: "phone", label: "Collect phone", text: "What’s your contact number?", next: id === "dm-leads" ? "name" : "delivery", skip: null, x: 480, y: 180 },
    ];
    if (id === "dm-leads") nodes.push({ id: "name", kind: "capture", label: "Collect name", text: "What’s your name?", field: "name", next: "delivery", skip: null, x: 860, y: 180 });
    nodes.push(message("delivery", id === "dm-leads" ? "Confirm details" : "Send your content", id === "dm-leads" ? "Thanks! Your contact details have been saved. Is there anything else you’d like us to know?" : "Thanks! Here is the content you requested.", id === "dm-leads" ? 1240 : 860, 180));
    if (id === "comment-leads") {
      const delivery = nodes[nodes.length - 1];
      if (delivery.kind === "message") delivery.links = [{ label: "Get the content", url: "" }];
    }
    return flow("email", nodes);
  }
  if (id === "dm-sales") return flow("interest", [
    { id: "interest", kind: "question", label: "What do they need?", text: "Hey! We’re so excited to have you here! How can I help you?", field: "interest", options: [{ label: "Get expert tips", next: "tips" }, { label: "Discover products", next: "products" }], x: 100, y: 180 },
    // Reference branches start blank. Explicit editing prompts avoid inventing an offer.
    message("tips", "Write your expert tips", "Start with your main goal, choose one offer that meets it, and check what is included before deciding. What are you hoping to achieve?", 480, 80),
    message("products", "Write your product offer", "Tell us what you’re looking for and your budget so we can help you choose the right option.", 480, 390),
  ]);
  if (id === "follow-up") return flow("delivery", [
    { id: "delivery", kind: "message", label: "Send your link", text: "Here is the link you requested.", links: [{ label: "Get the link", url: "" }], next: "delay", x: 100, y: 180 },
    // Ten minutes is an editable starting value, not a claimed reference delay.
    { id: "delay", kind: "delay", label: "Follow-up delay", seconds: 600, next: "clicked", x: 480, y: 180 },
    { id: "clicked", kind: "condition", label: "If link was clicked", field: "_linkClicked", operator: "eq", equals: "true", yes: "end", no: "reminder", x: 860, y: 180 },
    { id: "end", kind: "end", label: "Already clicked", x: 1240, y: 80 },
    message("reminder", "Follow-up message", "Did you get a chance to check the link? Let us know if you need any help.", 1240, 390),
  ]);
  if (id === "product-carousel") return flow("products", [
    { id: "products", kind: "carousel", label: "Your product carousel", text: "Explore our products below.", cards: [{ title: "Starter guide", subtitle: "A practical resource to help you take the first step.", image: "", links: [{ label: "Explore the guide", url: "" }] }, { title: "Personal consultation", subtitle: "Get advice tailored to your goals and questions.", image: "", links: [{ label: "See availability", url: "" }] }, { title: "Complete toolkit", subtitle: "Explore the resources included in the full collection.", image: "", links: [{ label: "View the toolkit", url: "" }] }], next: null, x: 100, y: 180 },
  ]);
  if (id === "all-dms") return flow("welcome", [message("welcome", "Welcome message", "Thanks for reaching out! What can we help you with today?", 100, 180)]);
  if (id === "story-mentions") return flow("thanks", [message("thanks", "Thank you message", "Thanks for mentioning us in your story!", 100, 180)]);
  if (id === "shared-post") return flow("thanks", [message("thanks", "Reply to a shared post", "Thanks for sharing this with us! How can we help?", 100, 180)]);
  return flow("delivery", [
    { id: "delivery", kind: "message", label: "Send your content", text: "Here is the link you requested.", links: [{ label: "Get the link", url: "" }], next: null, x: 100, y: 180 },
  ]);
}

export function templateFlow(id?: string): Flow {
  const reference = referenceTemplateFlow(id);
  if (reference) return reference;
  if (id === "giveaway")
    return {
      version: 1,
      entry: "split",
      oncePerContact: true,
      nodes: [
        {
          id: "split",
          kind: "random",
          label: "Random outcome",
          percent: 5,
          yes: "winner",
          no: "thanks",
          x: 80,
          y: 120,
        },
        message(
          "winner",
          "Selected outcome",
          "Your entry was selected! Reply to this conversation so our team can confirm the details.",
          440,
          60,
        ),
        message(
          "thanks",
          "Thank you",
          "Thanks for entering! You were not selected this time. We appreciate your support.",
          440,
          330,
        ),
      ],
    };
  if (id === "email" || id === "rsvp") {
    const nodes: FlowNode[] = [
      {
        id: "email",
        kind: "email",
        label: "Collect email",
        text: "Where should we send your resource? Reply with your email address.",
        next: "delivery",
        skip: "delivery",
        x: 100,
        y: 120,
      },
      message(
        "delivery",
        "Deliver your link",
        "Thanks! Here is the resource you requested.",
        460,
        120,
      ),
    ];
    if (nodes[1].kind === "message")
      nodes[1].links = [
        { label: id === "rsvp" ? "Register" : "Get the resource", url: "" },
      ];
    if (id === "rsvp") {
      nodes.unshift({
        id: "rsvp",
        kind: "question",
        label: "Attendance",
        text: "Would you like to join our event?",
        field: "attendance",
        options: [
          { label: "Yes, please", next: "email" },
          { label: "Not now", next: "end" },
        ],
        x: 80,
        y: 100,
      });
      nodes[1].x = 440;
      nodes[2].x = 800;
      nodes.push({ id: "end", kind: "end", label: "Finish", x: 440, y: 400 });
    }
    return {
      version: 1,
      entry: id === "rsvp" ? "rsvp" : "email",
      oncePerContact: false,
      nodes,
    };
  }
  if (["quiz", "course", "collabs", "story-faq"].includes(id ?? ""))
    return {
      version: 1,
      entry: "question",
      oncePerContact: false,
      nodes: [
        {
          id: "question",
          kind: "question",
          label: "Learn what they need",
          text:
            id === "story-faq"
              ? "What would you like to know?"
              : "Which option best describes what you need?",
          field: "interest",
          options: [
            { label: "Getting started", next: "beginner" },
            { label: "Advanced help", next: "advanced" },
          ],
          x: 80,
          y: 140,
        },
        message(
          "beginner",
          "Getting started",
          "Here is a good place to start. What else would you like to know?",
          450,
          60,
        ),
        message(
          "advanced",
          "Advanced help",
          "We can help you take the next step. Reply here and our team will help.",
          450,
          360,
        ),
      ],
    };
  return {
    version: 1,
    entry: "welcome",
    oncePerContact: false,
    nodes: [
      message(
        "welcome",
        "Welcome message",
        "Hi! Thanks for reaching out. How can we help?",
        100,
        140,
      ),
    ],
  };
}

export function templateEditorType(id?: string): Template["type"] {
  const template = templateById(id);
  if (["next-post", "shared-post"].includes(id ?? "")) return "flow";
  if (["comment-leads", "follow-up"].includes(id ?? "")) return "comment";
  return template?.type ?? "flow";
}
