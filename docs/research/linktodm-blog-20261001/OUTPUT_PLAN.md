# AP3K editorial refresh

Reference: https://linktodm.com/blogs -> AP3K /blog; reference article structure -> existing /blog/[slug]. User authorizes updating both routes. Existing application, localization, CMS overrides, metadata and published URLs remain intact.

Workflow: JCodesMore clone-website skill and inspection guide read. Adaptation: browser observation is blocked by the session credential guard; no browser fallback, credential inspection, computed-style claims, or pixel-perfect claim. Public search retrieval confirms centered archive welcome, four featured posts, search, nine-card latest list and pagination. Article has title, description, author/date/reading time, cover, table of contents, body, author box and CTA. Exact spacing and breakpoint values below are AP3K implementation choices, not extracted measurements.

Copyright: no wholesale article/image replication. New articles and artwork are original AP3K material. 104 reference guides and product walkthroughs remain reachable but are excluded from the editorial archive. Existing topic articles remain available; no unsupported promises of automatically recovering historical comments or payments.

Scope: 1120px archive, two-column featured collection, three-column latest collection; 2 columns at tablet, 1 at mobile. Compact bounded pagination with previous/next and search retention. Four featured slots selected by slug with published fallback, no duplicate articles across latest pages. Product walkthrough exclusion is archive-only, not deletion from sitemap/help/internal links. Article reading width ~740px plus desktop sticky contents rail, mobile native contents disclosure, uncluttered footer. New original articles cover industry workflows and campaign decisions.

QA: build, TypeScript, existing tests, pagination completeness with featured exclusion/search, article content and local assets. Actual visual QA blocked; report that limitation.

Content: four new original 568–691 word posts; 73 editorial articles in the archive. Eight original AI-generated photographic editorial illustrations mapped by subject across the existing article library, with truthful image descriptions and illustration captions. Images are not claimed to depict AP3K customers. Topic illustrations are intentionally shared within categories; no claim of unique commissioned photography per article. Existing diagram source/assets preserved for reference use.

## Supplied archive migration (2026-10-01)

The user has now supplied the entire archive, including article HTML, downloaded images, CSS, and source URL manifests. The original ZIP is authoritative: extension-split ZIPs flatten article-bodies and article files with duplicate basenames. Public browser observation also works again.

Implementation: import 175 complete articles with original author credits; source order, four featured articles and 20 archive pages. Use the source's 900px listing width, 24px grid gap, and single-column breakpoint at 900px. AP3K logo, theme colors, navigation and sign-up CTA belong to AP3K. Original vendor names, prices, partner status, product screenshots and feature statements are retained as source references rather than falsely transferred to AP3K. Historical AP3K URLs remain reachable but are excluded from the main archive when not part of the imported collection.

Content safety: HTML allowlist, remove scripts/unapproved iframes/forms/event handlers, localize all available inline images, rewrite imported article cross-links, align section anchors and table of contents. Three source 404 images in the setup guide are omitted, retaining their surrounding text. Remove 116 repeated inline hero images. Missing image entries are recorded in import-report.json. 175 image-byte hashes validate distinct covers.

Article HTML remains source-managed; CMS metadata, publication and SEO controls remain available and preserve the imported body. The editor identifies this limitation rather than silently replacing full HTML with empty structured sections.

QA: 1,628 tests passed; TypeScript passed; production build passed and traced all 175 HTML files. Final preview visual review remains required before a pixel-fidelity claim. Do not claim every source screenshot was rebranded: these are still reference screenshots from the supplied articles.

Preserves 11 source YouTube videos using validated youtube-nocookie.com embed URLs, lazy loading, and responsive players.
