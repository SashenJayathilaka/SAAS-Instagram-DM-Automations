import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";

vi.mock("axios");
const findUnique = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ client: { integrations: { findUnique } } }));
import {
  ensureInstagramAppPostbackSubscription,
  ensureInstagramButtonCallbacks,
  ensureInstagramPostbackSubscription,
} from "./instagram-postback-subscription";

describe("existing-account button subscription repair", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.INSTAGRAM_APP_ID = "app-1";
    process.env.INSTAGRAM_APP_SECRET = "secret-1";
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    process.env.INSTAGRAM_LOGIN_ENABLED = "true";
    process.env.META_VERIFY_TOKEN = "verify-token";
    process.env.NEXT_PUBLIC_HOST_URL = "https://ap3k.com";
    process.env.VERCEL_ENV = "production";
    findUnique.mockResolvedValue({
      instagramId: "ig-1",
      igAccountSource: "instagram_login",
      status: "CONNECTED",
      reconnectRequired: false,
    });
  });

  it("adds postbacks to an older account and preserves other fields", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        data: [
          {
            id: "app-1",
            subscribed_fields: ["comments", "messages", "message_reactions"],
          },
        ],
      },
    });
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { success: true },
    });
    expect(
      await ensureInstagramPostbackSubscription("old-account", "token"),
    ).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/ig-1/subscribed_apps"),
      null,
      expect.objectContaining({
        params: {
          subscribed_fields:
            "comments,messages,message_reactions,messaging_postbacks,messaging_seen",
        },
        headers: { Authorization: "Bearer token" },
      }),
    );
    expect(
      await ensureInstagramPostbackSubscription("old-account", "token"),
    ).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("does not rewrite a complete subscription", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        data: [
          {
            id: "app-1",
            subscribed_fields: [
              "comments",
              "messages",
              "messaging_postbacks",
              "messaging_seen",
              "message_reactions",
            ],
          },
        ],
      },
    });
    expect(
      await ensureInstagramPostbackSubscription("healthy-account", "token"),
    ).toBe(true);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("uses a message quick reply if Meta rejects the subscription", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { data: [] } });
    vi.mocked(axios.post).mockRejectedValue(new Error("permission missing"));
    expect(
      await ensureInstagramPostbackSubscription("rejected-account", "token"),
    ).toBe(false);
  });

  it("does not assume another app's subscription belongs to AP3K", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        data: [
          {
            id: "different-app",
            subscribed_fields: [
              "comments",
              "messages",
              "messaging_postbacks",
              "messaging_seen",
              "message_reactions",
            ],
          },
        ],
      },
    });
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { success: true },
    });
    expect(
      await ensureInstagramPostbackSubscription("other-app-account", "token"),
    ).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("enables Instagram Login buttons when account and app subscriptions are ready", async () => {
    process.env.INSTAGRAM_APP_ID = "ig-buttons-ready";
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "ig-buttons-ready",
              subscribed_fields: [
                "comments",
                "messages",
                "messaging_postbacks",
                "messaging_seen",
                "message_reactions",
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              object: "instagram",
              active: true,
              callback_url: "https://ap3k.com/api/webhooks/meta",
              fields: [
                { name: "comments" },
                { name: "messages" },
                { name: "messaging_postbacks" },
                { name: "messaging_seen" },
                { name: "message_reactions" },
              ],
            },
          ],
        },
      });
    await expect(
      ensureInstagramButtonCallbacks("ig-buttons-ready", "token"),
    ).resolves.toBe(true);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("keeps quick replies when the account is ready but the app check fails", async () => {
    process.env.INSTAGRAM_APP_ID = "ig-buttons-app-unavailable";
    vi.mocked(axios.get)
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: "ig-buttons-app-unavailable",
              subscribed_fields: [
                "comments",
                "messages",
                "messaging_postbacks",
                "messaging_seen",
                "message_reactions",
              ],
            },
          ],
        },
      })
      .mockRejectedValueOnce(new Error("app unavailable"));
    await expect(
      ensureInstagramButtonCallbacks("ig-buttons-app-unavailable", "token"),
    ).resolves.toBe(false);
  });

  it("keeps quick replies when the account subscription fails", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("account unavailable"));
    await expect(
      ensureInstagramButtonCallbacks("ig-buttons-account-unavailable", "token"),
    ).resolves.toBe(false);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("tries the parent Meta app before the Instagram Login app", async () => {
    process.env.META_APP_ID = "parent-meta-app";
    process.env.META_APP_SECRET = "parent-meta-secret";
    process.env.INSTAGRAM_APP_ID = "instagram-login-app";
    process.env.INSTAGRAM_APP_SECRET = "instagram-login-secret";
    vi.mocked(axios.get).mockImplementation(async (url) => {
      if (String(url).includes("parent-meta-app")) {
        return {
          data: {
            data: [
              {
                object: "instagram",
                active: true,
                callback_url: "https://ap3k.com/api/webhooks/meta",
                fields: [
                  { name: "comments" },
                  { name: "messages" },
                  { name: "messaging_postbacks" },
                  { name: "messaging_seen" },
                  { name: "message_reactions" },
                ],
              },
            ],
          },
        };
      }
      throw new Error("Instagram app endpoint must not be needed");
    });

    await expect(ensureInstagramAppPostbackSubscription()).resolves.toBe(true);
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/parent-meta-app/subscriptions"),
      expect.anything(),
    );
  });

  it("falls back to the Instagram app when the parent Meta app cannot be audited", async () => {
    process.env.META_APP_ID = "parent-meta-app-fallback";
    process.env.META_APP_SECRET = "parent-meta-secret";
    process.env.INSTAGRAM_APP_ID = "instagram-fallback-app";
    process.env.INSTAGRAM_APP_SECRET = "instagram-login-secret";
    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error("parent app unavailable"))
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              object: "instagram",
              active: true,
              callback_url: "https://ap3k.com/api/webhooks/meta",
              fields: [
                { name: "comments" },
                { name: "messages" },
                { name: "messaging_postbacks" },
                { name: "messaging_seen" },
                { name: "message_reactions" },
              ],
            },
          ],
        },
      });

    await expect(ensureInstagramAppPostbackSubscription()).resolves.toBe(true);
    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenLastCalledWith(
      expect.stringContaining("/instagram-fallback-app/subscriptions"),
      expect.anything(),
    );
  });

  it("recognizes a complete app-level Instagram webhook subscription", async () => {
    process.env.INSTAGRAM_APP_ID = "complete-app";
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        data: [
          {
            object: "instagram",
            active: true,
            callback_url: "https://ap3k.com/api/webhooks/meta",
            fields: [
              { name: "comments" },
              { name: "messages" },
              { name: "messaging_postbacks" },
              { name: "messaging_seen" },
              { name: "message_reactions" },
            ],
          },
        ],
      },
    });

    await expect(ensureInstagramAppPostbackSubscription()).resolves.toBe(true);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("repairs the app-level subscription before enabling full-width buttons", async () => {
    process.env.INSTAGRAM_APP_ID = "repair-app";
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        data: [
          {
            object: "instagram",
            active: true,
            callback_url: "https://ap3k.com/api/webhooks/meta",
            fields: [{ name: "comments" }, { name: "messages" }],
          },
        ],
      },
    });
    vi.mocked(axios.post).mockResolvedValue({
      status: 200,
      data: { success: true },
    });

    await expect(ensureInstagramAppPostbackSubscription()).resolves.toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/repair-app/subscriptions"),
      null,
      expect.objectContaining({
        params: expect.objectContaining({
          object: "instagram",
          callback_url: "https://ap3k.com/api/webhooks/meta",
          verify_token: "verify-token",
          fields:
            "comments,messages,messaging_postbacks,messaging_seen,message_reactions",
          include_values: true,
        }),
      }),
    );
  });
});
