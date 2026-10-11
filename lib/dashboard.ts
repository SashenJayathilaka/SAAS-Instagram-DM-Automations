export function dashboardPath(clerkId?: string | null) {
  return clerkId ? `/dashboard/${encodeURIComponent(clerkId)}` : "/dashboard";
}

const SAFE_DASHBOARD_DESTINATIONS = new Set([
  "/automation",
  "/contacts",
  "/automation/new",
  "/automation/new?type=flow",
  "/billing",
  "/integrations",
  "/referrals",
  "/settings",
  "/settings#email-preferences",
]);

export function dashboardEntryPath(destination?: string | null) {
  return destination && SAFE_DASHBOARD_DESTINATIONS.has(destination)
    ? `/dashboard?next=${encodeURIComponent(destination)}`
    : "/dashboard";
}

export function dashboardDestinationPath(
  clerkId?: string | null,
  destination?: string | null
) {
  const safeDestination =
    destination && SAFE_DASHBOARD_DESTINATIONS.has(destination)
      ? destination
      : "";
  return `${dashboardPath(clerkId)}${safeDestination}`;
}
