"use client";
import type { ReactNode } from "react";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUi } from "@/components/i18n/use-ui";
import { editorStyles as s } from "./editor-layout";

export function EditorSelect({ label, value, onChange, options, caption, selectedLabel }: { label: string; value: string; onChange: (value: string) => void; caption?: string; selectedLabel?: string; options: { value: string; label: string; group?: string; disabled?: boolean; icon?: ReactNode }[] }) {
  const tr = useUi();
  return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={tr(label)} className={s.selectTrigger}><span style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4}}>{caption && <small className="text-xs text-slate-400">{tr(caption)}</small>}<SelectValue>{selectedLabel ? tr(selectedLabel) : undefined}</SelectValue></span></SelectTrigger><SelectContent className="border-slate-200 light:border-slate-300 bg-white text-slate-900 dark:border-white/10 dark:bg-[#1d1b2b] dark:text-white">{Array.from(new Set(options.map(o=>o.group || ""))).map(group=><SelectGroup key={group}>{group && <SelectLabel className="text-xs text-slate-400">{tr(group)}</SelectLabel>}{options.filter(o=>(o.group || "")===group).map(option=><SelectItem key={option.value} value={option.value} disabled={option.disabled}><span className="inline-flex items-center gap-2">{option.icon}{tr(option.label)}</span></SelectItem>)}</SelectGroup>)}</SelectContent></Select>;
}
