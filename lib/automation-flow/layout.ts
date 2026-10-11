import type { Flow } from "./definition";

const CARD_WIDTH = 320;
const COLUMN_GAP = 64;

/** Reserve a compact trigger column for new templates; respect saved positions. */
export function prepareFlowCanvas(flow: Flow): Flow {
  if (flow.triggerPosition) return flow;
  const left = flow.nodes.length ? Math.min(...flow.nodes.map((node) => node.x)) : 464;
  const offset = 80 + CARD_WIDTH + COLUMN_GAP - left;
  const entry = flow.nodes.find((node) => node.id === flow.entry);
  return {
    ...flow,
    triggerPosition: { x: 80, y: entry?.y ?? 160 },
    nodes: flow.nodes.map((node) => ({ ...node, x: Math.max(0, Math.min(6000, node.x + offset)) })),
  };
}

type Measurement = { id: string; measured?: { width?: number; height?: number } };

/** Remove empty bands only: preserve branch order, overlap, and all connections. */
export function compactFlowCanvas(flow: Flow, measurements: Measurement[] = []): Flow {
  const measured = new Map(measurements.map((node) => [node.id, node.measured]));
  const items = [
    { id: "__trigger", ...(flow.triggerPosition ?? { x: 80, y: 160 }) },
    ...flow.nodes,
  ];
  const compactAxis = (axis: "x" | "y", gap: number) => {
    const sorted = [...items].sort((a, b) => a[axis] - b[axis]);
    let boundary = sorted[0][axis];
    let removed = Math.max(0, boundary - 80);
    const positions = new Map<string, number>();
    for (const item of sorted) {
      removed += Math.max(0, item[axis] - boundary - gap);
      positions.set(item.id, item[axis] - removed);
      const size = axis === "x"
        ? measured.get(item.id)?.width ?? CARD_WIDTH
        : measured.get(item.id)?.height ?? 320;
      boundary = Math.max(boundary, item[axis] + size);
    }
    return positions;
  };
  const x = compactAxis("x", COLUMN_GAP);
  const y = compactAxis("y", 48);
  return {
    ...flow,
    triggerPosition: { x: x.get("__trigger")!, y: y.get("__trigger")! },
    nodes: flow.nodes.map((node) => ({ ...node, x: x.get(node.id)!, y: y.get(node.id)! })),
  };
}
