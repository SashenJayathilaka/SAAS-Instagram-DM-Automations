"use client";

import {
  Check,
  Copy,
  Facebook,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/providers/i18n-provider";
import { REFERRAL_COPY } from "@/lib/i18n/referrals";
import { sendReferralInvite } from "@/actions/referrals";

export function ReferralShareCard({ inviteUrl }: { inviteUrl: string }) {
  const { locale, t } = useI18n();
  const c = REFERRAL_COPY[locale];
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const shareText = t("referralShareText");
  const social =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:hover:bg-white/10";
  async function copyLink() {
    try {
      await copyText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(c.copyFailed);
    }
  }
  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("tryAp3k"),
          text: shareText,
          url: inviteUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    await copyLink();
  }
  return (
    <div className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
      <div className="flex flex-col gap-3 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.06]">
            <Link2 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold">
              {c.share}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                · {c.linkTerms}
              </span>
            </p>
            <a
              href={inviteUrl}
              dir="ltr"
              className="mt-1 block break-all text-sm font-medium hover:underline"
            >
              {inviteUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-0.5">
          <a
            className={`${social} text-emerald-600`}
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${inviteUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={shareLink}
            className={`${social} text-pink-500`}
            aria-label={t("shareReferralLink")}
          >
            <Instagram className="h-4 w-4" />
          </button>
          <a
            className={`${social} text-blue-600`}
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
          >
            <Facebook className="h-4 w-4" />
          </a>
          <a
            className={social}
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
          >
            <span className="text-base font-medium">𝕏</span>
          </a>
          <a
            className={`${social} text-sky-500`}
            href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
          >
            <Send className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={copyLink}
            aria-live="polite"
            className="ml-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-semibold transition hover:bg-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-500 dark:bg-white/[0.07] dark:hover:bg-white/10"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? c.copied : c.copy}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/[0.06]">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{c.invite}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {c.inviteHint}
            </p>
          </div>
        </div>
        <form
          className="flex w-full flex-col gap-2 sm:flex-row lg:w-[410px]"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              try {
                const result = await sendReferralInvite(email);
                if (!result.ok) {
                  toast.error(result.error || c.actionFailed);
                  return;
                }
                setEmail("");
                toast.success(c.inviteSent);
              } catch {
                toast.error(c.actionFailed);
              }
            });
          }}
        >
          <label className="sr-only" htmlFor="referral-invite-email">
            {c.email}
          </label>
          <input
            id="referral-invite-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="min-h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-transparent px-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 dark:border-white/10"
          />
          <button
            type="submit"
            disabled={pending}
            className="min-h-10 shrink-0 rounded-xl border border-zinc-200 px-5 text-xs font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            {pending ? c.processing : c.send}
          </button>
        </form>
      </div>
    </div>
  );
}
async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      /* Fall back for browsers that deny clipboard access. */
    }
  }
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  textArea.remove();
  if (!copied) throw new Error("COPY_FAILED");
}
