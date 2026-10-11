"use client";
import { UiText } from "@/components/i18n/localized-copy";
import ReviewDisconnectInstagramButton from "@/components/dashboard/review-disconnect-instagram-button";
import InstagramAvatar from "@/components/dashboard/instagram-avatar";
import Link from "next/link";
import { useState } from "react";

type Props = {
  connected: boolean;
  displayUsername?: string | null;
  displayProfilePictureUrl?: string | null;
  pageName?: string | null;
};

export default function ReviewInstagramAccountProfile({
  connected,
  displayUsername,
  displayProfilePictureUrl,
  pageName,
}: Props) {
  const [removed, setRemoved] = useState(false);
  const liveConnected = connected && !removed;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* Left: profile identity */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <InstagramAvatar
          src={liveConnected ? displayProfilePictureUrl : null}
          username={displayUsername}
          label={pageName}
          size="lg"
          className="rounded-2xl"
        />
        <div className="min-w-0">
          <p className="truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            {liveConnected && displayUsername ? <bdi dir="ltr">@{displayUsername}</bdi> : "No Instagram account connected"}
          </p>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-500 light:text-slate-600 dark:text-slate-400">
            {liveConnected ? pageName ?? "Instagram Business or Creator profile" : "Connect Instagram to start."}
          </p>
          <p className="mt-1.5 text-sm font-bold text-slate-600 dark:text-slate-300">
            <UiText>{liveConnected ? "Profile connected" : "Connect Instagram to view profile details."}</UiText>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {liveConnected && <StatusBadge tone="pink"><UiText>{"Official Meta connection"}</UiText></StatusBadge>}
            <StatusBadge tone={liveConnected ? "green" : "slate"}>
              <UiText>{liveConnected ? "Connected" : "Not connected"}</UiText>
            </StatusBadge>
          </div>
        </div>
      </div>

      {/* Right: account actions panel */}
      <div className="shrink-0 rounded-2xl border border-slate-200 light:border-slate-300 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04] lg:min-w-[260px]">
        {liveConnected ? (
          <>
            <div className="flex flex-col gap-2.5 pb-4">
              <SummaryRow label="Instagram account" value="Connected" />
              <SummaryRow label="Comments" value="Ready to receive" />
              <SummaryRow label="Public replies" value="Available with comment automations" />
            </div>
            <div className="border-t border-slate-200 light:border-slate-300 pt-4 dark:border-white/10">
              <ReviewDisconnectInstagramButton onDisconnected={() => setRemoved(true)} />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{" Connect an Instagram Business or Creator account to get started. "}</UiText></p>
            <Link href="/onboarding" className="ap3k-gradient-button inline-flex justify-center px-4 py-2.5 text-sm"><UiText>{"Connect Instagram"}</UiText></Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-bold text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{label}</UiText></span>
      <span className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ tone, children }: { tone: "green" | "pink" | "slate"; children: React.ReactNode }) {
  const classes = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    pink: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200",
    slate: "border-slate-200 light:border-slate-300 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${classes[tone]}`}>{children}</span>;
}
