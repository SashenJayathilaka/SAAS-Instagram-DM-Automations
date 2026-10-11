import { describe, expect, it } from "vitest";
import { applyNodeChanges, type Node } from "@xyflow/react";
import { moveCanvasNodes, syncCanvasNodes } from "./canvas-state";
import { appendFlowNode } from "./connections";
import { compactFlowCanvas, prepareFlowCanvas } from "./layout";
import { edges, type Flow, type FlowNode } from "./definition";

const message = (id: string, x = 100, y = 160): Extract<FlowNode, { kind: "message" }> => ({
  id, kind: "message", label: id, text: "Hello", links: [], next: null, x, y,
});
const graph = (nodes: FlowNode[] = [message("first")]): Flow => ({
  version: 1, entry: nodes[0]?.id ?? "", oncePerContact: false, nodes,
});

describe("flow canvas interactions", () => {
  it("keeps dragging positions and measured sizes through parent updates, then accepts undo", () => {
    const original: Node = { id: "first", position: { x: 100, y: 160 }, data: { label: "old" }, measured: { width: 320, height: 220 } };
    const dragging = applyNodeChanges([{ type: "position", id: "first", position: { x: 350, y: 300 }, dragging: true }], [original]);
    const updated = { ...original, data: { label: "new" } };
    const synced = syncCanvasNodes(dragging, [updated], "first");
    expect(synced[0]).toMatchObject({ position: { x: 350, y: 300 }, measured: { width: 320, height: 220 }, selected: true, data: { label: "new" } });
    const stopped = applyNodeChanges([{ type: "position", id: "first", position: { x: 350, y: 300 }, dragging: false }], synced);
    expect(syncCanvasNodes(stopped, [original], null)[0].position).toEqual(original.position);
    expect(syncCanvasNodes(stopped, [], null)).toEqual([]);
  });

  it("saves all moved cards and the trigger within the persisted coordinate bounds", () => {
    const before = graph([message("first"), message("second")]);
    const after = moveCanvasNodes(before, [
      { id: "__trigger", position: { x: 50, y: 90 } },
      { id: "first", position: { x: -30, y: 300 } },
      { id: "second", position: { x: 9000, y: 7000 } },
    ]);
    expect(after.triggerPosition).toEqual({ x: 50, y: 90 });
    expect(after.nodes.map(({ x, y }) => ({ x, y }))).toEqual([{ x: 0, y: 300 }, { x: 6000, y: 6000 }]);
    expect(before.nodes[0].x).toBe(100);
  });

  it("adds and connects a dropped node atomically from the trigger or Then output", () => {
    const before = graph();
    const node = message("new", 670, 410);
    const after = appendFlowNode(before, node, { source: "first", slot: 0 });
    expect(edges(after.nodes[0])[0].target).toBe("new");
    expect(after.nodes[1]).toEqual(node);
    expect(after.entry).toBe("first");
    expect(appendFlowNode(before, node, { source: "__trigger", slot: 0 }).entry).toBe("new");
    expect(edges(before.nodes[0])[0].target).toBeNull();
  });

  it.each<FlowNode>([
    { ...message("source"), kind: "question", field: "answer", text: "Choose", options: [{ label: "A", next: "old" }, { label: "B", next: null }] },
    { id: "source", label: "", x: 100, y: 160, kind: "condition", field: "tag", equals: "yes", yes: "old", no: null },
    { id: "source", label: "", x: 100, y: 160, kind: "random", percent: 50, yes: "old", no: null },
    { id: "source", label: "", x: 100, y: 160, kind: "email", text: "Email?", next: "old", skip: null },
    { id: "source", label: "", x: 100, y: 160, kind: "phone", text: "Phone?", next: "old", skip: null },
    { id: "source", label: "", x: 100, y: 160, kind: "capture", text: "Name?", field: "name", next: "old", skip: null },
  ])("connects the selected branch only ($kind)", (source) => {
    const before = graph([source, message("old")]);
    const after = appendFlowNode(before, message("new"), { source: "source", slot: 1 });
    expect(edges(after.nodes[0]).map((edge) => edge.target)).toEqual(["old", "new"]);
    expect(edges(before.nodes[0]).map((edge) => edge.target)).toEqual(["old", null]);
  });

  it("does not insert a node for stale sources, invalid outputs, duplicate IDs or a full flow", () => {
    const before = graph();
    expect(appendFlowNode(before, message("new"), { source: "removed", slot: 0 })).toBe(before);
    expect(appendFlowNode(before, message("new"), { source: "first", slot: 2 })).toBe(before);
    expect(appendFlowNode(before, message("first"))).toBe(before);
    const full = graph(Array.from({ length: 50 }, (_, i) => message("node" + i)));
    expect(appendFlowNode(full, message("new"))).toBe(full);
  });

  it("gives new templates a 64px trigger gap and preserves saved arrangements", () => {
    const prepared = prepareFlowCanvas(graph());
    expect(prepared.triggerPosition).toEqual({ x: 80, y: 160 });
    expect(prepared.nodes[0].x - prepared.triggerPosition!.x - 320).toBe(64);
    const saved = { ...prepared, triggerPosition: { x: 900, y: 600 } };
    expect(prepareFlowCanvas(saved)).toBe(saved);
  });

  it("compacts empty space without changing connections or overlapping tall cards", () => {
    const before: Flow = {
      ...graph([{ ...message("first", 1600, 80), next: "second" }, message("second", 1600, 2200)]),
      triggerPosition: { x: 80, y: 80 },
    };
    const after = compactFlowCanvas(before, [
      { id: "__trigger", measured: { width: 320, height: 300 } },
      { id: "first", measured: { width: 320, height: 700 } },
      { id: "second", measured: { width: 320, height: 200 } },
    ]);
    expect(after.nodes[0]).toMatchObject({ x: 464, y: 80, next: "second" });
    expect(after.nodes[1]).toMatchObject({ x: 464, y: 828 });
    expect(after.entry).toBe(before.entry);
    expect(before.nodes[0].x).toBe(1600);
    expect(compactFlowCanvas(graph([])).nodes).toEqual([]);
  });
});
