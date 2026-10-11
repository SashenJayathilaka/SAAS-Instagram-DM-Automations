import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/providers/i18n-provider", () => ({
  useI18n: () => ({ locale: "en", t: (key: string) => key }),
}));

import WebsiteFooter from ".";

describe("website footer", () => {
  it("keeps a focused navigation and links every official social profile", () => {
    const html = renderToStaticMarkup(<WebsiteFooter />);

    for (const href of [
      "https://www.linkedin.com/company/ap3kautomation",
      "https://www.facebook.com/ap3kautomation/",
      "https://www.youtube.com/@AP3Kautomation",
      "https://www.instagram.com/ap3kautomation",
    ]) expect(html).toContain(`href="${href}"`);

    expect(html).toContain("support@ap3k.com");
    expect(html).toContain("refund-policy");
    expect(html).not.toContain("popularGuides");
  });
});
