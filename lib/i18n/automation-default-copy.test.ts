import { describe, expect, it } from "vitest";
import { AUTOMATION_DEFAULT_COPY } from "./automation-default-copy";
import { translateUi } from "./translate";
import { DEFAULT_OPENING_DM_TEXT, DEFAULT_FOLLOW_REQUEST_DM_TEXT } from "../comment-dm-flow";
import { SUPPORTED_LOCALES } from "./config";

describe("localized automation suggestions", () => {
  it("provides every template in every supported non-English language", () => {
    for (const locale of SUPPORTED_LOCALES.filter(locale => locale !== "en")) {
      expect(Object.keys(AUTOMATION_DEFAULT_COPY[locale]!)).toHaveLength(11);
      for (const [source, translation] of Object.entries(AUTOMATION_DEFAULT_COPY[locale]!)) {
        expect(translation).not.toBe(source);
        expect(translateUi(source, locale)).toBe(translation);
      }
      for (const label of ["Get the Link", "Send me the link", "Following"]) {
        expect(Array.from(translateUi(label, locale)).length).toBeLessThanOrEqual(20);
      }
      expect(translateUi(DEFAULT_OPENING_DM_TEXT, locale)).toContain("\n\n");
      expect(translateUi(DEFAULT_FOLLOW_REQUEST_DM_TEXT, locale)).toContain("\n\n");
    }
  });
});
