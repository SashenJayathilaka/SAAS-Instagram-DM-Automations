import { applyFlowTag, resolveFlowText, type FlowNode, type FlowValues } from "./definition";
import { parseWebhookUrl, renderWebhookBody } from "./webhook-contract";

/** Pure action simulation. This module cannot perform network or database work. */
export function previewFlowAction(node: FlowNode, data: FlowValues): { values: FlowValues; next: string | null; notice?: string; error?: string } | null {
  if (node.kind === "tag") return { values: applyFlowTag(data, node.tag, node.action), next: node.next };
  if (node.kind === "setfield") return { values: { ...data, [node.field]: resolveFlowText(node.value, data) }, next: node.next };
  if (node.kind === "webhook") {
    const url = parseWebhookUrl(node.url);
    try {
      if (!url) throw new Error();
      renderWebhookBody(node.body, data);
      // Do not expose a Zapier endpoint's secret path/query in the transcript.
      return { values: { ...data }, next: node.next, notice: `External request preview: POST to ${url.hostname}. No request is sent in preview.` };
    } catch {
      return { values: { ...data }, next: node.next, error: "Configure a public HTTPS URL and valid JSON body before previewing this request." };
    }
  }
  return null;
}
