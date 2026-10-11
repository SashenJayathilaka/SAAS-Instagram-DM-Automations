import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { dashboardPath } from "@/lib/dashboard";
import { client } from "@/lib/prisma";
import { INSTAGRAM_ACCOUNT_COOKIE } from "@/lib/instagram-account-scope";

// OAuth completion is rendered by a Server Component, which cannot set cookies.
// Finish selection here after validating the returned account against its owner.
export async function GET(request: NextRequest) {
  const auth = await currentUser();
  if (!auth) return NextResponse.redirect(new URL("/sign-in", request.url));
  const id = request.nextUrl.searchParams.get("integrationId");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(new URL("/dashboard", request.url));
  const integration = await client.integrations.findFirst({
    where: { id, User: { clerkId: auth.id }, name: "INSTAGRAM", planLocked: false },
    select: { id: true },
  });
  if (!integration) return NextResponse.redirect(new URL("/dashboard", request.url));
  const response = NextResponse.redirect(new URL(dashboardPath(auth.id), request.url));
  response.cookies.set(INSTAGRAM_ACCOUNT_COOKIE, integration.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 31536000 });
  return response;
}
