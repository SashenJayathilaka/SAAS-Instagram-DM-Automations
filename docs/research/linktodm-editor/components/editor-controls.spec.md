# Comment editor control reconstruction

Reference: user-provided Screenshot 2026-10-01 at 05.28.05.png, visually inspected. Browser access is blocked; these are screenshot-derived visual observations, not measured computed styles.

## Scope

- Keep the editor breadcrumb, automation name, state, and Publish action. Remove language and theme utilities from its toolbar.
- Put a small blue clock, muted uppercase Enable delay label, and compact switch at the right of the trigger group heading. Allow wrapping at narrow widths. Delay is initially hidden when saved seconds are zero; enabling exposes Add delay, choosing a duration uses the existing seconds field, disabling clears that field. No new persisted enable flag.
- Public comment reply has an AI selection with a purple sparkle beside AI. Existing manual and disabled drafts retain their settings. New comment drafts start with AI enabled and a usable prompt.
- Free users can edit/generate the prompt and sample replies. Only an attempted publication produces the exact error “AI only available on paid plans.” It appears in red beside the reply heading and below the red-outlined prompt, opens that section, and focuses the comments preview. No preemptive upgrade link or paid-plan warning.
- Retain server-side authorization for publish, activation from the list, and alternative status updates. UI behavior never replaces these checks.

## Visual constraints

The reference uses rounded white rows on a pale gray background, compact pill selectors, purple AI sparkle, muted section headings, and a blue clock. Preserve the existing AP3K editor layout and brand; use explicit light/dark icon contrast, allow row wrapping, and avoid fixed minimum widths that overflow mobile. Error placement follows the reference, but appears only after Publish per user instruction. Existing reduced-motion accordion behavior stays intact.

## Verification

Exercise delay on/off and saved-delay restoration, new vs saved AI defaults, free prompt editing, no warning before Publish, and error display following Publish. Re-run paid publication bypass tests and TypeScript. Visual parity cannot be declared browser-verified while browser access remains blocked.

## Completed checks

TypeScript (`tsc --noEmit`) passed. The focused run passed 23 tests across comment editor rendering/defaults, paid-plan publication/activation bypass protection, free copy generation, payload persistence, and setup localization. Live click/viewport comparisons remain for the integrated preview because the browser is unavailable in this session.
