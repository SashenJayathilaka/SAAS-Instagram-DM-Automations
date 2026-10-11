"use client";
import Link from "next/link";
import { ContactRound, CornerUpRight } from "lucide-react";
import { dashboardEntryPath } from "@/lib/dashboard";
import { DEFAULT_EMAIL_CAPTURE_PROMPT, DEFAULT_EMAIL_CAPTURE_RETRY, DEFAULT_PHONE_CAPTURE_PROMPT, DEFAULT_PHONE_CAPTURE_RETRY } from "@/lib/automation-engagement-settings";
import { useUi } from "@/components/i18n/use-ui";
import UsernameField from "./username-field";
import { MentionText } from "./mention-text";
import css from "./engagement-step.module.css";

export default function ContactCaptureStep({ kind, prompt, retry, onPrompt, onRetry }: {kind:"email"|"phone";prompt?:string;retry?:string;onPrompt:(v:string)=>void;onRetry:(v:string)=>void}) {
  const tr=useUi();
  const ask=prompt ?? (kind==="email"?DEFAULT_EMAIL_CAPTURE_PROMPT:DEFAULT_PHONE_CAPTURE_PROMPT);
  const retryMessage=retry ?? (kind==="email"?DEFAULT_EMAIL_CAPTURE_RETRY:DEFAULT_PHONE_CAPTURE_RETRY);
  return <div className={css.layout}>
    <div className={css.previewColumn}><h4>{tr("Preview")}</h4><div className={css.miniPreview}>
      <p><MentionText text={ask} username="username"/></p>
      <div className={css.captureAnswer}>{kind==="email"?"someone@mail.com":"+1 (949) 653-7130"}</div>
      <div className={css.wait}>{tr("If invalid")}</div>
      <p><MentionText text={retryMessage} username="username"/></p>
    </div></div>
    <div className={css.fields}>
      <label className={css.label}>{tr("Ask message")}</label>
      <div className={css.composer}><UsernameField label={`${kind==="email"?"Email":"Phone"} ask message`} value={ask} onChange={onPrompt} maxLength={900} rows={4} disabled={false}/></div>
      <div className={css.retryCondition}><span><CornerUpRight size={16}/>{tr(kind==="email"?"If their reply isn't a valid email":"If their reply isn't a valid phone")}</span></div>
      <label className={css.label}>{tr("Retry message")}</label>
      <div className={css.composer}><UsernameField label={`${kind==="email"?"Email":"Phone"} retry message`} value={retryMessage} onChange={onRetry} maxLength={900} rows={4} disabled={false}/></div>
      <p className={css.contactsNote}><ContactRound size={16}/><span>{tr("Replies are saved to")} <Link href={dashboardEntryPath("/contacts")}>{tr("Contacts")}</Link>, {tr("ready to export or sync.")}</span></p>
    </div>
  </div>;
}
