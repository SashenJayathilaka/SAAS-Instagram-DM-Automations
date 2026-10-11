import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ap3kFormControlClass, nextThemeMode, normalizeThemeMode } from "./theme-mode";

describe("theme mode helpers", () => {
  it("uses light mode for visitors without a saved preference", () => {
    const layout = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");
    expect(layout).toContain('defaultTheme="light"');
    expect(layout).toContain("enableSystem={false}");
  });

  it("normalizes unsupported values to system", () => {
    expect(normalizeThemeMode("dark")).toBe("dark");
    expect(normalizeThemeMode("light")).toBe("light");
    expect(normalizeThemeMode("system")).toBe("system");
    expect(normalizeThemeMode("unexpected")).toBe("system");
    expect(normalizeThemeMode(undefined)).toBe("system");
  });

  it("cycles the compact theme toggle between dark and light", () => {
    expect(nextThemeMode("dark")).toBe("light");
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("system")).toBe("dark");
    expect(nextThemeMode("bad-value")).toBe("dark");
  });

  it("returns dark-safe AP3K form classes", () => {
    expect(ap3kFormControlClass("input")).toBe("ap3k-input");
    expect(ap3kFormControlClass("textarea")).toBe("ap3k-textarea");
    expect(ap3kFormControlClass("select")).toBe("ap3k-select");
  });
});
