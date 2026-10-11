import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getInstagramAvatarFallbackInitial } from "@/lib/instagram-avatar";

describe("InstagramAvatar", () => {
  const source = () => readFileSync(join(process.cwd(), "components/dashboard/instagram-avatar.tsx"), "utf8");

  it("renders an img branch when src exists", () => {
    const avatar = source();

    expect(avatar).toContain("const showImage = Boolean(safeSrc && !imageFailed)");
    expect(avatar).toContain("if (showImage)");
    expect(avatar).toContain("<img");
    expect(avatar).toContain("src={safeSrc ?? undefined}");
  });

  it("renders fallback branch when src is missing", () => {
    const avatar = source();

    expect(avatar).toContain("const fallback = getInstagramAvatarFallbackInitial(username, label)");
    expect(avatar).toContain("{fallback}");
    expect(avatar).toContain("grid place-items-center bg-ap3k-gradient");
  });

  it("fallback initial uses username before label", () => {
    expect(getInstagramAvatarFallbackInitial("@maglobal", "AP3K Page")).toBe("M");
  });

  it("fallback initial uses IG when username and label are missing", () => {
    expect(getInstagramAvatarFallbackInitial(null, null)).toBe("IG");
  });

  it("has a client-side onError path that hides failed images", () => {
    const avatar = source();

    expect(avatar).toContain("onError={() => setImageFailed(true)}");
    expect(avatar).toContain("const showImage = Boolean(safeSrc && !imageFailed)");
  });

  it("dashboard account surfaces use InstagramAvatar instead of raw profile img rendering", () => {
    const dashboard = readFileSync(join(process.cwd(), "app/(protected)/dashboard/[slug]/page.tsx"), "utf8");
    const account = readFileSync(join(process.cwd(), "app/(protected)/dashboard/[slug]/account/page.tsx"), "utf8");
    const review = readFileSync(join(process.cwd(), "components/dashboard/review-instagram-account-profile.tsx"), "utf8");
    const sidebar = readFileSync(join(process.cwd(), "components/global/sidebar/index.tsx"), "utf8");

    expect(dashboard).toContain("<InstagramAvatar");
    expect(account).toContain("<InstagramAvatar");
    expect(review).toContain("<InstagramAvatar");
    expect(sidebar).toContain("<InstagramAccountSwitcher");
    expect(readFileSync("components/dashboard/instagram-account-switcher.tsx", "utf8")).toContain("<InstagramAvatar");
    expect(dashboard).not.toContain("@next/next/no-img-element");
    expect(account).not.toContain("@next/next/no-img-element");
    expect(review).not.toContain("@next/next/no-img-element");
    expect(sidebar).not.toContain("@next/next/no-img-element");
  });
});
