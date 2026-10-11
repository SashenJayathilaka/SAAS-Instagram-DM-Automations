import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  normalizeReferralCode,
} from "@/lib/referral-program";
import { createHash } from "node:crypto";
import { client } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const code = normalizeReferralCode(params.code);
  const destination = new URL("/sign-up", request.url);
  if (!code) return NextResponse.redirect(destination);

  const partner = await client.referralPartner.findFirst({
    where: { OR: [{ code }, { promoCode: code, promoEnabled: true }] },
    select: { id: true, promoCode: true },
  });
  const response = NextResponse.redirect(destination);
  if (!partner) return response;

  // Count a browser once per partner/day without storing IP addresses or user agents.
  const visitor =
    request.cookies.get("ap3k_ref_visitor")?.value || crypto.randomUUID();
  const visitorDayHash = createHash("sha256")
    .update(`${visitor}:${new Date().toISOString().slice(0, 10)}`)
    .digest("hex");
  await client.referralClick.upsert({
    where: {
      partnerId_visitorDayHash: { partnerId: partner.id, visitorDayHash },
    },
    create: { partnerId: partner.id, visitorDayHash },
    update: {},
  });
  response.cookies.set("ap3k_ref_visitor", visitor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  });
  response.cookies.set(
    REFERRAL_COOKIE,
    partner.promoCode === code ? `PROMO:${code}` : code,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    },
  );
  return response;
}
