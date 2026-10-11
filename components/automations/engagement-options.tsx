"use client";
import { useId, type ReactNode } from "react";
import { Clock3, Mail, MessageCircle, UserRoundCheck } from "lucide-react";
import { UiText } from "@/components/i18n/localized-copy";
import { useUi } from "@/components/i18n/use-ui";
import type { WizardData } from "@/hooks/use-wizard";
import { FOLLOW_UP_DELAYS } from "@/lib/automation-engagement-settings";

export function EngagementOption({ title, description, enabled, onToggle, icon, children, disabled = false }: {
  title: string; description: string; enabled: boolean; onToggle: () => void; icon: ReactNode; children: ReactNode; disabled?: boolean;
}) {
  const id = useId();
  return <section className={`overflow-hidden rounded-2xl border transition-colors ${enabled ? "border-violet-300 bg-violet-50/60 dark:border-violet-400/30 dark:bg-violet-400/[0.06]" : "border-slate-200 light:border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/[0.035]"}`}>
    <button type="button" role="switch" aria-checked={enabled} aria-controls={id} disabled={disabled && !enabled} onClick={onToggle} className="flex min-h-24 w-full items-start gap-3 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500 disabled:cursor-not-allowed sm:p-5">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm dark:bg-white/5 dark:text-violet-300" aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-6 text-slate-900 dark:text-slate-100"><UiText>{title}</UiText></span><span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400"><UiText>{description}</UiText></span></span>
      <span aria-hidden="true" className={`relative mt-1.5 h-6 w-11 shrink-0 rounded-full ${enabled ? "bg-violet-600" : "bg-slate-300 dark:bg-slate-600"}`}><span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : ""}`} /></span>
    </button>
    <div id={id} hidden={!enabled} className="space-y-3 px-4 pb-5 sm:px-5">{enabled ? children : null}</div>
  </section>;
}

export default function EngagementOptions({ data, update, followUpsReady, onPreview }: {
  data: WizardData; update: (next: Partial<WizardData>) => void; followUpsReady: boolean; onPreview: (mode: "comments" | "dm") => void;
}) {
  const tr = useUi();
  const dmDisabled = !data.sendPrivateDm;
  const enableDmStep = (values: Partial<WizardData>) => { update({ ...values, openingDmEnabled: true }); onPreview("dm"); };
  return <div className="space-y-3 pt-4">
    <div className="pb-2"><h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"><UiText>{"Other things to automate"}</UiText></h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400"><UiText>{"Build the conversation around your link."}</UiText></p></div>
    <EngagementOption title="Reply under the post" description="Make people feel seen. Add up to three reply variations." enabled={data.publicReplyEnabled} icon={<MessageCircle className="h-4 w-4" />} onToggle={() => { update({ publicReplyEnabled: !data.publicReplyEnabled, ...(!data.publicReplyEnabled ? { aiReplyEnabled: false } : {}) }); onPreview("comments"); }}>
      {(["publicReply", "publicReply2", "publicReply3"] as const).map((field, index) => <label key={field} className="block"><span className="sr-only">{tr("Reply")} {index + 1}</span><input value={data[field]} onFocus={() => onPreview("comments")} onChange={event => update({ [field]: event.target.value })} maxLength={1000} dir="auto" className="ap3k-input w-full rounded-xl px-4 py-3 text-sm" /></label>)}
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-400"><UiText>{"AP3K chooses one of your replies for each matching comment."}</UiText></p>
    </EngagementOption>
    <EngagementOption title="Follow up to re-engage" description={!followUpsReady ? "Scheduled reminders are temporarily unavailable." : dmDisabled ? "Enable Send a DM to add a reminder." : "Send one reminder if they haven’t replied after receiving your link."} enabled={Boolean(data.followUpEnabled)} disabled={dmDisabled || !followUpsReady} icon={<Clock3 className="h-4 w-4" />} onToggle={() => data.followUpEnabled ? update({ followUpEnabled: false }) : enableDmStep({ followUpEnabled: true })}>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300"><UiText>{"Minimum wait before sending"}</UiText><select value={data.followUpDelayMinutes ?? 30} onChange={e => update({ followUpDelayMinutes: Number(e.target.value) })} className="ap3k-input mt-2 w-full rounded-xl px-3 py-3 text-sm">{FOLLOW_UP_DELAYS.map(minutes => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} ${tr("minutes")}` : `${minutes / 60} ${tr(minutes === 60 ? "hour" : "hours")}`}</option>)}</select></label>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300"><UiText>{"Follow-up message"}</UiText><textarea value={data.followUpMessage ?? ""} maxLength={900} rows={3} onChange={e => update({ followUpMessage: e.target.value })} className="ap3k-textarea mt-2 w-full rounded-xl px-4 py-3 text-sm" /></label>
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-400"><UiText>{"Includes your link buttons. Timing is approximate. Cancels when they reply or someone takes over the conversation. Sends only within Instagram’s 24-hour messaging window."}</UiText></p>
    </EngagementOption>
    <EngagementOption title="Ask for a follow before sharing the link" description={dmDisabled ? "Enable Send a DM to add a follow request." : "Ask non-followers to follow, then verify when they tap the button."} enabled={data.followGateRequired} disabled={dmDisabled} icon={<UserRoundCheck className="h-4 w-4" />} onToggle={() => data.followGateRequired ? update({ followGateRequired: false }) : enableDmStep({ followGateRequired: true })}>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300"><UiText>{"Follow request DM"}</UiText><textarea value={data.followRequestDmText} onChange={e => update({ followRequestDmText: e.target.value })} maxLength={640} rows={4} className="ap3k-textarea mt-2 w-full rounded-xl px-4 py-3 text-sm" /></label>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300"><UiText>{"Verification button"}</UiText><input value={data.followRequestButtonText} onChange={e => update({ followRequestButtonText: e.target.value })} maxLength={20} className="ap3k-input mt-2 w-full rounded-xl px-4 py-3 text-sm" /></label>
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-400"><UiText>{"Opening DM is enabled automatically. People who already follow skip this step."}</UiText></p>
    </EngagementOption>
    <EngagementOption title="Ask for emails in DMs" description={dmDisabled ? "Enable Send a DM to collect emails." : "Collect an email before delivering your link, with an option to skip."} enabled={Boolean(data.emailCaptureEnabled)} disabled={dmDisabled} icon={<Mail className="h-4 w-4" />} onToggle={() => data.emailCaptureEnabled ? update({ emailCaptureEnabled: false }) : enableDmStep({ emailCaptureEnabled: true })}>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300"><UiText>{"Email request"}</UiText><textarea value={data.emailCapturePrompt ?? ""} maxLength={640} rows={4} onChange={e => update({ emailCapturePrompt: e.target.value })} className="ap3k-textarea mt-2 w-full rounded-xl px-4 py-3 text-sm" /></label>
      <p className="text-xs leading-5 text-slate-600 dark:text-slate-400"><UiText>{"Saved to Contacts. AP3K adds instructions to reply SKIP or STOP. Sharing an email does not subscribe someone to marketing emails."}</UiText></p>
    </EngagementOption>
  </div>;
}
