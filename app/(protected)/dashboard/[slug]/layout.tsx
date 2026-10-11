import { getInstagramAccountMenu } from "@/actions/instagram-accounts";
import MobileNavigation from "@/components/dashboard/mobile-navigation";
import Sidebar from "@/components/global/sidebar";
import { getDashboardUser as onUserInfo } from "@/lib/dashboard-data";
import { dashboardPath } from "@/lib/dashboard";
import { ClerkCacheSyncer } from "@/providers/clerk-cache-syncer";
import { TimeZoneProvider } from "@/providers/time-zone-provider";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

export const metadata: Metadata = {
  title: "Dashboard — AP3K",
  description: "Monitor Instagram automations, replies, leads, and delivery logs.",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

async function Layout(props: Props) {
  const params = await props.params;

  const {
    children
  } = props;

  const [userResult, accountMenu] = await Promise.all([onUserInfo(), getInstagramAccountMenu()]);

  // A valid Clerk session can briefly exist before AP3K provisions its local row,
  // especially after an account is deleted and recreated with the same email.
  if (userResult.status === 404) {
    redirect("/onboarding");
  }

  const currentClerkId = userResult.status === 200 ? userResult.data?.clerkId : null;
  const profile = userResult.status === 200 ? userResult.data : null;

  if (!currentClerkId) {
    redirect("/sign-in");
  }

  if (params.slug !== currentClerkId) {
    console.warn("[tenant-denied]", {
      route: "/dashboard/[slug]",
      currentUserExists: true,
      targetResourceExists: Boolean(params.slug),
      ownershipMatch: false,
      resource: "DashboardSlug",
    });
    redirect(dashboardPath(currentClerkId));
  }

  const query = new QueryClient();

  // Reuse the authenticated result instead of fetching the same profile again.
  // Screens fetch their own automation data; unrelated routes need not wait for it.
  query.setQueryData(["user-profile", currentClerkId], userResult);
  query.setQueryData(["instagram-account-menu", currentClerkId], accountMenu);

  return (
    <HydrationBoundary state={dehydrate(query)}>
      <TimeZoneProvider initialTimeZone={profile?.timeZone} initialAutomatic={profile?.timeZoneAuto}>
      <ClerkCacheSyncer />
      <div className="ap3k-page overflow-x-hidden">
        <Sidebar slug={params.slug} />
        <MobileNavigation slug={params.slug} />
        <div className="ap3k-app-shell [--app-sidebar-offset:0px] lg:[--app-sidebar-offset:76px] lg:peer-data-[expanded=true]:[--app-sidebar-offset:232px] relative z-10 flex min-w-0 flex-col px-3 pb-20 pt-3 transition-[margin] duration-base ease-ui-out lg:ml-[76px] lg:px-6 lg:py-5 lg:peer-data-[expanded=true]:ml-[232px]">
          {children}
        </div>
      </div>
      </TimeZoneProvider>
    </HydrationBoundary>
  );
}

export default Layout;
