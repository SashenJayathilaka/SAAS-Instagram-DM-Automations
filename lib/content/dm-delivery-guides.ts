import type { BlogPost } from "../blog-catalog";

/** Reviewed against the Post message editor, link-button serializer and plan limits. */
export const DM_DELIVERY_GUIDES: Record<string, Partial<BlogPost>> = {
  "comment-to-dm-final-message-templates": {
    title: "8 Instagram Auto-DM Templates",
    seoTitle: "8 Instagram Auto-DM Templates for Requested Links | AP3K",
    description: "Copy eight Instagram DM examples for guides, products, bookings and events. Add the right button, set up the final message in AP3K and test delivery.",
    updatedAt: "2026-10-06",
    contentLocale: "en",
    cover: "dm-message",
    keywords: ["Instagram auto DM templates", "comment to DM message examples", "final DM templates"],
    intro: "Use the final DM to deliver what the person requested in your Instagram comments. Below are eight complete message-and-button pairs you can adapt in AP3K. They are writing examples, not customer results or promises of delivery. Replace the resource names with your actual offer and enter your own destination URL before publishing.",
    sections: [
      {
        heading: "Choose a template that matches the destination",
        paragraphs: ["Each example identifies the resource, explains any required next step and gives the button a specific label. All suggested labels fit the AP3K editor’s 20-character limit. A webpage link does not attach a file, reserve a booking or complete a purchase by itself."],
        table: {
          headers: ["Use case", "DM message to adapt", "Button label"],
          rows: [
            ["Checklist", "Here is the lighting checklist from the Reel. Open it below and start with the window-light setup.", "Open checklist"],
            ["Guide behind a form", "Here is the camera guide you requested. Enter your email on the next page to receive the download.", "Get the guide"],
            ["Product enquiry", "Here is the bag from the video. You can check the available colors, sizes and current price on the product page.", "View the bag"],
            ["Service pricing", "Here are our current service packages and what each includes. Review the options before requesting a quote.", "See packages"],
            ["Consultation", "Here is the consultation booking page. Check the session details and available times, then complete your booking there.", "Choose a time"],
            ["Workshop", "Here is the workshop registration page. Review the date and joining details, then submit the form to register.", "View registration"],
            ["Course preview", "Here is the course outline and sample lesson you asked for. Start with the sample to see whether the teaching style suits you.", "Preview the course"],
            ["Restaurant menu", "Here is our current menu with prices. Check the opening hours and ordering details on the page before planning your visit.", "Open the menu"],
          ],
        },
      },
      {
        heading: "Build one complete campaign around the message",
        paragraphs: ["For a checklist campaign, a coherent caption could be: ‘Comment LIGHT for the lighting checklist from this Reel.’ Configure LIGHT as the keyword on that specific post. An optional public reply could say: ‘Thanks for requesting it—look for the next step in your DMs.’ The checklist message in the table then completes the promise.", "Avoid copying a template into an unrelated any-comment campaign. Someone asking about the camera price has not necessarily requested a lighting checklist. Match the trigger and post scope to the offer before polishing the wording."],
        links: [{ label: "Choose keyword or any-comment triggers", href: "/blog/instagram-comment-automation-keyword-vs-any-comment" }],
      },
      {
        heading: "Put the copy in the final DM controls",
        paragraphs: ["Open the relevant Post automation and review the DM message controls. Choose Text with button in the Message card’s layout selector to expose the link fields. Use the message field for the text and the separate Button label and Destination URL fields for the action. Do not paste a drafted label into the URL field. The screenshot shows an example workspace, not a campaign already created for you."],
        screenshot: "dm-message",
        steps: [
          { title: "Check the account and post", body: "Confirm the selected Instagram username and the post containing the offer. Edit the intended automation rather than a similarly named campaign." },
          { title: "Replace the example message", body: "Use one of the complete examples above, adapted to your resource. Remove drafting notes, brackets and any claim that does not describe the real destination." },
          { title: "Set the button and destination", body: "Enter a clear label within 20 characters and the actual HTTPS URL. Open the URL on a phone before using it in the campaign." },
          { title: "Review the whole sequence", body: "Check the opener, optional collection or follow steps and the final DM together. Save the intended changes and use the review/publish controls deliberately." },
        ],
        links: [{ label: "Post automation setup instructions", href: "/docs/post-automation/create-instagram-comment-to-dm-automation" }],
      },
      {
        heading: "Keep opening messages and delivery messages distinct",
        paragraphs: ["An optional opening DM asks the person to continue the conversation. For example: ‘You requested the lighting checklist. Tap below to continue.’ Its continuation button can say ‘Send the checklist’. The final DM contains the resource link. Do not label the first interaction ‘Download’ if it only advances to another question.", "Follow gates, in-DM contact collection and follow-up messages require an eligible paid plan. A link to an external signup form is different from collecting an email inside AP3K. Adding a form URL does not automatically copy that form’s submissions into Contacts. If you need in-DM capture, configure the dedicated collection step and test the saved contact."],
        links: [{ label: "Opening and final DM sequence", href: "/help/opening-final-dm" }, { label: "Current plan restrictions", href: "/pricing" }],
      },
      {
        heading: "Test the promise from comment to destination",
        paragraphs: ["The phone preview checks presentation. To verify delivery, use an eligible fresh interaction from a second Instagram account after activation. Complete every enabled step and tap the received link. Check message requests as well as the inbox. One DM per user and duplicate protection can intentionally skip repeats."],
        bullets: [
          "Does the matching comment start the intended campaign? Test unrelated text too when using a keyword rule.",
          "Does the final DM identify the same resource as the caption?",
          "Does the button open the correct file, product variant, form or calendar on mobile?",
          "Are required signup, payment or booking steps explained before the tap?",
          "If you enabled in-DM email or phone capture, is the test value saved to the intended contact?",
        ],
        links: [{ label: "Fix a received button that opens the wrong page", href: "/blog/comment-to-dm-wrong-link" }],
      },
      {
        heading: "Watch where the final DM fits in AP3K",
        paragraphs: ["Follow the AP3K setup walkthrough to see the post, trigger, public reply and DM controls in context. Pause at the message settings and compare them with your saved campaign. Optional paid steps depend on the plan and configuration you choose."],
        video: true,
      },
      {
        heading: "Can I personalize or rotate these messages?",
        paragraphs: ["Use only personalization that the selected control actually supports; do not assume that typing a placeholder such as {{first_name}} will insert a real name. Check the exact received message. If you use saved message variations, each version should deliver the same offer and describe the same destination.", "Change one part of the message at a time when evaluating wording. Record the version and date, then compare destination visits and completed actions with your own analytics. Sent messages are not confirmed clicks or sales, and these examples do not establish a conversion uplift."],
        links: [{ label: "Write clear button labels", href: "/blog/comment-to-dm-button-labels" }, { label: "Choose one, two or three links", href: "/blog/comment-to-dm-three-link-buttons" }],
      },
    ],
  },
  "comment-to-dm-three-link-buttons": {
    title: "One, Two or Three Instagram DM Buttons",
    seoTitle: "Instagram DM Link Buttons: One, Two or Three | AP3K",
    description: "Choose the right number of Instagram DM links, configure up to three buttons in AP3K, and test each destination with clear labels and tracking examples.",
    updatedAt: "2026-10-06",
    contentLocale: "en",
    cover: "dm-message",
    keywords: ["Instagram DM multiple links", "AP3K link buttons", "three Instagram DM buttons"],
    intro: "AP3K’s final DM editor supports up to three link buttons, each with its own label and URL. Start with one button when someone requested one resource. Add a second or third only when the choice helps fulfill that same request. This guide covers outbound website links; an opening-message continuation button serves a different purpose.",
    sections: [
      {
        heading: "Choose the number of buttons from the request",
        paragraphs: ["A useful menu makes a meaningful choice explicit. It should not force someone who requested a checklist to sort through your shop, newsletter and consultation offers before finding it. More available buttons do not establish that more buttons will perform better."],
        table: {
          headers: ["Buttons", "Appropriate example", "Message and labels"],
          rows: [
            ["One", "One checklist promised by the post", "Here is the checklist from the Reel. → Open checklist"],
            ["Two", "The same resource in two languages", "Choose the language you want to read. → English guide / Guide en français"],
            ["Two", "A beginner and advanced resource explicitly offered together", "Choose the guide that fits your experience. → Beginner guide / Advanced guide"],
            ["Three", "A service enquiry needing related information", "Here are the packages, example work and booking details. → See packages / View portfolio / Choose a time"],
          ],
        },
      },
      {
        heading: "Add and review the links in AP3K",
        paragraphs: ["Open the DM message controls in your Post automation and choose Text with button in the Message card’s layout selector. Each Button row pairs a Destination URL with a Button label. The editor provides Add link while fewer than three buttons are present. Its label counter allows up to 20 characters; keep the wording short enough to remain clear in the receiving app."],
        screenshot: "dm-message",
        steps: [
          { title: "Write the choice above the buttons", body: "Explain why there is more than one destination. For language versions, say ‘Choose the language you want to read’ instead of leaving the recipient to infer the difference." },
          { title: "Configure the first destination", body: "Enter the real HTTPS URL and a descriptive label. Put the primary resource first in the saved list." },
          { title: "Use Add link for a relevant alternative", body: "Add the second URL and its distinct label. Add a third only if it answers another part of the same request. Remove an unnecessary row using its remove control." },
          { title: "Review and test every button", body: "Check the phone preview, save the intended setup and test the received DM from a second account after activation. Opening only the first button leaves the other destinations unverified." },
        ],
        links: [{ label: "DM message layouts and buttons", href: "/docs/post-automation/dm-message-layouts-text-buttons-attachments" }],
      },
      {
        heading: "Separate a link menu from a branching conversation",
        paragraphs: ["A web-link button opens its configured destination. Two language links let the reader choose a page; they do not mean AP3K inferred the reader’s language, translated your saved message or stored that choice as a profile preference. Create and maintain both destination pages yourself.", "If your intended journey needs a reply to determine the next message, inspect the relevant Flow Builder controls rather than treating website URLs as conversation branches. Custom Flow publishing requires an eligible paid plan. Likewise, adding a link to an email form does not by itself configure AP3K’s in-DM email collection."],
        links: [{ label: "Compare current feature restrictions", href: "/pricing" }, { label: "Plan bilingual campaigns", href: "/blog/comment-to-dm-bilingual-campaigns" }],
      },
      {
        heading: "Use tracking that distinguishes the destinations",
        bullets: [
          "Packages: https://example.com/packages?utm_source=instagram&utm_medium=dm&utm_campaign=consultation&utm_content=packages",
          "Portfolio: https://example.com/work?utm_source=instagram&utm_medium=dm&utm_campaign=consultation&utm_content=portfolio",
          "Booking: https://example.com/book?utm_source=instagram&utm_medium=dm&utm_campaign=consultation&utm_content=booking",
        ],
        paragraphs: ["If your destination analytics supports campaign parameters, use the same campaign name and a distinct utm_content value for each link. These illustrative URLs use example.com; replace them with pages you own. Parameters label incoming visits in a compatible analytics system. They do not prove that a purchase happened or provide automatic per-button attribution inside AP3K.", "If a destination already contains a query string, add new parameters with & rather than a second ?. Preserve required product-variant or booking parameters. Keep email addresses, phone numbers and other personal details out of tracking URLs. Test the complete tagged link after any redirect."],
        links: [{ label: "Set up UTM tracking for DM links", href: "/blog/comment-to-dm-utm-tracking" }],
      },
      {
        heading: "Check the multi-button message on a real phone",
        paragraphs: ["Preview readability and delivery are separate checks. Trigger the active campaign with a fresh eligible comment from another account, complete any opener or gate, and inspect the final message inside Instagram. Test each button in the in-app browser as well as your normal mobile browser when diagnosing a destination problem."],
        table: {
          headers: ["Check", "Pass condition", "If it fails"],
          rows: [
            ["Labels", "Each label identifies a different destination", "Replace repeated ‘Learn more’ labels with specific nouns."],
            ["URLs", "Every button opens the intended current page", "Check each saved row; do not assume only the first URL matters."],
            ["Access", "The promised resource is available to an ordinary visitor", "Fix private file sharing, login requirements or an unexpected paywall."],
            ["Language", "The selected version matches its label", "Correct the destination or label; dashboard language does not translate it."],
            ["Tracking", "Your analytics receives the intended campaign values", "Inspect redirects and the final query string before judging copy performance."],
          ],
        },
      },
      {
        heading: "What if I need more than three destinations?",
        paragraphs: ["Link to one well-organized resource page with a clear button such as ‘Browse resources’. The page can contain the longer menu while the DM stays readable. Make the page’s first screen match the offer and check its mobile loading before sending traffic to it.", "Do not split one simple request across extra messages solely to fit more promotional links. Extra sends consume actions and must still satisfy Instagram’s delivery rules. A single relevant destination is easier to maintain when offers, stock or booking availability change."],
        links: [{ label: "Fix the wrong destination", href: "/blog/comment-to-dm-wrong-link" }, { label: "Copy final DM examples", href: "/blog/comment-to-dm-final-message-templates" }, { label: "Watch the AP3K setup tutorial", href: "/tutorials/instagram-comment-to-dm" }],
      },
    ],
  },
  "comment-to-dm-wrong-link": {
    title: "Fix an Instagram Auto-DM That Opens the Wrong Link",
    seoTitle: "Fix an Instagram Auto-DM That Opens the Wrong Link | AP3K",
    description: "Trace the wrong Instagram DM link from the received message to its AP3K automation, saved button, redirect and landing page. Fix it and retest safely.",
    updatedAt: "2026-10-06",
    contentLocale: "en",
    cover: "automations",
    keywords: ["Instagram automated DM wrong link", "AP3K link troubleshooting", "comment to DM wrong URL"],
    intro: "If the DM arrives but opens the wrong page, identify which campaign sent it before editing the URL. A different automation, an old received message, an incorrect button row or a redirect can produce similar symptoms. Work through the checks below in order so you correct the source without creating duplicate sends.",
    sections: [
      {
        heading: "First separate delivery from destination problems",
        paragraphs: ["This guide assumes the recipient has a message with a clickable link. If no DM arrived, use the delivery troubleshooting guide instead. A missing message concerns the trigger, permissions, sequence or sending result; changing a destination is not a substitute for checking those stages.", "If the wrong page could mislead customers, pause the affected campaign while investigating. Pause only the campaign you have identified, record what changed and resume after a successful test. Do not disconnect Instagram or delete an automation simply to repair a URL."],
        links: [{ label: "Troubleshoot a missing comment-triggered DM", href: "/docs/troubleshoot/fix-comment-automation-not-working" }],
      },
      {
        heading: "Locate the layer that is failing",
        paragraphs: ["Record the post or Reel, comment text, receiving account, message time and the URL that actually opens. Compare a new test message with the saved campaign. The following checks distinguish similar-looking failures."],
        table: {
          headers: ["Observed symptom", "First check", "Likely next action"],
          rows: [
            ["The message refers to a different offer", "Selected account, post, keyword and overlapping campaigns", "Find the sending rule before changing any button."],
            ["Correct message, wrong button destination", "The corresponding Button row’s saved URL", "Correct that row and test a newly received message."],
            ["One of several buttons is wrong", "Every label-and-URL pair separately", "Repair the affected pair; keep working links intact."],
            ["Correct URL opens a different page", "Redirects, expired campaigns or product variants", "Fix the destination or use its correct current URL."],
            ["Works for the owner, fails for visitors", "File permissions, required login or member access", "Make the intended resource accessible or explain the access condition."],
            ["Works in a normal browser, fails inside Instagram", "The destination’s in-app browser behavior", "Inspect the landing page, checkout or authentication requirement."],
            ["A test after editing still shows old copy", "Message timestamp and whether a new send occurred", "Use a fresh eligible interaction; do not mistake an old message for a new result."],
          ],
        },
      },
      {
        heading: "Find the automation that sent the message",
        paragraphs: ["Open Automations in the correct Instagram account’s workspace. Compare the post scope, trigger and enabled actions with the interaction you recorded. Look for a specific-post rule and broader rules that could both match. If another messaging tool is connected, inspect overlapping campaigns there too; do not assume every received DM came from AP3K.", "Compare the received wording with the saved message and its variations. An optional opener or follow-up may be the message you are looking at rather than the final DM. Keep a note of which stage contains the wrong link so you do not correct an unused field."],
        screenshot: "automations",
        links: [{ label: "Review your AP3K workspace", href: "/blog/ap3k-workspace-visual-guide" }],
      },
      {
        heading: "Correct the saved label-and-URL pair",
        paragraphs: ["In the intended Post automation, open the DM message controls and inspect each Button row. Destination URL and Button label are independent fields. Renaming a button does not change where it goes. AP3K supports up to three link buttons, so a correct first row does not prove the second and third are correct."],
        screenshot: "dm-message",
        steps: [
          { title: "Open the intended destination separately", body: "Use the actual product, file, form or calendar page. Confirm it matches the post’s promise and works for an ordinary visitor." },
          { title: "Copy the full correct URL", body: "Preserve required query parameters, such as a product variant. If adding tracking to a URL with an existing query string, use & rather than another ?." },
          { title: "Update the right button row", body: "Pair the corrected destination with an accurate label within the 20-character limit. Check other saved URLs and message variations for the same outdated offer." },
          { title: "Save and review", body: "Confirm the intended configuration was saved. Resume or publish only when you are ready for the real delivery test; the preview alone does not verify Instagram delivery." },
        ],
        links: [{ label: "Button configuration instructions", href: "/docs/post-automation/dm-message-layouts-text-buttons-attachments" }],
      },
      {
        heading: "Check redirects and visitor access",
        paragraphs: ["Compare the saved URL with the final address after the page opens. For example, a campaign URL ending in /summer-guide may now redirect to the store homepage after an offer expired. In that case the button can contain exactly what you saved while the destination still breaks the promise. Update the redirect or select a suitable current landing page.", "A file can also open for you because you are signed in to its owner account. Check it in a private browser window without owner privileges. Test the receiving phone’s Instagram browser if the normal browser works. Keep the resource accessible as intended; do not weaken account security to work around an unrelated landing-page error."],
      },
      {
        heading: "Retest with a newly delivered message",
        paragraphs: ["Editing the campaign affects subsequent sends; it does not replace the content of an old message already in someone’s Instagram inbox. Use a fresh eligible comment from another account and check the new message’s time and wording. If One DM per user or duplicate protection skips that test, use an eligible fresh test account or campaign setup rather than repeatedly replaying the same interaction.", "Complete any opener, follow gate or collection step, then open every final button. Confirm both the page title and the actual next action: the right variant, available booking time, accessible file or working form. Check tracking parameters separately. A successful send is not proof that the landing page or its conversion action works."],
        bullets: [
          "Keep the original evidence, the corrected destination and the time of the change.",
          "Verify a newly received DM from the intended campaign.",
          "Test all buttons and any other message stage containing the affected link.",
          "Review the caption and public reply if the offer itself changed.",
          "Resume normal delivery only after the corrected journey works.",
        ],
      },
      {
        heading: "What should I send support if it still fails?",
        paragraphs: ["Provide the automation name or ID, selected account, post link, test timestamp with time zone, expected destination and the actual destination. Describe whether the issue occurs in Instagram’s browser, a normal browser or both. A redacted screenshot of the button rows and received message can help distinguish a saved configuration issue from a redirect.", "Remove private conversation details, email addresses, phone numbers and secret tokens from evidence. The AP3K support assistant can guide the investigation but does not inspect your delivery records or change campaigns for you. Use the support contact when account-specific investigation is needed."],
        links: [{ label: "Contact AP3K support", href: "/contact" }, { label: "Review DM button labels", href: "/blog/comment-to-dm-button-labels" }],
      },
    ],
  },
};
