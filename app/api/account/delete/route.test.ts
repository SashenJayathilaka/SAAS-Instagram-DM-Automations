vi.mock("@/lib/attachment-cleanup",()=>({deleteOwnedAttachmentObjects:vi.fn().mockResolvedValue(undefined)}));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCurrentUser = vi.fn();
const mockClerkClient = vi.fn();
const mockUserFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockStripeCustomerDelete = vi.fn();
const mockGetStripeSecretKey = vi.fn();
const mockClerkUserDelete = vi.fn();

const tx = {
  automation: { findMany: vi.fn() },
  integrations: { findMany: vi.fn() },
  dms: { deleteMany: vi.fn() },
  webhookEvent: { deleteMany: vi.fn() },
  adminAuditLog: { deleteMany: vi.fn() },
  user: { delete: vi.fn() },
};

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: (...args: unknown[]) => mockCurrentUser(...args),
  clerkClient: (...args: unknown[]) => mockClerkClient(...args),
}));

vi.mock("@/lib/prisma", () => ({
  client: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { del: (...args: unknown[]) => mockStripeCustomerDelete(...args) },
  },
}));

vi.mock("@/lib/stripe-config", () => ({
  getStripeSecretKey: (...args: unknown[]) => mockGetStripeSecretKey(...args),
}));

import { POST } from "@/app/api/account/delete/route";

function request(
  confirmation = "DELETE",
  origin = "https://ap3k.test"
) {
  return new Request("https://ap3k.test/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify({ confirmation }),
  });
}

function authenticatedUser() {
  return {
    id: "clerk-user-a",
    primaryEmailAddress: { emailAddress: "owner@example.com" },
    emailAddresses: [{ emailAddress: "owner@example.com" }],
  };
}

describe("self-service account deletion route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCurrentUser.mockResolvedValue(authenticatedUser());
    mockClerkClient.mockResolvedValue({ users: { deleteUser: mockClerkUserDelete } });
    mockUserFindUnique.mockResolvedValue({
      id: "internal-user-a",
      email: "owner@example.com",
      subscription: { customerId: "cus_owner_a" },
    });
    mockGetStripeSecretKey.mockReturnValue("sk_test_configured");
    mockStripeCustomerDelete.mockResolvedValue({ deleted: true });
    mockClerkUserDelete.mockResolvedValue({ deleted: true });

    tx.automation.findMany.mockResolvedValue([{ id: "automation-a" }]);
    tx.integrations.findMany.mockResolvedValue([
      {
        id: "integration-a",
        instagramId: "ig-a",
        webhookAccountId: "webhook-a",
        pageId: "page-a",
        businessId: "business-a",
      },
    ]);
    tx.dms.deleteMany.mockResolvedValue({ count: 1 });
    tx.webhookEvent.deleteMany.mockResolvedValue({ count: 1 });
    tx.adminAuditLog.deleteMany.mockResolvedValue({ count: 1 });
    tx.user.delete.mockResolvedValue({ id: "internal-user-a" });

    mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects requests from a different origin before authentication or cleanup", async () => {
    const response = await POST(request("DELETE", "https://evil.example"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invalid_origin" } });
    expect(mockCurrentUser).not.toHaveBeenCalled();
    expect(mockStripeCustomerDelete).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockClerkUserDelete).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "not_authenticated" } });
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockStripeCustomerDelete).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockClerkUserDelete).not.toHaveBeenCalled();
  });

  it("rejects email-bearing confirmation; requires DELETE only", async () => {
    const response = await POST(request("DELETE another@example.com"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "confirmation_mismatch" } });
    expect(mockStripeCustomerDelete).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockClerkUserDelete).not.toHaveBeenCalled();
  });

  it("deletes billing first, then AP3K data, then the Clerk identity", async () => {
    const order: string[] = [];
    mockStripeCustomerDelete.mockImplementation(async () => {
      order.push("stripe");
      return { deleted: true };
    });
    mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) => {
      order.push("database");
      return callback(tx);
    });
    mockClerkUserDelete.mockImplementation(async () => {
      order.push("clerk");
      return { deleted: true };
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(order).toEqual(["stripe", "database", "clerk"]);
    expect(mockStripeCustomerDelete).toHaveBeenCalledWith("cus_owner_a");
    expect(tx.dms.deleteMany).toHaveBeenCalledWith({
      where: { automationId: { in: ["automation-a"] } },
    });
    expect(tx.webhookEvent.deleteMany).toHaveBeenCalled();
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "internal-user-a" } });
    expect(mockClerkUserDelete).toHaveBeenCalledWith("clerk-user-a");
  });

  it("stops before database and identity deletion when Stripe cleanup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockStripeCustomerDelete.mockRejectedValue({ code: "api_error" });

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "billing_cleanup_failed" } });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockClerkUserDelete).not.toHaveBeenCalled();
  });

  it("treats an already-missing Stripe customer as safe to continue", async () => {
    mockStripeCustomerDelete.mockRejectedValue({ code: "resource_missing" });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockClerkUserDelete).toHaveBeenCalledWith("clerk-user-a");
  });

  it("does not remove the Clerk identity when database cleanup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockTransaction.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "database_cleanup_failed" } });
    expect(mockClerkUserDelete).not.toHaveBeenCalled();
  });

  it("supports retrying identity cleanup after AP3K data is already gone", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockStripeCustomerDelete).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockClerkUserDelete).toHaveBeenCalledWith("clerk-user-a");
  });

  it("reports partial completion when Clerk cleanup fails after AP3K data deletion", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockClerkUserDelete.mockRejectedValue(new Error("Clerk unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "identity_cleanup_failed" } });
    expect(mockStripeCustomerDelete).toHaveBeenCalledTimes(1);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});
