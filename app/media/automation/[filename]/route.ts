import { GET as getImage } from "@/app/api/automation-images/[id]/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, props: { params: Promise<{ filename: string }> }) {
  const params = await props.params;
  if (!params.filename.endsWith(".jpg")) return new Response(null, { status: 404 });
  return getImage(request, { params: Promise.resolve({ id: params.filename.slice(0, -4) }) });
}
