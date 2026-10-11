"use client";
import { UiText } from "@/components/i18n/localized-copy";


import { removeCurrentInstagramAccount } from "@/actions/integration/remove-instagram";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function RemoveInstagramAccountButton({ integrationId }: { integrationId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const removeAccount = async () => {
    if (isRemoving) return;

    setIsRemoving(true);
    try {
      const result = await removeCurrentInstagramAccount(integrationId);
      if (result.status !== 200) {
        toast.error(result.data);
        return;
      }

      toast.success("Instagram account removed.");
      setOpen(false);
      await queryClient.cancelQueries();
      queryClient.clear();
      window.localStorage.setItem("ap3k-account-changed", `removed:${Date.now()}`);
      window.location.reload();
    } catch {
      toast.error("Instagram account could not be removed. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isRemoving && setOpen(nextOpen)}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl border-red-200 bg-white px-4 text-sm font-black text-red-600 transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:bg-red-500/[0.06] dark:text-red-300 dark:hover:bg-red-500/[0.12] dark:hover:text-red-200"
        >
          <Trash2 className="h-4 w-4" /><UiText>{" Remove Instagram account "}</UiText></Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white p-0 shadow-2xl dark:border-red-500/25 dark:bg-[#101827]">
        <div className="border-b border-red-100 bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 dark:border-red-500/15 dark:from-red-500/[0.12] dark:via-[#101827] dark:to-orange-500/[0.06]">
          <AlertDialogHeader className="text-left">
            <div className="mb-2 grid h-11 w-11 place-items-center rounded-2xl border border-red-200 bg-red-100 text-red-600 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-950 dark:text-white"><UiText>{" Remove Instagram account? "}</UiText></AlertDialogTitle>
            <AlertDialogDescription className="pt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300"><UiText>{" Removing this Instagram account permanently deletes only its automations, contacts, inbox, analytics, and AI knowledge. Your other accounts stay unchanged. "}</UiText></AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="gap-2 p-5 sm:space-x-0">
          <AlertDialogCancel
            disabled={isRemoving}
            className="h-11 rounded-xl border-slate-200 light:border-slate-300 bg-white px-5 font-black text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
          ><UiText>{" Keep Account "}</UiText></AlertDialogCancel>
          <Button
            type="button"
            onClick={removeAccount}
            disabled={isRemoving}
            className="h-11 rounded-xl bg-red-600 px-5 font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            <UiText>{isRemoving ? "Removing..." : "Remove Account"}</UiText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
