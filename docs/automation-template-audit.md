# Instagram templates and custom flows — 25 September 2026

## Observed in the connected ManyChat account

Inspected the template catalog, giveaway and email-list draft builders, trigger settings, content palette and step palette. No automation was activated, no messages were sent, and no upgrade was purchased. Two template drafts were installed for inspection.

The catalog groups recommended templates before the rest, with goal and trigger filters. Comment-to-DM is marked Popular. Quick Automation and Flow Builder are separate experiences. Setup progressively reveals the trigger, message and next step; the flow editor connects steps and has an alternative linear view.

Upgrade markers observed: follow-growth quick automation, follow-first freebie, email-list flow, giveaway flow, AI question recognition; all/next-post targeting in the inspected trigger; AI Step, Actions, Condition, Randomizer and Data Collection in the palettes. This is an observation of this account and UI, not a universal pricing guarantee.

Giveaway defaults to 95% / 5% paths, with a tag condition preventing repeated participation. It does not guarantee a single winner. Email-list automation starts with the EBOOK DM keyword, collects an email and delivers the resource link.

## AP3K implementation

- Template modal, search, goal/trigger filters, Popular marker and setup descriptions.
- Existing quick comment, DM, story, affiliate and AI builders retained; template-specific defaults.
- New three-stage canvas editor: trigger, conversation, review/publish.
- Executable message, image/product card, email, multiple-choice question, condition, conversation tag, random split and finish nodes.
- Real phone simulator using the same branch/answer helpers. It makes no Instagram requests.
- Original captioned illustrated videos; no ManyChat marketing assets copied.
- Flow drafts can be edited and previewed on Free. Publishing and execution require Pro/Business. Existing quick automations retain their previous access.
- Flow definitions, revision checks, per-account recipient sessions, webhook receipts and one-entry records are persisted in additive tables/columns.
- Email replies are stored as leads, never automatically as marketing subscriptions. SKIP and STOP are available.
- Every outbound step checks account status, active automation, messaging window and action budget. Human replies cancel pending custom conversations. Ambiguous crashed sends fail closed.
- Giveaway entry records survive edits and show the latest 50 outcomes on the detail page.

## Deliberate capability boundaries

This is not full ManyChat parity. Live-comment triggers are visible but unavailable because AP3K does not currently dispatch them. SMS and WhatsApp templates link to an external signup/conversation destination; they do not provision those channels. Tags are scoped to a flow conversation. Arbitrary loops, cross-automation jumps, general delay scheduling, PDFs, native SMS sends and AI nodes inside a custom graph are not implemented. Existing standalone AI and quick-automation follow-up features remain available through their current builders. The canvas accepts up to 30 steps and six messages between customer replies.

## Verification and release

Run `npm test`, `npx tsc --noEmit`, `npm run build`. The production build script runs Prisma migrations before promotion. The additive migration was executed against the previous Prisma schema in local PGlite/PostgreSQL, checking legacy defaults, unique entries and cascading cleanup. Direct Neon verification was unavailable because the connector requires a project_id absent from its callable schema.

The local file preview was blocked by the cloud browser's URL policy. The AP3K sign-in page stopped at Cloudflare verification. Authenticated visual verification and a controlled real Instagram conversation remain release follow-up checks; unit/migration tests do not prove Meta delivery.
