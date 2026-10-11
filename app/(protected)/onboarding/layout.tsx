import { UiText } from "@/components/i18n/localized-copy";
import { ensureCurrentUserProfile } from "@/actions/user";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const profile = await ensureCurrentUserProfile();

  if (profile.status === 401) {
    redirect("/sign-in");
  }

  const profileReady = profile.status === 200 || profile.status === 201;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 text-slate-950 dark:bg-[#050816] dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-ap3k-radial" />
      <div className="relative z-10 w-full mx-auto max-w-2xl has-[#choose-plan-title]:max-w-6xl rounded-3xl bg-white p-2 dark:bg-[#0f172a] sm:p-8">
        {profileReady ? (
          children
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
            <h1 className="text-xl font-black"><UiText>{"AP3K workspace setup failed"}</UiText></h1>
            <p className="mt-2 text-sm leading-relaxed"><UiText>{" Your sign-in is valid, but AP3K could not prepare your workspace. Refresh once. If the problem continues, contact support before connecting Instagram. "}</UiText></p>
          </div>
        )}
      </div>
    </div>
  );
}
