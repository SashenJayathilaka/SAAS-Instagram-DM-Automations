"use client";

import { useUi } from "@/components/i18n/use-ui";
import { UiMessage } from "@/components/i18n/dashboard-values";
import { UiText } from "@/components/i18n/localized-copy";
import { DEFAULT_LINK_BUTTON_LABEL, MAX_LINK_BUTTONS, type LinkButton } from "@/lib/link-buttons";
import { editorStyles as s } from "./editor-layout";
import { useId } from "react";
import { Link2, MousePointer2, Plus, Trash2 } from "lucide-react";

type Props = {
  hideMessage?: boolean;
  message: string;
  linkButtons: LinkButton[];
  onChange: (next: Partial<Omit<Props, "onChange">>) => void;
};

export default function MessageResponseEditor({ message, linkButtons, onChange, hideMessage = false }: Props) {
  const tr = useUi();
  const messageId = useId();
  const buttons = linkButtons.length > 0
    ? linkButtons.slice(0, MAX_LINK_BUTTONS)
    : [{ label: tr(DEFAULT_LINK_BUTTON_LABEL), url: "" }];

  const updateButton = (index: number, partial: Partial<LinkButton>) => {
    onChange({ linkButtons: buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, ...partial } : button) });
  };

  return (
    <div className="space-y-5">
      {!hideMessage && <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label htmlFor={messageId} className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 light:text-slate-600 dark:text-slate-400"><UiText>{"DM message text"}</UiText></label>
          <span className={message.length > 1000 ? "text-xs font-bold text-red-500" : "text-xs font-bold text-slate-400 light:text-slate-600"}>{message.length}/1000</span>
        </div>
        <textarea id={messageId} dir="auto" value={message} maxLength={1000} onChange={(event) => onChange({ message: event.target.value })} rows={5} placeholder={tr("Write the message shown above your links…")} className="ap3k-textarea w-full resize-none rounded-2xl px-4 py-3 text-sm" />
      </div>}

      <div className={s.linkEditor}>
        {buttons.map((button,index)=><div key={index}>
          <div className={s.copyHeading}><strong>{tr("Button")}{buttons.length > 1 ? ` ${index+1}` : ""}</strong>{buttons.length > 1 && <button type="button" className={s.remove} aria-label={tr("Remove link {number}").replace("{number}",String(index+1))} onClick={()=>onChange({linkButtons:buttons.filter((_,i)=>i!==index)})}><Trash2 size={14}/></button>}</div>
          <div className={s.linkRow}>
            <label><Link2 size={14}/><span>{tr("Destination URL")}<input dir="ltr" type="url" aria-label={tr("Destination URL")} value={button.url} onChange={e=>updateButton(index,{url:e.target.value})} placeholder="https://example.com"/></span></label>
            <label><MousePointer2 size={14}/><span>{tr("Button label")}<input dir="auto" aria-label={tr("Button label")} value={button.label} maxLength={20} onChange={e=>updateButton(index,{label:e.target.value})} placeholder={tr("Get the Link")}/></span><small>{button.label.length}/20</small></label>
          </div>
        </div>)}
        {buttons.length < MAX_LINK_BUTTONS && <button type="button" className={s.addLink} onClick={()=>onChange({linkButtons:[...buttons,{label:tr("Link {number}").replace("{number}",String(buttons.length+1)),url:""}]})}><Plus size={13}/>{tr("Add link")}<span>· {tr("{count} more").replace("{count}",String(MAX_LINK_BUTTONS-buttons.length))}</span></button>}
      </div>
    </div>
  );
}
