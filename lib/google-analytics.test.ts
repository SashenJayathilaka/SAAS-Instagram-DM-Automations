import { describe, expect, it } from "vitest";
import { analyticsPage, analyticsReferrer, analyticsCampaign, googleTag, type GoogleWindow } from "./google-analytics";

describe("analytics data boundaries", () => {
  it("keeps approved campaign labels while rejecting arbitrary identifiers and secrets", () => {
    expect(analyticsCampaign("?utm_source=instagram&utm_medium=organic_social&utm_campaign=comment_dm_launch_kit&utm_content=reel_demo&email=private@example.com&token=secret")).toEqual({ campaign_source: "instagram", campaign_medium: "organic_social", campaign_name: "comment_dm_launch_kit", campaign_content: "reel_demo" });
    expect(analyticsCampaign("?utm_source=facebook&utm_medium=paid_social&utm_campaign=creator_pilot")).toEqual({ campaign_source: "facebook", campaign_medium: "paid_social", campaign_name: "creator_pilot" });
    expect(analyticsCampaign("?utm_source=private@example.com&utm_campaign=user_secret&utm_content=secret")).toEqual({});
  });
  it("redacts private account paths, queries and fragments", () => {
    expect(analyticsPage("/fr/dashboard/user_secret/inbox/thread_secret?email=private#message").path).toBe("/dashboard");
    expect(analyticsPage("/ap3k-admin-v2/users?email=private").path).toBe("/ap3k-admin-v2");
    expect(analyticsPage("/callback/instagram?code=secret").path).toBe("/callback");
    expect(analyticsPage("/blog/automate-instagram-dms-from-comments?email=private#section-1").path).toBe("/blog/automate-instagram-dms-from-comments");
  });
  it("preserves public locale paths and limits external referrers to origins", () => {
    expect(analyticsPage("/fr/pricing").path).toBe("/fr/pricing");
    expect(analyticsReferrer("https://google.com/search?q=private")).toBe("https://google.com");
    expect(analyticsReferrer("https://ap3k.com/dashboard/user_secret/inbox")).toBe("https://ap3k.com/dashboard");
    expect(analyticsReferrer("javascript:alert(1)")).toBe("");
  });
  it("queues early events and preserves an existing Google tag", () => {
    const win = {} as GoogleWindow;
    const tag = googleTag(win);
    tag("event", "signup_cta_clicked", { locale: "en" });
    expect(Array.from(win.dataLayer![0] as IArguments)).toEqual(["event", "signup_cta_clicked", { locale: "en" }]);
    expect(googleTag(win)).toBe(tag);
  });
});
