"use server";
import { onCurrentUser } from "@/actions/user";
import { client } from "@/lib/prisma";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";
import { consumeWebhookAccountRateLimit } from "@/lib/webhook-rate-limit";
import { policyScanInputSchema, type PolicyScanInput, type PolicyScanResult } from "@/lib/automation-policy";
import { generateAutomationPolicyScan } from "@/lib/ai-policy-scan";
import { reservePolicyScan, finishPolicyScan } from "@/lib/automation-policy-quota";
import { mapSavedAutomationPolicy } from "@/lib/automation-policy-input";

async function scanOwner(integrationId: string) {
  const clerk = await onCurrentUser();
  if (await currentInstagramAccountId(clerk.id) !== integrationId) throw new Error("Account changed");
  const user = await client.user.findUnique({ where: { clerkId: clerk.id }, select: { id: true, status: true } });
  if (!user || user.status === "SUSPENDED") throw new Error("Account unavailable");
  const integration = await client.integrations.findFirst({ where: { id: integrationId, userId: user.id, planLocked: false }, select: { id: true } });
  if (!integration) throw new Error("Account unavailable");
  return user;
}

/** Advisory only: never publishes, saves a draft, or sends Instagram messages. */
export async function scanAutomationPolicy(raw: PolicyScanInput): Promise<PolicyScanResult> {
  let reservationId: string | null = null;
  try {
    const parsed = policyScanInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, code: "ERROR", error: "This automation could not be reviewed. Reload the editor and try again." };
    const input = parsed.data;
    const owner = await scanOwner(input.integrationId);
    const rate = await consumeWebhookAccountRateLimit([`policy-scan:${owner.id}`], { limit: 6 });
    if (!rate.allowed) return { ok: false, code: "ERROR", error: "Please wait a minute before running another safety scan." };
    const quota = await reservePolicyScan(owner.id);
    if (!quota.ok) return { ok: false, code: "LIMIT", error: "You've used your free policy-scan allowance.", used: quota.used, limit: quota.limit };
    reservationId = quota.id;
    const findings = await generateAutomationPolicyScan(input);
    await finishPolicyScan(reservationId, true);
    reservationId = null;
    return { ok: true, findings, used: quota.used, limit: quota.limit };
  } catch {
    if (reservationId) await finishPolicyScan(reservationId, false).catch(() => undefined);
    return { ok: false, code: "ERROR", error: "The safety scan could not complete. Please try again." };
  }
}

export async function getSavedPolicyInput(automationId: string): Promise<PolicyScanInput | null> {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(automationId)) return null;
    const clerk = await onCurrentUser();
    const integrationId = await currentInstagramAccountId(clerk.id);
    const owner = await scanOwner(integrationId);
    const automation = await client.automation.findFirst({ where: { id: automationId, userId: owner.id, integrationId, archivedAt: null }, include: { listener: true, keywords: true, trigger: true, posts: true } });
    if (!automation) return null;
    return policyScanInputSchema.parse(mapSavedAutomationPolicy(automation));
  } catch { return null; }
}
