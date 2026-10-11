import type { Node } from "@xyflow/react";
import type { Flow } from "./definition";

export function syncCanvasNodes<T extends Node>(current: T[], incoming: T[], selected: string | null): T[] {
  const previous = new Map(current.map((node) => [node.id, node]));
  return incoming.map((node) => {
    const old = previous.get(node.id);
    return {
      ...old,
      ...node,
      // Parent updates (including autosave and selection) must not rewind a drag.
      position: old?.dragging ? old.position : node.position,
      selected: node.id === selected,
    };
  });
}

export const clampCanvasPosition = (position: { x: number; y: number }) => ({
  x: Math.max(0, Math.min(6000, position.x)),
  y: Math.max(0, Math.min(6000, position.y)),
});

export function moveCanvasNodes(flow: Flow, moved: Pick<Node, "id" | "position">[]): Flow {
  const positions = new Map(moved.map((node) => [node.id, clampCanvasPosition(node.position)]));
  return {
    ...flow,
    triggerPosition: positions.get("__trigger") ?? flow.triggerPosition,
    nodes: flow.nodes.map((node) => {
      const position = positions.get(node.id);
      return position ? { ...node, ...position } : node;
    }),
  };
}
