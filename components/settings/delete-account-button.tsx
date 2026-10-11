"use client";
import { UiText } from "@/components/i18n/localized-copy";
import { getAccountDeletionConfirmation } from "@/lib/account-deletion-confirmation";
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
import { Input } from "@/components/ui/input";
import { useClerk } from "@clerk/nextjs";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

type DeleteAccountButtonProps = {
  email: string;
  visualOnly?: boolean;
};

export function DeleteAccountButton({
  email,
  visualOnly = false,
}: DeleteAccountButtonProps) {
  const clerk = useClerk();
  const requiredConfirmation = getAccountDeletionConfirmation(email);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmationMatches =
    confirmation.trim().toLowerCase() === requiredConfirmation.toLowerCase();

  async function deleteAccount() {
    if (visualOnly || !confirmationMatches || isDeleting) return;

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: { message?: string } }
        | null;

      if (!response.ok || !result?.success) {
        throw new Error(result?.error?.message || "Account deletion failed. Please try again.");
      }
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : "Account deletion failed. Please try again."
      );
      setIsDeleting(false);
      return;
    }

    // The backend has removed the Clerk identity. Clear the browser's active
    // Clerk session before navigating so a deleted session cannot poison SSR.
    try {
      await clerk.signOut({ redirectUrl: "/?account_deleted=1" });
      return;
    } catch {
      try {
        await clerk.setActive({ session: null });
      } catch {
        // Navigation below is the final fallback after successful deletion.
      }
      window.location.replace("/?account_deleted=1");
    }
  }

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open && !isDeleting) {
          setConfirmation("");
          setError("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          className="h-11 rounded-xl px-4 font-bold"
        >
          <Trash2 aria-hidden="true" /><UiText>{"Delete account permanently"}</UiText></Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="border-red-200 dark:border-red-500/30">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-700 dark:text-red-300"><UiText>{" Permanently delete your AP3K account? "}</UiText></AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left leading-relaxed">
            <span className="block"><UiText>{" This permanently removes your campaigns, connected Instagram accounts, leads, activity, AP3K billing profile, and sign-in account. Active Stripe subscriptions are canceled immediately. Previous payments are not automatically refunded. "}</UiText></span>
            <span className="block font-semibold text-slate-800 dark:text-slate-200"><UiText>{"This action cannot be undone."}</UiText></span>
            {visualOnly && (
              <span className="block rounded-xl border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"><UiText>{" Preview visual QA only. Account deletion is disabled on this page. "}</UiText></span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label htmlFor="delete-account-confirmation" className="text-sm font-bold"><UiText>{" Type "}</UiText><span className="select-all break-all font-mono text-red-700 dark:text-red-300">{requiredConfirmation}</span>
          </label>
          <Input
            id="delete-account-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={isDeleting}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={error ? "delete-account-error" : undefined}
            className="h-11 border-red-200 focus-visible:ring-red-500 dark:border-red-500/30"
          />
          {error && (
            <p id="delete-account-error" role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}><UiText>{"Keep my account"}</UiText></AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={visualOnly || !confirmationMatches || isDeleting}
            onClick={deleteAccount}
          >
            {isDeleting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Trash2 aria-hidden="true" />}
            <UiText>{visualOnly
              ? "Preview only — deletion disabled"
              : isDeleting
                ? "Deleting account…"
                : "Delete permanently"}</UiText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
