import { UiText } from "@/components/i18n/localized-copy";
import { Input } from "@/components/ui/input";
import { useKeywords } from "@/hooks/use-automation";
import { useMutationDataState } from "@/hooks/use-mutation-data";
import { useQueryAutomations } from "@/hooks/user-queries";
import { X } from "lucide-react";

type Props = {
  id: string;
};

function Keywords({ id }: Props) {
  const { deleteMutation, keywords, onKeyPress, onValueChange } =
    useKeywords(id);

  const { latestVariable } = useMutationDataState(["add-keywords"]);
  const { data } = useQueryAutomations(id);

  return (
    <div className="bg-background-80 flex flex-col gap-y-3 p-3 rounded-xl">
      <p className="text-sm text-text-secondary"><UiText>{"Add words that trigger automation"}</UiText></p>
      <div className="flex flex-wrap justify-start gap-2 items-center">
        {data?.data?.keywords &&
          data.data.keywords.length > 0 &&
          data.data.keywords.map(
            (keyword) =>
              keyword.id !== latestVariable.variables.id && (
                <div
                  key={keyword.id}
                  className="bg-background-90 flex items-center gap-x-2 capitalize text-text-secondary py-1 px-4 rounded-full"
                >
                  <p>{keyword.word}</p>
                  <X
                    size={20}
                    onClick={() => deleteMutation({ id: keyword.id })}
                  />
                </div>
              )
          )}
        {latestVariable && latestVariable.status === "pending" && (
          <div className="bg-background-90 flex items-center gap-x-2 capitalize text-text-secondary py-1 px-4 rounded-full">
            {latestVariable.variables.keyword}
          </div>
        )}
        <Input
          placeholder="Add Keyword..."
          /* style={{
            width: Math.min(Math.max(keywords.length || 10, 2), 50) + "ch",
          }} */
          value={keywords}
          className="p-0 bg-transparent ring-0 border-none outline-none"
          onChange={onValueChange}
          onKeyUp={onKeyPress}
        />
      </div>
    </div>
  );
}

export default Keywords;
