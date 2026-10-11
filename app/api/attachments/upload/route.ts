import { createAttachmentUploads } from "@/lib/attachment-storage";
export const runtime = "nodejs";
export const maxDuration = 60;
async function handle(request: Request) {
  if (!process.env.UPSTASH_BLOB_TOKEN)
    return Response.json(
      { error: "Attachment storage is not configured yet." },
      { status: 503 },
    );
  const handler = createAttachmentUploads();
  return request.method === "GET"
    ? handler.GET(request)
    : handler.POST(request);
}
export const GET = handle;
export const POST = handle;
