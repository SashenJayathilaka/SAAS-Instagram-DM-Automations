"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { adminDeleteUserAction } from "@/actions/admin/delete-user";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

export function DeleteUserButton({ userId, email, accountCount }: { userId: string; email: string; accountCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (busy || confirmation.trim().toUpperCase() !== "DELETE" || reason.trim().length < 5) return;
    setBusy(true); setError("");
    const form = new FormData();
    form.set("userId", userId); form.set("reason", reason); form.set("confirmation", confirmation);
    try {
      const result = await adminDeleteUserAction(form);
      if (result.status !== 200) { setError(result.data); setBusy(false); return; }
      router.replace("/admin/users?deleted=1"); router.refresh();
    } catch { setError("Could not complete deletion. Refresh the user page to check its status before retrying."); setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!busy) { setOpen(value); setConfirmation(""); setReason(""); setError(""); } }}>
    <AlertDialogTrigger asChild><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 text-sm font-bold text-red-700 dark:text-red-300 hover:bg-red-500/20"><Trash2 className="h-4 w-4" />Delete AP3K account</button></AlertDialogTrigger>
    <AlertDialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto border-red-400/20 bg-white dark:bg-[#0c111d] text-slate-950 dark:text-white">
      <AlertDialogHeader><AlertDialogTitle>Permanently delete this AP3K account?</AlertDialogTitle><AlertDialogDescription className="space-y-3 text-muted-foreground dark:text-slate-400">
        <span className="block break-all font-semibold text-slate-950 dark:text-white">{email}</span>
        <span className="block">This removes all {accountCount} connected Instagram accounts from AP3K, automations, contacts, inbox history, AI data and sign-in access. It does not delete the Instagram profiles themselves.</span>
        <span className="block">Active Stripe subscriptions are canceled immediately. Previous payments are not automatically refunded. This cannot be undone. The admin audit record is retained.</span>
      </AlertDialogDescription></AlertDialogHeader>
      <label className="space-y-2 text-sm">Reason<textarea value={reason} onChange={e => setReason(e.target.value)} disabled={busy} maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 p-3 text-base" /></label>
      <label className="space-y-2 text-sm">Type <strong className="font-mono">DELETE</strong><input value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy} autoComplete="off" spellCheck={false} className="mt-2 w-full rounded-xl border border-red-400/30 bg-slate-50 dark:bg-white/5 p-3 text-base" /></label>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><button onClick={remove} disabled={busy || confirmation.trim().toUpperCase() !== "DELETE" || reason.trim().length < 5} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-40">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Deleting…" : "Delete permanently"}</button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
