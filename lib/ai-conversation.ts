import { z } from "zod";
import { normalizeAiWorkspace } from "@/lib/ai-workspace";

export const aiConversationSchema = z.object({
  version: z.literal(1),
  goal: z.string().trim().min(10, "Describe your conversation goal in at least 10 characters.").max(800),
  context: z.string().trim().min(10, "Add the facts AI needs to answer accurately.").max(12000),
  tasks: z.array(z.string().trim().min(1).max(240)).min(1).max(8),
  tone: z.enum(["FRIENDLY", "FUN", "PROFESSIONAL"]),
  collectEmail: z.boolean(),
  fallback: z.string().trim().min(1).max(500),
});
export type AiConversationConfig = z.infer<typeof aiConversationSchema>;
export type AiConversationTurn = { role: "user" | "assistant"; content: string };
export const DEFAULT_AI_CONVERSATION: AiConversationConfig = {
  version: 1, goal: "", context: "", tasks: ["Understand what the customer needs", "Recommend a relevant offer using the supplied facts", "Answer questions and share the appropriate link"],
  tone: "FRIENDLY", collectEmail: false,
  fallback: "I’m unable to answer right now. Please leave your question here and our team can help.",
};
export function readAiConversation(value: unknown): AiConversationConfig | null {
  const result = aiConversationSchema.safeParse(value);
  return result.success ? result.data : null;
}
export function conversationInstructions(config: AiConversationConfig) {
  return [
    `Conversation goal: ${config.goal}`,
    ...config.tasks.map((task, i) => `${i + 1}. ${task}`),
    "Ask one question at a time. Use previous answers; never repeat a question already answered. Recommend only relevant offers supported by the facts. Never claim to have browsed a website, placed an order or completed a purchase.",
    config.collectEmail ? "If useful, ask for an email to let the team follow up. Explain why and make it optional. Accept SKIP without asking again." : "Do not ask for personal contact details.",
    "Never request passwords, payment details, government IDs or other sensitive information. If asked for a person, stop selling and offer human help. Respect refusals.",
  ].join("\n");
}
export function conversationWorkspace(config: AiConversationConfig) {
  return normalizeAiWorkspace({ aiRepliesEnabled: true, defaultTone: config.tone,
    brandVoice: `${config.tone.toLowerCase()}, concise, helpful. Match the customer's language.`,
    knowledge: [{ id: "flow-context", title: "Approved business facts and offers", content: config.context.slice(0, 5000) },
      ...(config.context.length > 5000 ? [{ id: "flow-context-2", title: "More approved facts", content: config.context.slice(5000, 10000) }] : []),
      ...(config.context.length > 10000 ? [{ id: "flow-context-3", title: "Additional approved facts", content: config.context.slice(10000) }] : [])],
  });
}
export function readConversationHistory(value: unknown): AiConversationTurn[] {
  return z.array(z.object({role: z.enum(["user", "assistant"]), content: z.string().max(1000)})).safeParse(value).data?.slice(-12) ?? [];
}
export function conversationStopIntent(message: string) {
  return /^(stop|unsubscribe|cancel|human|agent|talk to a human|توقف|إلغاء|الغاء|موظف|arrêter|arreter|parar|cancelar|stopp)[.!؟?\s]*$/i.test(message.trim());
}
export function explicitConversationEmail(message: string) {
  const value = message.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254 ? value.toLowerCase() : null;
}
