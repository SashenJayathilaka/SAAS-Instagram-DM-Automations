"use client";

import { useState, useTransition } from "react";
import {
  adminPrivateReplyPreflightAction,
  type AdminPrivateReplyPreflightActionResult,
} from "@/actions/admin/private-reply-preflight";
import { DEFAULT_PRIVATE_REPLY_MESSAGE } from "@/lib/private-reply-preflight";

type Props = {
  integrationId: string;
  enabled: boolean;
  disabledReason?: string | null;
};

const EMPTY_RESULT: AdminPrivateReplyPreflightActionResult = {
  status: 0,
  message: "",
};

export function PrivateReplyPreflightForm({
  integrationId,
  enabled,
  disabledReason,
}: Props) {
  const [result, setResult] =
    useState<AdminPrivateReplyPreflightActionResult>(EMPTY_RESULT);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setResult(EMPTY_RESULT);
    startTransition(async () => {
      setResult(await adminPrivateReplyPreflightAction(formData));
    });
  }

  const succeeded = result.event === "PRIVATE_REPLY_PREFLIGHT_SENT";

  return (
    <form action={submit} className="flex flex-col gap-5">
      <input type="hidden" name="integrationId" value={integrationId} />

      <div>
        <label
          htmlFor="private-reply-comment-id"
          className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-300"
        >
          Fresh Instagram comment_id
        </label>
        <input
          id="private-reply-comment-id"
          name="commentId"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          placeholder="Example: 1785…"
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5 font-mono text-sm text-slate-950 dark:text-white placeholder:text-slate-700 focus:border-pink-500 focus:outline-none"
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          Use a new comment from a different Instagram account. Meta permits one
          private reply and enforces the comment eligibility window.
        </p>
      </div>

      <div>
        <label
          htmlFor="private-reply-message"
          className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-800 dark:text-slate-300"
        >
          Message text
        </label>
        <textarea
          id="private-reply-message"
          name="message"
          rows={4}
          required
          defaultValue={DEFAULT_PRIVATE_REPLY_MESSAGE}
          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-slate-950 dark:text-white focus:border-pink-500 focus:outline-none"
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
        <input
          type="checkbox"
          name="confirmed"
          value="yes"
          required
          className="mt-0.5 h-4 w-4 accent-pink-500"
        />
        <span>
          I confirm this is a fresh eligible comment from a different Instagram
          account and I intend to send exactly one real private reply.
        </span>
      </label>

      {!enabled && disabledReason && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700 dark:text-red-300"
        >
          {disabledReason}
        </p>
      )}

      {result.message && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 ${
            succeeded
              ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-200"
              : "border-red-500/20 bg-red-500/[0.08] text-red-700 dark:text-red-200"
          }`}
        >
          {result.event && (
            <p className="font-mono text-[11px] font-bold">{result.event}</p>
          )}
          <p className="mt-1 text-sm">{result.message}</p>
          {result.metaError && (
            <dl className="mt-3 grid gap-1 font-mono text-[11px] opacity-80">
              {result.metaError.code !== undefined && (
                <div>
                  <dt className="inline">code: </dt>
                  <dd className="inline">{result.metaError.code}</dd>
                </div>
              )}
              {result.metaError.subcode !== undefined && (
                <div>
                  <dt className="inline">subcode: </dt>
                  <dd className="inline">{result.metaError.subcode}</dd>
                </div>
              )}
              {result.metaError.type && (
                <div>
                  <dt className="inline">type: </dt>
                  <dd className="inline">{result.metaError.type}</dd>
                </div>
              )}
              {result.metaError.message && (
                <div>
                  <dt className="inline">message: </dt>
                  <dd className="inline">{result.metaError.message}</dd>
                </div>
              )}
              {result.metaError.fbtrace_id && (
                <div>
                  <dt className="inline">fbtrace_id: </dt>
                  <dd className="inline">{result.metaError.fbtrace_id}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!enabled || isPending}
        className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Sending one private reply…" : "Send one private reply"}
      </button>
    </form>
  );
}
