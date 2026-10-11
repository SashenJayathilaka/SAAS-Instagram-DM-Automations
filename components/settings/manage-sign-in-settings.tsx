"use client";

import { Button } from "@/components/ui/button";
import { useClerk, useUser } from "@clerk/nextjs";
import { Loader2, Settings2 } from "lucide-react";

export function ManageSignInSettings() {
  const { openUserProfile } = useClerk();
  const { isLoaded } = useUser();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={!isLoaded}
      onClick={() => openUserProfile()}
      className="h-11 w-full rounded-xl border-slate-200 light:border-slate-300 bg-white px-4 font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08] sm:w-auto"
    >
      {isLoaded ? <Settings2 aria-hidden="true" /> : <Loader2 aria-hidden="true" className="animate-spin" />}
      {isLoaded ? "Manage sign-in settings" : "Loading sign-in settings"}
    </Button>
  );
}
