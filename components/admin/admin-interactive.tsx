"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Copy, Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isAdminConfirmReady,
  sanitizeAdminPayload,
  shortenAdminId,
  summarizeAdminError,
  type AdminActionItem,
} from "@/lib/admin-control-center";

type ServerAction = (formData: FormData) => Promise<unknown>;

export type AdminRowAction = AdminActionItem & {
  serverAction?: ServerAction;
  hidden?: Record<string, string>;
  impact?: string;
  danger?: boolean;
};

export function AdminActionMenu({
  viewHref,
  viewLabel = "View",
  actions,
}: {
  viewHref?: string;
  viewLabel?: string;
  actions: AdminRowAction[];
}) {
  const [selected, setSelected] = useState<AdminRowAction | null>(null);
  const [open, setOpen] = useState(false);
  const enabledActions = actions.filter((item) => !item.disabled);

  return (
    <div className="flex items-center gap-2">
      {viewHref ? (
        <Link
          href={viewHref}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
        >
          <Eye className="h-3.5 w-3.5" />
          {viewLabel}
        </Link>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]" aria-label="Actions">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {actions.map((action, index) => (
            <div key={action.id}>
              {index > 0 && action.danger && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={action.disabled}
                onSelect={(event) => {
                  event.preventDefault();
                  if (action.disabled || !action.serverAction) return;
                  setSelected(action);
                  setOpen(true);
                }}
                className={action.danger ? "text-red-700 focus:text-red-700" : ""}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{action.label}</span>
                  {action.disabled && action.disabledReason ? (
                    <span className="truncate text-xs text-slate-500">{action.disabledReason}</span>
                  ) : null}
                </span>
              </DropdownMenuItem>
            </div>
          ))}
          {enabledActions.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-slate-500">No enabled actions</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AdminConfirmDialog action={selected} open={open} onOpenChange={setOpen} onDone={() => setSelected(null)} />
    </div>
  );
}

function AdminConfirmDialog({
  action,
  open,
  onOpenChange,
  onDone,
}: {
  action: AdminRowAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ready = useMemo(
    () => isAdminConfirmReady({ reason, confirmation, expectedConfirmation: action?.confirmation, reasonRequired: action?.reasonRequired ?? true }),
    [action?.confirmation, action?.reasonRequired, confirmation, reason]
  );

  if (!action) return null;

  const reset = () => {
    setReason("");
    setConfirmation("");
    setResult(null);
    onDone();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-[94vw] border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#101827] dark:text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>
            {action.targetLabel ? `Target: ${action.targetLabel}` : "Review this admin action before submitting."}
          </DialogDescription>
        </DialogHeader>
        {action.impact && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            {action.impact}
          </div>
        )}
        <div className="space-y-3">
          <label className="grid gap-1 text-sm font-bold">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04]"
              placeholder="Operational reason"
            />
          </label>
          {action.confirmation && (
            <label className="grid gap-1 text-sm font-bold">
              Type {action.confirmation}
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-slate-400 dark:border-white/10 dark:bg-white/[0.04]"
                placeholder={action.confirmation}
              />
            </label>
          )}
          {result && <p className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">{result}</p>}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready || isPending || !action.serverAction}
            onClick={() => {
              if (!action.serverAction) return;
              const formData = new FormData();
              Object.entries(action.hidden ?? {}).forEach(([key, value]) => formData.set(key, value));
              formData.set("reason", reason);
              if (action.confirmation) formData.set("confirmation", confirmation);
              startTransition(async () => {
                const response = await action.serverAction!(formData);
                const message = typeof response === "object" && response && "data" in response
                  ? String((response as { data?: unknown }).data ?? "Action completed")
                  : "Action completed";
                setResult(message);
                router.refresh();
                setTimeout(() => onOpenChange(false), 700);
              });
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50",
              action.danger ? "bg-red-600 hover:bg-red-700" : "bg-slate-950 hover:bg-slate-800",
            ].join(" ")}
          >
            {isPending ? "Working..." : action.label}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShortId({ value, empty = "Missing" }: { value?: string | null; empty?: string }) {
  if (!value) return <span className="text-xs text-slate-400">{empty}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1" title={value}>
      <span className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">{shortenAdminId(value)}</span>
      <CopyButton value={value} label="Copy ID" />
    </span>
  );
}

export function CopyButton({ value, label = "Copy" }: { value?: string | null; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      aria-label={label}
      title={copied ? "Copied" : label}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 900);
        });
      }}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

export function AdminErrorSummary({ error }: { error?: string | null }) {
  const summary = summarizeAdminError(error);
  const sanitized = sanitizeAdminPayload({ error });
  if (!error) return <span className="text-sm text-slate-500">No error</span>;
  return (
    <details className="max-w-full">
      <summary className="cursor-pointer list-none">
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {summary}
        </span>
      </summary>
      <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-2 flex justify-end">
          <CopyButton value={JSON.stringify(sanitized)} label="Copy sanitized error" />
        </div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-300">
          {JSON.stringify(sanitized, null, 2)}
        </pre>
      </div>
    </details>
  );
}

