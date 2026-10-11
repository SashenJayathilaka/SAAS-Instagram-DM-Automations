"use client";

import { GitBranch, Mail, MessageCircle, Target, Text } from "lucide-react";
import type { Flow } from "@/lib/automation-flow/definition";
import type { FlowTrigger } from "@/lib/automation-flow/triggers";
import EditorLayout, { EditorGroup, EditorRow, editorStyles as s } from "./editor-layout";
import FlowTriggerEditor, { triggerLabel } from "./flow-trigger-editor";
import MessageResponseEditor from "./message-response-editor";
import { EditorSelect } from "./editor-select";
import FlowNodeEditor, { NODE_NAMES } from "./flow-node-editor";
import FlowPreview, { needsSeparateFlowOpening } from "./flow-preview";
import { CopyField } from "./copy-composer";

export type BasicFlowDocument = {
  flow: Flow; triggers: FlowTrigger[]; name: string; opening: string;
  openingButton: string; publicReply: string; openingEnabled: boolean;
};
export default function BasicFlowEditor({ doc, patch, slug, username, avatar, busy, live, error, save, expanded, setExpanded, posts, postsLoading, postsError, refreshPosts, updateTrigger, addTrigger, openFlow }: {
  doc: BasicFlowDocument; patch: (patch: Partial<BasicFlowDocument>) => void;
  slug: string; username?: string | null; avatar?: string | null;
  busy: boolean; live: boolean; error: string; save: (active: boolean) => void;
  expanded: string | null; setExpanded: (value: string | null) => void;
  posts: any[]; postsLoading?: boolean; postsError?: string; refreshPosts: () => void;
  updateTrigger: (trigger: FlowTrigger) => void; addTrigger: (trigger: FlowTrigger) => void; openFlow: () => void;
}) {
  const comments = doc.triggers.some(t => t.source === "COMMENT");
  const toggle = (id: string) => setExpanded(expanded === id ? null : id);
  return <EditorLayout slug={slug} name={doc.name} onNameChange={name => patch({ name })} active={live} saving={busy} onSave={save} error={error} accountName={username ?? undefined}
    preview={<FlowPreview embedded flow={doc.flow} triggers={doc.triggers} publicReply={doc.publicReply} opening={doc.opening} openingButton={doc.openingButton} username={username} avatar={avatar} />}>
    <EditorGroup title={comments ? "Setup triggers and public reply" : "Setup triggers"}>
      <EditorRow title={doc.triggers[0]?.source === "STORY" ? "Story interaction" : "Trigger"} summary={doc.triggers[0] ? triggerLabel(doc.triggers[0]) : "Choose a trigger"} icon={<Target />} open={expanded === "trigger"} onOpen={() => toggle("trigger")}>
        <FlowTriggerEditor trigger={doc.triggers[0]} posts={posts} postsLoading={postsLoading} postsError={postsError} refreshPosts={refreshPosts} onChange={updateTrigger} onAdd={addTrigger} />
      </EditorRow>
      {comments && <EditorRow title="Public comment reply" summary={doc.publicReply ? "Saved reply" : "Off"} icon={<MessageCircle />} open={expanded === "reply"} onOpen={() => toggle("reply")}>
        <CopyField label="Public comment reply" value={doc.publicReply} onChange={publicReply => patch({ publicReply })} maxLength={300} rows={3} />
      </EditorRow>}
    </EditorGroup>
    <EditorGroup title="Setup direct message">
      {doc.triggers.some(t => needsSeparateFlowOpening(doc.flow, t.source)) && <EditorRow title="Opener message" summary="Wait for a button tap" icon={<Mail />} open={expanded === "opener"} onOpen={() => toggle("opener")}>
        <label className={s.field}>Opening message<textarea rows={3} maxLength={800} value={doc.opening} onChange={e => patch({ opening: e.target.value })} /></label>
        <label className={s.field}>Button label<input maxLength={20} value={doc.openingButton} onChange={e => patch({ openingButton: e.target.value })} /></label>
      </EditorRow>}
      {doc.flow.nodes.filter(n => n.kind !== "end").map(n => <EditorRow key={n.id} title={n.label || NODE_NAMES[n.kind]} summary={n.label === NODE_NAMES[n.kind] ? undefined : NODE_NAMES[n.kind]} icon={<Text />} open={expanded === n.id} onOpen={() => toggle(n.id)}
        controls={n.kind === "message" ? <EditorSelect label="Message format" value={n.links.length ? "LINK" : "TEXT"} options={[{ value: "TEXT", label: "text" }, { value: "LINK", label: "text with button" }]} onChange={value => patch({ flow: { ...doc.flow, nodes: doc.flow.nodes.map(node => node.id === n.id ? { ...n, links: value === "LINK" ? [{ label: "Get the Link", url: "" }] : [] } : node) } })} /> : undefined}>
        {n.kind === "message" ? <>
          <CopyField label="DM message text" value={n.text} onChange={text => patch({ flow: { ...doc.flow, nodes: doc.flow.nodes.map(node => node.id === n.id ? { ...n, text } : node) } })} maxLength={1000} rows={4} />
          {n.links.length > 0 && <MessageResponseEditor hideMessage message={n.text} linkButtons={n.links} onChange={value => patch({ flow: { ...doc.flow, nodes: doc.flow.nodes.map(node => node.id === n.id ? { ...n, text: value.message ?? n.text, links: value.linkButtons ?? n.links } : node) } })} />}
        </> : <FlowNodeEditor node={n} flow={doc.flow} onChange={flow => patch({ flow })} />}
      </EditorRow>)}
      <div className={s.addons}><button type="button" onClick={openFlow}><GitBranch size={16} />Edit branches in Flow builder</button></div>
    </EditorGroup>
  </EditorLayout>;
}
