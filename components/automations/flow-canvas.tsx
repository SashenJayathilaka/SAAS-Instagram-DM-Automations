"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  MarkerType,
  applyNodeChanges,
  type Node,
  type NodeProps,
  type Connection,
  type NodeChange,
  type OnConnectEnd,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import {
  Copy,
  Diamond,
  Filter,
  Flag,
  GitBranch,
  LayoutGrid,
  Hourglass,
  Instagram,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Shuffle,
  Webhook,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  edges,
  type Flow,
  type FlowNode,
} from "@/lib/automation-flow/definition";
import { appendFlowNode, connectFlow } from "@/lib/automation-flow/connections";
import { clampCanvasPosition, moveCanvasNodes, syncCanvasNodes } from "@/lib/automation-flow/canvas-state";
import { compactFlowCanvas } from "@/lib/automation-flow/layout";
import FlowNodeEditor, {
  newFlowNode,
  NODE_NAMES,
} from "./flow-node-editor";
import "@xyflow/react/dist/style.css";
import "./flow-workspace.css";

type GraphData = {
  node?: FlowNode;
  triggers?: Array<{ id: string; label: string; detail: string }>;
  onTrigger?: (id?: string) => void;
};
type GraphNode = Node<GraphData>;
type PendingConnection = {
  source: string;
  slot: number;
  position: { x: number; y: number };
  menuPosition: { x: number; y: number };
};
const iconMap: Record<FlowNode["kind"], typeof Send> = {
  message: Send,
  question: Send,
  product: Send,
  carousel: Send,
  email: Mail,
  phone: MessageCircle,
  capture: MessageCircle,
  delay: Hourglass,
  condition: Filter,
  random: Shuffle,
  tag: Tag,
  webhook: Webhook,
  setfield: Tag,
  end: Flag,
};
function AutomationNode({ data, selected }: NodeProps<GraphNode>) {
  const n = data.node;
  if (!n)
    return (
      <div
        className={`flow-card flow-trigger ${selected ? "is-selected" : ""}`}
      >
        <div className="flex items-center gap-2 px-[14px] py-[17px] text-[12px] font-medium">
          <Diamond size={16} fill="currentColor" />
          Begin when…
        </div>
        <p className="px-[14px] pb-4 text-[12px] leading-5 text-slate-500 light:text-slate-600 dark:text-slate-400">
          A Trigger is an action that initiates your Flow. Click to add one.
        </p>
        <div className="space-y-2 px-[14px]">
          {data.triggers?.map((t) => (
            <button
              key={t.id}
              onClick={() => data.onTrigger?.(t.id)}
              className="nodrag flex w-full items-center gap-3 rounded-md bg-[#f5f5f5] px-3 py-3 text-left dark:bg-white/5"
            >
              <Instagram size={20} className="shrink-0 text-pink-500" />
              <span className="min-w-0">
                <strong className="block text-[12px] font-semibold">
                  {t.label}
                </strong>
                <span className="mt-1 block truncate text-[11px] text-slate-500 light:text-slate-600 dark:text-slate-400">
                  {t.detail}
                </span>
              </span>
            </button>
          ))}
          <button
            onClick={() => data.onTrigger?.()}
            className="nodrag flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-violet-400 text-[12px] text-violet-600 dark:text-violet-300"
          >
            <Plus size={16} />
            New Trigger
          </button>
        </div>
        <div className="relative mt-2 flex justify-end p-[14px] text-xs">
          Then
          <Handle className="flow-output-handle" aria-label="Drag Then to connect or add a node" type="source" position={Position.Right} id="out-0" />
        </div>
      </div>
    );
  const Icon = iconMap[n.kind];
  const outputs = edges(n);
  const isMessage = [
    "message",
    "question",
    "product",
    "carousel",
    "email",
    "phone",
    "capture",
  ].includes(n.kind);
  return (
    <div className={`flow-card ${selected ? "is-selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div
        className={`flex items-center gap-2.5 px-[14px] py-[14px] text-[12px] ${n.kind === "delay" ? "text-rose-700 dark:text-rose-300" : n.kind === "condition" ? "text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-200"}`}
      >
        <Icon size={18} />
        <div>
          {isMessage && (
            <span className="block text-[10px] leading-4 text-slate-400 light:text-slate-600">
              Instagram
            </span>
          )}
          <strong className="font-medium">
            {isMessage ? "Send message" : NODE_NAMES[n.kind]}
          </strong>
        </div>
      </div>
      {isMessage && (
        <div className="mx-[14px] mb-3 space-y-2 rounded-lg bg-[#f5f5f5] p-2.5 text-[12px] leading-5 dark:bg-white/5">
          {n.kind === "product" && n.image && (
            /* eslint-disable-next-line @next/next/no-img-element */ <img
              src={n.image}
              alt={n.text}
              className="max-h-36 w-full rounded-md object-cover"
            />
          )}
          {n.kind === "carousel" && (
            <div className="flex gap-2 overflow-hidden">
              {n.cards.map((c, i) => (
                <div
                  key={i}
                  className="w-40 shrink-0 rounded-lg border border-slate-200 light:border-slate-300 bg-white p-2 dark:border-white/10 dark:bg-slate-800"
                >
                  {c.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */ <img
                      src={c.image}
                      alt={c.title}
                      className="mb-2 h-20 w-full rounded object-cover"
                    />
                  )}
                  {c.title || `Card ${i + 1}`}
                  <p className="text-[10px] text-slate-400 light:text-slate-600">
                    {c.links.length} link buttons
                  </p>
                </div>
              ))}
            </div>
          )}
          {"text" in n && (
            <p dir="auto" className="whitespace-pre-wrap break-words">
              {n.text || (
                <span className="text-slate-400 light:text-slate-600">Enter your message…</span>
              )}
            </p>
          )}
          {"links" in n &&
            n.links.map((l, i) => (
              <div
                key={i}
                className="rounded-xl border border-black/5 bg-white px-2 py-1.5 text-center text-[11px] dark:border-white/10 dark:bg-slate-800"
              >
                {l.label || "Button text"}
              </div>
            ))}
          {n.kind === "question" &&
            n.options.map((o, i) => (
              <div
                key={i}
                className="relative rounded-xl border border-black/5 bg-white px-2 py-1.5 text-center text-[11px] dark:border-white/10 dark:bg-slate-800"
              >
                {o.label}
                <Handle
                  className="flow-output-handle"
                  aria-label={`Drag ${o.label} to connect or add a node`}
                  type="source"
                  position={Position.Right}
                  id={`out-${i}`}
                />
              </div>
            ))}
          {["email", "phone", "capture"].includes(n.kind) && (
            <p className="text-[10px] text-violet-500 light:text-violet-700">
              Wait for {n.kind === "capture" ? "a reply" : `a valid ${n.kind}`}
            </p>
          )}
        </div>
      )}
      {n.kind === "delay" && (
        <p className="px-[14px] pb-2 text-xs">
          Wait{" "}
          <strong>
            {n.seconds < 60
              ? `${n.seconds} seconds`
              : n.seconds < 3600
                ? `${n.seconds / 60} minutes`
                : `${n.seconds / 3600} hours`}
          </strong>{" "}
          and continue
        </p>
      )}
      {n.kind === "condition" && (
        <p className="px-[14px] pb-2 text-xs">
          {n.field.replace(/^_/, "")} {n.operator ?? "eq"} {n.equals}
        </p>
      )}
      {n.kind === "tag" && (
        <p className="px-[14px] pb-2 text-xs">
          {n.action === "remove" ? "Remove" : "Add"} tag: {n.tag}
        </p>
      )}
      {n.kind === "webhook" && (
        <p className="px-[14px] pb-2 text-xs">
          POST JSON to your connected service
        </p>
      )}
      {n.kind === "setfield" && (
        <p className="px-[14px] pb-2 text-xs">
          {n.field} = {n.value || "…"}
        </p>
      )}
      {n.kind !== "question" &&
        outputs.map((o, i) => (
          <div
            key={i}
            className="relative flex min-h-8 justify-end px-[14px] pb-3 pt-1 text-[11px]"
          >
            {outputs.length === 1
              ? "Then"
              : n.kind === "condition" && i === 1
                ? "Doesn’t match any"
                : o.label}
            <Handle className="flow-output-handle" aria-label="Drag to connect or add a node" type="source" position={Position.Right} id={`out-${i}`} />
          </div>
        ))}
    </div>
  );
}
const nodeTypes = { automation: AutomationNode };
export default function FlowCanvas({
  flow,
  onChange,
  triggers = [],
  onEditTrigger,
  triggerPanelOpen = false,
  onOpenStep,
}: {
  flow: Flow;
  onChange: (f: Flow) => void;
  triggers?: GraphData["triggers"];
  onEditTrigger?: (id?: string) => void;
  triggerPanelOpen?: boolean;
  onOpenStep?: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  useEffect(() => { if (triggerPanelOpen) setEdit(false); }, [triggerPanelOpen]);
  const [menu, setMenu] = useState(false);
  const [subMenu, setSubMenu] = useState<"message" | "action" | null>(null);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const menuElement = useRef<HTMLDivElement>(null);
  const instance = useRef<ReactFlowInstance<GraphNode> | null>(null);
  const lastDrop = useRef(-Infinity);
  const closeMenu = () => {
    setMenu(false);
    setSubMenu(null);
    setPending(null);
  };
  useEffect(() => {
    if (menu) menuElement.current?.focus();
  }, [menu]);
  const graphNodes = useMemo<GraphNode[]>(
    () => [
      {
        id: "__trigger",
        type: "automation",
        position: flow.triggerPosition ?? { x: 80, y: 160 },
        data: { triggers, onTrigger: onEditTrigger },
        deletable: false,
      },
      ...flow.nodes.map((n) => ({
        id: n.id,
        type: "automation",
        position: { x: n.x, y: n.y },
        data: { node: n },
      })),
    ],
    [flow, triggers, onEditTrigger],
  );
  const [nodes, setNodes] = useState<GraphNode[]>(graphNodes);
  useEffect(
    () =>
      setNodes((current) => syncCanvasNodes(current, graphNodes, selected)),
    [graphNodes, selected],
  );
  const graphEdges = useMemo(
    () =>
      [
        ...(flow.entry && flow.nodes.some((n) => n.id === flow.entry)
          ? [
              {
                id: "__entry",
                source: "__trigger",
                sourceHandle: "out-0",
                target: flow.entry,
              },
            ]
          : []),
        ...flow.nodes.flatMap((n) =>
          edges(n).flatMap((e, i) =>
            e.target
              ? [
                  {
                    id: `${n.id}:${i}`,
                    source: n.id,
                    sourceHandle: `out-${i}`,
                    target: e.target,
                  },
                ]
              : [],
          ),
        ),
      ].map((e) => ({
        ...e,
        type: "default",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: resolvedTheme === "dark" ? "#69748b" : "#64748b",
        },
        style: {
          stroke: resolvedTheme === "dark" ? "#69748b" : "#64748b",
          strokeWidth: 1.25,
        },
        interactionWidth: 20,
      })),
    [flow, resolvedTheme],
  );
  const removeMany = (
    ids: string[],
    deletedEdges: Array<{ source: string; sourceHandle?: string | null }> = [],
  ) => {
    const removed = new Set(ids.filter((id) => id !== "__trigger"));
    let next = {
      ...flow,
      entry: removed.has(flow.entry) ? "" : flow.entry,
      nodes: flow.nodes.filter((n) => !removed.has(n.id)),
    };
    for (const n of next.nodes)
      edges(n).forEach((e, i) => {
        if (e.target && removed.has(e.target))
          next = connectFlow(next, n.id, i, null);
      });
    for (const e of deletedEdges)
      if (!removed.has(e.source))
        next = connectFlow(
          next,
          e.source,
          Number(e.sourceHandle?.replace("out-", "") ?? 0),
          null,
        );
    onChange(next);
    setSelected(null);
    setEdit(false);
  };
  const remove = (id: string) => removeMany([id]);
  const add = (kind: FlowNode["kind"]) => {
    if (flow.nodes.length >= 50) return;
    const n = newFlowNode(kind, flow.nodes.length);
    const bounds = workspace.current?.getBoundingClientRect();
    const position = pending?.position ?? (bounds && instance.current?.screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    }));
    if (position) Object.assign(n, clampCanvasPosition(position));
    if (!pending) {
      // Toolbar additions should be visible, without stacking on another card.
      for (let attempt = 0; attempt < 20; attempt++) {
        const overlap = nodes.find((old) =>
          n.x < old.position.x + (old.measured?.width ?? 320) + 24 &&
          n.x + 320 + 24 > old.position.x &&
          n.y < old.position.y + (old.measured?.height ?? 260) + 24 &&
          n.y + 260 + 24 > old.position.y,
        );
        if (!overlap) break;
        n.y = Math.min(6000, overlap.position.y + (overlap.measured?.height ?? 260) + 48);
      }
    }
    const next = appendFlowNode(flow, n, pending);
    if (next === flow) return;
    onChange(next);
    setSelected(n.id);
    setEdit(true);
    closeMenu();
  };
  const onConnectEnd: OnConnectEnd = (event, state) => {
    if (state.isValid || !state.fromNode || state.fromHandle?.type !== "source") return;
    const pointer = "changedTouches" in event ? event.changedTouches[0] : event;
    if (!pointer || !instance.current || !workspace.current) return;
    // A failed drop on a card, toolbar, or settings panel is not an empty-space drop.
    const target = document.elementFromPoint(pointer.clientX, pointer.clientY);
    if (!target?.classList.contains("react-flow__pane") || !workspace.current.contains(target)) return;
    const bounds = workspace.current.getBoundingClientRect();
    setPending({
      source: state.fromNode.id,
      slot: Number(state.fromHandle.id?.replace("out-", "") ?? 0),
      position: clampCanvasPosition(instance.current.screenToFlowPosition({
        x: pointer.clientX, y: pointer.clientY,
      })),
      menuPosition: {
        x: Math.max(8, Math.min(pointer.clientX - bounds.left, bounds.width - 248)),
        y: Math.max(8, Math.min(pointer.clientY - bounds.top, bounds.height - 420)),
      },
    });
    lastDrop.current = performance.now();
    setSelected(null);
    setEdit(false);
    setSubMenu(null);
    setMenu(true);
  };
  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target && c.target !== "__trigger")
        onChange(
          connectFlow(
            flow,
            c.source,
            Number(c.sourceHandle?.replace("out-", "") ?? 0),
            c.target,
          ),
        );
    },
    [flow, onChange],
  );
  const node = flow.nodes.find((n) => n.id === selected);
  const onNodeChanges = (changes: NodeChange<GraphNode>[]) =>
    setNodes((current) => applyNodeChanges(changes, current));
  return (
    <div
      ref={workspace}
      className="flow-workspace relative h-full w-full"
      onKeyDown={(event) => {
        if (event.key === "Escape") { closeMenu(); setEdit(false); }
      }}
    >
      <ReactFlow<GraphNode>
        nodes={nodes}
        edges={graphEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodeChanges}
        onConnect={onConnect}
        onInit={(api) => { instance.current = api; }}
        onConnectStart={closeMenu}
        onConnectEnd={onConnectEnd}
        onNodeDragStart={() => { setEdit(false); closeMenu(); }}
        onNodeClick={(_, n) => {
          closeMenu();
          setSelected(n.id);
          if (n.id !== "__trigger") { onOpenStep?.(); setEdit(true); }
        }}
        onPaneClick={() => {
          if (performance.now() - lastDrop.current < 250) return;
          setEdit(false);
          closeMenu();
          setSelected(null);
        }}
        onNodeDragStop={(_, n, dragged) => {
          onChange(moveCanvasNodes(flow, dragged.length ? dragged : [n]));
        }}
        onDelete={({ nodes: deletedNodes, edges: deletedEdges }) =>
          removeMany(
            deletedNodes.map((n) => n.id),
            deletedEdges,
          )
        }
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        panOnDrag
        panOnScroll
        zoomOnScroll={false}
        zoomOnPinch
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1, nodes: [{ id: "__trigger" }, { id: flow.entry }] }}
        nodeExtent={[
          [0, 0],
          [6000, 6000],
        ]}
        deleteKeyCode={["Backspace", "Delete"]}
        connectionRadius={30}
        ariaLabelConfig={{
          "controls.zoomIn.ariaLabel": "Zoom in",
          "controls.zoomOut.ariaLabel": "Zoom out",
          "controls.fitView.ariaLabel": "Fit view",
          "controls.interactive.ariaLabel": "Toggle interactivity",
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.5}
          color={resolvedTheme === "dark" ? "#263247" : "#b8c4d4"}
        />
        <Controls showInteractive={false} position="bottom-left" fitViewOptions={{ padding: 0.15, maxZoom: 1 }} />
      </ReactFlow>
      <button
        aria-label="Compact flow spacing"
        title="Compact flow spacing"
        onClick={() => {
          closeMenu();
          setEdit(false);
          onChange(compactFlowCanvas(flow, nodes));
          requestAnimationFrame(() => {
            void instance.current?.fitView({ padding: 0.15, maxZoom: 1, duration: 250 });
          });
        }}
        className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-slate-200 light:border-slate-300 bg-white px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-[#192233]"
      >
        <LayoutGrid size={15} /> Compact layout
      </button>
      <button
        aria-label="Add node"
        onClick={() => {
          setPending(null);
          setEdit(false);
          setMenu(!menu);
          setSubMenu(null);
        }}
        className="absolute bottom-[160px] left-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-violet-600 text-white shadow-lg transition hover:bg-violet-500"
      >
        <Plus size={23} />
      </button>
      {menu && (
        <div
          ref={menuElement}
          tabIndex={-1}
          role="dialog"
          aria-label={pending ? "Add a connected node" : "Add node"}
          style={pending ? { left: pending.menuPosition.x, top: pending.menuPosition.y, maxHeight: `calc(100% - ${pending.menuPosition.y + 12}px)` } : { left: 64, bottom: 12 }}
          className="absolute z-30 max-h-[calc(100%_-_24px)] w-[240px] max-w-[calc(100%_-_24px)] overflow-y-auto rounded-2xl border border-slate-200 light:border-slate-300 bg-white p-2 shadow-xl outline-none dark:border-white/10 dark:bg-[#1b2334]"
        >
          <button aria-label="Cancel adding node" onClick={closeMenu} className="float-right rounded p-2 text-slate-500 light:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={14} />
          </button>
          {pending && <p className="px-3 pt-2 text-xs text-violet-600 dark:text-violet-300">Choose a node to connect here</p>}
          {flow.nodes.length >= 50 && <p role="status" className="px-3 py-2 text-xs text-amber-600 light:text-amber-800">This flow has reached the 50-node limit.</p>}
          <p className="px-3 py-2 text-xs font-semibold text-slate-400 light:text-slate-600">
            {subMenu === "message"
              ? "Message type"
              : subMenu === "action"
                ? "Choose an action"
                : "Add node"}
          </p>
          {(subMenu === "message"
            ? [
                "message",
                "question",
                "product",
                "carousel",
                "email",
                "phone",
                "capture",
              ]
            : subMenu === "action"
              ? ["tag", "setfield", "webhook", "end"]
              : ["message", "delay", "condition", "tag", "random"]
          ).map((k) => (
            <button
              key={k}
              disabled={flow.nodes.length >= 50}
              onClick={() => {
                if (!subMenu && k === "message") setSubMenu("message");
                else if (!subMenu && k === "tag") setSubMenu("action");
                else add(k as FlowNode["kind"]);
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {k === "delay" ? (
                <Hourglass size={17} />
              ) : k === "condition" ? (
                <Filter size={17} />
              ) : k === "random" ? (
                <Shuffle size={17} />
              ) : k === "tag" ? (
                <Tag size={17} />
              ) : (
                <Send size={17} />
              )}
              {!subMenu && k === "tag"
                ? "Action"
                : NODE_NAMES[k as FlowNode["kind"]]}
            </button>
          ))}
        </div>
      )}
      {selected && node && !edit && (
        <div className="absolute right-4 top-4 z-10 flex gap-2 rounded-2xl bg-white p-2 shadow-lg dark:bg-slate-800">
          <button onClick={() => setEdit(true)} className="px-3 text-xs">
            Edit step
          </button>
          <button
            aria-label="Delete node"
            onClick={() => remove(node.id)}
            className="p-2 text-red-500"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
      {edit && node && (
        <aside
          aria-label="Step settings"
          className="absolute inset-y-0 right-0 z-20 flex w-full max-w-none sm:max-w-[384px] flex-col border-l border-slate-200 light:border-slate-300 bg-white shadow-xl dark:border-white/10 dark:bg-[#111827]"
        >
          <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-slate-100 light:border-slate-200 px-5 dark:border-white/5">
            <h2 className="flex-1 text-sm font-semibold">
              {NODE_NAMES[node.kind]}
            </h2>
            <button
              aria-label="Copy node"
              disabled={flow.nodes.length >= 50}
              onClick={() => {
                const copied = {
                  ...JSON.parse(JSON.stringify(node)),
                  id: `step_${crypto.randomUUID().slice(0, 8)}`,
                  x: Math.min(6000, node.x + 80),
                  y: Math.min(6000, node.y + 220),
                } as FlowNode;
                onChange({ ...flow, nodes: [...flow.nodes, copied] });
                setSelected(copied.id);
              }}
              className="p-2 text-slate-500 light:text-slate-600"
            >
              <Copy size={17} />
            </button>
            <button
              aria-label="Delete node"
              onClick={() => remove(node.id)}
              className="p-2 text-red-500"
            >
              <Trash2 size={17} />
            </button>
            <button
              aria-label="Close step settings"
              onClick={() => setEdit(false)}
              className="p-2"
            >
              <X size={18} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <FlowNodeEditor key={node.id} node={node} flow={flow} onChange={onChange} />
          </div>
        </aside>
      )}
    </div>
  );
}
