vi.mock("@/lib/instagram-account-scope", () => ({ currentInstagramAccountId: vi.fn(async () => "integration-a") }));
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockUserFindUnique = vi.fn();
const mockAutomationFindMany = vi.fn();
const mockKeywordFindMany = vi.fn();
const mockLeadFindMany = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: (...args: unknown[]) => mockCurrentUser(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    automation: { findMany: (...args: unknown[]) => mockAutomationFindMany(...args) },
    keyword: { findMany: (...args: unknown[]) => mockKeywordFindMany(...args) },
    lead: { findMany: (...args: unknown[]) => mockLeadFindMany(...args) },
  },
}));

import { GET } from "@/app/api/dashboard/search/route";
import {
  MAX_WORKSPACE_SEARCH_LENGTH,
  normalizeWorkspaceSearchQuery,
  searchWorkspaceForClerkUser,
  WORKSPACE_SEARCH_RESULT_LIMIT,
} from "@/lib/workspace-search";

function searchRequest(query: string) {
  return new Request(`http://localhost:3000/api/dashboard/search?q=${encodeURIComponent(query)}`);
}

describe("workspace search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.mockResolvedValue({ id: "clerk-user-a" });
    mockUserFindUnique.mockResolvedValue({ id: "internal-user-a", clerkId: "clerk-user-a" });
    mockAutomationFindMany.mockResolvedValue([]);
    mockKeywordFindMany.mockResolvedValue([]);
    mockLeadFindMany.mockResolvedValue([]);
  });

  it("trims queries and enforces minimum and maximum lengths", () => {
    expect(normalizeWorkspaceSearchQuery("  launch  ")).toEqual({ ok: true, query: "launch" });
    expect(normalizeWorkspaceSearchQuery(" a ")).toMatchObject({ ok: false, code: "query_too_short" });
    expect(normalizeWorkspaceSearchQuery("x".repeat(MAX_WORKSPACE_SEARCH_LENGTH + 1))).toMatchObject({
      ok: false,
      code: "query_too_long",
    });
  });

  it("rejects unauthorized requests before querying AP3K data", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const response = await GET(searchRequest("launch"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "not_authenticated" } });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a one-character query without running database searches", async () => {
    const response = await GET(searchRequest("x"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "query_too_short" } });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockAutomationFindMany).not.toHaveBeenCalled();
  });

  it("scopes campaign, keyword, and lead searches to the authenticated internal user", async () => {
    await searchWorkspaceForClerkUser("clerk-user-a", "launch");

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { clerkId: "clerk-user-a" },
      select: { id: true, clerkId: true },
    });
    expect(mockAutomationFindMany.mock.calls[0][0].where).toMatchObject({ userId: "internal-user-a", archivedAt: null });
    expect(mockKeywordFindMany.mock.calls[0][0].where.Automation).toMatchObject({ userId: "internal-user-a", archivedAt: null });
    expect(mockLeadFindMany.mock.calls[0][0].where.automation).toMatchObject({ userId: "internal-user-a", archivedAt: null });
  });

  it("does not construct any search with another user's ID", async () => {
    await searchWorkspaceForClerkUser("clerk-user-a", "launch");

    const searchCalls = [
      mockAutomationFindMany.mock.calls[0][0],
      mockKeywordFindMany.mock.calls[0][0],
      mockLeadFindMany.mock.calls[0][0],
    ];
    expect(JSON.stringify(searchCalls)).toContain("internal-user-a");
    expect(JSON.stringify(searchCalls)).not.toContain("internal-user-b");
  });

  it("matches campaign names case-insensitively and returns the campaign destination", async () => {
    mockAutomationFindMany.mockResolvedValue([
      { id: "campaign-1", name: "Launch Guide", keywords: [{ word: "GUIDE" }] },
    ]);

    const results = await searchWorkspaceForClerkUser("clerk-user-a", "launch");

    expect(mockAutomationFindMany.mock.calls[0][0].where.name).toEqual({ contains: "launch", mode: "insensitive" });
    expect(results?.campaigns[0]).toMatchObject({
      title: "Launch Guide",
      href: "/dashboard/clerk-user-a/automation/campaign-1/analytics",
    });
  });

  it("matches keywords case-insensitively and links to their campaign", async () => {
    mockKeywordFindMany.mockResolvedValue([
      { id: "keyword-1", word: "GUIDE", Automation: { id: "campaign-1", name: "Lead Magnet" } },
    ]);

    const results = await searchWorkspaceForClerkUser("clerk-user-a", "guide");

    expect(mockKeywordFindMany.mock.calls[0][0].where.word).toEqual({ contains: "guide", mode: "insensitive" });
    expect(results?.keywords[0]).toMatchObject({
      title: "GUIDE",
      subtitle: "Lead Magnet",
      href: "/dashboard/clerk-user-a/automation/campaign-1/analytics",
    });
  });

  it("matches leads by Instagram username or comment text", async () => {
    mockLeadFindMany.mockResolvedValue([
      {
        id: "lead-1",
        igUsername: "sarah.creates",
        commentText: "Please send the guide",
        automation: { id: "campaign-1", name: "Lead Magnet" },
      },
    ]);

    const results = await searchWorkspaceForClerkUser("clerk-user-a", "sarah");

    expect(mockLeadFindMany.mock.calls[0][0].where.OR).toEqual([
      { igUsername: { contains: "sarah", mode: "insensitive" } },
      { commentText: { contains: "sarah", mode: "insensitive" } },
    ]);
    expect(results?.leads[0]).toMatchObject({
      title: "@sarah.creates",
      subtitle: "Please send the guide · Lead Magnet",
      href: "/dashboard/clerk-user-a/automation/campaign-1/analytics",
    });
  });

  it("limits every category to five results", async () => {
    const campaigns = Array.from({ length: 7 }, (_, index) => ({
      id: `campaign-${index}`,
      name: `Campaign ${index}`,
      keywords: [],
    }));
    mockAutomationFindMany.mockResolvedValue(campaigns);

    const results = await searchWorkspaceForClerkUser("clerk-user-a", "campaign");

    expect(mockAutomationFindMany.mock.calls[0][0].take).toBe(WORKSPACE_SEARCH_RESULT_LIMIT);
    expect(mockKeywordFindMany.mock.calls[0][0].take).toBe(WORKSPACE_SEARCH_RESULT_LIMIT);
    expect(mockLeadFindMany.mock.calls[0][0].take).toBe(WORKSPACE_SEARCH_RESULT_LIMIT);
    expect(results?.campaigns).toHaveLength(WORKSPACE_SEARCH_RESULT_LIMIT);
  });

  it("returns categorized empty results when nothing matches", async () => {
    const response = await GET(searchRequest("nothing"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      query: "nothing",
      results: { campaigns: [], keywords: [], leads: [] },
    });
  });
});
