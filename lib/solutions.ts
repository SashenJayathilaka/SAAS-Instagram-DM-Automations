export type Solution = {
  slug: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  sections: { title: string; body: string; bullets?: string[] }[];
  steps: { title: string; body: string }[];
  faq: { question: string; answer: string }[];
  related: string;
};
export const SOLUTIONS: Solution[] = [
  {
    slug: "grow-followers",
    label: "Grow followers",
    title: "Turn Instagram interest into a reason to follow.",
    description:
      "Use AP3K follow requests and useful resource delivery to build an Instagram audience that wants to hear from you.",
    intro:
      "A useful post gets attention. A clear next step gives that person a reason to stay. With AP3K, you can invite an interested commenter to follow your account before continuing to the resource you promised.",
    sections: [
      {
        title: "What is a follow request?",
        body: "A follow request is a step in an Instagram conversation. Someone comments on your post, receives a DM and sees your invitation to follow. A supported follow-check step can check their status before continuing. It is not a way to make someone follow automatically.",
      },
      {
        title: "Give people a useful reason to stay",
        body: "Choose a resource that matches your regular content. Someone who wants a recipe collection should know they will see more recipes on your profile. Explain the value of following in one short sentence.",
        bullets: [
          "A creator can share a topic-specific checklist or mini guide.",
          "A coach can deliver a worksheet that supports a recent tutorial.",
          "A shop can send a relevant product guide or offer.",
        ],
      },
      {
        title: "Keep the follow step clear",
        body: "If following is part of the offer, say so before someone begins. Write a helpful instruction and check the path for both existing followers and people who have just followed. Keep the resource available at a working HTTPS URL.",
      },
      {
        title: "Measure interest, not just a bigger number",
        body: "Review the campaign’s activity and lead quality alongside your Instagram account insights. AP3K records supported automation activity; it does not guarantee a number of new followers or claim that every sent DM was read.",
      },
    ],
    steps: [
      {
        title: "Choose a relevant post",
        body: "Use a post or Reel that offers something your audience wants.",
      },
      {
        title: "Set the comment trigger",
        body: "Pick a memorable keyword and make the instruction clear in your caption.",
      },
      {
        title: "Add the follow request",
        body: "Use the supported follow step and explain what happens after the check.",
      },
      {
        title: "Test and activate",
        body: "Try the flow with another account, including someone who is not already following.",
      },
    ],
    faq: [
      {
        question: "Does AP3K add followers automatically?",
        answer:
          "No. People choose whether to follow. AP3K can invite a follow and use supported checks in the conversation.",
      },
      {
        question: "Can existing followers get the resource?",
        answer:
          "Yes. Configure and test the follower path so an existing follower can continue to your resource.",
      },
      {
        question: "What if Instagram cannot confirm a follow?",
        answer:
          "Check the connection and the flow’s response. Do not promise delivery based on an unconfirmed status; test the retry path before activating the campaign.",
      },
    ],
    related: "/instagram-automation-for-creators",
  },
  {
    slug: "increase-sales",
    label: "Increase sales",
    title: "Take Instagram product interest straight to the next step.",
    description:
      "Send the right product, booking or offer link from Instagram comments and DMs with AP3K. Build a clearer path from interest to checkout.",
    intro:
      "When someone asks for a product link, make it easy to find. AP3K can respond to an eligible Instagram comment or message with the details and destination that match your offer.",
    sections: [
      {
        title: "Connect the post to the offer",
        body: "Use a specific destination instead of a general homepage. A post about one product should lead to that product. A coaching invitation should lead to the correct booking page. Keep the message focused on the next useful action.",
      },
      {
        title: "Ways to use link delivery",
        body: "You can keep your existing website and checkout. AP3K handles the conversation that gets people there.",
        bullets: [
          "Send a product page after someone comments a campaign keyword.",
          "Share a booking link after a question about your service.",
          "Deliver an offer or product guide to someone who requests it.",
          "Collect an email in a supported flow when the person chooses to share it.",
        ],
      },
      {
        title: "Make the message feel connected",
        body: "Thank the person for their interest, name the resource and use a short button label. Write variations that preserve the destination and the offer. On paid plans, AI-assisted variations can help with the wording after you provide the message and URL.",
      },
      {
        title: "Track the full journey",
        body: "Review AP3K’s send and lead activity, then use your checkout or booking platform to measure purchases. A recorded send is not a sale. Keep campaign names and tagged destination links consistent so you can connect the two reports.",
      },
    ],
    steps: [
      {
        title: "Choose one offer",
        body: "Start with a product, consultation or useful resource with a working destination.",
      },
      {
        title: "Create the trigger",
        body: "Match your caption’s keyword to the automation.",
      },
      {
        title: "Write the reply and DM",
        body: "Explain what you are sending, add the destination and preview the message.",
      },
      {
        title: "Test the customer journey",
        body: "Check the message, the link and the checkout or booking page on mobile.",
      },
    ],
    faq: [
      {
        question: "Does AP3K process payments?",
        answer:
          "AP3K sends people to your destination. Your store, booking service or payment provider handles the transaction.",
      },
      {
        question: "Can I guarantee more sales with automation?",
        answer:
          "No. Automation reduces manual reply work and makes the next step clearer. Sales still depend on the offer, audience and checkout experience.",
      },
      {
        question: "Can I use my existing store?",
        answer:
          "Yes. Add the complete HTTPS URL for the product or offer you want to share.",
      },
    ],
    related: "/instagram-automation-for-ecommerce",
  },
  {
    slug: "enhance-engagements",
    label: "Enhance engagement",
    title: "Keep Instagram conversations moving while you create.",
    description:
      "Use AP3K to reply to Instagram comments and messages with relevant answers, useful links and a clear next step for your audience.",
    intro:
      "Repeated questions should not keep you away from creating content. AP3K helps you respond to supported Instagram interactions with messages that are relevant to the post and useful to the person asking.",
    sections: [
      {
        title: "Respond where the conversation starts",
        body: "A public reply acknowledges a comment; a DM gives you space to share details. Configure either action or both. Use supported story or incoming-message triggers when those are the places your audience already talks to you.",
      },
      {
        title: "Make every reply useful",
        body: "Write a response that delivers on the context instead of a generic greeting. If a post offers a guide, send that guide. If someone asks a recurring question, provide the answer or a clear way to continue.",
        bullets: [
          "Use specific keywords for posts with several possible topics.",
          "Add message variations without changing the promise.",
          "Keep public replies brief and make DM buttons descriptive.",
          "Review conversations that need your personal attention.",
        ],
      },
      {
        title: "Use AI with a clear purpose",
        body: "On Pro and Business, give AI the tone and information it needs for the supported reply. Review generated copy before using it. Keep your automation’s instructions consistent with the actual offer and avoid sending people to an unrelated destination.",
      },
      {
        title: "Improve one campaign at a time",
        body: "Start small and review the campaign’s successful sends, failures and skipped interactions. Adjust the keyword, message or destination based on what you see. An automation supports a conversation; it does not guarantee reach or replace relevant content.",
      },
    ],
    steps: [
      {
        title: "Choose a repeated interaction",
        body: "Pick one question or resource request that you answer often.",
      },
      {
        title: "Write a useful response",
        body: "Choose a public reply, a DM or both, and make the next step obvious.",
      },
      {
        title: "Preview and test",
        body: "Read the conversation on a phone and send a new test interaction from another account.",
      },
      {
        title: "Review and refine",
        body: "Monitor the automation’s activity and update the message when your content or offer changes.",
      },
    ],
    faq: [
      {
        question: "Can I send a public reply without a DM?",
        answer:
          "Yes. Public replies and DMs are separate actions for supported comment automations.",
      },
      {
        question: "Will it reply to old comments?",
        answer:
          "Automations process eligible new interactions after activation. They do not retroactively reply to every historical comment.",
      },
      {
        question: "Does every reply use my allowance?",
        answer:
          "Each successfully sent automated public reply or DM counts as one action. Failed and skipped actions do not count.",
      },
    ],
    related: "/instagram-comment-automation",
  },
];
