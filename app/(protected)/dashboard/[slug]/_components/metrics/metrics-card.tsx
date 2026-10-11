"use client";
import { UiText } from "@/components/i18n/localized-copy";


import { useQueryAutomation } from "@/hooks/user-queries";

type Props = {};

function MetricsCard({}: Props) {
  const { data } = useQueryAutomation();
  const comments = data?.data.reduce((current, next) => {
    return current + next.listener?.commentCount!;
  }, 0);

  const dms = data?.data.reduce((current, next) => {
    return current + next.listener?.dmCount!;
  }, 0);

  return (
    <div className="h-full flex lg:flex-row flex-col gap-5 items-end">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="p-5 border-[1px] flex flex-col gap-y-20 rounded-xl w-full lg:w-6/12"
        >
          {i === 1 ? (
            <div>
              <h2 className="text-3xl text-white font-bold"><UiText>{"Comments"}</UiText></h2>
              <p className="text-sm text-text-secondary"><UiText>{"On your posts"}</UiText></p>
            </div>
          ) : (
            <div className="flex flex-col">
              <h2 className="text-3xl text-white font-bold"><UiText>{"Direct Messages"}</UiText></h2>
              <p className="text-sm text-text-secondary"><UiText>{"On your account"}</UiText></p>
            </div>
          )}
          {i === 1 ? (
            <div>
              <h3 className="text-3xl font-bold">100%</h3>
              <p className="text-sm text-text-secondary">
                {comments}<UiText>{" out of "}</UiText>{comments}<UiText>{" comments replied "}</UiText></p>
            </div>
          ) : (
            <div>
              <h3 className="text-3xl font-bold">100%</h3>
              <p className="text-sm text-text-secondary">
                {dms}<UiText>{" out of "}</UiText>{dms}<UiText>{" DMs replied "}</UiText></p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default MetricsCard;
