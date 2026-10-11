import { UiText } from "@/components/i18n/localized-copy";
import Loader from "@/components/global/loader";
import SubscriptionPlan from "@/components/global/subscription-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AUTOMATION_LISTENERS } from "@/constants/automation";
import { useListener } from "@/hooks/use-automation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TriggerButton from "../trigger-button";

type Props = {
  id: string;
};

function ThenActions({ id }: Props) {
  const {
    onSetListener,
    onFormSubmit,
    register,
    isPending,
    listener: Listener,
  } = useListener(id);

  return (
    <TriggerButton label="Then">
      <div className="flex flex-col gap-y-2">
        {AUTOMATION_LISTENERS.map((listener) =>
          listener.type === "SMARTAI" ? (
            <SubscriptionPlan key={listener.id} type="PRO">
              <div
                //onClick={() => onSetListener(listener.type)}
                onClick={() =>
                  toast("Sorry, This moment not available SMART-AI Fetcher")
                }
                key={listener.id}
                className={cn(
                  Listener === listener.type
                    ? "bg-gradient-to-br from-[#3352CC] to-[#1C2D70]"
                    : "bg-background-80",
                  "p-3 rounded-xl flex flex-col gap-y-2 cursor-pointer hover:opacity-80 transition duration-100"
                )}
              >
                <div className="flex gap-x-2 items-center">
                  {listener.icon}
                  <p>{listener.label}</p>
                </div>
                <p>{listener.description}</p>
              </div>
            </SubscriptionPlan>
          ) : (
            <div
              onClick={() => onSetListener(listener.type)}
              key={listener.id}
              className={cn(
                Listener === listener.type
                  ? "bg-gradient-to-br from-[#3352CC] to-[#1C2D70]"
                  : "bg-background-80",
                "p-3 rounded-xl flex flex-col gap-y-2 cursor-pointer hover:opacity-80 transition duration-100"
              )}
            >
              <div className="flex gap-x-2 items-center">
                {listener.icon}
                <p>{listener.label}</p>
              </div>
              <p>{listener.description}</p>
            </div>
          )
        )}
      </div>
      <form onSubmit={onFormSubmit} className="flex flex-col gap-y-2">
        <Textarea
          placeholder={
            Listener === "SMARTAI"
              ? "Add a prompt that your smart ai can use..."
              : "Add a message you want send to your customers"
          }
          {...register("prompt")}
          className="bg-background-80 outline-none border-none ring-0 focus:ring-0"
        />
        <Input
          {...register("reply")}
          placeholder="Add a reply for comments (Optional)"
          className="bg-background-80 outline-none border-none ring-0 focus:ring-0"
        />
        <Button className="bg-gradient-to-br w-full from-[#3352CC] font-medium text-white to-[#1C2D70]">
          <Loader state={isPending}><UiText>{"Add listener"}</UiText></Loader>
        </Button>
      </form>
    </TriggerButton>
  );
}

export default ThenActions;
