import { describe, expect, it } from "vitest";
import {
  buildEmailTemplate,
  EMAIL_TEMPLATE_IDS,
  EMAIL_TEMPLATES,
  isEmailTemplateId,
} from "./catalog";

describe("AP3K email catalog", () => {
  it("defines every supported template with complete customer copy", () => {
    expect(EMAIL_TEMPLATE_IDS).toHaveLength(18);
    for (const id of EMAIL_TEMPLATE_IDS) {
      const template = EMAIL_TEMPLATES[id];
      const content = buildEmailTemplate(id, {}, "https://ap3k.com");
      expect(template.id).toBe(id);
      expect(content.subject.trim().length).toBeGreaterThan(5);
      expect(content.preview.trim().length).toBeGreaterThan(10);
      expect(content.headline.trim().length).toBeGreaterThan(5);
      expect(content.paragraphs.every(Boolean)).toBe(true);
      for (const cta of [content.cta, content.secondaryCta].filter(Boolean)) {
        expect(cta?.url).toMatch(/^https:\/\/ap3k\.com\//);
      }
    }
  });

  it("keeps sensitive event copy deterministic", () => {
    const sensitive = [
      "instagram_connected",
      "automation_activated",
      "automation_needs_attention",
      "instagram_reconnect",
      "usage_80_percent",
      "usage_limit_reached",
      "trial_ending",
      "plan_activated",
      "payment_failed",
      "subscription_canceled",
      "support_received",
      "support_reply",
    ] as const;
    expect(sensitive.every((id) => EMAIL_TEMPLATES[id].aiPersonalization === false)).toBe(true);
  });

  it("validates template identifiers without accepting arbitrary input", () => {
    expect(isEmailTemplateId("weekly_report")).toBe(true);
    expect(isEmailTemplateId("reset_every_password")).toBe(false);
    expect(isEmailTemplateId(undefined)).toBe(false);
  });

  it("routes every default CTA to the action promised by its label", () => {
    const expectedPrimaryUrls = {
      welcome: "/onboarding",
      connect_instagram: "/onboarding",
      instagram_connected: "/dashboard?next=%2Fautomation%2Fnew",
      automation_activated: "/dashboard?next=%2Fautomation",
      automation_needs_attention: "/dashboard?next=%2Fautomation",
      instagram_reconnect: "/dashboard?next=%2Fintegrations",
      usage_80_percent: "/dashboard?next=%2Fbilling",
      usage_limit_reached: "/dashboard?next=%2Fbilling",
      trial_ending: "/pricing",
      plan_activated: "/dashboard?next=%2Fbilling",
      payment_failed: "/dashboard?next=%2Fbilling",
      subscription_canceled: "/dashboard?next=%2Fbilling",
      referral_qualified: "/dashboard?next=%2Freferrals",
      referral_reward: "/dashboard?next=%2Freferrals",
      support_received: "/help",
      support_reply: "/help",
      weekly_report: "/dashboard",
      inactive_workspace: "/dashboard?next=%2Fautomation%2Fnew",
    } satisfies Record<(typeof EMAIL_TEMPLATE_IDS)[number], string>;

    for (const id of EMAIL_TEMPLATE_IDS) {
      expect(buildEmailTemplate(id, {}, "https://ap3k.com").cta?.url).toBe(
        `https://ap3k.com${expectedPrimaryUrls[id]}`
      );
    }

    const connected = buildEmailTemplate("instagram_connected", {}, "https://ap3k.com");
    expect(connected.secondaryCta?.url).toBe(
      "https://ap3k.com/dashboard?next=%2Fintegrations"
    );
    const support = buildEmailTemplate("support_reply", {}, "https://ap3k.com");
    expect(support.secondaryCta?.url).toBe("https://ap3k.com/dashboard");
  });
});
