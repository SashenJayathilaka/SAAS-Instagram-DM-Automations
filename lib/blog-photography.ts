// Original AP3K editorial artwork. These are illustrative business scenes,
// not customer endorsements, product screenshots or performance evidence.
const descriptions = {
  commerce: "An independent shop owner preparing products and handling a phone inquiry at a packing desk",
  creator: "A creator filming an educational video in a naturally lit home studio",
  photography: "A photographer reviewing a phone inquiry beside camera equipment in a studio",
  fitness: "A fitness coach reviewing a phone and planning notes in a training studio",
  analytics: "Two business owners reviewing a laptop and printed charts in an office",
  planning: "A content planning desk with a calendar, notebook, camera and smartphone",
  support: "A business owner reviewing a laptop and checklist in a workspace",
  conversation: "Hands holding a phone with abstract conversation bubbles at a creative workspace",
};
export function getEditorialPhoto(post: { slug: string; title: string; visual?: string }) {
  const topic = `${post.slug} ${post.title}`.toLowerCase();
  let theme: keyof typeof descriptions = "conversation";
  if (post.slug === "instagram-dm-campaigns-that-match-customer-intent") theme = "planning";
  else if (/photograph|portrait|camera/.test(topic)) theme = "photography";
  else if (/fitness|coach|workout|training-program/.test(topic)) theme = "fitness";
  else if (/ecommerce|e-commerce|product|shop|sell|sale|order|price|delivery|stock/.test(topic)) theme = "commerce";
  else if (/analytic|metric|measur|conversion|attribution|report|roi|test-plan|compar/.test(topic)) theme = "analytics";
  else if (/schedul|calendar|batch|launch|reschedul|approval|plan|handoff|evergreen|retire/.test(topic)) theme = "planning";
  else if (/error|fail|troubleshoot|not-working|missing|support|connect|permission|token|fix|incident/.test(topic)) theme = "support";
  else if (/creator|content|reel|story|stories|video|educat|course|webinar|resource/.test(topic)) theme = "creator";
  return { src: `/images/blog/editorial/${theme}.webp`, alt: descriptions[theme], width: 1200, height: 675 };
}
