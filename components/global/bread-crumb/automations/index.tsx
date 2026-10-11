"use client";
import { UiText } from "@/components/i18n/localized-copy";
import { Input } from "@/components/ui/input";
import { useEditAutomation } from "@/hooks/use-automation";
import { useMutationDataState } from "@/hooks/use-mutation-data";
import { useQueryAutomations } from "@/hooks/user-queries";
import { ChevronRight, PencilIcon } from "lucide-react";
import ActiveAutomationButton from "../../active-automation-button";

type Props = {
  id: string;
};

function AutomationBreadCrumb({ id }: Props) {
  const { data } = useQueryAutomations(id);

  const { edit, enableEdit, disableEdit, inputRef, isPending } =
    useEditAutomation(id);

  const { latestVariable } = useMutationDataState(["update-automation"]);

  return (
    <div className="rounded-full w-full p-5 bg-[#18181B1A] flex items-center">
      <div className="flex items-center gap-x-3">
        <p className="text-[#9B9CA0] truncate"><UiText>{"Automation"}</UiText></p>
        <ChevronRight className="flex-shrink-0" color="#9B9CA0" />
        <span className="flex gap-x-3 items-center">
          {edit ? (
            <Input
              ref={inputRef}
              placeholder={
                isPending ? latestVariable.variables : "Add a new Name"
              }
              className="bg-transparent h-auto outline-none text-base border-none p-0"
            />
          ) : (
            <p className="text-[#9B9CA0]">
              {latestVariable?.variables
                ? latestVariable?.variables.name
                : data?.data?.name}
            </p>
          )}
          {edit ? (
            <></>
          ) : (
            <span
              className="cursor-pointer hover:opacity-75 duration-100 transition flex-shrink-0 mr-4"
              onClick={enableEdit}
            >
              <PencilIcon size={14} />
            </span>
          )}
        </span>
      </div>
      <div className="flex gap-x-5 ml-auto">
        <p className="text-text-secondary/60 text-sm"><UiText>{" All pages are automatically Saved "}</UiText></p>
        <div className="flex gap-x-5">
          <p className="text-text-secondary text-sm"><UiText>{"Changes Saved"}</UiText></p>
          <p className="text-text-secondary text-sm"><UiText>{"Undo | Redo"}</UiText></p>
        </div>
      </div>
      <ActiveAutomationButton id={id} />
    </div>
  );
}

export default AutomationBreadCrumb;
