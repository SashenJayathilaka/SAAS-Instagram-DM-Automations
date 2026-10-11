import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { dashboardDestinationPath } from "@/lib/dashboard";
import { getAuthenticatedHomeRedirect } from "@/lib/authenticated-home-redirect";
import {
  LOCALE_COOKIE,
  isEnglishOnlyArticle,
  browserLocale,
  isLocale,
  localizePublicPath,
  isProtectedPath,
  localeFromPath,
  stripLocaleFromPath,
  resolveRequestLocale,
  retiredLocaleFromPath,
  stripRetiredLocaleFromPath,
} from "@/lib/i18n/config";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/admin(.*)",
  "/ap3k-admin(.*)",
  "/api/payment(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const requestedPath = req.nextUrl.pathname;
  const retiredLocale = retiredLocaleFromPath(requestedPath);
  if (retiredLocale) {
    const destination = req.nextUrl.clone();
    destination.pathname = stripRetiredLocaleFromPath(requestedPath);
    const response = NextResponse.redirect(destination, 308);
    response.cookies.set(LOCALE_COOKIE, "en", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }
  const pathLocale = localeFromPath(requestedPath);
  const pathname = stripLocaleFromPath(requestedPath);

  // No translated document exists for these articles. Keep one public URL.
  if (pathLocale && isEnglishOnlyArticle(pathname)) {
    const destination = req.nextUrl.clone();
    destination.pathname = pathname;
    return NextResponse.redirect(destination, 308);
  }

  const savedLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  const browserPreference = browserLocale(req.headers.get("accept-language"));
  const firstVisit = !isEnglishOnlyArticle(pathname) && !isLocale(savedLocale) && !pathLocale
    && !/\.[^/]+$/.test(pathname)
    && req.method === "GET" && !/^\/(api|callback|payment|media|r)(?:\/|$)/.test(pathname)
    && !/bot|crawler|spider|slurp/i.test(req.headers.get("user-agent") || "")
    && !req.headers.has("next-router-prefetch") && req.headers.get("purpose") !== "prefetch";
  if (firstVisit && !isProtectedPath(pathname) && browserPreference !== "en") {
    const destination = req.nextUrl.clone();
    destination.pathname = localizePublicPath(pathname, browserPreference);
    const response = NextResponse.redirect(destination);
    response.headers.set("Vary", "Accept-Language, Cookie");
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(LOCALE_COOKIE, browserPreference, { path: "/", maxAge: 31536000, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  }

  if (pathname === "/") {
    const { userId } = await auth();
    const destination = getAuthenticatedHomeRedirect(pathname, userId);

    if (destination) {
      return NextResponse.redirect(new URL(destination, req.url));
    }
  }

  if (pathLocale && isProtectedPath(pathname)) {
    const destination = req.nextUrl.clone();
    destination.pathname = pathname;
    const response = NextResponse.redirect(destination);
    response.cookies.set(LOCALE_COOKIE, pathLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  if (isProtectedRoute(req)) await auth.protect();

  // Resolve the entry URL from the verified session at the edge. Loading the
  // provisioning page first cold-started a second server function on every login.
  // The destination layout still checks ownership and sends missing workspaces
  // through onboarding, where profile creation and welcome delivery belong.
  if (pathname === "/dashboard" && req.method === "GET") {
    const { userId } = await auth();
    if (userId) {
      const response = NextResponse.redirect(new URL(
        dashboardDestinationPath(userId, req.nextUrl.searchParams.get("next")), req.url
      ));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  const locale = resolveRequestLocale(requestedPath, firstVisit ? browserPreference : savedLocale);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-ap3k-locale", locale);
  requestHeaders.set("x-ap3k-request-path", requestedPath);

  if (pathLocale) {
    const destination = req.nextUrl.clone();
    destination.pathname = pathname;
    const response = NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
    return response;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (firstVisit) response.cookies.set(LOCALE_COOKIE, browserPreference, { path: "/", maxAge: 31536000, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|mp4|webm|avif|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
