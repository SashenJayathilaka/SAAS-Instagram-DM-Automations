import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FadeIn, ReadableReveal, ScaleIn, StaggerContainer, StaggerItem } from "./fade-in";

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("framer-motion", async (importOriginal) => ({
  ...await importOriginal<typeof import("framer-motion")>(),
  useReducedMotion: () => preference.reduced,
}));

describe("readable content before browser animations", () => {
  it("ships visible content without JavaScript or a viewport intersection", () => {
    const markup = renderToStaticMarkup(<ReadableReveal>Read this tutorial</ReadableReveal>);
    expect(markup).toContain("Read this tutorial");
    expect(markup).not.toMatch(/opacity:\s*0(?:[;"\s])|visibility:\s*hidden|display:\s*none/);
  });

  it("keeps public sections crawlable and readable if hydration or observers fail", () => {
    const markup = renderToStaticMarkup(<>
      <FadeIn>Approved heading</FadeIn>
      <ScaleIn>Approved explanation</ScaleIn>
      <StaggerContainer><StaggerItem>Approved linked content</StaggerItem></StaggerContainer>
    </>);
    expect(markup).not.toMatch(/opacity:\s*0(?:[;"\s])|visibility:\s*hidden|display:\s*none/);
    expect(markup).toContain("Approved linked content");
  });

  it("removes decorative starting transforms for reduced motion", () => {
    preference.reduced = true;
    try {
      const markup = renderToStaticMarkup(<>
        <FadeIn>Heading</FadeIn><ReadableReveal>Article</ReadableReveal>
        <ScaleIn>Preview</ScaleIn>
        <StaggerContainer><StaggerItem>Step</StaggerItem></StaggerContainer>
      </>);
      expect(markup).not.toMatch(/transform:|opacity:\s*0(?:[;"\s])/);
      expect(markup).toContain("Article");
    } finally {
      preference.reduced = false;
    }
  });
});
