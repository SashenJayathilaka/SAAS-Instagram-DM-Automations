import { UiText } from "@/components/i18n/localized-copy";
import { onUserInfo, skipOnboarding } from "@/actions/user";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import AP3KLogo from "@/components/global/ap3k-logo";

const onboardingSkippedCookie = (clerkId: string) =>
  `ap3k_onboarding_skipped_${clerkId}`;

export default async function OnboardingWelcomePage() {
  const appReviewMode = isAppReviewMode();
  const user = await onUserInfo();

  const instagram = getCanonicalInstagramIntegration(user.status === 200 ? user.data?.integrations : null);

  if (instagram) {
    redirect("/onboarding/complete");
  }

  if (
    user.status === 200 &&
    user.data?.clerkId &&
    (await cookies()).get(onboardingSkippedCookie(user.data.clerkId))?.value === "true"
  ) {
    redirect("/dashboard");
  }

  const firstName = user.data?.firstname ?? "there";
  const slug = user.data?.clerkId ?? "";

  return (
    <div className="text-center">
      <AP3KLogo showText={false} markClassName="mx-auto mb-6 h-16 w-16 rounded-2xl text-sm" />

      <h1 className="text-3xl font-black tracking-tight mb-3"><UiText>{" Welcome to AP3K, "}</UiText>{firstName}
      </h1>
      <p className="mb-10 leading-relaxed text-slate-600 dark:text-rf-muted"><UiText>{" It takes 60 seconds to set up your first automation."}</UiText><br /><UiText>{" Let's connect your Instagram and launch it now. "}</UiText></p>

      <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
        {[
          { icon: "💬", label: "Comment" },
          { icon: "→", label: null },
          { icon: "✉️", label: "Reply sent" },
          { icon: "→", label: null },
          { icon: "🎯", label: "Lead captured" },
        ].map((item, i) => item.label ? (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xl dark:border-white/10 dark:bg-white/[0.04]">
              {item.icon}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-rf-muted"><UiText>{item.label}</UiText></span>
          </div>
        ) : (
          <span key={i} className="text-rf-subtle text-xl mb-4">{item.icon}</span>
        ))}
      </div>

      <Link
        href={`/dashboard/${slug}/integrations`}
        className="ap3k-gradient-button block w-full py-3.5 text-sm"
      ><UiText>{" Let's connect your Instagram → "}</UiText></Link>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:text-rf-muted"><UiText>{" What happens next "}</UiText></p>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-rf-muted">
          <li><UiText>{"1. Meta opens its official permission screen."}</UiText></li>
          <li><UiText>{"2. Choose the Instagram Business or Creator account that owns your posts."}</UiText></li>
          <li><UiText>{"3. AP3K listens for comments through Meta's API. No password sharing, no scraping."}</UiText></li>
        </ul>
      </div>

      <form action={skipOnboarding}>
        <button
          type="submit"
          className="block w-full mt-3 text-xs text-slate-500 hover:text-slate-950 transition-colors dark:text-rf-muted dark:hover:text-rf-text"
        ><UiText>{" I'll explore first "}</UiText></button>
      </form>
    </div>
  );
}
