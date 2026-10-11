/** Curated AP3K uploads. Keep the setup walkthrough separate from short demos. */
export const PRODUCT_VIDEOS = {
  overview: {
    id: "TmsqoNRkG64",
    title: "AP3K Instagram automation — quick demo",
    description: "A short introduction to AP3K. Use the full setup walkthrough for step-by-step instructions.",
    duration: "36 seconds",
  },
  tutorial: {
    id: "SSOYGbfwLUQ",
    title: "Create an Instagram comment-to-DM automation",
    description: "Choose a post, set keywords, add a public reply and DM, then review and publish.",
    duration: "3 minutes",
  },
} as const;

// Intentional placements, not a video attached indiscriminately to every post.
export const QUICK_DEMO_POSTS = new Set([
  "ap3k-workspace-visual-guide",
  "instagram-comment-to-dm-automation",
  "connect-instagram-to-ap3k",
]);
