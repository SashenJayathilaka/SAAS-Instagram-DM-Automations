import { client } from "@/lib/prisma";
import { productImageId } from "@/lib/product-card";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (!productImageId(`/api/automation-images/${params.id}`)) return new Response(null, { status: 404 });
  const image = await client.automationImage.findUnique({ where: { id: params.id }, select: { data: true } });
  if (!image) return new Response(null, { status: 404 });
  // Public, unguessable URL so Meta can fetch the product photo. Never index image endpoints.
  return new Response(new Uint8Array(image.data), { headers: {
    "Content-Type": "image/jpeg", "Content-Length": String(image.data.length),
    "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": "default-src 'none'",
  } });
}
