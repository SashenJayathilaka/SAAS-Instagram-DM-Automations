import { beforeEach, describe, expect, it, vi } from "vitest";
import { BLOG_POSTS } from "@/lib/blog";

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  transaction: vi.fn(),
  invalidate: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  saved: vi.fn(),
  audit: vi.fn(),
}));
vi.mock("@/actions/admin/safe-actions", () => ({
  requireAdminAction: mocks.guard,
}));
vi.mock("@/lib/prisma", () => ({
  client: { $transaction: mocks.transaction },
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.invalidate,
  revalidateTag: mocks.invalidate,
}));
import { saveEditorialPost } from "./editorial";

describe("owner editorial actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.guard.mockResolvedValue({
      clerkId: "owner",
      email: "owner@example.test",
    });
    mocks.find.mockResolvedValue(null);
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.create.mockImplementation(async ({ data }) => ({
      ...data,
      version: 1,
    }));
    mocks.saved.mockResolvedValue({
      version: 2,
      hidden: false,
      draft: BLOG_POSTS[0],
      published: BLOG_POSTS[0],
    });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        editorialPost: {
          findUnique: mocks.find,
          create: mocks.create,
          updateMany: mocks.update,
          findUniqueOrThrow: mocks.saved,
        },
        adminAuditLog: { create: mocks.audit },
      }),
    );
  });
  it("requires ownership before touching data", async () => {
    mocks.guard.mockRejectedValue(new Error("NOT_FOUND"));
    await expect(
      saveEditorialPost(BLOG_POSTS[0], 0, "save", ""),
    ).rejects.toThrow("NOT_FOUND");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("preserves the live snapshot when first editing an existing source article", async () => {
    const result = await saveEditorialPost(
      { ...BLOG_POSTS[0], title: "Unpublished draft title" },
      0,
      "save",
      "",
    );
    expect(result.ok).toBe(true);
    expect(mocks.create.mock.calls[0][0].data.published).toEqual(BLOG_POSTS[0]);
    expect(mocks.create.mock.calls[0][0].data.draft.title).toBe(
      "Unpublished draft title",
    );
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
  it("requires explicit confirmation for both public operations", async () => {
    for (const operation of ["publish", "unpublish"] as const) {
      expect(
        (await saveEditorialPost(BLOG_POSTS[0], 0, operation, "")).ok,
      ).toBe(false);
    }
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("publishes the reviewed snapshot and invalidates public discovery", async () => {
    const result = await saveEditorialPost(
      BLOG_POSTS[0],
      0,
      "publish",
      "PUBLISH",
    );
    expect(result.ok).toBe(true);
    const data = mocks.create.mock.calls[0][0].data;
    expect(data.published).toEqual(data.draft);
    expect(data.draft.contentLocale).toBe("en");
    expect(mocks.invalidate).toHaveBeenCalledWith("editorial");
    expect(mocks.invalidate).toHaveBeenCalledWith("/sitemap.xml");
    expect(mocks.invalidate).toHaveBeenCalledWith("/");
  });
  it("does not overwrite another editor's newer revision", async () => {
    mocks.find.mockResolvedValue({ version: 3 });
    const result = await saveEditorialPost(BLOG_POSTS[0], 2, "save", "");
    expect(result.ok).toBe(false);
    expect(result.message).toContain("another tab");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("also detects races after reading the revision", async () => {
    mocks.find.mockResolvedValue({ version: 2 });
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await saveEditorialPost(BLOG_POSTS[0], 2, "save", "")).ok).toBe(
      false,
    );
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("unpublishes recoverably, without destroying content or customer records", async () => {
    mocks.find.mockResolvedValue({ version: 1 });
    expect(
      (await saveEditorialPost(BLOG_POSTS[0], 1, "unpublish", "UNPUBLISH")).ok,
    ).toBe(true);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data.hidden).toBe(true);
    expect(data.published).toBeUndefined();
    expect(data.draft.sections).toEqual(BLOG_POSTS[0].sections);
  });
  it("rejects unsupported future scheduling", async () => {
    expect(
      (
        await saveEditorialPost(
          { ...BLOG_POSTS[0], publishedAt: "2999-01-01" },
          0,
          "publish",
          "PUBLISH",
        )
      ).ok,
    ).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
