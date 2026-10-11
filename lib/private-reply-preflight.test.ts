import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import {
  buildSafePrivateReplyDiagnostics,
  PRIVATE_REPLY_PREFLIGHT_EVENTS,
  sendPrivateReplyPreflight,
} from "@/lib/private-reply-preflight";

vi.mock("axios");

const mockedAxios = vi.mocked(axios, true);
const RAW_TOKEN = "EAAB-private-reply-preflight-secret-token";
const BASE_INPUT = {
  token: RAW_TOKEN,
  instagramId: "17841400000000000",
  commentId: "18000000000000000",
  message: "Thanks for commenting.",
  integrationId: "integration-1",
  connectedUsername: "ap3k_test",
};

function metaError(input: {
  code: number;
  subcode?: number;
  type?: string;
  message: string;
}) {
  const error = new Error("Meta API request failed") as Error & {
    isAxiosError: boolean;
    response: {
      status: number;
      data: {
        error: {
          code: number;
          error_subcode?: number;
          type?: string;
          message: string;
          fbtrace_id: string;
        };
      };
    };
  };
  error.isAxiosError = true;
  error.response = {
    status: 400,
    data: {
      error: {
        code: input.code,
        error_subcode: input.subcode,
        type: input.type ?? "OAuthException",
        message: input.message,
        fbtrace_id: "safe-trace-id",
      },
    },
  };
  return error;
}

beforeEach(() => {
  vi.resetAllMocks();
  mockedAxios.isAxiosError = vi.fn(
    (error: unknown) =>
      Boolean((error as { isAxiosError?: boolean })?.isAxiosError)
  ) as any;
  mockedAxios.post = vi.fn() as any;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendPrivateReplyPreflight", () => {
  it("maps success to PRIVATE_REPLY_PREFLIGHT_SENT and uses recipient.comment_id", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: { message_id: "mid.1" },
    });

    const result = await sendPrivateReplyPreflight(BASE_INPUT);

    expect(result).toEqual({
      ok: true,
      event: PRIVATE_REPLY_PREFLIGHT_EVENTS.SENT,
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post.mock.calls[0][1]).toEqual({
      recipient: { comment_id: BASE_INPUT.commentId },
      message: { text: BASE_INPUT.message },
    });
  });

  it("maps capability errors to PRIVATE_REPLY_PREFLIGHT_FAILED_CAPABILITY", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      metaError({
        code: 3,
        message:
          "(#3) Application does not have the capability to make this API call",
      })
    );

    const result = await sendPrivateReplyPreflight(BASE_INPUT);

    expect(result.event).toBe(
      PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_CAPABILITY
    );
  });

  it("maps permission errors to PRIVATE_REPLY_PREFLIGHT_FAILED_PERMISSION", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      metaError({
        code: 10,
        message:
          "This request requires the instagram_manage_messages permission.",
      })
    );

    const result = await sendPrivateReplyPreflight(BASE_INPUT);

    expect(result.event).toBe(
      PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_PERMISSION
    );
  });

  it("maps token errors to PRIVATE_REPLY_PREFLIGHT_FAILED_TOKEN", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      metaError({
        code: 190,
        subcode: 463,
        message: "Error validating access token: Session has expired.",
      })
    );

    const result = await sendPrivateReplyPreflight(BASE_INPUT);

    expect(result.event).toBe(PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_TOKEN);
  });

  it("maps comment, recipient, and window errors to PRIVATE_REPLY_PREFLIGHT_FAILED_WINDOW", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      metaError({
        code: 100,
        message:
          "The comment recipient is outside the allowed private reply window.",
      })
    );

    const result = await sendPrivateReplyPreflight(BASE_INPUT);

    expect(result.event).toBe(PRIVATE_REPLY_PREFLIGHT_EVENTS.FAILED_WINDOW);
  });

  it("never returns, renders through diagnostics, or logs the raw token", async () => {
    mockedAxios.post.mockRejectedValueOnce(
      metaError({
        code: 10,
        message: "Permission is missing.",
      })
    );

    const result = await sendPrivateReplyPreflight(BASE_INPUT);
    const diagnostics = buildSafePrivateReplyDiagnostics({
      integrationStatus: "CONNECTED",
      connectedUsername: "ap3k_test",
      instagramId: BASE_INPUT.instagramId,
      token: RAW_TOKEN,
      tokenExpiry: new Date("2026-08-01T00:00:00.000Z"),
      grantedScopes: ["instagram_basic"],
      scopeDetection: "detected",
    });
    const logged = [
      ...vi.mocked(console.info).mock.calls,
      ...vi.mocked(console.warn).mock.calls,
    ];

    expect(JSON.stringify(result)).not.toContain(RAW_TOKEN);
    expect(JSON.stringify(diagnostics)).not.toContain(RAW_TOKEN);
    expect(JSON.stringify(logged)).not.toContain(RAW_TOKEN);
    expect(diagnostics.tokenPresent).toBe(true);
  });
});
