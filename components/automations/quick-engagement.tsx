"use client";
import DelayControl from "./delay-control";
import ContactCaptureStep from "./contact-capture-step";
import type { StepDelays, AutomationStep } from "@/lib/automation-step-delays";
import UsernameField from "./username-field";
import { MentionText } from "./mention-text";
import { EditorSelect } from "./editor-select";
import css from "./engagement-step.module.css";
import { followUpDelayLabel, followUpConditionLabel } from "@/lib/automation-engagement-settings";
import { useState, type ReactNode } from "react";
import {
  Clock3,
  Mail,
  Phone,
  Inbox,
  MessageCircle,
  UserRoundCheck,
  Send,
  Eye,
  EyeOff,
  Smile,
  MousePointerClick,
  UserPlus,
  UserMinus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EditorRow, editorStyles as s } from "./editor-layout";
import UpgradeDialog, { ProBadge } from "./upgrade-dialog";
import {
  FOLLOW_UP_CONDITIONS,
  FOLLOW_UP_DELAYS,
  normalizeEngagementSettings,
  type EngagementSettings,
} from "@/lib/automation-engagement-settings";
import { useUi } from "@/components/i18n/use-ui";
export type QuickEngagementData = Partial<
  ReturnType<typeof normalizeEngagementSettings>
> & {
  followGateRequired: boolean;
  followRequestDmText: string;
  followRequestButtonText: string;
};
type Props = {
  leading?: ReactNode;
  data: QuickEngagementData;
  update: (v: Partial<QuickEngagementData>) => void;
  paid: boolean;
  followUpsReady: boolean;
  open: string | null;
  setOpen: (v: string | null) => void;
};
const conditionIcons = [
  Send,
  Eye,
  EyeOff,
  Smile,
  MousePointerClick,
  MousePointerClick,
  UserPlus,
  UserMinus,
];
export function QuickEngagementRows({
  data,
  update,
  open,
  setOpen,
  part, delayEnabled, stepDelays, onDelayChange,
}: {
  data: QuickEngagementData;
  update: Props["update"];
  open: string | null;
  setOpen: Props["setOpen"];
  part: "before" | "after";
  delayEnabled?:boolean;stepDelays?:StepDelays;onDelayChange?:(step:AutomationStep,seconds:number)=>void;
}) {
  const tr = useUi();
  const field = (
    label: string,
    key:
      | "emailCapturePrompt"
      | "phoneCapturePrompt"
      | "followRequestDmText"
      | "followUpMessage",
  ) => (
    <label className={s.field}>
      {tr(label)}
      <textarea
        value={data[key] || ""}
        rows={4}
        maxLength={640}
        dir="auto"
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  const row = (key: string) => ({
    open: open === key,
    onOpen: () => setOpen(open === key ? null : key),
  });
  if (part === "after") return data.followUpEnabled ? (
    <EditorRow title="Follow up message" controls={<EditorSelect label="Follow-up condition" value={data.followUpCondition || "ALWAYS"} onChange={followUpCondition=>update({followUpCondition})} selectedLabel={followUpConditionLabel(data.followUpCondition)} options={FOLLOW_UP_CONDITIONS.map(c=>({value:c.value,label:c.label,group:c.group}))}/>} icon={<MessageCircle/>} {...row("followup")} onRemove={()=>update({followUpEnabled:false})}>
      <div className={css.layout}><div className={css.previewColumn}><h4>{tr("Preview")}</h4><div className={css.miniPreview}><p className={css.lastMessage}>{tr("Last message")}</p><div className={css.wait}><Clock3 size={11}/>{tr(followUpDelayLabel(data.followUpDelayMinutes ?? 1))} {tr("later")}</div><p><MentionText text={data.followUpMessage || tr("Enter a message")} username="username"/></p></div></div>
      <div className={css.fields}><label className={css.label}>{tr("Timing")}</label><div className={css.timing}><EditorSelect caption="Check after" label="Check after" value={String(data.followUpDelayMinutes ?? 1)} onChange={value=>update({followUpDelayMinutes:Number(value)})} options={[...FOLLOW_UP_DELAYS.filter(m=>![15,720].includes(m)||data.followUpDelayMinutes===m).map(m=>({value:String(m),label:followUpDelayLabel(m),icon:<Clock3 size={16}/>})),{value:"1440",label:"1 day — outside Instagram’s messaging window",disabled:true}]}/></div><label className={css.label}>{tr("Follow-up message")}</label><div className={css.composer}><UsernameField label="Follow-up message" value={data.followUpMessage || ""} onChange={followUpMessage=>update({followUpMessage})} maxLength={900} rows={4} disabled={false}/></div></div></div>
    </EditorRow>
  ) : null;
  return (
    <>
      {data.followGateRequired && delayEnabled && onDelayChange && <DelayControl label="Ask to follow" seconds={stepDelays?.FOLLOW || 0} onChange={seconds=>onDelayChange("FOLLOW",seconds)}/>}
      {data.followGateRequired && (
        <EditorRow
          title="Ask to follow"
          icon={<UserRoundCheck />}
          {...row("follow")}
          onRemove={() => update({ followGateRequired: false })}
        >
          {field("Follow request DM", "followRequestDmText")}
          <label className={s.field}>
            {tr("Verification button")}
            <input
              value={data.followRequestButtonText}
              maxLength={20}
              onChange={(e) =>
                update({ followRequestButtonText: e.target.value })
              }
            />
          </label>
          <p className={s.hint}>
            {tr("People who already follow skip this step.")}
          </p>
        </EditorRow>
      )}
      {data.emailCaptureEnabled && delayEnabled && onDelayChange && <DelayControl label="Collect email" seconds={stepDelays?.EMAIL || 0} onChange={seconds=>onDelayChange("EMAIL",seconds)}/>}
      {data.emailCaptureEnabled && (
        <EditorRow
          title="Collect email"
          icon={<Mail />}
          {...row("email")}
          onRemove={() => update({ emailCaptureEnabled: false })}
        >
          <ContactCaptureStep kind="email" prompt={data.emailCapturePrompt} retry={data.emailCaptureRetryMessage} onPrompt={emailCapturePrompt=>update({emailCapturePrompt})} onRetry={emailCaptureRetryMessage=>update({emailCaptureRetryMessage})}/>
        </EditorRow>
      )}
      {data.phoneCaptureEnabled && delayEnabled && onDelayChange && <DelayControl label="Collect phone" seconds={stepDelays?.PHONE || 0} onChange={seconds=>onDelayChange("PHONE",seconds)}/>}
      {data.phoneCaptureEnabled && (
        <EditorRow
          title="Collect phone"
          icon={<Phone />}
          {...row("phone")}
          onRemove={() => update({ phoneCaptureEnabled: false })}
        >
          <ContactCaptureStep kind="phone" prompt={data.phoneCapturePrompt} retry={data.phoneCaptureRetryMessage} onPrompt={phoneCapturePrompt=>update({phoneCapturePrompt})} onRetry={phoneCaptureRetryMessage=>update({phoneCaptureRetryMessage})}/>
        </EditorRow>
      )}
    </>
  );
}
export function QuickEngagementButtons({
  leading,
  data,
  update,
  paid,
  followUpsReady,
  open,
  setOpen,
}: Props) {
  const tr = useUi();
  const [upgrade, setUpgrade] = useState(false);
  function add(key: string, v: Partial<QuickEngagementData>) {
    if (!paid) {
      setUpgrade(true);
      return;
    }
    update({ ...normalizeEngagementSettings(data), ...v });
    setOpen(key);
  }
  const badge = !paid ? <ProBadge /> : null;
  return (
    <>
      <div className={s.addons}>
        {leading}
        {!paid && (
          <>
            <button type="button" onClick={() => setUpgrade(true)}>
              <Inbox />
              {tr("Collect info")}
              {badge}
            </button>
            <button type="button" onClick={() => setUpgrade(true)}>
              <UserRoundCheck />
              {tr("Ask to follow")}
              {badge}
            </button>
            <button type="button" onClick={() => setUpgrade(true)}>
              <MessageCircle />
              {tr("Follow up message")}
              {badge}
            </button>
          </>
        )}
        {paid && (!data.emailCaptureEnabled || !data.phoneCaptureEnabled) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  if (!paid) {
                    e.preventDefault();
                    setUpgrade(true);
                  }
                }}
              >
                <Inbox />
                {tr("Collect info")}
                {badge}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="z-[60] min-w-48 rounded-2xl p-2"
            >
              {!data.emailCaptureEnabled && (
                <DropdownMenuItem
                  onSelect={() => add("email", { emailCaptureEnabled: true })}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {tr("Email")}
                </DropdownMenuItem>
              )}
              {!data.phoneCaptureEnabled && (
                <DropdownMenuItem
                  onSelect={() => add("phone", { phoneCaptureEnabled: true })}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  {tr("Phone")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {paid && !data.followGateRequired && (
          <button
            type="button"
            onClick={() => add("follow", { followGateRequired: true })}
          >
            <UserRoundCheck />
            {tr("Ask to follow")}
            {badge}
          </button>
        )}
        {paid && !data.followUpEnabled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"

                onClick={(e) => {
                  if (!paid) {
                    e.preventDefault();
                    setUpgrade(true);
                  }
                }}
              >
                <MessageCircle />
                {tr("Follow up message")}
                {badge}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="z-[60] max-h-[70dvh] min-w-60 overflow-y-auto rounded-2xl p-2"
            >
              {FOLLOW_UP_CONDITIONS.map((c, i) => {
                const Icon = conditionIcons[i];
                return (
                  <div key={c.value}>
                    {c.group &&
                      c.group !== FOLLOW_UP_CONDITIONS[i - 1]?.group && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>{tr(c.group)}</DropdownMenuLabel>
                        </>
                      )}
                    <DropdownMenuItem
                      onSelect={() =>
                        add("followup", {
                          followUpEnabled: true,
                          followUpCondition: c.value,
                          followUpDelayMinutes: 1,
                        })
                      }
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {tr(c.label)}
                    </DropdownMenuItem>
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {paid && !followUpsReady && (
        <p className={s.hint}>
          {tr("You can configure your follow-up now. Publishing requires the delivery scheduler to be ready.")}
        </p>
      )}
      <UpgradeDialog open={upgrade} onOpenChange={setUpgrade} />
    </>
  );
}
