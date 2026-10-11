# AP3K interface refinement

## Audit and direction

Baseline: production tree e6422b7668ff109d2a18b1136a7f85abbc046bf0.
UI UX Pro Max was run for “SaaS creator productivity dashboard”, with variance 3,
motion 2, density 7, and supplemented with Instagram automation SaaS, focus not
obscured, reduced motion, and Next.js/Radix form/navigation searches.

Adopt: neutral layered surfaces, existing Plus Jakarta Sans/Tajawal, clear focus,
44px touch targets, modest motion, stable layout, accessible Radix overlays.
Reject: suggested teal/orange palette, GSAP installation, information architecture
changes, generic glassmorphism, and replaying scroll reveals. AP3K keeps its violet
identity, approved copy, media, links, localization, pricing, and business behavior.

Findings: inconsistent blue/pink focus colors; very heavy shared shadows; static
cards lifting like links; primary dark-theme blue with white text; 500ms drawers;
36px controls; physical left/right spacing in overlays; custom mobile preview
dialogs lacking Radix focus management; variable 380–820ms product entrances;
continuous decorative hero motion; sticky controls without consistent safe-area
padding. Existing responsive tables, locale routing and optimized videos are kept.

## Boundaries

Only presentation, semantics and interaction accessibility are in scope. No
changes to auth, Stripe, webhooks, data models, API contracts, automation execution,
account isolation, approved text or translated strings. Existing working layouts
are retained. No dependencies added.

Production public pages were inspected directly. Initial authenticated review was
blocked by the Cloudflare challenge on accounts.ap3k.com. The user subsequently
signed in at ap3k.com; the production review below records the resolved checks
separately from isolated presentation verification.

## Motion

Shared 140/220/360/440ms durations, ease-out entrances and ease-in-out state
transitions. CSS handles control feedback and Radix overlays; existing Framer
Motion handles content changes and marketing reveals. Reduced motion removes
decorative movement. Content must never depend on an observer to become readable.
Sidebar width and matching content margin are the deliberate layout-animation
exception; no animation of message-history scrolling or data values.

## Validation record

- Local production build succeeds; ESLint and TypeScript succeed. Preview builds
  also succeed. No packages or lockfiles changed.
- Full suite: 125 files / 972 tests passed, one pre-existing Arabic translation
  coverage failure. Reproduced on the untouched baseline: missing translation for
  `AP3K workflow connecting Instagram interactions with replies and direct messages`.
  Approved locale catalogs were deliberately not edited.
- Additional focused regression coverage verifies server-rendered reading content
  remains visible and reduced-motion reveals have no decorative starting transforms.
- Source/AST copy comparison found no copy removals. The two mobile-preview labels
  moved into the shared dialog. Pricing/catalogs, locale catalogs, actions, API
  routes, database models, auth and payment behavior have no changes.
- UI UX Pro Max was run again for responsive dashboard/forms/navigation,
  accessibility, motion and contrast. Applied focus visibility, touch sizing and
  viewport containment guidance. Rejected replacing the existing sidebar with a
  new framework scaffold; that would be an unnecessary production refactor.

### Initial preview browser review

A separate preview-only QA branch renders real shared components with empty state
fixtures and local editor state. It contains no customer records, cannot activate
an automation, and is not part of this branch. This is presentation verification,
not a substitute for authenticated workflow testing.

| Screen | Evidence and remaining boundary |
| --- | --- |
| Homepage | English at 375/390/430/768/1024/1440; Arabic feature switching, dark workflow surfaces, visible video ready/playing and inactive videos paused. |
| Pricing | Arabic at all six widths; German at 375/768/1024/1440. No document overflow. |
| Blog listing | German at all six widths, visible content on mobile. |
| Blog article | German at 375/768/1440; first screenshot loaded; 390px enlargement/zoom/Escape/focus return checked. Other images retain native lazy loading. |
| Help and help article | German at 375/768/1440; readable question list and separate article layout. |
| Sign in / sign up | Presentation source inspected. Live Clerk account screen blocked by Cloudflare challenge. Auth remains unchanged. |
| Dashboard / analytics | Source reviewed: real metric values, period links, account scoping, loading and card layout retained. Live data view blocked. |
| Sidebar / account switcher | Source reviewed: matching 220ms width/content offset, logical RTL sides, collapsed keyboard tooltip, current account and pending state. Live account switching blocked. |
| Automation list | Real empty component inspected at 375px; focused table tests pass. Populated live list blocked. |
| Create / edit automation | Both wizard implementations inspected; shared message/link/follow components checked at all six widths, light/dark. Local-only text/option update reflects in phone. Save/edit operations not exercised. |
| Automation detail | Source reviewed: wrapping toolbar, stable metric grid, bounded phone height, unchanged data/actions. Live detail blocked. |
| Inbox | Source reviewed: tablet split width, bubbles, composer and history behavior; no fetching/send/scroll logic changed. Live conversation switching blocked. |
| Contacts | Real empty component checked at 375px; logical pagination and 44px actions inspected. Populated list blocked. |
| AI Replies / AI Comments | Real Free/empty presentation checked, switches disabled by existing plan rules; English and Arabic. No AI execution performed. |
| AI knowledge / behavior / Playground | Arabic mobile tabs and disabled forms checked in light/dark. No saving or generation performed. |
| Referrals | Source reviewed; copy feedback accessibility and shared control styling. No referral action performed. |
| Billing | Real Free-plan presentation in Arabic at 375/768/1024/1440. Prices, checkout URLs and payment handlers unchanged; no payment performed. |
| Settings / Instagram connection | Source reviewed: surfaces, hierarchy, errors, permission labels, logical list indentation. No connect/delete/save action performed. |
| Notifications | Existing empty notification panel inspected in dark mode. No notifications invented. |
| Shared controls | Keyboard Select, Switch and Checkbox checked; Dialog and mobile phone dialog fit 375px, Escape closes and focus returns to opener. |

Width measurements used iframe viewports; native scrollbars reserve up to 10px.
No page-level horizontal overflow was observed in the listed checks. Visible
interactive bounds were also checked on Portuguese and Arabic homepages. This is
not a claim of every possible content/state combination or device coverage.
French (390/1024), Spanish (430/1024), Portuguese (430), and Arabic homepages were
reviewed. Switching Arabic to English using the actual language menu left zero
Arabic characters in the English DOM snapshot. Translation catalogs are untouched.

No hydration or animation warning was observed in reviewed pages. Isolated QA
components emitted expected failed prefetches for protected `/dashboard/review`
links without an authenticated workspace; browser-extension metadata errors were
also present. Neither is represented as a clean authenticated console check.

### Release boundary and performance

PR #112 was merged and deployed to production on September 21, 2026, at commit
`87969d71dba670d75cb32a8bcc2b606d6a2272b6`. Vercel reports READY with the
`ap3k.com` alias. The user supplied an authenticated production browser session,
resolving the initial preview review's access boundary above.

Authenticated checks confirmed populated dashboard/analytics, date-range navigation,
232px/76px expanded/collapsed sidebar, account switching and account-scoped data,
automation list/detail, and all four edit-builder steps through review with existing
messages intact. Inbox conversation switching/composer, Contacts, AI Overview,
Knowledge, Behavior and Playground, billing, referrals, settings, account connection
and the empty notification panel were inspected. Dark/light themes and Arabic RTL
were reviewed; switching the account screen back to English left zero Arabic
characters in its DOM text. A follow-up isolates account handles with `bdi dir="ltr"`
so the @ prefix stays in its correct position in Arabic, matching the dashboard
and account switcher. No localization strings were changed.

These are UI/navigation checks, not a claim of executing payments, sending customer
messages, saving AI configuration, or activating/deleting live automations. Those
operations were not performed. The responsive matrix above uses isolated preview
viewports, while authenticated production checks use the desktop browser viewport.
Some existing account-screen labels remain English in Arabic; translation catalogs
are deliberately preserved under this task's approved-content constraint.

No new animation dependency, image or video payload was added. Existing video
lazy loading and poster behavior remain. Control feedback is CSS; existing Framer
Motion handles bounded content transitions. Content stays in the initial DOM.
Continuous decorative hero loops and static-card hover lifts were removed.
Reduced motion is covered by the CSS preference rule and reveal regression test;
OS-level browser preference emulation was unavailable. No measured Core Web Vitals
improvement is claimed. The final build reports 87.4kB shared first-load JavaScript.

Major changes are in `app/globals.css`, `tailwind.config.ts`, `lib/motion.ts`,
`components/ui/*`, the shell/navigation, pricing, the two automation wizards and
shared phone dialog, AI console, Inbox/Contacts, and marketing motion sections.
Existing article/help architecture, optimized assets, analytics calculations,
message history scrolling, customer content and business logic remain intact.
