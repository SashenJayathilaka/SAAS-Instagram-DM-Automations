import { describe, it, expect } from "vitest";
import { resolveTemplate } from "./template";

describe("resolveTemplate", () => {
  it("replaces {{username}}", () => {
    expect(resolveTemplate("Hey {{username}}!", { username: "john_doe" })).toBe("Hey john_doe!");
  });

  it("replaces {{first_name}}", () => {
    expect(resolveTemplate("Hi {{first_name}}", { first_name: "Jane" })).toBe("Hi Jane");
  });

  it("replaces {{keyword}}", () => {
    expect(resolveTemplate("You typed {{keyword}}", { keyword: "GUIDE" })).toBe("You typed GUIDE");
  });

  it("replaces {{link}}", () => {
    expect(resolveTemplate("Get it here: {{link}}", { link: "https://example.com/guide" })).toBe(
      "Get it here: https://example.com/guide"
    );
  });

  it("replaces all four variables in one string", () => {
    const result = resolveTemplate(
      "Hi {{first_name}} (@{{username}}), you said {{keyword}}. Here: {{link}}",
      { first_name: "Alex", username: "alex_ig", keyword: "PRICE", link: "https://go.com" }
    );
    expect(result).toBe("Hi Alex (@alex_ig), you said PRICE. Here: https://go.com");
  });

  it("replaces multiple occurrences of the same variable", () => {
    expect(
      resolveTemplate("{{first_name}}, hi {{first_name}}!", { first_name: "Sam" })
    ).toBe("Sam, hi Sam!");
  });

  it("substitutes empty string for missing variables", () => {
    expect(resolveTemplate("Hey {{username}}", {})).toBe("Hey ");
  });

  it("is case-insensitive for variable names", () => {
    expect(
      resolveTemplate("{{USERNAME}} and {{First_Name}}", { username: "u1", first_name: "F1" })
    ).toBe("u1 and F1");
  });

  it("returns the template unchanged when no variables present", () => {
    expect(resolveTemplate("Hello world! No vars here.", {})).toBe("Hello world! No vars here.");
  });

  it("handles empty template string", () => {
    expect(resolveTemplate("", { username: "x" })).toBe("");
  });
});
