import { describe, expect, it } from "vitest";
import { collectAiLinkOptions, parseAiDmModelReply } from "./ai-dm-links";

describe("AI DM link buttons", () => {
  it("builds a deduplicated allowlist only from owner-provided URLs", () => {
    const options = collectAiLinkOptions([
      { title: "Official links", content: "Start at https://ap3k.com/sign-up and see https://ap3k.com/pricing." },
      { title: "Duplicate", content: "Again: https://ap3k.com/sign-up" },
    ], "Help: https://ap3k.com/help");

    expect(options.map((item) => ({ url: item.url, label: item.defaultLabel }))).toEqual([
      { url: "https://ap3k.com/sign-up", label: "Get Started" },
      { url: "https://ap3k.com/pricing", label: "View Pricing" },
      { url: "https://ap3k.com/help", label: "Get Help" },
    ]);
  });

  it("maps the model's opaque link id to a validated Instagram button", () => {
    const options = collectAiLinkOptions([{ title: "Signup", content: "https://ap3k.com/sign-up" }]);
    const result = parseAiDmModelReply(
      JSON.stringify({ reply: "You can create your account now.", linkId: "link_1", buttonLabel: "GET STARTED" }),
      options
    );

    expect(result).toEqual({
      reply: "You can create your account now.",
      linkButton: { label: "GET STARTED", url: "https://ap3k.com/sign-up" },
    });
  });

  it("promotes an approved raw URL to a button and removes it from the bubble", () => {
    const options = collectAiLinkOptions([{ title: "Pricing", content: "https://ap3k.com/pricing" }]);
    const result = parseAiDmModelReply("See the plans here: https://ap3k.com/pricing", options);

    expect(result).toEqual({
      reply: "See the plans here:",
      linkButton: { label: "View Pricing", url: "https://ap3k.com/pricing" },
    });
  });

  it("never turns a hallucinated destination into a button", () => {
    const options = collectAiLinkOptions([{ title: "Signup", content: "https://ap3k.com/sign-up" }]);
    const result = parseAiDmModelReply(
      JSON.stringify({ reply: "Use this page https://evil.example/phish", linkId: "link_99", buttonLabel: "Open" }),
      options
    );

    expect(result).toEqual({ reply: "Use this page" });
  });
});
