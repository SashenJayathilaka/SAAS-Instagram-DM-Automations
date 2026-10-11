"use server";

import { onCurrentUser } from "@/actions/user";
import { getAutomationAnalytics } from "@/lib/automation-analytics";
import { currentInstagramAccountId } from "@/lib/instagram-account-scope";

export async function onGetAutomationAnalytics(automationId: string) {
  const user = await onCurrentUser();
  const integrationId = await currentInstagramAccountId(user.id);
  return getAutomationAnalytics(automationId, user.id, integrationId);
}
