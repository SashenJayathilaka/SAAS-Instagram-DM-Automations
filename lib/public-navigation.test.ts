import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("public website navigation", () => {
  const source = readFileSync(
    join(process.cwd(), "components/global/website-nav/index.tsx"),
    "utf8"
  );

  it("does not advertise the protected dashboard to signed-out visitors", () => {
    expect(source).not.toContain('href="/dashboard"');
  });

  it("keeps the public authentication actions available", () => {
    expect(source).toContain('href={href("/sign-in")}');
    expect(source).toContain('href={href("/sign-up")}');
    expect(source).toContain("<LanguageSwitcher");
  });
});
