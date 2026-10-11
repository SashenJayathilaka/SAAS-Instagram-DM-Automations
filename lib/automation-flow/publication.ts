import { client } from "@/lib/prisma";
import { productImageId } from "@/lib/product-card";
import { type Flow } from "./definition";
/** Drafts may contain placeholders; every activation path checks published assets. */
export async function flowAssetIssue(
  flow: Flow,
  userId: string,
): Promise<string | null> {
  for (const node of flow.nodes) {
    if (
      node.kind === "webhook" &&
      (/(^|\.)example\.(com|org|net)$/i.test(new URL(node.url).hostname) ||
        /replace[-_]me/i.test(node.url))
    )
      return `${node.label}: replace the example webhook URL before publishing.`;
    const images =
      node.kind === "product"
        ? [node.image]
        : node.kind === "carousel"
          ? node.cards.map((c) => c.image)
          : [];
    for (const image of images) {
      const id = productImageId(image);
      if (
        !id ||
        !(await client.automationImage.findFirst({
          where: { id, userId },
          select: { id: true },
        }))
      )
        return `${node.label}: upload an image from your own account.`;
    }
    const links =
      node.kind === "message" || node.kind === "product"
        ? node.links
        : node.kind === "carousel"
          ? node.cards.flatMap((c) => c.links)
          : [];
    if (
      links.some(
        (link) =>
          /(^|\.)example\.(com|org|net)$/i.test(new URL(link.url).hostname) ||
          /replace[-_]me/i.test(link.url),
      )
    )
      return `${node.label}: replace the example link before publishing.`;
  }
  return null;
}
