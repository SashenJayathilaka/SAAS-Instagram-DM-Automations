import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hit: vi.fn(),
  link: vi.fn(),
  linkClick: vi.fn(),
  click: vi.fn(),
  transaction: vi.fn(),
  lock: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  client: {
    automationEngagementJob: { updateMany: vi.fn() },
    automationHit: { upsert: mocks.hit },
    automationTrackedLink: { upsert: mocks.link, updateMany: mocks.linkClick },
    automationClick: { upsert: mocks.click },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/app-url", () => ({
  getApplicationUrl: () => "https://ap3k.com",
}));
import {
  isHumanLinkRequest,
  knownFollowStatus,
  observeAutomationFollow,
  recordAutomationClick,
  recordAutomationHit,
  trackedDestination,
  withTrackedLinks,
} from "./automation-tracking";
const automationId = "00000000-0000-0000-0000-000000000001";
const otherAutomation = "00000000-0000-0000-0000-000000000002";
const integrationId = "account-1";
const recipientIgId = "recipient-1";
let states: Map<string, any>;
const stateKey = (value: any) =>
  `${value.integrationId}:${value.recipientIgId}`;
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  states = new Map();
  mocks.link.mockResolvedValue({ id: "12345678-0000-0000-0000-000000000000" });
  mocks.transaction.mockImplementation(async (fn) =>
    fn({
      $executeRaw: mocks.lock,
      automationFollowerState: {
        upsert: mocks.upsert,
        updateMany: mocks.update,
      },
    }),
  );
  mocks.upsert.mockImplementation(async ({ create }: any) => {
    if (!states.has(stateKey(create)))
      states.set(stateKey(create), { followedAt: null, ...create });
  });
  mocks.update.mockImplementation(async ({ where, data }: any) => {
    const row = states.get(stateKey(where));
    if (
      !row ||
      row.firstFollowing !== where.firstFollowing ||
      row.followedAt !== null ||
      (where.automationId && row.automationId !== where.automationId)
    )
      return { count: 0 };
    if (
      where.lastNotFollowingAt &&
      (!row.lastNotFollowingAt ||
        row.lastNotFollowingAt < where.lastNotFollowingAt.gte ||
        row.lastNotFollowingAt > where.lastNotFollowingAt.lte)
    )
      return { count: 0 };
    Object.assign(row, data);
    return { count: 1 };
  });
});
const observe = (
  followsBusiness: boolean | undefined,
  now = new Date("2026-09-27T09:00:00Z"),
  overrides = {},
) =>
  observeAutomationFollow(
    {
      integrationId,
      automationId,
      recipientIgId,
      followsBusiness,
      ...overrides,
    },
    now,
  );

describe("verified follower attribution", () => {
  it("keeps missing/string API status unknown and makes no database writes", async () => {
    expect(
      [null, undefined, "false", "true", 0, 1].map(knownFollowStatus),
    ).toEqual(Array(6).fill(undefined));
    expect(knownFollowStatus(false)).toBe(false);
    expect(knownFollowStatus(true)).toBe(true);
    await observe(undefined);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("does not count a first observed or pre-existing follower, including later unfollow/refollow", async () => {
    await observe(true);
    await observe(false);
    await observe(true);
    expect(
      states.get(`${integrationId}:${recipientIgId}`).followedAt,
    ).toBeNull();
  });
  it("counts a false-to-true transition once and keeps the original timestamp under callback retries", async () => {
    await observe(false);
    const confirmed = new Date("2026-09-27T09:01:00Z");
    await observe(true, confirmed);
    await observe(true, new Date("2026-09-27T09:05:00Z"));
    await observe(false);
    expect(states.get(`${integrationId}:${recipientIgId}`).followedAt).toEqual(
      confirmed,
    );
    expect(mocks.lock).toHaveBeenCalledTimes(4);
    expect(mocks.lock.mock.calls[0][1]).toBe(
      `${integrationId}:${recipientIgId}`,
    );
  });
  it("rejects stale observations beyond seven days and observations from the future", async () => {
    await observe(false);
    await observe(true, new Date("2026-10-05T09:00:00Z"));
    expect(
      states.get(`${integrationId}:${recipientIgId}`).followedAt,
    ).toBeNull();
    await observe(true, new Date("2026-09-26T09:00:00Z"));
    expect(
      states.get(`${integrationId}:${recipientIgId}`).followedAt,
    ).toBeNull();
  });
  it("attributes only the last verified non-follower automation and never grants two credits", async () => {
    await observe(false);
    await observe(false, undefined, { automationId: otherAutomation });
    await observe(true);
    expect(
      states.get(`${integrationId}:${recipientIgId}`).followedAt,
    ).toBeNull();
    await observe(true, undefined, { automationId: otherAutomation });
    await observe(false);
    await observe(true);
    expect(states.get(`${integrationId}:${recipientIgId}`).automationId).toBe(
      otherAutomation,
    );
  });
  it("isolates both recipient and Instagram account", async () => {
    await observe(false);
    await observe(true, undefined, { recipientIgId: "other" });
    await observe(true, undefined, { integrationId: "other" });
    expect(
      states.get(`${integrationId}:${recipientIgId}`).followedAt,
    ).toBeNull();
    expect(states.size).toBe(3);
  });
  it("does not break delivery when persistence fails", async () => {
    mocks.transaction.mockRejectedValue(new Error("db unavailable"));
    await expect(observe(false)).resolves.toBeUndefined();
  });
});

describe("delivery and click tracking", () => {
  it("records a destination once without overwriting its first-click timestamp", async () => {
    await recordAutomationClick({ id:"link-id", automationId, recipientIgId });
    expect(mocks.linkClick).toHaveBeenCalledWith({ where:{ id:"link-id", automationId, recipientIgId, firstClickedAt:null }, data:{ firstClickedAt:expect.any(Date) } });
    expect(mocks.click.mock.calls[0][0].create).not.toHaveProperty("id");
  });
  it("deduplicates callback hits on automation/event key with an empty update", async () => {
    const hit = {
      automationId,
      eventKey: "comment:123",
      recipientIgId,
      source: "COMMENT",
    };
    await recordAutomationHit(hit);
    await recordAutomationHit(hit);
    expect(mocks.hit).toHaveBeenNthCalledWith(2, {
      where: {
        automationId_eventKey: { automationId, eventKey: hit.eventKey },
      },
      create: hit,
      update: {},
    });
    mocks.hit.mockRejectedValue(new Error("db unavailable"));
    await expect(recordAutomationHit(hit)).resolves.toBeUndefined();
  });
  it("uses opaque URLs with distinct stable keys for each automation, recipient and destination", async () => {
    const destination = "https://example.com/guide?q=one";
    expect(
      await trackedDestination(automationId, recipientIgId, destination),
    ).toBe("https://ap3k.com/api/go/12345678-0000-0000-0000-000000000000");
    await trackedDestination(automationId, recipientIgId, destination);
    await trackedDestination(otherAutomation, recipientIgId, destination);
    await trackedDestination(automationId, "other", destination);
    await trackedDestination(
      automationId,
      recipientIgId,
      "https://example.com/other",
    );
    const keys = mocks.link.mock.calls.map((call) => call[0].where.key);
    expect(keys[0]).toBe(keys[1]);
    expect(new Set(keys).size).toBe(4);
  });
  it("leaves unsupported and already tracked URLs alone, and falls back to the destination on DB failure", async () => {
    for (const url of [
      "javascript:alert(1)",
      "http://example.com",
      "https://user:password@example.com",
      "https://ap3k.com/api/go/id",
    ])
      expect(await trackedDestination(automationId, recipientIgId, url)).toBe(
        url,
      );
    expect(mocks.link).not.toHaveBeenCalled();
    mocks.link.mockRejectedValue(new Error("db unavailable"));
    expect(
      await trackedDestination(
        automationId,
        recipientIgId,
        "https://example.com/guide",
      ),
    ).toBe("https://example.com/guide");
  });
  it("tracks CTA, button and carousel links without changing card content", async () => {
    const result = await withTrackedLinks({
      automationId,
      recipientId: recipientIgId,
      ctaUrl: "https://example.com/a",
      linkButtons: [{ label: "Open", url: "https://example.com/b" }],
      carouselCards: [
        {
          title: "Guide",
          image: "https://example.com/image.jpg",
          subtitle: "Useful",
          links: [{ label: "Download", url: "https://example.com/c" }],
        },
      ],
    });
    expect(mocks.link).toHaveBeenCalledTimes(3);
    expect(result.carouselCards[0]).toMatchObject({
      title: "Guide",
      image: "https://example.com/image.jpg",
      subtitle: "Useful",
      links: [
        { label: "Download", url: expect.stringContaining("ap3k.com/api/go/") },
      ],
    });
  });
  it("preserves follow-gate/postback control messages instead of wrapping control links", async () => {
    for (const control of [
      { followGatePrompt: "Follow me" },
      { postbackButton: { text: "Continue" } },
    ]) {
      const original = {
        automationId,
        recipientId: recipientIgId,
        ctaUrl: "https://example.com",
        ...control,
      };
      expect(await withTrackedLinks(original)).toBe(original);
    }
    expect(mocks.link).not.toHaveBeenCalled();
  });
  it("records only first click per automation/contact and sanitizes country", async () => {
    await recordAutomationClick({ automationId, recipientIgId }, "ma");
    expect(mocks.click).toHaveBeenCalledWith({
      where: { automationId_recipientIgId: { automationId, recipientIgId } },
      create: { automationId, recipientIgId, country: "MA" },
      update: {},
    });
    await recordAutomationClick({ automationId, recipientIgId }, "<script>");
    expect(mocks.click.mock.calls[1][0].create.country).toBeNull();
  });
  it("excludes preview bots, prefetch, and unknown user agents", () => {
    for (const agent of [
      "",
      "facebookexternalhit/1.1",
      "WhatsApp/2",
      "Googlebot",
      "HeadlessChrome",
      "Slackbot",
    ])
      expect(isHumanLinkRequest(new Headers({ "user-agent": agent }))).toBe(
        false,
      );
    const prefetchHeaders: Array<Record<string, string>> = [
      { purpose: "prefetch" },
      { "sec-purpose": "prefetch;prerender" },
      { "next-router-prefetch": "1" },
    ];
    for (const extra of prefetchHeaders)
      expect(
        isHumanLinkRequest(
          new Headers({ "user-agent": "Mozilla/5.0 Chrome/126", ...extra }),
        ),
      ).toBe(false);
    expect(
      isHumanLinkRequest(
        new Headers({ "user-agent": "Mozilla/5.0 Chrome/126" }),
      ),
    ).toBe(true);
  });
});
