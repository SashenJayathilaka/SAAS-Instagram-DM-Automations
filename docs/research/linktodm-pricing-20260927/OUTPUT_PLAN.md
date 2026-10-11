# Pricing fidelity correction

Workflow: JCodesMore/ai-website-cloner-template, canonical clone-website skill at commit/file SHA 007d7e10c25d407bfceb8a36c9837dabe7c9debb. Applied to the existing AP3K Next.js application; no framework replacement.

Source https://linktodm.com/pricing -> existing authorized AP3K /pricing and localized pricing routes. Source site key linktodm-com-ab5c09e9, page key pricing-7394a2bb. Existing components/website/public-pricing namespace intentionally retained. User explicitly requests replacement, AP3K branding, actual plan data, themes, and imagery correction. Existing website routes, checkout, and backend preserved.

Research/screenshot namespace: docs/research/linktodm-pricing-20260927; supplied full-page desktop screenshot is the master reference. Computed measurements captured at 1363px. Template 1440/390 viewport APIs are unavailable in the provided browser; use same-origin preview iframe review at 1440/768/390/320 and inspect CSS breakpoints, documenting this adaptation.

Baseline build: deployed production release 9de3fe3 READY. New changes receive type checking, focused billing/localization tests and preview build before merge.

Pricing topology: existing floating navigation; centered animated PRO badge; title and subtitle; Yearly/Monthly selector; three cards aligned at top; usage note; comparison table with selector and per-plan prices in its header; existing FAQ and footer.

Source card: 384px maximum, grid1200px / 24px gap, three columns at >=1024px; otherwise single column. Radius24, padding8. Name/description alone in inset panel: radius18 padding24 gap6. Card body padding28px 20px 20px gap18. Name24px/36 bold; description12px/18. Price30px/45 semibold. CTA14px with14px vertical padding; thin16px icons, 12px/18 feature copy, 12px row gaps. Source uses Inter; AP3K pricing adopts Inter already used by public navigation.

Hero:32px/48 bold, subtitle14px/21, component gaps25px. Source badge: 161x100 cropped looping muted inline 3second video. Reference has no product photos on pricing. Use same generic PRO motion asset with blend modes for dark/light and poster + reduced-motion fallback. No LinktoDM logos or Meta partner claims.

Interactions: billing is click-driven, source top and table controls independent; AP3K improves consistency by synchronizing both. Hover CTA color/shadow transitions. Source navbar fixed, no scroll-triggered pricing content transitions. Reference tablet breakpoint1024, single-column cards max384. Table minimum700 with horizontal scrolling.

Customization: purple accent #7c3aed in light, #b794ff for text on dark. Main paper white/#0d0d12; cards #f5f5f7/#19191f. Featured always nearblack with explicit white text. AP3K prices, allowances and cancellation wording only. No enterprise plan or unsupported reference features.

Blog covers: parallel isolated worktree builder per accompanying component spec; merge after independent verification. Search Console work uses officialabde@gmail.com property; retain existing ownership verification without removing other owners.
