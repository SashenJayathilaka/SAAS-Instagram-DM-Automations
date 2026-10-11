# AI conversation flows

Entry: Automations → Create automation → Automate conversations with AI.

The builder has two stages: goal/context/task configuration with a private interactive phone preview, followed by a visual flow and DM trigger settings. Customers can start it with configured keywords or any incoming DM. Keyword automations take precedence over catch-all automations. AI sessions continue without requiring the keyword in each reply.

## Configuration and delivery

- Configuration lives in Listener.aiConversation (versioned JSON, validated server-side). Existing aiDmReplyEnabled remains the dispatch flag.
- Each flow uses its own explicitly supplied context. It does not import website content or silently reuse the global workspace facts. Links are selected from owner-supplied URLs using the existing server-side approved-link mapping.
- Generated tasks are editable and never activate a flow automatically.
- Preview/generation requires the authenticated owner, selected Instagram account, Pro/Business entitlement, and a reserved AI usage unit. A preview never sends a DM or writes contact information.
- Real delivery uses the existing account isolation, duplicate detection, subscription checks, message sender, inbox persistence and delivery logs. Replies require a recent inbound timestamp within the messaging window.
- Sessions are scoped by integration and recipient. A short lease prevents concurrent turns from independently generating responses. History is bounded to the last 12 turns; only delivered replies enter it. Session continuation expires 24 hours after the inbound message.
- STOP/HUMAN (and supported localized equivalents) pauses the AI session for 24 hours. A manual reply from AP3K Inbox also pauses it. This does not detect all human messages sent directly in the Instagram app.
- Optional email collection saves only a valid email address explicitly sent as the customer's message, into the existing Lead record. Other information remains in conversation history and Inbox. SKIP is accepted by the conversation instructions; contact collection is optional.
- Provider failure uses the owner's saved fallback and releases the AI reservation. Quota exhaustion pauses delivery without calling the provider.
- AI Comments controls are removed from the comment setup. Saving that setup disables AI comments on that automation. Previously active AI comment automations are not bulk-modified by this release.

## Database / release

The additive migration `20260925010000_ai_conversations` adds Listener.aiConversation and AiConversationSession. The existing production build pipeline applies migrations before building. No backfill is needed. Existing automations and product images remain compatible.

## Verification

Unit/integration coverage includes configuration validation, complete context retention, account/plan authorization, disallowed preview history roles, quota release, conversation routing, keyword precedence, opt-out, lease loss, messaging-window expiry, failed delivery history, and explicit email capture.

Local UI fixture: `node scripts/ai-conversation-ui-preview/build.mjs <output-dir-outside-public>`. Its network actions are mocked; it verifies layout only, never real provider behavior. Do not deploy the fixture as an application route.

Production acceptance: create a draft, generate tasks, preview multiple turns, save and reopen, then activate a dedicated test keyword. A tester sends the keyword and replies without repeating it; verify context retention, approved link, email capture, STOP and manual Inbox takeover. No test messages should be sent to unrelated contacts.
