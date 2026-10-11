import { describe, expect, it } from "vitest";
import { normalizeCampaignPayload, validateNormalizedCampaignPayload } from "./campaign-save";
import { productImageId, validateProductCard } from "./product-card";
import { buildProductCardPayload } from "./instagram-dm";
const image = "https://ap3k.com/api/automation-images/11111111-1111-4111-8111-111111111111";
const card = { post: { postid: "ANY", media: "" }, triggerMode: "ANY_COMMENT", sendPrivateDm: true, listener: { responseFormat: "PRODUCT_CARD", prompt: "My product", cardSubtitle: "The offer", mediaUrl: image, linkButtons: [{ label: "View product", url: "https://example.com/offer?ref=creator" }] } };
describe("affiliate cards", () => {
  it("keeps image, copy, and all link buttons through campaign normalization", () => {
    const normalized = normalizeCampaignPayload(card);
    expect(validateNormalizedCampaignPayload(normalized)).toBeNull();
    expect(normalized.listener).toMatchObject({ responseFormat: "PRODUCT_CARD", mediaUrl: image, cardSubtitle: "The offer", ctaLink: "https://example.com/offer?ref=creator", quickReplies: card.listener.linkButtons });
    expect(normalized.listener.openingDmEnabled).toBe(true);
  });
  it("requires an owned-upload URL shape, title, complete links, and Meta-length copy", () => {
    for (const value of ["https://evil.example/api/automation-images/11111111-1111-4111-8111-111111111111", "data:image/jpeg;base64,abc", image + "?x=1", image + "/bad"]) expect(productImageId(value)).toBeNull();
    expect(validateProductCard("", image)).toBeTruthy();
    expect(validateProductCard("x".repeat(81), image)).toBeTruthy();
    expect(validateProductCard("Title", image, "x".repeat(81))).toBeTruthy();
    expect(validateNormalizedCampaignPayload(normalizeCampaignPayload({ ...card, listener: { ...card.listener, linkButtons: [{ label: "Buy", url: "javascript:alert(1)" }] } }))).toBeTruthy();
  });
  it("builds one generic card with photo, title, subtitle and affiliate tracking intact", () => {
    expect(buildProductCardPayload({ message: "My product", cardSubtitle: "The offer", mediaUrl: image, linkButtons: card.listener.linkButtons })).toEqual({ attachment: { type: "template", payload: { template_type: "generic", image_aspect_ratio: "square", elements: [{ title: "My product", subtitle: "The offer", image_url: image.replace("/api/automation-images/", "/media/automation/") + ".jpg", buttons: [{ type: "web_url", title: "View product", url: "https://example.com/offer?ref=creator" }] }] } } });
  });
});
