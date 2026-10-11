import { emailRequestMessage } from "./automation-engagement-settings";
import { describe, expect, it } from "vitest";
import {
  followUpEligible,
  parseEmailReply,
  validateEngagementSettings,
  MESSAGING_WINDOW_MS,
  messagingWindowOpen,
} from "./automation-engagement-settings";
import {
  normalizeCampaignPayload,
  validateNormalizedCampaignPayload,
} from "./campaign-save";

describe("engagement settings", () => {
  it("keeps existing campaigns off and supports capture without an opening DM", () => {
    expect(normalizeCampaignPayload({}).listener.emailCaptureEnabled).toBe(
      false,
    );
    expect(
      validateEngagementSettings(
        { emailCaptureEnabled: true, emailCapturePrompt: "Email?" },
        true,
        false,
      ),
    ).toBeNull();
    expect(
      validateEngagementSettings(
        {
          followUpEnabled: true,
          followUpMessage: "Reminder",
          followUpDelayMinutes: 1440,
        },
        true,
        true,
      ),
    ).toContain("delay");
    expect(
      validateEngagementSettings(
        {
          followUpEnabled: true,
          followUpMessage: "Reminder",
          followUpDelayMinutes: 30,
        },
        true,
        true,
      ),
    ).toBeNull();
    const payload = normalizeCampaignPayload({
      sendPrivateDm: true,
      listener: { emailCaptureEnabled: true, openingDmEnabled: false },
    });
    expect(validateNormalizedCampaignPayload(payload)).not.toContain("Opening DM");
  });
  it.each([
    "@example.com",
    "name@",
    "me@example.com and you@example.com",
    "hello <me@example.com>",
    ".me@example.com",
    "me..you@example.com",
    "a@-example.com",
    "a@example-.com",
    "hello\nme@example.com",
  ])("does not incidentally collect %s", (input) => {
    expect(parseEmailReply(input)).toEqual({ kind: "invalid" });
  });
  it("normalizes email and recognizes opt-out commands", () => {
    expect(parseEmailReply(" Creator+Guide@Example.COM ")).toEqual({
      kind: "email",
      email: "creator+guide@example.com",
    });
    expect(parseEmailReply(" SKIP ")).toEqual({ kind: "skip" });
    expect(parseEmailReply("Unsubscribe")).toEqual({ kind: "stop" });
  });
  it("fails closed at the messaging window boundary and on future timestamps", () => {
    const now = new Date("2026-09-24T05:00:00Z");
    expect(
      messagingWindowOpen(new Date(now.getTime() - MESSAGING_WINDOW_MS), now),
    ).toBe(false);
    expect(messagingWindowOpen(new Date(now.getTime() + 1), now)).toBe(false);
    expect(messagingWindowOpen(new Date("invalid"), now)).toBe(false);
    expect(
      messagingWindowOpen(
        new Date(now.getTime() - MESSAGING_WINDOW_MS + 1),
        now,
      ),
    ).toBe(true);
  });
  it("requires a due reminder, a live window and no later reply", () => {
    const now = new Date("2026-09-24T05:00:00Z"),
      inboundAt = new Date("2026-09-24T04:00:00Z");
    const job = {
      inboundAt,
      latestInboundAt: inboundAt,
      dueAt: new Date("2026-09-24T04:30:00Z"),
      expiresAt: new Date("2026-09-25T04:00:00Z"),
    };
    expect(followUpEligible(job, now)).toBe(true);
    expect(
      followUpEligible(
        { ...job, latestInboundAt: new Date("2026-09-24T04:40:00Z") },
        now,
      ),
    ).toBe(false);
    expect(followUpEligible({ ...job, latestInboundAt: null }, now)).toBe(
      false,
    );
    expect(
      followUpEligible(
        { ...job, dueAt: new Date("2026-09-24T06:00:00Z") },
        now,
      ),
    ).toBe(false);
  });
});

import {
  parsePhoneReply,
  followUpConditionMatches,
} from "./automation-engagement-settings";
describe("phone capture and conditional follow-ups", () => {
  it.each(["+1 (415) 555-0123", "+33612345678", "441234567890"])(
    "accepts phone reply %s",
    (value) => expect(parsePhoneReply(value).kind).toBe("phone"),
  );
  it.each([
    "123",
    "email@example.com",
    "call 1234567890",
    "+000000000",
    "1234567890123456",
  ])("rejects incomplete phone reply %s", (value) =>
    expect(parsePhoneReply(value).kind).toBe("invalid"),
  );
  it.each(["STOP", "SKIP"])("preserves %s consent command", (value) =>
    expect(parsePhoneReply(value).kind).toBe(value.toLowerCase()),
  );
  const empty = {
    seen: false,
    reacted: false,
    clicked: false,
    baselineFollows: null,
    follows: null,
  };
  it.each(["FOLLOWED", "UNFOLLOWED"])(
    "never treats unknown status as %s",
    (c) => expect(followUpConditionMatches(c, empty)).toBe(false),
  );
  it("checks all eight behavior conditions", () => {
    expect(followUpConditionMatches("ALWAYS", empty)).toBe(true);
    expect(followUpConditionMatches("NOT_SEEN", empty)).toBe(true);
    expect(followUpConditionMatches("SEEN", { ...empty, seen: true })).toBe(
      true,
    );
    expect(
      followUpConditionMatches("REACTED", { ...empty, reacted: true }),
    ).toBe(true);
    expect(
      followUpConditionMatches("CLICKED", { ...empty, clicked: true }),
    ).toBe(true);
    expect(
      followUpConditionMatches("NOT_CLICKED", { ...empty, clicked: true }),
    ).toBe(false);
    expect(
      followUpConditionMatches("FOLLOWED", {
        ...empty,
        baselineFollows: false,
        follows: true,
      }),
    ).toBe(true);
    expect(
      followUpConditionMatches("UNFOLLOWED", {
        ...empty,
        baselineFollows: true,
        follows: false,
      }),
    ).toBe(true);
  });
});

it("sends only the configured contact prompt", () => {
  expect(emailRequestMessage("  Where should we send your guide?  ")).toBe("Where should we send your guide?");
});
