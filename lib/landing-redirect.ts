import { dashboardPath } from "@/lib/dashboard";
import { getCanonicalInstagramIntegration, type InstagramIntegrationStatusBase } from "@/lib/instagram-integration-status";

export type LandingRedirectUser = {
  id: string;
} | null;

export type LandingRedirectProfile = {
  clerkId: string | null;
  integrations?: InstagramIntegrationStatusBase[] | null;
  automations?: unknown[] | null;
} | null;

export function getAuthenticatedLandingRedirect(
  user: LandingRedirectUser,
  profile: LandingRedirectProfile,
  options: { onboardingPath?: string } = {}
) {
  if (!user) return null;
  if (profile?.clerkId) {
    const instagram = getCanonicalInstagramIntegration(profile.integrations);
    if (!instagram) return options.onboardingPath ?? "/onboarding";
    if (!profile.automations?.length) return "/onboarding/complete";
    return dashboardPath(profile.clerkId);
  }
  return options.onboardingPath ?? "/onboarding";
}
