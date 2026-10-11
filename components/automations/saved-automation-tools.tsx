"use client";
import { useEffect, useState } from "react";
import { getSavedPolicyInput } from "@/actions/automation-policy";
import { getBacktrackInfo } from "@/actions/automation-tools";
import type { PolicyScanInput } from "@/lib/automation-policy";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BacktrackDialog, PublishedDialog, ViewMediaDialog } from "./automation-tools-dialogs";
import PolicyScanDialog from "./policy-scan-dialog";
export type AutomationTool = "backtrack" | "media" | "scan" | "published";
export function publishPreferenceKey(slug:string) { return `ap3k:publish-next-steps:${slug}`; }
export function showPublishedTools(slug:string) { try { return localStorage.getItem(publishPreferenceKey(slug)) !== "true"; } catch { return true; } }
export default function SavedAutomationTools({automationId,slug,tool,onClose}:{automationId:string;slug:string;tool:AutomationTool;onClose:()=>void}) {
  const [current,setCurrent]=useState(tool);
  const [input,setInput]=useState<PolicyScanInput|null>(null);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const [backtrackEligible,setBacktrackEligible]=useState(false);
  useEffect(()=>{let cancelled=false; if(current!=="published") return;
    void getBacktrackInfo(automationId).then(info=>{if(!cancelled)setBacktrackEligible(info.ok && info.eligible);}).catch(()=>{});
    return()=>{cancelled=true;};
  },[automationId,current]);
  useEffect(()=>{let cancelled=false; if(current!=="scan")return;
    setError("");setInput(null);
    void getSavedPolicyInput(automationId).then(value=>{if(cancelled)return; if(value)setInput(value);else setError("Could not load this automation. Check your selected Instagram account and try again.");}).catch(()=>{if(!cancelled)setError("Could not load this automation. Try again.");});
    return()=>{cancelled=true;};
  },[automationId,current,retry]);
  const close=(open:boolean)=>{if(!open)onClose();};
  if(current==="backtrack")return <BacktrackDialog open onOpenChange={close} automationId={automationId}/>;
  if(current==="media")return <ViewMediaDialog open onOpenChange={close} automationId={automationId}/>;
  if(current==="published")return <PublishedDialog open onOpenChange={close} onBacktrack={backtrackEligible?()=>setCurrent("backtrack"):undefined} onScan={()=>setCurrent("scan")} preferenceKey={publishPreferenceKey(slug)}/>;
  if(input)return <PolicyScanDialog open onOpenChange={close} input={input} slug={slug}/>;
  return <Dialog open onOpenChange={close}><DialogContent><DialogTitle>AI Meta Policy Safety check</DialogTitle><DialogDescription>{error || "Loading your automation…"}</DialogDescription>{error&&<button className="ap3k-table-action" onClick={()=>setRetry(n=>n+1)}>Try again</button>}</DialogContent></Dialog>;
}
