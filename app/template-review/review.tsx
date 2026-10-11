"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { TEMPLATES, templateEditorType, templateFlow, templatePreset } from "@/lib/automation-flow/templates";
import { commentTemplateDefaults } from "@/lib/automation-flow/basic-presets";
import { useWizard } from "@/hooks/use-wizard";
import CommentEditor from "@/components/automations/comment-editor";
import MessageAutomationWizard from "@/components/automations/message-automation-wizard";
import BasicFlowEditor, { type BasicFlowDocument } from "@/components/automations/basic-flow-editor";
export default function Review({ frame, templateId, dark }: { frame: boolean; templateId: string; dark: boolean }) {
  const { setTheme } = useTheme();
  useEffect(() => { if (frame) setTheme(dark ? "dark" : "light"); }, [frame, dark, setTheme]);
  const [width, setWidth] = useState(390);
  const [chosen, setChosen] = useState(templateId);
  const [night, setNight] = useState(dark);
  if (!frame) return <main className="min-h-screen bg-slate-100 p-4 text-slate-950">
    <div className="mb-4 flex flex-wrap gap-4"><select aria-label="Template" value={chosen} onChange={e => setChosen(e.target.value)}>{TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <button onClick={() => setWidth(390)}>Mobile 390px</button><button onClick={() => setWidth(1280)}>Desktop 1280px</button><button onClick={() => setNight(v => !v)}>Toggle theme</button></div>
    <iframe title="Template review" key={`${chosen}:${night}`} src={`/template-review?frame=1&template=${chosen}&dark=${night ? "1" : "0"}`} style={{ width, maxWidth: "100%", height: 850, border: 0 }} />
  </main>;
  return <div className={dark ? "dark" : "light"}><TemplateFrame templateId={templateId} /></div>;
}
function TemplateFrame({ templateId }: { templateId: string }) {
  const template = TEMPLATES.find(t => t.id === templateId)!;
  const { data: initial } = useWizard("preview", "review-only", "");
  const [data, setData] = useState({ ...initial, ...commentTemplateDefaults(templateId) });
  const preset = templatePreset(templateId);
  const [doc, setDoc] = useState<BasicFlowDocument>({ name: template?.name ?? "Template", flow: templateFlow(templateId), triggers: [{ id: "primary", ...preset }], opening: "Thanks for your comment! Tap below to continue.", openingButton: "Continue", publicReply: "{{username}} Thanks! Check your DMs. ✨", openingEnabled: true });
  const [expanded, setExpanded] = useState<string | null>("trigger");
  const [error, setError] = useState("");
  const type = templateEditorType(templateId);
  const identity = { slug: "preview", username: "ap3kautomation", avatar: "/brand/ap3k-social-avatar.png" };
  if (type === "comment") return <CommentEditor {...identity} data={data} update={patch => setData(v => ({ ...v, ...patch }))} onSave={() => setError("Preview only. No automation was published.")} saving={false} error={error} editingActive={false} posts={[]} postsLoading={false} postsFetching={false} refreshPosts={() => {}} connected accountLoading={false} accountError={false} retryAccount={() => {}} followUpsReady paid aiAvailable={false} commentOnly={false} />;
  if (type === "story" || type === "dm") return <MessageAutomationWizard {...identity} source={type === "story" ? "STORY" : "DM"} templateId={templateId} paid followUpsReady />;
  return <BasicFlowEditor {...identity} doc={doc} patch={patch => setDoc(v => ({ ...v, ...patch }))} busy={false} live={false} error={error} save={() => setError("Preview only. No automation was published.")} expanded={expanded} setExpanded={setExpanded} posts={[]} refreshPosts={() => {}} updateTrigger={trigger => setDoc(v => ({ ...v, triggers: [trigger] }))} addTrigger={trigger => setDoc(v => ({ ...v, triggers: [...v.triggers, trigger] }))} openFlow={() => setError("Use the Flow tab to review the canvas.")} />;
}
