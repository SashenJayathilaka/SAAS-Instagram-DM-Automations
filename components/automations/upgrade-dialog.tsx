"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import PublicPricing from "@/components/website/public-pricing";
import { useUi } from "@/components/i18n/use-ui";
export function ProBadge() {
  return (
    <span className="rounded-md bg-gradient-to-r from-orange-600 to-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">
      PRO
    </span>
  );
}
export default function UpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const tr = useUi();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] w-[calc(100%-24px)] max-w-[970px] overflow-y-auto rounded-[26px] bg-white p-5 text-slate-950 dark:bg-[#11131d] dark:text-slate-100 sm:p-10">
        <div className="mb-4 text-center">
          <span className="mb-4 inline-block -rotate-6 rounded-xl bg-zinc-900 px-3 py-1 text-lg font-bold text-white dark:bg-zinc-700">
            PRO
          </span>
          <DialogTitle className="text-xl font-bold sm:text-2xl">
            {tr("Unlock all Pro features")}
          </DialogTitle>
          <DialogDescription className="mt-2">
            {tr("More conversations. More possibilities.")} ·{" "}
            {tr("Cancel anytime")}
          </DialogDescription>
        </div>
        <PublicPricing paidOnly />
      </DialogContent>
    </Dialog>
  );
}
