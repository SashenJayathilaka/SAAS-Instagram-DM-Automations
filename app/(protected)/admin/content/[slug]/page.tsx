import { notFound } from "next/navigation";
import { requireOwnerAdmin } from "@/lib/admin";
import { client } from "@/lib/prisma";
import { getBlogPost, type BlogPost } from "@/lib/blog";
import { EditorialEditor } from "@/components/admin-v2/editorial-editor";
import { AdminPageHeader } from "@/components/admin-v2/page-header";

export default async function EditorPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  await requireOwnerAdmin();
  const row =
    params.slug === "new"
      ? null
      : await client.editorialPost.findUnique({ where: { slug: params.slug } });
  const base = getBlogPost(params.slug);
  if (params.slug !== "new" && !row && !base) notFound();
  const initial = (row?.draft ||
    base || {
      slug: "",
      title: "",
      description: "",
      intro: "",
      category: "Instagram Automation",
      keywords: [],
      contentLocale: "en",
      publishedAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      readingTime: "1 min read",
      visual: "workflow",
      visualAlt: "Instagram automation workflow with AP3K",
      visualCaption: "",
      sections: [{ heading: "", paragraphs: [""] }],
    }) as BlogPost;
  const logs = row
    ? await client.adminAuditLog.findMany({
        where: {
          targetType: "EditorialPost",
          targetId: params.slug,
          status: "SUCCESS",
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { id: true, createdAt: true, action: true, after: true },
      })
    : [];
  const history = logs.flatMap((log) => {
    const after = log.after as { draft?: BlogPost } | null;
    return after?.draft
      ? [
          {
            id: log.id,
            date: log.createdAt.toISOString(),
            action: log.action,
            post: after.draft,
          },
        ]
      : [];
  });
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Publishing"
        title={params.slug === "new" ? "Create an article" : "Edit article"}
        description="Write, preview and publish from one place. Existing URLs stay stable."
      />
      <EditorialEditor
        initial={initial}
        version={row?.version || 0}
        existing={Boolean(row || base)}
        history={history}
      />
    </div>
  );
}
