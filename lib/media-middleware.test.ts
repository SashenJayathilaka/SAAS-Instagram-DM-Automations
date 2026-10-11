import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("skips static demo media while retaining dashboard and API middleware", () => {
  const source = readFileSync("middleware.ts", "utf8");
  const literals = Array.from(source.slice(source.indexOf("export const config")).matchAll(/"(?:[^"\\]|\\.)*"/g)).map(match => JSON.parse(match[0]) as string);
  const matchers = literals.map(pattern => new RegExp(`^${pattern}$`));
  const matches = (path: string) => matchers.some(pattern => pattern.test(path));
  for (const path of ["/media/demo.mp4", "/media/demo.webm", "/media/poster.avif"]) expect(matches(path)).toBe(false);
  for (const path of ["/dashboard", "/dashboard/accounts", "/admin/overview", "/api/payment", "/api/test.mp4", "/fr"]) expect(matches(path)).toBe(true);
});
