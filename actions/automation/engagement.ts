"use server";
import { onCurrentUser } from "@/actions/user";
import { followUpSchedulerReady } from "@/lib/automation-engagement";
export async function getEngagementAvailability() {
  await onCurrentUser();
  try { return { followUpsReady: await followUpSchedulerReady() }; }
  catch { return { followUpsReady: false }; }
}
