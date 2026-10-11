import { UiText } from "@/components/i18n/localized-copy";
import {
  getPendingInstagramAccountSelections,
  selectPendingInstagramAccount,
} from "@/actions/integration";
import InstagramAvatar from "@/components/dashboard/instagram-avatar";
import { dashboardPath } from "@/lib/dashboard";
import { isInstagramLoginEnabled } from "@/lib/instagram-login";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

async function Page(props: Props) {
  const params = await props.params;
  if (isInstagramLoginEnabled()) {
    redirect(`${dashboardPath(params.slug)}/integrations`);
  }

  const result = await getPendingInstagramAccountSelections();
  const accounts = result.data ?? [];

  if (!accounts.length) {
    redirect(`${dashboardPath(params.slug)}/integrations?integration_error=page_resolution_failed`);
  }

  return (
    <div className="flex justify-center p-4 text-slate-950 dark:text-slate-50 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl">
        <div className="rounded-3xl border border-slate-200 light:border-slate-300 bg-white p-6 shadow-sm dark:border-white/[0.12] dark:bg-white/[0.04]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-600 light:text-pink-700"><UiText>{" Legacy Meta connection "}</UiText></p>
          <h1 className="mt-2 text-3xl font-black tracking-tight"><UiText>{" Select an Instagram account "}</UiText></h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400"><UiText>{" This selector is only used by the legacy Facebook Login flow. The new Instagram Login flow connects the Instagram account directly and skips this step. "}</UiText></p>
        </div>

        <div className="mt-5 grid gap-4">
          {accounts.map((account) => (
            <form
              key={account.pageId}
              action={selectPendingInstagramAccount}
              className="rounded-3xl border border-slate-200 light:border-slate-300 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
            >
              <input type="hidden" name="pageId" value={account.pageId} />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <InstagramAvatar
                    src={account.profilePictureUrl}
                    username={account.instagramUsername}
                    label={account.pageName}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <p className="text-lg font-black text-slate-950 dark:text-white">
                      {account.instagramUsername ? `@${account.instagramUsername}` : account.pageName ?? "Instagram account"}
                    </p>
                    <div className="mt-3 grid gap-1 text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                      <span className="font-mono"><UiText>{" Instagram account ID: "}</UiText>{account.instagramBusinessAccountId || "Not available"}
                      </span>
                      <span className="font-mono"><UiText>{" Legacy linked Page ID: "}</UiText>{account.pageId}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-ap3k-gradient px-5 py-3 text-sm font-black text-white shadow-sm"
                ><UiText>{" Use this account "}</UiText></button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Page;
