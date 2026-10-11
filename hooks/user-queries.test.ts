import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), query: vi.fn((options: any) => options) }));
vi.mock("@/actions/user", () => ({ onUserInfo: mocks.profile }));
vi.mock("@/actions/automation", () => ({ getAllAutomation: vi.fn(), getAutomationInfo: vi.fn() }));
vi.mock("@/actions/automation/media", () => ({ getProfilePostsPaginated: vi.fn() }));
vi.mock("@/actions/integration", () => ({ getCurrentWebhookHealth: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user-a" }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.query }));
import { useQueryUser } from "./user-queries";
beforeEach(() => vi.clearAllMocks());
describe("profile loading", () => {
  it("rejects failed profile reads so React Query retries instead of caching a disconnected account", async () => {
    mocks.profile.mockResolvedValue({ status: 500 });
    useQueryUser();
    await expect(mocks.query.mock.calls[0][0].queryFn()).rejects.toThrow("Unable to load");
  });
  it("accepts a confirmed profile with no connections", async () => {
    const response = { status: 200, data: { integrations: [] } };
    mocks.profile.mockResolvedValue(response);
    useQueryUser();
    await expect(mocks.query.mock.calls[0][0].queryFn()).resolves.toEqual(response);
  });
});
