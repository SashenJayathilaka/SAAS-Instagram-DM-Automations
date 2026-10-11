"use client";
import { UiText } from "@/components/i18n/localized-copy";
import {
  getCurrentWebhookHealth,
  getInstagramConnectUrl,
  resubscribeCurrentInstagramWebhooks,
} from "@/actions/integration";
import { onUserInfo } from "@/actions/user";
import { Button } from "@/components/ui/button";
import InstagramAvatar from "@/components/dashboard/instagram-avatar";
import LocalTime from "@/components/global/local-time";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { getCanonicalInstagramIntegration } from "@/lib/instagram-integration-status";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import React from "react";
import { toast } from "sonner";
import { formatUserFacingMetaError } from "@/lib/user-facing-errors";

type Props = {
  title: string;
  description: string;
  icon: React.ReactNode;
  strategy: "INSTAGRAM" | "CRM";
  surface?: "dashboard" | "onboarding";
  continueHref?: string;
  canonicalConnected?: boolean;
  oauthSaveFailed?: boolean;
  directInstagramLogin?: boolean;
  compact?: boolean;
};

function IntegrationCard({
  title,
  description,
  icon,
  strategy,
  surface = "dashboard",
  continueHref,
  canonicalConnected,
  oauthSaveFailed = false,
  directInstagramLogin = false,
  compact = false,
}: Props) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const { userId } = useAuth();
  const appReviewMode = isAppReviewMode();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: onUserInfo,
    enabled: Boolean(userId),
  });

  const { data: health } = useQuery({
    queryKey: ["webhook-health", userId],
    queryFn: getCurrentWebhookHealth,
    enabled: Boolean(userId) && strategy === "INSTAGRAM",
  });

  const resubscribe = useMutation({
    mutationKey: ["resubscribe-webhooks", userId],
    mutationFn: resubscribeCurrentInstagramWebhooks,
    onSuccess: async (result) => {
      if (result.status === 200) {
        toast.success(result.data);
      } else {
        toast.error(result.data ?? "Webhook refresh failed");
      }
      await queryClient.invalidateQueries({
        queryKey: ["webhook-health", userId],
      });
    },
  });

  const integrated =
    strategy === "INSTAGRAM"
      ? getCanonicalInstagramIntegration(data?.data?.integrations)
      : data?.data?.integrations.find((i: any) => i.name === strategy);
  const isInstagram = strategy === "INSTAGRAM";
  const onboarding = surface === "onboarding";
  const connected =
    typeof canonicalConnected === "boolean"
      ? canonicalConnected
      : Boolean(integrated);
  const displayIntegration = connected ? integrated : null;
  const displayTitle = onboarding && connected ? "Instagram connected" : title;
  const displayDescription = onboarding
    ? connected
      ? "AP3K can now receive Instagram interactions, send responses, and track automation activity for this account."
      : directInstagramLogin
        ? "Connect your Instagram Business or Creator account directly. No Facebook Page selection is required."
        : "AP3K connects through Meta's official login to receive Instagram interactions, send responses, and track automation activity for the account you choose."
    : directInstagramLogin
      ? "Connect your Instagram Business or Creator account directly. AP3K subscribes comments and messages automatically after authorization."
      : description;
  const lastFailure = formatUserFacingMetaError(
    health?.data?.subscription?.error ??
      health?.data?.lastFailure?.errorMessage,
    health?.data?.lastFailure?.eventType,
  );

  const onConnect = async () => {
    if (!isInstagram) return;

    setIsConnecting(true);
    try {
      const result = await getInstagramConnectUrl();
      if (result.status === 200 && result.url) {
        window.location.assign(result.url);
        return;
      }

      toast.error("Instagram connection could not be started.");
    } catch {
      toast.error("Instagram connection could not be started.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      className={[
        "w-full rounded-2xl border border-slate-200 light:border-slate-300 bg-white text-slate-950 shadow-sm transition-colors hover:border-rf-pink/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-white",
        compact ? "p-4 sm:p-5" : "p-5",
        onboarding ? "sm:p-6" : "",
      ].join(" ")}
    >
      <div
        className={
          compact
            ? "flex w-full flex-col gap-3 sm:flex-row sm:items-center"
            : "flex w-full flex-col gap-5 sm:flex-row sm:items-start"
        }
      >
        <div
          className={
            compact
              ? "hidden w-12 shrink-0 items-center justify-center sm:flex"
              : "flex w-14 shrink-0 items-center justify-center self-start"
          }
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          {!compact && (
            <h3 className="text-xl font-black leading-tight sm:text-2xl">
              <UiText>{displayTitle}</UiText>
            </h3>
          )}
          {!compact && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              <UiText>{displayDescription}</UiText>
            </p>
          )}
          {displayIntegration?.instagramId && (
            <div
              className={[
                "flex min-w-0 items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10",
                compact ? "" : "mt-4",
              ].join(" ")}
            >
              <InstagramAvatar
                src={displayIntegration.profilePictureUrl}
                username={displayIntegration.instagramUsername}
                label={displayIntegration.pageName}
                size="md"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-emerald-700 dark:text-rf-green">
                  {displayIntegration.instagramUsername
                    ? `@${displayIntegration.instagramUsername}`
                    : "Instagram connected"}
                </p>
                {!appReviewMode && (
                  <p className="truncate text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{" Instagram ID: "}</UiText>{displayIntegration.instagramId}
                  </p>
                )}
                {!appReviewMode &&
                  !directInstagramLogin &&
                  displayIntegration.pageId && (
                    <p className="truncate text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{" Linked Page ID: "}</UiText>{displayIntegration.pageId}
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-52 sm:flex-wrap">
          {onboarding && connected && continueHref ? (
            <Link
              href={continueHref}
              className="ap3k-gradient-button inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-center text-sm font-black text-white"
            ><UiText>{" Create my first campaign "}</UiText></Link>
          ) : (
            <Button
              onClick={onConnect}
              disabled={!isInstagram || isConnecting}
              className="ap3k-gradient-button min-h-11 w-full px-4 text-white disabled:opacity-60"
            >
              <UiText>{connected
                ? "Reconnect Instagram"
                : isConnecting
                  ? "Connecting..."
                  : "Connect Instagram"}</UiText>
            </Button>
          )}
          {onboarding && connected && (
            <Button
              type="button"
              variant="outline"
              onClick={onConnect}
              disabled={!isInstagram || isConnecting}
              className="min-h-11 w-full border-slate-200 light:border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              <UiText>{isConnecting ? "Connecting..." : "Reconnect Instagram"}</UiText>
            </Button>
          )}
          {connected &&
            !directInstagramLogin &&
            !appReviewMode &&
            !onboarding && (
              <Button
                type="button"
                variant="outline"
                onClick={() => resubscribe.mutate()}
                disabled={resubscribe.isPending}
                className="min-h-11 w-full border-slate-200 light:border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
              >
                <UiText>{resubscribe.isPending
                  ? "Refreshing..."
                  : "Refresh webhook subscription"}</UiText>
              </Button>
            )}
          {connected && !appReviewMode && !onboarding && (
            <Button
              type="button"
              variant="outline"
              disabled
              className="min-h-11 w-full cursor-not-allowed border-red-200 bg-white px-4 text-sm font-bold text-red-400 opacity-70 dark:border-red-500/30 dark:bg-white/[0.04] dark:text-red-300"
            ><UiText>{" Contact support to disconnect "}</UiText></Button>
          )}
        </div>
      </div>

      {connected && appReviewMode && !oauthSaveFailed && !compact && (
        <div className="mt-5 w-full rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-relaxed text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100"><UiText>{" Instagram connected. Comments and public replies are ready for campaigns. "}</UiText></div>
      )}
      {connected && appReviewMode && oauthSaveFailed && !compact && (
        <div className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"><UiText>{" Current saved connection "}</UiText>{displayIntegration?.instagramUsername
            ? `: @${displayIntegration.instagramUsername}`
            : ""}
          .
        </div>
      )}

      {connected && !appReviewMode && (
        <div className="mt-5 w-full rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 p-4 text-xs text-slate-600 dark:border-white/10 dark:bg-[#101827] dark:text-slate-300">
          <p className="font-black uppercase tracking-[0.16em] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"Connection health"}</UiText></p>

          {displayIntegration?.instagramId &&
            health?.data?.oauth?.reconnectRequired && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <p className="font-bold"><UiText>{"Reconnect Instagram"}</UiText></p>
                <p className="mt-1 leading-relaxed"><UiText>{" AP3K matched your real comment, but the saved access token is missing or invalid. Click "}</UiText><strong><UiText>{"Reconnect Instagram"}</UiText></strong>{" "}<UiText>{" above to restore delivery. "}</UiText></p>
              </div>
            )}

          <div className="mt-3 flex flex-wrap gap-2">
            <HealthBadge
              label="OAuth valid"
              ok={Boolean(health?.data?.oauth?.tokenUsable)}
            />
            <HealthBadge
              label="Token format"
              ok={Boolean(health?.data?.oauth?.tokenFormatValid)}
            />
            <HealthBadge
              label="Webhook subscribed"
              ok={
                Boolean(health?.data?.subscription?.subscribed) ||
                Boolean(health?.data?.lastCommentWebhook)
              }
            />
            <HealthBadge
              label="Comment delivery"
              ok={Boolean(health?.data?.lastCommentWebhook)}
            />
            <HealthBadge
              label="Messaging"
              ok={!health?.data?.lastFailure?.errorMessage?.includes("dm_")}
            />
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <HealthItem
              label="Access token"
              value={
                health?.data?.oauth
                  ? `${health.data.oauth.tokenPresent ? "stored" : "missing"} · ${health.data.oauth.tokenFormatValid ? "format ok" : "format invalid"}${health.data.oauth.tokenExpired ? " · expired" : ""}${health.data.oauth.tokenSource ? ` · source: ${health.data.oauth.tokenSource}` : ""}`
                  : "Unknown"
              }
            />
            <HealthItem
              label="Subscription attempted"
              value={
                health?.data?.subscription?.lastAttemptedAt
                  ? <LocalTime value={health.data.subscription.lastAttemptedAt} />
                  : <UiText>{"Never"}</UiText>
              }
            />
            <HealthItem
              label="Subscription result"
              value={
                health?.data?.subscription
                  ? `${health.data.subscription.subscribed ? "success" : "failure"}${health.data.subscription.statusCode ? ` · ${health.data.subscription.statusCode}` : ""}${health.data.subscription.subscriptionMode ? ` · ${health.data.subscription.subscriptionMode}` : ""}`
                  : "Unknown"
              }
            />
            <HealthItem
              label="Last webhook"
              value={formatHealth(health?.data?.lastWebhook)}
            />
            <HealthItem
              label="Last comment"
              value={formatHealth(health?.data?.lastCommentWebhook)}
            />
            <HealthItem
              label="Last failure"
              value={
                lastFailure.detail
                  ? `${lastFailure.title} · ${lastFailure.detail}`
                  : lastFailure.title
              }
            />
          </div>

          {!health?.data?.lastCommentWebhook && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"><UiText>{" No real comment webhook received yet. Reconnect Instagram, then test with a real comment from another Instagram account. "}</UiText></p>
          )}
          {health?.data?.lastCommentWebhook && (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"><UiText>{" Comment delivery active. Last comment:"}</UiText>{" "}
              <LocalTime value={health.data.lastCommentWebhook.createdAt} /><UiText>{" . Outbound DM capability may still depend on Meta messaging approval. "}</UiText></p>
          )}
        </div>
      )}
    </div>
  );
}

export default IntegrationCard;

function HealthBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-[11px] font-black",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
      ].join(" ")}
    >
      <UiText>{label}</UiText>: <UiText>{ok ? "ok" : "check"}</UiText>
    </span>
  );
}

function HealthItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 light:border-slate-300 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 light:text-slate-600 dark:text-slate-400">
        <UiText>{label}</UiText>
      </p>
      <p className="mt-1 break-words font-bold text-slate-800 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}

function formatHealth(
  event?: {
    eventType: string;
    status: string;
    createdAt: Date | string;
  } | null,
) {
  if (!event) return <UiText>{"None yet"}</UiText>;
  return <>{event.eventType} · {event.status} · <LocalTime value={event.createdAt} /></>;
}
