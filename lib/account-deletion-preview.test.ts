import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("account deletion Preview QA safety", () => {
  it("exposes the visual QA page only on authenticated Vercel Preview deployments", () => {
    const page = source("app/(protected)/account-deletion-preview/page.tsx");

    expect(page).toContain('process.env.VERCEL_ENV !== "preview"');
    expect(page).toContain("const user = await currentUser()");
    expect(page).toContain('redirect("/sign-in")');
    expect(page).toContain("<DeleteAccountButton email={email} visualOnly />");
  });

  it("hard-disables deletion requests in visual-only mode", () => {
    const button = source("components/settings/delete-account-button.tsx");

    expect(button).toContain(
      "if (visualOnly || !confirmationMatches || isDeleting) return;"
    );
    expect(button).toContain(
      "disabled={visualOnly || !confirmationMatches || isDeleting}"
    );
    expect(button).toContain("Preview only — deletion disabled");
  });
});
