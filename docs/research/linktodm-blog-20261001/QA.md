# Release verification

- 1,625 Vitest tests passed; TypeScript passed.
- Archive regression covers featured/latest separation, all-page reachability, published CMS filtering, reference-guide preservation, bounded controls and valid sitemap archive URLs.
- English-only canonical routing includes all four new posts.
- Eight original photo-style images decoded as 1200x675 WebP, distinct byte hashes and meaningful scene-specific alt text. Contact sheet visually reviewed. Illustrations are labeled on article pages; no claim that pictured people are AP3K customers.
- Four original articles: 568–691 words each. No copied LinktoDM article text or image assets shipped.
- Responsive CSS: three latest columns desktop, two tablet, one mobile; two featured columns desktop, one mobile. Sticky contents only above 1099px; mobile disclosure below. Both theme token sets retained. Native keyboard links/forms and visible focus outlines remain.
- Actual browser screenshots, touch interactions, and pixel-match comparison remain unavailable due to the browser credential observation guard. No claim of exact visual parity.
- Preview/production build and public response checks are the remaining release gates.


## Supplied archive import checks
- 175 imported articles in source order; 4 featured slots; 20 listing pages.
- 175 distinct cover hashes; 585 optimized local images.
- 116 duplicate inline heroes removed; three source 404 images omitted with surrounding text retained.
- Internal article links resolve, including cross-article fragments. Scripts, unapproved embedded content and event handlers removed from supplied HTML.
- TypeScript passes; full suite passes (1,628 tests). Production build passes and includes all 175 HTML bodies in its output trace.
- Source layout checked in live browser; exact source fonts and hero aspect ratios implemented. Preview browser review pending.
- Source text, author credits and reference screenshots retain vendor identities. AP3K owns the page shell, navigation, colors and main signup CTA. This is not a claim that all source products' features or certifications belong to AP3K.

Preserves 11 source YouTube videos using validated youtube-nocookie.com embed URLs, lazy loading, and responsive players.
