"use client";
import { UiText } from "@/components/i18n/localized-copy";


import { Separator } from "@/components/ui/separator";
import { useQueryAutomations } from "@/hooks/user-queries";
import { PlaneBlue, Warning } from "@/icons";
import PostButton from "../post";

type Props = {
  id: string;
};

function ThenNode({ id }: Props) {
  const { data } = useQueryAutomations(id);
  const commentTrigger = data?.data?.trigger?.find((t) => t.type === "COMMENT");

  return !data?.data?.listener ? (
    <></>
  ) : (
    <div className="w-full lg:w-10/12 relative xl:w-6/12 p-5 rounded-xl flex flex-col bg-[#1D1D1D] gap-y-3">
      <div className="absolute h-20 left-1/2 bottom-full flex flex-col items-center z-50">
        <span className="h-[9px] w-[9px] bg-connector/10 rounded-full" />
        <Separator
          orientation="vertical"
          className="bottom-full flex-1 border-[1px] border-connector/10"
        />
        <span className="h-[9px] w-[9px] bg-connector/10 rounded-full" />
      </div>
      <div className="flex gap-x-2">
        <Warning /><UiText>{" Then... "}</UiText></div>
      <div className="bg-background-80 p-3 rounded-xl flex flex-col gap-y-2">
        <div className="flex gap-x-2 items-center">
          <PlaneBlue />
          <p className="text-lg"><UiText>{"Send the user message"}</UiText></p>
        </div>
        <p className="font-light text-text-secondary">
          {data.data.listener.prompt}
        </p>
      </div>
      {data.data.posts.length > 0 ? (
        <></>
      ) : commentTrigger ? (
        <PostButton id={id} />
      ) : (
        <></>
      )}
    </div>
  );
}

export default ThenNode;
