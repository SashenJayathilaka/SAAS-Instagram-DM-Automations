# Empty automation and library specification

Source: supplied `Screenshot 2026-10-01 at 05.08.37.png` and `01.10.2026_06.42.49_REC.mp4` (824×692, 25 fps, 105.98 seconds), LinktoDM automations page.
Destination: AP3K `/dashboard/[slug]` recent-automations empty state and `/dashboard/[slug]/automation` empty state. Both use the same component.

## Evidence and limits

The recording now supplies the entire conversation, entrance motion, avatar changes, top fade and loop boundary. Browser observation remains blocked by native credential protection; live AP3K visual comparison, reference computed CSS, reference dark mode and reference mobile layout remain unverified. Desktop dimensions come from supplied images, not computed styles.

## Card

One centered card, approximately 474×392 CSS pixels (recording scale approximately 1.4), pale gray gradient, subtle 2px border and 32px radius. 32px interior padding. Fixed 148px chat viewport above a bold 20px heading, 16px muted description, and bottom action row. White rounded message bubbles; left AP3K avatar, right customer avatar. Replace the reference logo and greeting brand with AP3K.

Heading: “Create your first automation”. Description: “Create a new DM automation for your Instagram account”. Actions: “New automation”, “Read docs”. Primary action: white text over cyan-to-deep-blue gradient; secondary white pill with book icon.

Links: new automation goes to the current dashboard slug's automation/new; Read docs goes to /help.

## Complete conversation

32 messages, retaining original capitalization, punctuation and order. The initial recording starts partway through an entrance. Repeated “Pick a post…” entrances at 3.76s and 101.96s establish a 98.20s cycle. First three holds use the second observed greeting at 94.64s, help at 97.60s, question at 100.48s and answer at 101.96s. All remaining intervals use the first cycle. Timing precision is one frame (40ms); recording jitter may differ from the reference's original timers.

| Row | Speaker / avatar | Text | Hold until next entrance |
| --- | --- | --- | --- |
| 1 | Customer 1 | Hey, AP3K | 2.96s |
| 2 | AP3K | How can we help you? | 2.88s |
| 3 | Customer 1 | how does this work? | 1.48s |
| 4 | AP3K | Pick a post and a keyword, that's it | 2.56s |
| 5 | AP3K | Anyone who comments gets your link in DM | 2.68s |
| 6 | Customer 1 | instantly? | 3.20s |
| 7 | AP3K | Or add a delay so it feels human | 3.16s |
| 8 | Customer 2 | won’t every DM look the same? | 3.56s |
| 9 | AP3K | AI writes variations, so each one reads fresh | 2.84s |
| 10 | Customer 2 | can I send a PDF? | 3.20s |
| 11 | AP3K | PDFs, images, even a voice note | 3.20s |
| 12 | Customer 2 | can I take payment in the DM? | 3.48s |
| 13 | AP3K | Yes, Stripe checkout right inside the chat | 3.20s |
| 14 | Customer 3 | my keywords keep missing people | 3.56s |
| 15 | AP3K | Switch to AI intent, it reads what they meant | 2.68s |
| 16 | AP3K | Works in any language your audience writes in | 3.04s |
| 17 | Customer 3 | what about story replies? | 3.44s |
| 18 | AP3K | Story replies and mentions, both covered | 3.20s |
| 19 | Customer 3 | can I ask them to follow first? | 3.48s |
| 20 | AP3K | Add an Ask to follow step before the link | 3.20s |
| 21 | Customer 1 | people DM me before commenting | 3.60s |
| 22 | AP3K | Conversation starter shows 4 one tap questions | 3.20s |
| 23 | Customer 1 | I want a proper multi step flow | 3.48s |
| 24 | AP3K | Flow builder does that, or let AI build it | 2.72s |
| 25 | AP3K | Describe the goal and it drafts the whole flow | 3.12s |
| 26 | Customer 2 | can I split test two offers? | 3.52s |
| 27 | AP3K | Drop a randomizer node and split the traffic | 3.16s |
| 28 | Customer 3 | worried about getting flagged | 3.44s |
| 29 | AP3K | Every send goes through a safety queue | 2.28s |
| 30 | AP3K | Paced to stay inside Meta limits | 2.96s |
| 31 | Customer 1 | ok setting one up now | 3.00s |
| 32 | AP3K | Takes about a minute 💫 | 2.72s |

Rows enter from below with a roughly 0.7s blur/fade and upward movement. New content pushes earlier messages up, including wrapped two-line replies; the top of the viewport fades to transparent. The next greeting enters behind the final reply with no global fade-out or empty reset. Keep at most four rows mounted, using monotonically increasing keys so the loop boundary retains previous rows. Hidden tabs pause the timer and resume the current message on return. Reduced motion shows the static three-message introduction without cycling. The decoration is hidden from screen readers to avoid repeated announcements.

The three customer avatar variants are extracted from the user-supplied recording at 93s (x660,y184), 19s (x660,y186), and 37s (x660,y257), each 48×48 pixels, rendered as 32px circles. Files: public/images/preview/conversation-01.png through conversation-03.png. No new stock identity is inferred; these are the supplied reference's decorative sample portraits.

## Library controls

Rounded gray segmented control containing All (check), Basic (lightning), Flow (branch icon), selected white pill. Filters are click-driven, mutually exclusive and keyboard accessible. Flow means a persisted non-null listener.flowDefinition or flowDraft; all others Basic. Search and current sorting/pagination must continue working. Empty category/search results must not claim the account has no automations. Genuine account-empty state gets the shared card once, not duplicate banners.

## Responsive and themes

Desktop card width474px maximum; mobile width100%, padding24px, wrap chatcopy and stack buttons where necessary. Center within available content area. Dark mode uses dark neutral card and bubbles, visible light copy, subduedborder, sameAP3Kaccent. Keep navigation reachable onmobile using a compact floatingdrawerbutton; removeglobalutilitytoolbarwithoutreplacingitwithanotherbar. Settings retains appearance/language.

## Validation

Check defaulttheme, existingstoredtheme preservation, per-accountzero state, categoryclassification, searchcombinedwithcategories, accurate emptyfiltermessage, mobilewidthcontainment and reducedmotion. Livevisualcomparisonblocked untilbrowserisusable.
