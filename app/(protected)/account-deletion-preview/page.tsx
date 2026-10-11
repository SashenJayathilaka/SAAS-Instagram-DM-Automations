import { UiText } from "@/components/i18n/localized-copy";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountDeletionPreviewPage() {
  if (process.env.VERCEL_ENV !== "preview") {
    notFound();
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    "";

  if (!email) {
    notFound();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-950 dark:text-rf-text">
      <div className="pointer-events-none absolute inset-0 bg-ap3k-radial" />
      <section className="relative z-10 w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f172a]/78 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-300"><UiText>{" Preview visual QA "}</UiText></p>
        <h1 className="mt-2 text-3xl font-black tracking-tight"><UiText>{" Account deletion confirmation "}</UiText></h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-rf-muted"><UiText>{" This authenticated Preview-only page renders the production deletion dialog without requiring an Instagram connection. The final destructive request is hard-disabled. "}</UiText></p>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 p-5 dark:border-red-500/25 dark:bg-red-500/[0.07]">
          <p className="text-sm font-black text-red-800 dark:text-red-200"><UiText>{"Danger zone"}</UiText></p>
          <p className="mt-2 text-sm leading-relaxed text-red-700 dark:text-red-200/80"><UiText>{" Open the dialog to review its warning, account-specific confirmation text, spacing, and mobile behavior. No deletion can be submitted from this page. "}</UiText></p>
          <div className="mt-4">
            <DeleteAccountButton email={email} visualOnly />
          </div>
        </div>
      </section>
    </main>
  );
}
