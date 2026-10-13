# Dedicated blog photography: first 182 covers

This release assigns 182 distinct generated photographs to 182 existing articles. The catalog contains 357 articles; the other 175 retain the existing topic fallback pending the next generation batch. It does not claim all 357 articles have unique photos.

The prior release's working changes were not present on the remote branch. The original generated PNGs were recovered from the persistent image collection. Assignments were reconstructed by article topic and visually reviewed against contact sheets. The recovered collection contained 199 images, including the previous 12-scene collection; 182 newer images were selected for this release.

- Runtime mapping: `lib/content/blog-photo-assignments.json`.
- Source filenames, persistent source IDs, original dimensions and SHA-256 hashes: `docs/maintenance/blog-photo-sources.json`.
- Original PNGs remain in the persistent image collection; they are not duplicated into the production repository.
- Responsive exports: 1600×900 and 800×450 WebP. These are web derivatives, not native 4K claims.
- Regenerate exports: `node scripts/optimize-blog-photography.mjs <original-png-directory>`.
- Refresh bundled archive covers and remove decorative body photos: `node --import tsx scripts/refresh-blog-photography.ts`.
- 512 repeated decorative body image placements are removed. Product instructional screenshots remain.
- Article URLs, publication dates, application and billing behavior are unchanged.

The dedicated-cover regression verifies slug existence, image routing, dimensions, byte budgets, source hashes, encoded hashes, and uniqueness of decoded thumbnail pixels. It also prevents decorative image recycling in imported article bodies. Generated people are illustrative and are not customer endorsements.
