import { attachmentScopeFilter } from "@/lib/attachment-scope";
import {
  attachmentUser,
  attachmentDto,
  attachmentSelection,
} from "@/lib/attachment-storage";
import { client } from "@/lib/prisma";
import { attachmentId, attachmentUrl } from "@/lib/message-attachment";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const user = await attachmentUser();
    const id = new URL(request.url).searchParams.get("id");
    if (id !== null && !attachmentId(attachmentUrl(id))) {
      return Response.json({ error: "Invalid attachment." }, { status: 400 });
    }
    const files = await client.automationAttachment.findMany({
      where: { userId: user.id, status: "READY", ...(id ? { id } : {}), ...attachmentScopeFilter() },
      select: attachmentSelection,
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    return Response.json({ files: files.map(attachmentDto) });
  } catch {
    return Response.json(
      { error: "Sign in to view your attachments." },
      { status: 401 },
    );
  }
}
