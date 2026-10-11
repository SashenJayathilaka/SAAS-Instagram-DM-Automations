import { edges, type FlowNode, type Flow } from "./definition";

export function connectFlow(
  flow: Flow,
  source: string,
  slot: number,
  target: string | null,
): Flow {
  if (source === "__trigger") return { ...flow, entry: target ?? "" };
  return {
    ...flow,
    nodes: flow.nodes.map((n) => {
      if (n.id !== source) return n;
      if (n.kind === "question")
        return {
          ...n,
          options: n.options.map((o, i) =>
            i === slot ? { ...o, next: target } : o,
          ),
        };
      if (n.kind === "condition" || n.kind === "random")
        return { ...n, [slot === 0 ? "yes" : "no"]: target };
      if (n.kind === "email" || n.kind === "phone" || n.kind === "capture")
        return { ...n, [slot === 0 ? "next" : "skip"]: target };
      if (n.kind === "end") return n;
      return { ...n, next: target };
    }),
  };
}

/** Add and connect in one edit so undo/cancel cannot leave a dangling edge. */
export function appendFlowNode(
  flow: Flow,
  node: FlowNode,
  connection?: { source: string; slot: number } | null,
): Flow {
  if (flow.nodes.length >= 50 || flow.nodes.some((item) => item.id === node.id)) return flow;
  if (connection && connection.source !== "__trigger") {
    const source = flow.nodes.find((item) => item.id === connection.source);
    if (!source || !edges(source)[connection.slot]) return flow;
  }
  const next = { ...flow, entry: flow.entry || node.id, nodes: [...flow.nodes, node] };
  return connection ? connectFlow(next, connection.source, connection.slot, node.id) : next;
}
