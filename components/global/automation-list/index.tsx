"use client";
import { UiText } from "@/components/i18n/localized-copy";


import { Button } from "@/components/ui/button";
import LocalTime from "@/components/global/local-time";
import { useMutationDataState } from "@/hooks/use-mutation-data";
import { usePath } from "@/hooks/user-nav";
import { useQueryAutomation } from "@/hooks/user-queries";
import { isAppReviewMode } from "@/lib/app-review-mode";
import { formatKeywordDisplay } from "@/lib/keyword-display";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo } from "react";
import CreateAutomation from "../create-automation";

type Props = {};

function AutomationList({}: Props) {
  const appReviewMode = isAppReviewMode();
  const { data } = useQueryAutomation();

  const { latestVariable } = useMutationDataState(["create-automation"]);
  // console.log("🚀 ~ AutomationList ~ latestVariables:", latestVariables);

  const { pathname } = usePath();

  const optimisticUiData = useMemo(() => {
    if (latestVariable && latestVariable?.variables && data) {
      const newData = [latestVariable.variables, ...data.data];
      return { data: newData };
    }
    return data || { data: [] };
  }, [latestVariable, data]);

  if (data?.status !== 200 || data?.data.length <= 0) {
    return (
      <div className="h-[70vh] flex justify-center items-center flex-col gap-y-3">
        <h3 className="text-lg text-gray-400"><UiText>{"No Automation"}</UiText></h3>
        <CreateAutomation />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-3">
      {optimisticUiData.data!.map((automation) => (
        <Link
          href={`${pathname}/${automation.id}`}
          key={automation.id}
          className="bg-[#1D1D1D] hover:opacity-80 transition duration-100 rounded-xl p-5 border-[1px] radial--gradient--automations flex border-[#545454]"
        >
          <div className="flex flex-col flex-1 items-start">
            <h2 className="text-xl font-semibold">{automation.name}</h2>
            <p className="text-[#9B9CA0] text-sm font-light mb-2"><UiText>{" This is from comment "}</UiText></p>

            {automation.keywords.length > 0 ? (
              <div className="flex gap-x-2 flex-wrap mt-3">
                {
                  // @ts-ignore
                  automation.keywords.map((keyword, index) => (
                    <div
                      key={index}
                      className={cn(
                        "rounded-full px-4 py-1 capitalize",
                        (0 + 1) % 1 == 0 &&
                          "bg-keyword-green/15 border-2 border-keyword-green",
                        (1 + 1) % 2 == 0 &&
                          "bg-keyword-purple/15 border-2 border-keyword-purple",
                        (2 + 1) % 3 == 0 &&
                          "bg-keyword-yellow/15 border-2 border-keyword-yellow",
                        (3 + 1) % 4 == 0 &&
                          "bg-keyword-red/15 border-2 border-keyword-red"
                      )}
                    >
                      {formatKeywordDisplay(String(keyword.word ?? ""), appReviewMode)}
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="rounded-full border-2 mt-3 border-dashed border-white/60 px-3 py-1">
                <p className="text-sm text-[#bfc0c3]"><UiText>{"No Keywords"}</UiText></p>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between">
            <p className="capitalize text-sm font-light text-[#9B9CA0]">
              <LocalTime value={automation.createdAt} mode="date" />
            </p>

            <Button className="bg-background-80 hover:bg-background-80 text-white">
              {automation.active ? "Live" : "Paused"}
            </Button>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default AutomationList;
