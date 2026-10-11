export const AUTOMATION_STEPS = ["PUBLIC_REPLY", "OPENING", "FOLLOW", "EMAIL", "PHONE", "MESSAGE"] as const;
export type AutomationStep = typeof AUTOMATION_STEPS[number];
export type StepDelays = Partial<Record<AutomationStep, number>>;
export function normalizeStepDelays(value: unknown): StepDelays | undefined {
 if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
 return Object.fromEntries(AUTOMATION_STEPS.map(key=>{const n=(value as Record<string,unknown>)[key];return [key,typeof n==="number" && Number.isFinite(n)?Math.min(82800,Math.max(0,Math.floor(n))):0];}));
}
export function editorStepDelays(data:{stepDelays?:unknown;deliveryDelaySeconds?:number;openingDmEnabled?:boolean}):StepDelays {
 return normalizeStepDelays(data.stepDelays) ?? {PUBLIC_REPLY:data.deliveryDelaySeconds || 0,[data.openingDmEnabled?"OPENING":"MESSAGE"]:data.deliveryDelaySeconds || 0};
}
export function stepDelay(data:{stepDelays?:unknown},step:AutomationStep){return normalizeStepDelays(data.stepDelays)?.[step] || 0;}
