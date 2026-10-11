# core-content specification
Target: lib/docs/content/core-content.json. Schema lib/docs/types.ts DocsArticle[].
Source: ../source-articles.json. Assigned groups: post-automation,story-automation,chat-automation.
Interaction model: static article HTML, renderer handles anchors/image zoom/video.
Preserve actual source prose and structure, adapt only AP3K branding and actual implementation mismatches.
Strip scripts, SVG decorative icons, anchor helper links, source figures/videos, inline styles/classes/data attrs; retain semantic paragraphs, lists, headings, tables, aside callouts, code and links. Keep headings with ids and build headings array.
Only extract .sl-markdown-content; exclude surrounding source related/feedback/navigation. Remove source image figures (root will add actual AP3K images).
Slug is source path after /docs/ with linktodm -> ap3k and no trailing slash. Internal source docs links must follow that same replacement; /blogs -> /blog; linktodm.com external links must map AP3K actual equivalent or /docs. Do not invent unsupported routes or claim unsupported features.
Read implementation to verify details. Preserve factual supported content. Rewrite unsupported instructions as explicit current availability plus supported alternative, do not fake UI/features.
Typography handled centrally: h1 32px/38.4px700; h2 24px/31.2px600; body16px/25.6 #333b45. White/dark theme tokens centrally. Screenshots none in shard; no generated UI. Responsive content no fixed widths; tables wrapped by renderer.
Set updated 2026-10-02, description from short intro, video true only main comment-to-DM tutorial. All author wording AP3K.
Verify JSON, no scripts/source-brand URLs, and npx tsc --noEmit. Own only assigned JSON.
