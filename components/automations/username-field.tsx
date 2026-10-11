"use client";
import { useLayoutEffect, useRef } from "react";
import { useUi } from "@/components/i18n/use-ui";
import { editorStyles as s } from "./editor-layout";
const tokenPattern = /(@?\{\{username\}\}|@?\bUsername\b)/gi;
function read(node: Node): string {
  if (node instanceof HTMLElement && node.dataset.usernameToken) return "{{username}}";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeName === "BR") return "\n";
  return Array.from(node.childNodes).map(read).join("") + (node.nodeName === "DIV" ? "\n" : "");
}
export default function UsernameField({ label, value, onChange, maxLength, rows, disabled }: {label:string;value:string;onChange:(v:string)=>void;maxLength:number;rows:number;disabled:boolean}) {
  const tr=useUi(); const ref=useRef<HTMLDivElement>(null); const last=useRef<string>();
  function render(text: string) {
    const field=ref.current; if(!field) return;
    field.replaceChildren(...text.split(tokenPattern).filter(Boolean).map(part=>{
      if (/^@?(?:\{\{username\}\}|Username)$/i.test(part)) {
        const chip=document.createElement("span");chip.dataset.usernameToken="true";chip.contentEditable="false";chip.className=s.usernameToken;chip.textContent=tr("Username");return chip;
      }
      return document.createTextNode(part);
    }));
  }
  useLayoutEffect(()=>{if(value!==last.current){render(value);last.current=value;}},[value,tr]);
  function changed(){if(!ref.current)return; const next=Array.from(ref.current.childNodes).map(read).join("").slice(0,maxLength);last.current=next;onChange(next);if((ref.current.textContent?.length||0)>maxLength)render(next);}
  function insert(text: string){
    const field=ref.current;if(!field)return;field.focus();
    const selection=window.getSelection();let range=selection?.rangeCount ? selection.getRangeAt(0) : null;
    if(!range || !field.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(field);range.collapse(false);}
    range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection?.removeAllRanges();selection?.addRange(range);changed();
    // Render the new token, then place the caret after it.
    if(text==="{{username}}") {render(Array.from(field.childNodes).map(read).join(""));range.selectNodeContents(field);range.collapse(false);selection?.removeAllRanges();selection?.addRange(range);}
  }
  return <><div ref={ref} className={s.tokenInput} role="textbox" aria-label={tr(label)} aria-multiline="true" aria-disabled={disabled} contentEditable={!disabled} suppressContentEditableWarning style={{minHeight:`${rows*1.6+1.5}em`}} dir="auto" onBlur={()=>render(value)} onInput={changed} onPaste={e=>{e.preventDefault();insert(e.clipboardData.getData("text/plain").slice(0,Math.max(0,maxLength-value.length)));}} onKeyDown={e=>{if(value.length>=maxLength && e.key.length===1 && !e.metaKey && !e.ctrlKey)e.preventDefault();}}/><div className={s.copyFooter}><span>{value.length}/{maxLength}</span><button type="button" title={tr("Insert username")} aria-label={tr("Insert username")} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>{if(value.length+12<=maxLength)insert("{{username}}");}}>{"{}"}</button></div></>;
}
