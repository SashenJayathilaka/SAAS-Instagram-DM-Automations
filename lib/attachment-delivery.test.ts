import { it, expect, vi, beforeEach } from "vitest";
vi.mock("axios");
vi.mock("@/lib/attachment-delivery", () => ({
  resolveAttachmentMessage: vi.fn(),
}));
import { resolveAttachmentMessage } from "@/lib/attachment-delivery";
vi.mock("@/lib/automation-tracking", () => ({
  withTrackedLinks: async (x: unknown) => x,
  knownFollowStatus: () => false,
}));
import axios from "axios";
import {
  sendInstagramCommentPrivateReply,
  sendInstagramDirectResponse,
} from "./instagram-dm";
const base = {
  token: "test",
  automationId: "id",
  igBusinessAccountId: "biz",
  message: "MUST NOT SEND",
  responseFormat: "ATTACHMENT",
  mediaUrl:
    "https://ap3k.com/media/attachments/11111111-1111-4111-8111-111111111111",
  linkButtons: [{ label: "MUST NOT SEND", url: "https://example.com" }],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(axios.post).mockResolvedValue({ data: { message_id: "message" } });
});
it.each(["IMAGE", "VIDEO", "AUDIO"])(
  "sends a single %s attachment in both private and direct deliveries",
  async (mediaType) => {
    vi.mocked(resolveAttachmentMessage).mockResolvedValue({
      attachment: {
        type: mediaType.toLowerCase() as "image" | "video" | "audio",
        payload: { url: base.mediaUrl, is_reusable: true },
      },
    });
    const direct = await sendInstagramDirectResponse({
      ...base,
      recipientId: "person",
      mediaType,
    });
    expect(direct.ok).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(vi.mocked(axios.post).mock.calls[0][1]).toEqual({
      recipient: { id: "person" },
      message: {
        attachment: {
          type: mediaType.toLowerCase(),
          payload: { url: base.mediaUrl, is_reusable: true },
        },
      },
    });
    vi.mocked(axios.post).mockClear();
    const initial = await sendInstagramCommentPrivateReply({
      ...base,
      commentId: "comment",
      commenterId: "person",
      mediaType,
    });
    expect(initial.ok).toBe(true);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(
      JSON.stringify(vi.mocked(axios.post).mock.calls[0][1]),
    ).not.toContain("MUST NOT SEND");
  },
);
it("reports rejected attachment delivery without substituting hidden text", async () => {
  vi.mocked(axios.post).mockRejectedValue(new Error("failed"));
  vi.mocked(resolveAttachmentMessage).mockResolvedValue({
    attachment: {
      type: "template",
      payload: { url: base.mediaUrl, is_reusable: true },
    },
  });
  const result = await sendInstagramDirectResponse({
    ...base,
    recipientId: "person",
    mediaType: "FILE",
  });
  expect(result.ok).toBe(false);
  expect(axios.post).toHaveBeenCalledTimes(1);
});
