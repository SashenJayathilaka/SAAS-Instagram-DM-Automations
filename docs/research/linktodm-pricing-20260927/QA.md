# Release verification

Preview: `10891348535469a0d61cdb001ad84ec12284adc7`, Vercel `dpl_CWQj1BhwyyEQZJF1ubBqWVE1ZFim`, READY.

- Full regression suite: 164 files, 1,181 tests passed. TypeScript passed.
- Desktop reference comparison at 1363px: all cards 384px, 24px gaps. Inset panels contain names/descriptions, with pricing and CTAs below. Light and dark inspected visually.
- PRO video loaded at 800px native resolution, readyState 4, playing with advancing currentTime. Light multiply and dark invert/screen blending inspected.
- Top Monthly control updates both selectors and both paid checkout hrefs to interval=month. Comparison Yearly control restores both selectors and interval=year links.
- Responsive same-origin iframe at 320, 390, 768 and 1440px. App body has no horizontal overflow. At 320px outer width (310px excluding browser scrollbar), cards are 270px; at tablet, centered 384px; at desktop, three columns. Vercel's preview toolbar adds document-level shadow overflow, outside the app body.
- Comparison has its own 700px table inside a 340px scroll region at 390px. Keyboard ArrowRight changes only the region's scrollLeft. Mobile navigation expands and exposes theme controls.
- French pricing and billing labels verified at 390px. Added the missing usage-note and primary billing-label translations after inspection.
- Blog cover contact sheet reviewed at actual 350px thumbnail width; first featured covers and tutorial screenshot load on desktop and mobile. Search for "time zone" returns relevant article-specific covers. Article canonical, description and Open Graph use the same local image.
- 169 unique local WebP covers plus four existing tutorial screenshots. Hash/dimensions checks ensure no duplicated rendered covers; article step summaries are concise. Unknown CMS titles get bounded per-title image fallback.
- Footer theme control remains removed. Navigation retains light/dark switch.
- Search Console account confirmed as officialabde@gmail.com. Live homepage test: available to Google, indexing requested. Sitemap /sitemap.xml: Success, 497 discovered pages.

Temporary noindex responsive review page removed before merge. This is a measured visual adaptation: AP3K branding, actual plans/features, synchronized billing controls and dark-mode styling differ intentionally from the source.
