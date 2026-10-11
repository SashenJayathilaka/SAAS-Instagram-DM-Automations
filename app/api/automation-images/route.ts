import { auth } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { client } from "@/lib/prisma";
import { PRODUCT_IMAGE_UPLOAD_LIMIT } from "@/lib/product-card";
import { optimizeProductImage } from "@/lib/product-image-processing";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: "Sign in to upload a product image." }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await client.user.findUnique({ where: { clerkId }, select: { id: true, status: true } });
  if (!user || user.status === "SUSPENDED") return NextResponse.json({ error: "Image uploads are unavailable for this account." }, { status: 403 });
  if (!["image/jpeg", "image/png"].includes(request.headers.get("content-type") ?? "")) return NextResponse.json({ error: "Upload a PNG or JPEG image." }, { status: 415 });
  if (Number(request.headers.get("content-length")) > PRODUCT_IMAGE_UPLOAD_LIMIT) return NextResponse.json({ error: "Image upload is too large." }, { status: 413 });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Choose an image.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > PRODUCT_IMAGE_UPLOAD_LIMIT) { await reader.cancel(); return NextResponse.json({ error: "Image upload is too large." }, { status: 413 }); }
      chunks.push(value);
    }
    const data = await optimizeProductImage(Buffer.concat(chunks)).catch(() => { throw new Error("Upload a valid PNG or JPEG image."); });
    const digest = createHash("sha256").update(data).digest("hex");
    const result = await client.$transaction(async tx => {
      // Serialize uploads per owner so concurrent requests cannot bypass storage limits.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`;
      const existing = await tx.automationImage.findUnique({ where: { userId_digest: { userId: user.id, digest } }, select: { id: true } });
      if (existing) return existing;
      const recent = await tx.automationImage.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } } });
      if (recent >= 10) throw new Error("Please wait a minute before uploading another image.");
      // Reclaim abandoned drafts; images used by any saved/duplicated flow remain available.
      const retained = await tx.listener.findMany({ where: { Automation: { userId: user.id }, mediaUrl: { not: null } }, select: { mediaUrl: true } });
      const ids = retained.flatMap(row => row.mediaUrl?.match(/\/api\/automation-images\/([0-9a-f-]+)$/)?.[1] ?? []);
      await tx.automationImage.deleteMany({ where: { userId: user.id, id: { notIn: ids }, createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
      if (await tx.automationImage.count({ where: { userId: user.id } }) >= 200) throw new Error("Your image library is full. Remove unused product cards before uploading more.");
      return tx.automationImage.create({ data: { userId: user.id, digest, data }, select: { id: true } });
    });
    return NextResponse.json({ url: `https://ap3k.com/api/automation-images/${result.id}` });
  } catch (error) {
    const known = error instanceof Error && /^(Upload|Image|Choose|Please wait|Your image)/.test(error.message);
    return NextResponse.json({ error: known ? error.message : "Could not upload the image. Please try again." }, { status: known ? 400 : 500 });
  }
}
