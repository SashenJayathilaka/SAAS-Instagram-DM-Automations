# AP3K original blog photography — 11 October 2026

## Scope

All 357 bundled article covers use the original 12-scene collection through `lib/blog-images.ts`. The same source feeds archive cards, article heroes, Open Graph/Twitter metadata and Article ImageObject data. New CMS entries receive a safe topic-based original photo too.

512 imported inline image placements were replaced. Thirteen real `/images/docs/` captures in imported HTML and instructional screenshots in original article sections remain. Old unused asset URLs remain available to avoid breaking historical links. No external image requests are required. Existing article publication dates and URLs are unchanged.

Three original guides (816, 820 and 1,040 words at release) cover plan selection, pause/restart operations and AI knowledge preparation. They are dated on their actual publication day, use existing archive/directory/sitemap discovery, and are English-only with canonical language routing. No indexing or ranking guarantee is implied.

## Assets and resolution

- `public/images/blog/original/ap3k-<scene>.webp`: 1600×900, WebP quality 81, used by Next Image for covers.
- `public/images/blog/original/ap3k-<scene>-800.webp`: 800×450, quality 78, responsive inline HTML source.
- `assets/blog/masters/ap3k-<scene>-4k.webp`: 3840×2160, quality 92, **upscaled** master exports, outside the public directory.
- The built-in image generator returned 1672×941 source images despite the requested 3840×2160. These exports are not native 4K captures.
- All 24 web files together are about 1.5 MiB; each individual full-width file is bounded below 300 KB by regression tests. The browser does not download the entire collection for each article.

Generated people are illustrative, not actual customers, endorsements or results. Article hero captions identify AI-generated editorial imagery. Replacement figure captions no longer claim to show an old dashboard or performance figures. Actual product UI remains represented by real screenshots.

## Art direction and prompt set

Tool: built-in image generation (not a fallback CLI). Input reference: raster rendering of the repository's real `public/brand/ap3k-logo-on-light.svg`. The logo was supplied as a supporting compositing reference, with exact AP3K spelling requested on laptop lids. Brand source geometry remains authoritative; generated scenes are illustrations, not evidence of physical branded hardware.

Shared prompt specification: `Use case: compositing / photorealistic-natural. One original premium AP3K editorial photograph, landscape 16:9, requested 3840×2160. Reproduce the supplied authentic AP3K mark and wordmark as a tasteful sticker on the rear laptop lid. Natural high-end magazine photography, realistic skin and hands, crisp texture, organic lighting, depth and central crop-safe subjects. Single full-bleed scene. No headline, caption, watermark, fake dashboard, statistics, other brands or endorsement claims.`

Scene prompts:

| File scene | Prompt subject and setting |
| --- | --- |
| creator | Curly-haired content creator checking a phone beside a tripod camera and silver laptop in a warm sunlit home studio; cream linen and subtle violet accents. |
| commerce | Independent skincare shop owner packing unbranded product boxes beside an open silver laptop in a terracotta and cream studio. |
| analytics | Founder and colleague reviewing a laptop and planning notes in an office with teal accents and warm daylight; no fake results. |
| planning | Silver laptop, planner, camera lens, phone and espresso on a sunny oak desk; lavender and warm beige materials. |
| fitness | Fitness coach planning at a laptop in a boutique training studio; plum sportswear, weights and yoga mat softly in the background. |
| photography | Photographer reviewing portrait contact sheets beside camera equipment and a laptop in a daylight studio; charcoal and warm white palette. |
| support | Business owner in a blue shirt reviewing a checklist beside a laptop, phone and plant in a quiet workspace. |
| conversation | Close-up of hands holding a phone from its rear beside a branded laptop on a sunny cafe table; amber and lilac palette. |
| educator | Educator preparing a workshop beside a laptop, microphone, headphones and notebook; warm wood and sage studio. |
| agency | Three agency colleagues discussing a paper content plan across a laptop in a blue creative meeting space; candid interaction. |
| creator-mobile | Creator recording a short phone video beside a laptop in a mint-green studio; medium-wide framing and an expressive natural gesture. |
| laptop | Silver laptop rear lid at a contemporary desk at blue hour; violet accent lighting, warm desk lamp and a city-window background. |

## Maintenance

Topic selection and descriptive alt text live in `lib/blog-photography.ts`. Reuse the collection deliberately by subject; do not pretend each article has a separately generated photograph. Add a distinct scene when an existing one does not fit.

`node --import tsx scripts/refresh-blog-photography.ts` updates the trusted imported HTML and cover manifest. It keeps real documentation screenshots, writes intrinsic dimensions and lazy loading, supplies 800/1600 source sets, and updates only captions attached to replaced figures. It does not import or fetch third-party HTML.

Preserve useful diagrams and screenshots inside future articles rather than illustrating product instructions with fabricated UI. Avoid keyword-stuffed alt text. Keep real publication dates when refreshing imagery. Google guidance: https://developers.google.com/search/docs/appearance/google-images

## Verification

Tests cover every catalog cover, all imported image paths, web byte budgets, exact master/export dimensions, retained real screenshots, safe CMS fallback, new guide metadata/content/internal links, plan-table parity and English-only sitemap/canonical routing. Release verification also includes mobile/desktop light/dark browser inspection and production HTTP checks.
