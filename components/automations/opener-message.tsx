"use client";
import { Mail, CornerDownRight, Link2, TextCursorInput } from "lucide-react";
import { useUi } from "@/components/i18n/use-ui";
import { EditorRow } from "./editor-layout";
import { EditorSelect } from "./editor-select";
import UsernameField from "./username-field";
import { MentionText } from "./mention-text";
import css from "./engagement-step.module.css";
export type OpenerData = {openingDmText:string;openingDmButtonText:string;openingDmFormat?:"BUTTON"|"QUICK_REPLY"};
export default function OpenerMessage({data,update,open,onOpen,onRemove}:{data:OpenerData;update:(value:Partial<OpenerData>)=>void;open:boolean;onOpen:()=>void;onRemove:()=>void}) {
 const tr=useUi();const quick=data.openingDmFormat==="QUICK_REPLY";
 return <EditorRow title="Opener message" icon={<Mail/>} open={open} onOpen={onOpen} onRemove={onRemove} controls={<EditorSelect label="Opener format" value={quick?"QUICK_REPLY":"BUTTON"} onChange={value=>update({openingDmFormat:value as OpenerData["openingDmFormat"]})} options={[{value:"BUTTON",label:"text with button"},{value:"QUICK_REPLY",label:"text with quick reply"}]}/> }>
  <div className={css.layout}><div className={css.previewColumn}><h4>{tr("Preview")}</h4><div className={css.miniPreview}><p><MentionText text={data.openingDmText||tr("Enter a message")} username="username"/></p><span className={quick?css.quickReply:css.button}>{data.openingDmButtonText||tr("Get the link")}</span></div></div>
  <div className={css.fields}><label className={css.label}>{tr("Message")}</label><div className={css.composer}><UsernameField label="Opener message" value={data.openingDmText} onChange={openingDmText=>update({openingDmText})} maxLength={640} rows={3} disabled={false}/></div><label className={css.label}>{tr(quick?"Quick reply":"Button")}</label>{quick&&<p className={css.help}>{tr("Sits under the message as a tappable chip. It disappears once tapped and can’t be shown again in that thread.")}</p>}<div className={css.actionCard}><div className={css.actionInput}>{quick?<Link2 size={16}/>:<TextCursorInput size={16}/>}<label><small>{tr(quick?"Chip label":"Button label")}</small><input aria-label={tr(quick?"Chip label":"Button label")} value={data.openingDmButtonText} maxLength={20} onChange={e=>update({openingDmButtonText:e.target.value})}/></label><small>{data.openingDmButtonText.length}/20</small></div><div className={css.nextStep}><CornerDownRight size={16}/><div><small>{tr("When tapped")}</small><span>{tr("Continue to next step")}</span></div></div></div></div></div>
 </EditorRow>;
}
