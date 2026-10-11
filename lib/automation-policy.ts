import { z } from "zod";

export const policyScanInputSchema = z.object({
  integrationId: z.string().uuid(),
  sections: z.array(z.object({
    id: z.string().min(1).max(100), label: z.string().min(1).max(120),
    detail: z.string().max(200).optional(), texts: z.array(z.string().max(8000)).max(20),
  }).strict()).min(1).max(200),
}).strict().superRefine((input, context) => {
  if (new Set(input.sections.map(section => section.id)).size !== input.sections.length)
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Section IDs must be unique." });
  if (JSON.stringify(input).length > 60000)
    context.addIssue({ code: z.ZodIssueCode.custom, message: "This automation is too large to scan." });
});
export type PolicyScanInput = z.infer<typeof policyScanInputSchema>;
export type PolicySection = PolicyScanInput["sections"][number];
export type PolicyFinding = { sectionId: string; textIndex: number; title: string; reason: string; quote: string; replacement?: string };
export type PolicyScanResult = { ok: true; findings: PolicyFinding[]; used: number; limit: 3 | null } | { ok: false; code: "LIMIT" | "ERROR"; error: string; used?: number; limit?: 3 | null };

/** Rewrites must retain every URL, mention and template token, and introduce none. */
export function policyReplacementPreservesTokens(source: string, replacement: string): boolean {
  const tokens = (value: string) => (value.match(/https?:\/\/[^\s<>"'`]+|\{\{[^{}]+\}\}|\{[^{}]+\}|@[\w.]+|\bUsername\b/g) ?? [])
    .map(value => value.replace(/[.,;!?)}\]]+$/, value.startsWith("http") ? "" : "$&")).sort();
  return JSON.stringify(tokens(source)) === JSON.stringify(tokens(replacement));
}
