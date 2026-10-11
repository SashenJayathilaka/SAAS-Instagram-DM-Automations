import { attachmentScopeFilter, attachmentKeyInScope } from "@/lib/attachment-scope";
import { Bucket } from "@upstash/blob";
import { client } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
      params.id,
    )
  )
    return new Response(null, { status: 404 });
  const item = await client.automationAttachment.findFirst({
    where: { id: params.id, status: "READY", ...attachmentScopeFilter() },
    select: { storageKey: true },
  });
  if (
    !item ||
    !attachmentKeyInScope(item.storageKey) ||
    !process.env.UPSTASH_BLOB_TOKEN
  )
    return new Response(null, { status: 404 });
  const { url } = await Bucket.fromEnv().signedReadUrl(item.storageKey, {
    expiresIn: "10m",
  });
  return new Response(null, {
    status: 307,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
