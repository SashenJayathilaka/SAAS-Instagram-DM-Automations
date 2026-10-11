# Product knowledge and media maintenance

## Sources of truth

- Product entitlements: `lib/plan-limits.ts`; prices: `lib/billing-plans.ts`.
- Task instructions: `lib/docs/content/*.json` and `lib/ap3k-help.ts`.
- Feature lookup: `lib/support-resources.ts` maps user vocabulary to a real guide, workspace destination and optional screenshot/video. Add a feature here after its implementation and guide are reviewed. Do not duplicate an entire guide in `facts`; reserve notes for critical distinctions.
- Server retrieval: `lib/support-knowledge.ts` retrieves the matching current guide and always includes configured limits. Short follow-up questions reuse the preceding question's topic.
- Presentation: `components/help/support-resources.tsx` attaches approved links and images separately from model-generated text. Never render model-supplied HTML or unrestricted image URLs.

Support is read-only for account mutations. The allowlisted controls in `lib/support-assistance.ts` and `components/help/support-actions.tsx` can open Billing, payment management, or an explicit cancellation-review handoff. Stripe authenticates the owner through the existing server route and requires the customer to confirm the actual change. Chat text never executes an operation. Workspace links let a signed-in user open the actual controls. Any future write tool needs server authentication, ownership validation, input validation, idempotency and a separate explicit confirmation for sends, publishing, backtracking, billing or deletion. A model statement must never be treated as proof an operation ran.

## Screenshot inventory

`lib/product-screenshots.ts` is the reviewed inventory, with descriptive alt text, capture date and exact dimensions. `public/images/docs/` holds compressed WebP files. October 6, 2026 captures cover Home, account connection, creation, keyword triggers, final DM/buttons, opener, public replies, follow gate, email, phone, follow-up, Story, Chat, Flow triggers, templates, AI Overview/Knowledge/Behavior/Playground, policy check, Backtracking, Contacts/CSV filters, billing and analytics.

These are actual @ap3kautomation demonstration-workspace screens. They are examples, not promised performance. Billing shows internal demonstration access. Contacts uses an empty search to hide people; analytics excludes individual activity and location details. Story shows the honest no-active-stories state. Drafts were not published and Backtracking was not executed.

For an update:

1. Inspect the live UI against current implementation. Capture a clean demonstration state without private messages, emails, phone numbers, tokens or customer names.
2. Compress to WebP (quality 82 is a useful starting point); retain readable text. Most full captures are 20–63 KB. Set true dimensions; do not preload below-fold screenshots.
3. Register the file in `PRODUCT_SCREENSHOTS`; attach to relevant `DOCS_SCREENSHOTS`, `TUTORIAL_SCREENSHOTS` and support resources. Check captions against the pictured controls.
4. Update guide modification dates only when the instructions or media actually change. Preserve first-publication dates and existing URLs.
5. Run documentation, tutorial-image, support-knowledge and archive tests; inspect the page and enlargement interaction at desktop and phone widths in both themes.

## Publishing and discovery

`getEditorialArchive` accepts the published collection and excludes explicit `noIndex` entries. Do not use content provenance (`importedArchive`, legacy or original) as a publication flag. Chronological sorting uses `publishedAt`, not import order. CMS drafts remain excluded upstream. Indexing eligibility, locale canonical handling and sitemap generation remain shared through the existing editorial/SEO pipeline.

Keep weak URLs when they can be improved. Check Search Console before consolidation; add a relevant redirect if a URL is retired. This update removed no published URLs.

## Audio

The support completion cue is opt-in via `ap3k-support-sound`. Audio is unlocked only by the user's send gesture, suppressed for hidden tabs/reduced motion, and never connected to Instagram webhooks. No audio files or preload costs are introduced.

## Support guidance and interaction (October 11, 2026)

- `actions/support.ts` sends only the authenticated plan and, for billing questions, aggregate usage counts. Never send whole profiles, integration tokens, email, or Stripe IDs to a model. Missing counts must remain unknown; a plan entitlement is not proof of payment or renewal status.
- `supportKnowledgeFor` recommends the lowest-cost eligible plan, explains yearly upfront billing, and asks a focused question when needs are unclear. Configured limits and pricing remain authoritative.
- Initial and contextual question suggestions live in `lib/support-assistance.ts`. They use the same authenticated, rate-limited send action as typed questions. Keep operations allowlisted and separate from model output.
- Requests start immediately. Very fast answers have a one-second preparing cue, followed by a bounded 0.6–1.8-second reveal. Reduced-motion users and hidden tabs skip the reveal. Show full answer can end it immediately. Timers clean up when the panel closes.
- Mobile Help expands inside the drawer; do not restore a sideways desktop popover there. Keep the Menu trigger labeled, the drawer close button above its content, and scrollable content clear of the floating trigger.
- Regression coverage: support action ownership/context, question/action routing, single-send suggestion clicks, mobile disclosure, reveal cleanup/accessibility, explicit cancellation review, and the existing Stripe portal ownership tests.
