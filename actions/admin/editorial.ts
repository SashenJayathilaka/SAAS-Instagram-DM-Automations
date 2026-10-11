"use server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminAction } from "@/actions/admin/safe-actions";
import { client } from "@/lib/prisma";
import { getBlogPost } from "@/lib/blog";
import { normalizeEditorial } from "@/lib/editorial";

class EditorialInputError extends Error {}

export async function saveEditorialPost(
  input: unknown,
  expectedVersion: number,
  operation: "save" | "publish" | "unpublish",
  confirmation: string,
) {
  const admin = await requireAdminAction();
  try {
    if (!["save", "publish", "unpublish"].includes(operation))
      throw new EditorialInputError("Unknown editorial action.");
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0)
      throw new EditorialInputError("Invalid revision.");
    if (
      operation !== "save" &&
      confirmation !== (operation === "publish" ? "PUBLISH" : "UNPUBLISH")
    )
      throw new EditorialInputError(
        `Type ${operation.toUpperCase()} to confirm.`,
      );
    const post = normalizeEditorial(input);
    post.contentLocale = "en";
    if (
      operation === "publish" &&
      post.publishedAt > new Date().toISOString().slice(0, 10)
    )
      throw new EditorialInputError(
        "Future-dated publishing is not enabled. Choose today or an earlier date.",
      );
    const json = JSON.parse(JSON.stringify(post)) as Prisma.InputJsonValue;
    const row = await client.$transaction(async (tx) => {
      const before = await tx.editorialPost.findUnique({
        where: { slug: post.slug },
      });
      if ((before?.version || 0) !== expectedVersion)
        throw new EditorialInputError(
          "This post changed in another tab. Reload before saving.",
        );
      const base = getBlogPost(post.slug);
      const published = operation === "publish" ? json : undefined;
      let saved;
      if (before) {
        const result = await tx.editorialPost.updateMany({
          where: { slug: post.slug, version: expectedVersion },
          data: {
            draft: json,
            ...(published ? { published } : {}),
            ...(operation !== "save"
              ? { hidden: operation === "unpublish" }
              : {}),
            version: { increment: 1 },
            updatedBy: admin.clerkId,
          },
        });
        if (result.count !== 1)
          throw new EditorialInputError(
            "This post changed in another tab. Reload before saving.",
          );
        saved = await tx.editorialPost.findUniqueOrThrow({
          where: { slug: post.slug },
        });
      } else {
        saved = await tx.editorialPost.create({
          data: {
            slug: post.slug,
            draft: json,
            published:
              published ||
              (base ? JSON.parse(JSON.stringify(base)) : Prisma.DbNull),
            hidden: operation === "unpublish",
            updatedBy: admin.clerkId,
          },
        });
      }
      await tx.adminAuditLog.create({
        data: {
          adminUserId: admin.clerkId,
          adminEmail: admin.email,
          action: `EDITORIAL_${operation.toUpperCase()}`,
          targetType: "EditorialPost",
          targetId: post.slug,
          targetLabel: post.title,
          before: before
            ? {
                version: before.version,
                hidden: before.hidden,
                draft: before.draft,
                published: before.published,
              }
            : Prisma.JsonNull,
          after: {
            version: saved.version,
            hidden: saved.hidden,
            draft: saved.draft,
            published: saved.published,
          },
          status: "SUCCESS",
        },
      });
      return saved;
    });
    revalidateTag("editorial");
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/admin/content");
    revalidatePath("/admin/seo");
    return {
      ok: true as const,
      version: row.version,
      message:
        operation === "save"
          ? "Draft saved. The live article is unchanged."
          : operation === "publish"
            ? "Published. The article and sitemap are updated."
            : "Unpublished. Content is retained and can be published again.",
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      return {
        ok: false as const,
        message:
          error.code === "P2002"
            ? "This slug already exists. Reload or choose another slug."
            : "The post could not be saved. Please retry.",
      };
    if (error instanceof EditorialInputError)
      return { ok: false as const, message: error.message };
    if (error instanceof ZodError)
      return {
        ok: false as const,
        message: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .slice(0, 5)
          .join(" · "),
      };
    return {
      ok: false as const,
      message:
        "The post could not be saved. Your editor content is preserved; retry after checking the connection.",
    };
  }
}
