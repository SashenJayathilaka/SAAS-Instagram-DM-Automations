import type { BlogSection } from "./blog";
import { ILLUSTRATED_POSTS, INSTAGRAM_CONNECTION_SECTIONS } from "./tutorial-content";

const workspace = ILLUSTRATED_POSTS.find(post => post.slug === "ap3k-workspace-visual-guide")!.sections;
const automation = ILLUSTRATED_POSTS.find(post => post.slug === "create-ap3k-automation-visual-guide")!.sections;
const ai = ILLUSTRATED_POSTS.find(post => post.slug === "set-up-ap3k-ai-visual-guide")!.sections;

// Reuse the reviewed instructions next to the exact screen they describe.
// The automation list is identified as a review screen, never as the DM editor.
const sections: Record<string, BlogSection[]> = {
  "workspace-tour": workspace,
  "connect-instagram": INSTAGRAM_CONNECTION_SECTIONS.slice(0, 4),
  "reconnect-instagram": INSTAGRAM_CONNECTION_SECTIONS.slice(3),
  "automation-types": [automation[0]],
  "create-automation": automation,
  "opening-final-dm": [automation[1], automation[2], automation[3]],
  "automation-troubleshooting": [automation[2], automation[3], INSTAGRAM_CONNECTION_SECTIONS[3]],
  "ai-setup": ai,
  "ai-knowledge": [ai[1], ai[3]],
  "ai-safety": [ai[2], ai[3]],
  "inbox": [workspace[3]],
  "contacts-leads": [workspace[2]],
  "plans-usage": [workspace[4]],
  "billing-troubleshooting": [workspace[4]],
  "refer-earn": [workspace[5]],
  "privacy-delete": [workspace[6], INSTAGRAM_CONNECTION_SECTIONS[4]],
};
export function helpArticleSections(slug: string): BlogSection[] {
  return (sections[slug] ?? []).map(section => ({ ...section, heading: section.heading.replace(/^\d+\.\s*/, "") }));
}
