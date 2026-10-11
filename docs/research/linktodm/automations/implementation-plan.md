# Automation implementation — 27 September 2026

Reference: authenticated console.linktodm.com and the user's six screenshots. The JCodesMore/ai-website-cloner-template workflow informed measured component specs and parallel implementation of independent backend modules. Existing AP3K URLs, account isolation and billing limits remain authoritative.

## Verified reference
Inspected all 16 template cards and their available editor states. Reproduced the observed Comment Delay, Ask to Follow and DM Qualifier graphs, the chooser, template library, dotted canvas, trigger drawer and AI-assistant layout. Some advanced template controls and actual AI generation are gated by LinktoDM Pro in the connected account. Dark mode is an AP3K adaptation; the reference exposes no theme control. Responsive behavior is based on observed responsive CSS plus AP3K preview checks, not an unavailable native mobile reference session.

## Implementation
Persisted multi-trigger graphs, disconnected drafts, publish validation and revision conflicts; edits to running flows remain drafts until published. Graph execution supports branching, short and durable delays, email/phone/name collection, contact fields and add/remove tags, bounded POST JSON webhooks (including Zapier catch hooks), carousels, follower conditions and click-dependent follow-ups. AI returns validated editable drafts using the configured AP3K provider; it cannot publish or send.

Analytics include deduplicated triggers, opaque tracked CTA links, unique clicks, country aggregation, seven-day activity, and masked recent contacts. Owner and selected-account checks precede reads. New followers require an observed false-to-true change within seven days after a follow check, once per account/contact. Existing followers and unknown status are excluded. No historical counts are fabricated. Short delays use the webhook lifetime; recovery/long delays run on the existing five-minute scheduler. The Instagram messaging window is enforced.

## Known parity boundaries
Reference payment and contact-deletion actions are not represented as working AP3K actions. Webhooks support public HTTPS POST JSON endpoints; arbitrary methods, authentication headers and response mapping are intentionally unsupported. Templates use AP3K-owned content/assets and require real links/images before publishing. Conversation starters use Meta's actual ice-breaker profile and callback APIs. Validation: 1,367 automated tests pass and TypeScript checks are clean. The preview database migration is applied. Desktop and 390px layouts were checked in both themes. Provider and Meta end-to-end responses require configured services; automated tests use isolated fixtures and never send messages to real contacts.
