export const PRODUCT_IMAGE_INPUT_LIMIT = 10 * 1024 * 1024;
export const PRODUCT_IMAGE_UPLOAD_LIMIT = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_STORED_LIMIT = 512 * 1024;
export const PRODUCT_CARD_TEXT_LIMIT = 80;

export function productImageId(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "https://ap3k.com");
    if (parsed.origin !== "https://ap3k.com" || parsed.search || parsed.hash) return null;
    return /^\/api\/automation-images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(parsed.pathname)?.[1] ?? null;
  } catch { return null; }
}

export function validateProductCard(title: string, imageUrl?: string | null, subtitle?: string | null): string | null {
  if (!title.trim()) return "Add a product title.";
  if (Array.from(title).length > PRODUCT_CARD_TEXT_LIMIT) return "Keep the product title to 80 characters.";
  if (Array.from(subtitle ?? "").length > PRODUCT_CARD_TEXT_LIMIT) return "Keep the product subtitle to 80 characters.";
  if (!productImageId(imageUrl)) return "Upload a product image before saving.";
  return null;
}

// Keep stored upload URLs stable; give Meta a dedicated, crawlable image URL.
export function productImageDeliveryUrl(url?: string | null): string | null {
  const id = productImageId(url);
  return id ? `https://ap3k.com/media/automation/${id}.jpg` : null;
}
