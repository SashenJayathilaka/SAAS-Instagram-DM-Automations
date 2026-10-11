# Automation editor refresh — 2026-09-26

The user requested the LinktoDM creation editor layout with AP3K branding and functioning existing automation logic. The authenticated reference and supplied screenshots show a name/draft/publish toolbar, accordion trigger and message groups, a horizontal post strip, optional message pills and a flat Instagram preview.

Comment, affiliate, story and direct-message editors now share that structure. Custom flow and AI conversation builders retain their specialized behavior. The template picker routes directly into the editor. Real post media and account identity come from the selected AP3K Instagram integration.

Save uses the existing authenticated actions, account-scope checks, validation, plan limits and runtime. AI settings survive edits. Plain-text mode clears link payloads. Email/follow/follow-up additions retain required opening-message behavior for comment automations. Unsupported simulated delays, shared-post triggers and attachment features are not presented as working controls. There is no autosave or automatic activation.

## Validation

- TypeScript and production build passed.
- 1,145 tests passed, including payload format, draft/publish intent, saved AI/engagement settings and all five UI languages.
- Browser preview reviewed at desktop, 768px, 390px and 320px widths, in light and dark themes.
- Checked post selection, keyword entry, accordion expansion, adding email with automatic opener, ordered DM preview, plain-text fields and mobile preview dialog with focus handling.
- Temporary preview fixture and responsive harness removed before merge. These used dummy content and could not save or send messages.

Live draft persistence verification is recorded in the release PR after deployment.
