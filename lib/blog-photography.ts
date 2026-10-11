/** Original AI-generated AP3K editorial scenes, not customer endorsements or product screenshots. */
export const EDITORIAL_PHOTOS = {
  commerce: "Shop owner packing products beside an AP3K-branded laptop in a sunlit studio",
  creator: "Content creator checking her phone beside a camera and AP3K-branded laptop",
  photography: "Photographer reviewing portrait prints beside his camera and AP3K-branded laptop",
  fitness: "Fitness coach planning at an AP3K-branded laptop in a training studio",
  analytics: "Two colleagues reviewing an AP3K-branded laptop and planning notes",
  planning: "AP3K-branded laptop beside a planner, camera lens and phone on a sunlit desk",
  support: "Business owner reviewing a checklist beside an AP3K-branded laptop",
  conversation: "Creator holding a phone beside an AP3K-branded laptop at a cafe table",
  educator: "Educator preparing a workshop beside a microphone and AP3K-branded laptop",
  agency: "Three agency colleagues reviewing a content plan beside an AP3K-branded laptop",
  "creator-mobile": "Creator recording a phone video beside an AP3K-branded laptop in a mint studio",
  laptop: "AP3K-branded laptop on a desk with violet lighting and a city view",
} as const;
export type EditorialPhotoTheme = keyof typeof EDITORIAL_PHOTOS;
export function editorialPhoto(theme: EditorialPhotoTheme) {
  return { src: `/images/blog/original/ap3k-${theme}.webp`, alt: EDITORIAL_PHOTOS[theme], width: 1600, height: 900 };
}
export function getEditorialPhoto(post: { slug: string; title: string; visual?: string }) {
  const topic = `${post.slug} ${post.title}`.toLowerCase();
  let theme: EditorialPhotoTheme = "conversation";
  if (/photograph|portrait|camera/.test(topic)) theme = "photography";
  else if (/fitness|coach|workout|training-program/.test(topic)) theme = "fitness";
  else if (/agency|agencies|team|client|collaborat/.test(topic)) theme = "agency";
  else if (/educat|course|webinar|workshop|teach/.test(topic)) theme = "educator";
  else if (/ecommerce|e-commerce|shop|sell|sale|order|stock|product-page/.test(topic)) theme = "commerce";
  else if (/analytic|metric|measur|conversion|attribution|report|roi|test-plan|compar|pricing|free-vs/.test(topic)) theme = "analytics";
  else if (/schedul|calendar|batch|launch|reschedul|approval|plan|handoff|evergreen|retire|next-post/.test(topic)) theme = "planning";
  else if (/error|fail|troubleshoot|not-working|missing|support|connect|permission|token|fix|incident|pause|restart|knowledge|polic|safe/.test(topic)) theme = "support";
  else if (/reel|story|stories|video|influencer/.test(topic)) theme = "creator-mobile";
  else if (/creator|content|resource|guide|lead-magnet/.test(topic)) theme = "creator";
  else if (/tool|software|platform|api|flow|automation/.test(topic)) theme = "laptop";
  return editorialPhoto(theme);
}
