"use client";

import { updateProfileName } from "@/actions/profile";
import { UiText } from "@/components/i18n/localized-copy";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

export function ProfileNameSettings({ firstName = "", lastName = "" }: { firstName?: string | null; lastName?: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const result = await updateProfileName({ firstName: first, lastName: last });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Name updated everywhere in AP3K.");
        router.refresh();
      } catch {
        toast.error("Could not update your name. Please try again.");
      }
    });
  };

  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
      <UiText>First name</UiText>
      <input value={first} onChange={event => setFirst(event.target.value)} required maxLength={80} autoComplete="given-name" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.05] dark:text-white" />
    </label>
    <label className="grid gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
      <UiText>Last name</UiText>
      <input value={last} onChange={event => setLast(event.target.value)} maxLength={80} autoComplete="family-name" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/[0.05] dark:text-white" />
    </label>
    <button type="submit" disabled={pending} className="ap3k-gradient-button h-11 whitespace-nowrap px-5 text-sm disabled:cursor-wait disabled:opacity-60">
      <UiText>{pending ? "Saving…" : "Save name"}</UiText>
    </button>
  </form>;
}
