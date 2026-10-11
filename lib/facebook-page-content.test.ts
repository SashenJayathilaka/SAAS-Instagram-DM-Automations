import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  META_GRAPH_API_BASE_URL,
  getRecentFacebookPagePosts,
} from "./fetch";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

const mockAxiosGet = vi.mocked(axios.get);

describe("getRecentFacebookPagePosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests three Page posts with the Page access token and returns sanitized fields", async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "page_1",
            message: "First post",
            created_time: "2026-06-25T10:00:00+0000",
            permalink_url: "https://www.facebook.com/page/posts/1",
            ignored: "not returned",
          },
          {
            id: "page_2",
            created_time: "2026-06-24T10:00:00+0000",
          },
        ],
      },
    });

    await expect(
      getRecentFacebookPagePosts("page-id", "page-access-token-that-is-long-enough")
    ).resolves.toEqual([
      {
        id: "page_1",
        message: "First post",
        createdTime: "2026-06-25T10:00:00+0000",
        permalinkUrl: "https://www.facebook.com/page/posts/1",
      },
      {
        id: "page_2",
        message: undefined,
        createdTime: "2026-06-24T10:00:00+0000",
        permalinkUrl: undefined,
      },
    ]);

    expect(mockAxiosGet).toHaveBeenCalledWith(
      `${META_GRAPH_API_BASE_URL}/page-id/posts`,
      {
        params: {
          fields: "id,message,created_time,permalink_url",
          limit: 3,
          access_token: "page-access-token-that-is-long-enough",
        },
      }
    );
  });

  it("drops malformed posts instead of exposing unexpected Graph response fields", async () => {
    mockAxiosGet.mockResolvedValue({
      data: {
        data: [
          { id: "missing-created-time", message: "Ignored" },
          { created_time: "2026-06-25T10:00:00+0000", message: "Ignored" },
        ],
      },
    });

    await expect(
      getRecentFacebookPagePosts("page-id", "page-access-token-that-is-long-enough")
    ).resolves.toEqual([]);
  });
});
