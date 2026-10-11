import { getDashboardUser as onUserInfo } from "@/lib/dashboard-data";
import ReferralDashboard from "@/components/referrals/referral-dashboard";
import { getApplicationUrl } from "@/lib/app-url";
import { FOUNDING_PARTNER_LIMIT, getReferralDashboard } from "@/lib/referral-program";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const userResult = await onUserInfo();
  const user = userResult.status === 200 ? userResult.data : null;
  if (!user?.id) redirect("/sign-in");
  const dashboard = await getReferralDashboard(user.id);
  return <ReferralDashboard dashboard={dashboard} inviteUrl={`${getApplicationUrl()}/r/${dashboard.code}`} foundingPartnerLimit={FOUNDING_PARTNER_LIMIT} />;
}
