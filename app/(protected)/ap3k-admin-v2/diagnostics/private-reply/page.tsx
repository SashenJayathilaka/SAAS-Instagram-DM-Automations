import Link from "next/link";
import { PrivateReplyPreflightForm } from "@/components/admin-v2/private-reply-preflight-form";
import { V2Badge } from "@/components/admin-v2/v2-badge";
import { getPrivateReplyPreflightPageData } from "@/lib/admin-v2/private-reply-preflight";
import { isMessagingReviewMode } from "@/lib/messaging-review-mode";

type Props = {
  searchParams?: Promise<{
    integrationId?: string;
  }>;
};

function diagnosticTone(value: boolean | null) {
  if (value === true) return "green" as const;
  if (value === false) return "red" as const;
  return "amber" as const;
}
export default async function PrivateReplyPreflightPage(props: Props) {
  const searchParams = await props.searchParams;
  const messagingReviewMode = isMessagingReviewMode();
  const pageData = await getPrivateReplyPreflightPageData(
    searchParams?.integrationId
  );
  const diagnostics = pageData.diagnostics;
  const tokenExpired = Boolean(
    diagnostics?.tokenExpiry &&
      new Date(diagnostics.tokenExpiry).getTime() <= Date.now()
  );
  const canSend = Boolean(
    messagingReviewMode &&
      pageData.selectedAccount &&
      diagnostics?.instagramIdPresent &&
      diagnostics.tokenPresent &&
      !tokenExpired &&
      diagnostics.messagingScopeDetected !== false
  );
  const disabledReason = !messagingReviewMode
    ? "Messaging review mode is off. Set NEXT_PUBLIC_MESSAGING_REVIEW_MODE=true and restart the app."
    : !pageData.selectedAccount
      ? "No connected Facebook Login Instagram integration is available."
      : !diagnostics?.instagramIdPresent
        ? "The selected integration has no Instagram ID."
        : !diagnostics.tokenPresent
          ? "The selected integration has no stored Page token."
          : tokenExpired
            ? "The stored Page token is expired. Reconnect the account."
            : diagnostics.messagingScopeDetected === false
              ? "instagram_manage_messages was not detected on this token. Reconnect the account after enabling messaging review mode."
              : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest text-pink-700 dark:text-pink-400">
          Diagnostics · Private messaging preflight only
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Instagram Private Reply Preflight
        </h1>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground dark:text-slate-400">
          Sends one isolated Meta API request using{" "}
          <code className="text-slate-800 dark:text-slate-300">recipient.comment_id</code>. It does
          not run campaign, webhook, public reply, billing, or product
          automation logic.
        </p>
      </div>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <V2Badge tone={messagingReviewMode ? "green" : "red"}>
            Messaging flag {messagingReviewMode ? "on" : "off"}
          </V2Badge>
          <V2Badge tone="amber">Do not submit App Review yet</V2Badge>
        </div>
        <h2 className="mt-3 text-sm font-black text-amber-800 dark:text-amber-200">
          Reconnect is mandatory after enabling the messaging scope
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-100/70">
          Previously stored Page tokens must not be assumed to contain{" "}
          <code>instagram_manage_messages</code>. Set the flag, restart AP3K,
          reconnect this Facebook Login account, then return here and verify the
          detected scope before sending.
        </p>
        {pageData.reconnectUrl && (
          <Link
            href={pageData.reconnectUrl}
            className="mt-3 inline-flex rounded-lg border border-amber-400/30 px-3 py-1.5 text-xs font-black text-amber-800 dark:text-amber-200 hover:bg-amber-400/10"
          >
            Reconnect selected account
          </Link>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.025] p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
            1. Connected integration/account
          </h2>
          {pageData.accounts.length > 0 ? (
            <form
              method="get"
              action="/ap3k-admin-v2/diagnostics/private-reply"
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <select
                name="integrationId"
                defaultValue={pageData.selectedAccount?.id}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b1020] px-3 py-2.5 text-sm text-slate-950 dark:text-white focus:border-pink-500 focus:outline-none"
              >
                {pageData.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label}
                    {account.ownerEmail ? ` · ${account.ownerEmail}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2.5 text-xs font-black text-slate-800 dark:text-slate-300 hover:border-slate-200 dark:hover:border-white/20 hover:text-slate-950 dark:hover:text-white"
              >
                Load diagnostics
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No connected Instagram integrations found.
            </p>
          )}

          {diagnostics && (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Integration status
                </dt>
                <dd className="mt-1">
                  <V2Badge
                    tone={
                      diagnostics.integrationStatus === "CONNECTED"
                        ? "green"
                        : "amber"
                    }
                  >
                    {diagnostics.integrationStatus}
                  </V2Badge>
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Connected username
                </dt>
                <dd className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                  {diagnostics.connectedUsername
                    ? `@${diagnostics.connectedUsername}`
                    : "Unknown"}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Instagram ID present
                </dt>
                <dd className="mt-1">
                  <V2Badge tone={diagnosticTone(diagnostics.instagramIdPresent)}>
                    {diagnostics.instagramIdPresent ? "Yes" : "No"}
                  </V2Badge>
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Page token present
                </dt>
                <dd className="mt-1">
                  <V2Badge tone={diagnosticTone(diagnostics.tokenPresent)}>
                    {diagnostics.tokenPresent ? "Yes" : "No"}
                  </V2Badge>
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  Token expiry
                </dt>
                <dd className="mt-1 text-xs text-slate-800 dark:text-slate-300">
                  {diagnostics.tokenExpiry
                    ? new Date(diagnostics.tokenExpiry).toLocaleString()
                    : "Unknown"}
                  {tokenExpired && (
                    <span className="ml-2 font-black text-red-700 dark:text-red-300">Expired</span>
                  )}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] p-3">
                <dt className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                  instagram_manage_messages
                </dt>
                <dd className="mt-1">
                  <V2Badge
                    tone={diagnosticTone(
                      diagnostics.messagingScopeDetected
                    )}
                  >
                    {diagnostics.messagingScopeDetected === true
                      ? "Detected"
                      : diagnostics.messagingScopeDetected === false
                        ? "Missing"
                        : "Not detectable"}
                  </V2Badge>
                </dd>
              </div>
            </dl>
          )}

          {diagnostics?.grantedScopes.length ? (
            <div className="mt-4 rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-100/80 dark:bg-black/10 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                Detected granted scopes
              </p>
              <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted-foreground dark:text-slate-400">
                {diagnostics.grantedScopes.join(", ")}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.025] p-5">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-slate-200">
            2. Send exactly one private reply
          </h2>
          {pageData.selectedAccount ? (
            <div className="mt-4">
              <PrivateReplyPreflightForm
                integrationId={pageData.selectedAccount.id}
                enabled={canSend}
                disabledReason={disabledReason}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Connect an Instagram account before running this diagnostic.
            </p>
          )}
        </div>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Raw access tokens are never rendered or logged. Only Meta error code,
        subcode, type, message, and fbtrace_id are retained for this preflight.
      </p>
    </div>
  );
}
