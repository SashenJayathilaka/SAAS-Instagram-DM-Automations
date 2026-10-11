import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const db = vi.hoisted(() => ({ update: vi.fn(), find: vi.fn() }));
vi.mock("./prisma", () => ({ client: { automation: { updateMany: db.update, findFirst: db.find } } }));
import { bindNextCommentPost } from "./next-post-runtime";
const owner = { token: "a".repeat(50), instagramId: "owner", igAccountSource: "instagram_login" };
const pending = { id: "rule", integrationId: "account", postConfig: { scope: "NEXT", armedAt: "2026-10-11T10:00:00Z" } };
const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
beforeEach(() => { vi.resetAllMocks(); db.update.mockResolvedValue({ count: 1 }); });
afterEach(() => vi.restoreAllMocks());
describe("verified next-post binding", () => {
  it("chooses earliest owner publication even when a newer post is returned first", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ data: [{ id: "333", timestamp: "2026-10-11T12:00:00Z" }, { id: "222", timestamp: "2026-10-11T11:00:00Z" }, { id: "111", timestamp: "2026-10-11T09:00:00Z" }] }));
    expect((await bindNextCommentPost(pending, owner))?.boundPostId).toBe("222");
    expect(String(fetch.mock.calls[0][0])).toContain("/owner/media");
    expect(db.update.mock.calls[0][0].where).toMatchObject({ id: "rule", integrationId: "account", active: true, archivedAt: null, postConfig: { equals: pending.postConfig } });
  });
  it("fails closed on unavailable or incomplete timeline", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 403 }));
    expect(await bindNextCommentPost(pending, owner)).toBeNull();
    fetch.mockResolvedValue(response({ data: [{ id: "333", timestamp: "2026-10-11T12:00:00Z" }], paging: { next: "present" } }));
    expect(await bindNextCommentPost(pending, owner)).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("does not rebind after a concurrent editor change", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ data: [{ id: "222", timestamp: "2026-10-11T11:00:00Z" }] }));
    db.update.mockResolvedValue({ count: 0 }); db.find.mockResolvedValue({ postConfig: null });
    expect(await bindNextCommentPost(pending, owner)).toBeNull();
  });
  it("does not call Meta for a draft, an existing binding or a missing token", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    await bindNextCommentPost({ ...pending, postConfig: { scope: "NEXT" } }, owner);
    await bindNextCommentPost({ ...pending, postConfig: { ...pending.postConfig, boundPostId: "222" } }, owner);
    await bindNextCommentPost(pending, { ...owner, token: "" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
