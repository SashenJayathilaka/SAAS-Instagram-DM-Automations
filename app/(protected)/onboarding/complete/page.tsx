import ChoosePlan from "@/components/onboarding/choose-plan";
import { UiText } from "@/components/i18n/localized-copy";
import { onUserInfo } from "@/actions/user";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function OnboardingCompletePage() {
  const user = await onUserInfo();
  const slug = user.data?.clerkId ?? "";
  const instagram = getCanonicalInstagramIntegration(user.status === 200 ? user.data?.integrations : null);

  if (!instagram) {
    redirect("/onboarding");
  }

  return <ChoosePlan slug={slug} paid={["PRO", "BUSINESS"].includes(user.data?.subscription?.plan ?? "FREE")} />;
}
