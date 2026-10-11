import { getDashboardUser as onUserInfo } from "@/lib/dashboard-data";
import { getUserMonthlyUsage } from "@/actions/usage/queries";
import Billing from "@/components/global/billing";
import { getBillingLookup } from "@/lib/billing-snapshot";
import type { CustomerPlan } from "@/lib/billing-plans";
import { getStripeSecretKey } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const userResult = await onUserInfo();
  const user = userResult.status === 200 ? userResult.data : null;
  const currentPlan = (user?.subscription?.plan ?? "FREE") as CustomerPlan;
  const customerId = user?.subscription?.customerId ?? null;
  const stripeConfigured = Boolean(getStripeSecretKey());
  const [usage, billingLookup] = await Promise.all([
    user?.id ? getUserMonthlyUsage(user.id) : undefined,
    stripeConfigured && customerId
      ? getBillingLookup(customerId)
      : Promise.resolve({ state: customerId ? "unavailable" as const : "none" as const, snapshot: null }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-1 py-4 text-slate-950 dark:text-slate-50 sm:px-2 lg:py-6">
      <Billing
        current={currentPlan}
        usage={usage}
        billingState={billingLookup.state}
        billing={billingLookup.snapshot}
        billingReason={"reason" in billingLookup ? billingLookup.reason : undefined}
      />
    </div>
  );
}
