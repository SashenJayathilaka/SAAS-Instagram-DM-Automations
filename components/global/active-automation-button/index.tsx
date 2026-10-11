"use client";

import { activateAutomation, repairCampaign } from "@/actions/automation";
import { Button } from "@/components/ui/button";
import { useMutationData } from "@/hooks/use-mutation-data";
import { useQueryAutomations } from "@/hooks/user-queries";
import { ActiveAutomation } from "@/icons/active-automation";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type Props = {
  id: string;
  disabled?: boolean;
  disabledReason?: string | null;
  showRepair?: boolean;
};

function ActiveAutomationButton({ id, disabled, disabledReason, showRepair }: Props) {
  const router = useRouter();
  const [isRepairing, startRepair] = useTransition();
  const { data } = useQueryAutomations(id);
  const { isPending, mutate } = useMutationData(
    ["activate"],
    (data: { status: boolean }) => activateAutomation(id, data.status),
    "automation-info"
  );

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <Button
        disabled={isPending || disabled}
        title={disabledReason ?? undefined}
        onClick={() => mutate({ status: !data?.data?.active })}
        className="ap3k-gradient-button ml-4 rounded-xl text-white disabled:opacity-50 lg:px-8"
      >
        {isPending ? <Loader2 className="animate-spin" /> : <ActiveAutomation />}
        <p className="lg:inline hidden">
          {data?.data?.active ? "Deactivate" : "Activate"}
        </p>
      </Button>
      {disabledReason && (
        <p className="max-w-xs text-right text-xs font-bold text-amber-700 dark:text-amber-300">{disabledReason}</p>
      )}
      {showRepair && (
        <Button
          type="button"
          variant="outline"
          disabled={isRepairing}
          onClick={() => startRepair(async () => {
            const result = await repairCampaign(id);
            if (result.status === 200) toast.success(result.data);
            else toast.error(result.data);
            router.refresh();
          })}
          className="ml-4 rounded-xl border-amber-200 bg-amber-50 text-sm font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
        >
          {isRepairing ? "Repairing..." : "Repair automation"}
        </Button>
      )}
    </div>
  );
}

export default ActiveAutomationButton;
