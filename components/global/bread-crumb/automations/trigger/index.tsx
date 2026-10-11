"use client";
import { UiText } from "@/components/i18n/localized-copy";


import Loader from "@/components/global/loader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AUTOMATION_TRIGGERS } from "@/constants/automation";
import { useTrigger } from "@/hooks/use-automation";
import { useQueryAutomations } from "@/hooks/user-queries";
import { cn } from "@/lib/utils";
import ThenActions from "../then/then-actions";
import TriggerButton from "../trigger-button";
import ActiveTrigger from "./active";
import Keywords from "./keywords";

type Props = {
  id: string;
};

function Trigger({ id }: Props) {
  const { isPending, onSaveTrigger, onSetTrigger, types } = useTrigger(id);
  const { data } = useQueryAutomations(id);

  /*   const data = {
    data: {
      trigger: [
        {
          type: "COMMENTS",
        },
      ],
      keywords: [
        { id: "1", word: "hello", automationId: "M001" },
        { id: "2", word: "welcome", automationId: null },
        { id: "3", word: "thank you", automationId: "M003" },
      ],
      listener: null,
    },
  }; */

  if (data?.data && data?.data?.trigger?.length > 0) {
    return (
      <div className="flex flex-col gap-y-6 items-center">
        <ActiveTrigger
          type={data.data.trigger[0].type}
          keywords={data.data.keywords}
        />

        {data.data.trigger.length > 1 && (
          <>
            <div className="relative w-6/12">
              <p className="absolute transform bg-background-90 px-2 -translate-y-1/2 top-1/2 -translate-x-1/2 left-1/2"><UiText>{" or "}</UiText></p>
              <Separator
                orientation="horizontal"
                className="border-muted border-[1px]"
              />
            </div>
            <ActiveTrigger
              type={data.data.trigger[1].type}
              keywords={data.data.keywords}
            />
          </>
        )}

        {!data.data.listener && <ThenActions id={id} />}
      </div>
    );
  }

  return (
    <TriggerButton label="Add Trigger">
      <div className="flex flex-col gap-y-2">
        {AUTOMATION_TRIGGERS.map((trigger) => (
          <div
            key={trigger.id}
            onClick={() => onSetTrigger(trigger.type)}
            className={cn(
              "hover:opacity-80 text-white rounded-xl flex cursor-pointer flex-col p-3 gap-y-2",
              !types?.find((t) => t === trigger.type)
                ? "bg-background-80"
                : "bg-gradient-to-br from-[#3352CC] font-medium to-[#1C2D70]"
            )}
          >
            <div className="flex gap-x-2 items-center">
              {trigger.icon}
              <p className="font-bold">{trigger.label}</p>
            </div>
            <p className="text-sm font-light">{trigger.description}</p>
          </div>
        ))}
        <Keywords id={id} />
        <Button
          onClick={onSaveTrigger}
          disabled={types?.length === 0}
          className="bg-gradient-to-br from-[#3352CC] font-medium text-white to-[#1C2D70]"
        >
          <Loader state={isPending}><UiText>{"Create Trigger"}</UiText></Loader>
        </Button>
      </div>
    </TriggerButton>
  );
}

export default Trigger;
