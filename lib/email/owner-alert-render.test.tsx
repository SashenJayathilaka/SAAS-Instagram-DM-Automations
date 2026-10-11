import { describe, expect, it } from "vitest";
import { renderAp3kEmail } from "./render";
import { ownerAlertContent, OWNER_ALERT_LABELS, type OwnerAlertKind } from "./owner-alert-content";

describe("owner alert email rendering", () => {
  it("renders every owner event with branding, plain text, escaped customer data, and the correct admin destination", async () => {
    for (const kind of Object.keys(OWNER_ALERT_LABELS) as OwnerAlertKind[]) {
      const content = ownerAlertContent({ kind, key: "example", userId: "customer-id", email: "customer@example.com", name: '<script>alert("unsafe")</script>', amount: 900, currency: "usd", plan: "PRO", occurredAt: "2026-09-20T12:00:00Z" });
      const rendered = await renderAp3kEmail({ templateId: "welcome", contentOverride: content, appUrl: "https://ap3k.com", recipientHint: "owner@example.com" });
      expect(rendered.html).toContain("/brand/ap3k-social-avatar.png");
      expect(rendered.html).toContain('href="https://ap3k.com/admin/users/customer-id"');
      expect(rendered.html).not.toContain('<script>alert("unsafe")</script>');
      expect(rendered.text.toLowerCase()).toContain(OWNER_ALERT_LABELS[kind].toLowerCase());
      expect(rendered.text).toContain("customer@example.com");
    }
  });
});
