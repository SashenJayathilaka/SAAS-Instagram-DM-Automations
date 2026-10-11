import { PricingPlan } from "@/types/types";
import { PLAN_CARDS } from "@/lib/billing-plans";

export const pricingPlans: PricingPlan[] = PLAN_CARDS.map((plan) => ({
  name: plan.name,
  description: plan.description,
  price: `$${plan.monthlyPrice}/mo`,
  features: plan.features.map((text) => ({ icon: "/bimi/ap3k-logo.svg", text })),
}));
