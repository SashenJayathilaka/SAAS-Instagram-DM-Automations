export type AutomationCategory = "all" | "basic" | "flow";

export function matchesAutomationCategory(automation: { listener?: { flowDefinition?: unknown; flowDraft?: unknown } | null }, category: AutomationCategory) {
  if (category === "all") return true;
  const isFlow = automation.listener?.flowDefinition != null || automation.listener?.flowDraft != null;
  return category === "flow" ? isFlow : !isFlow;
}
