"use server";
import { requireOwnerAdmin } from "@/lib/admin";
import { processMarketingQueue } from "@/lib/marketing/delivery";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function processMarketingEmailsAction() {
  await requireOwnerAdmin();
  let result = "unavailable";
  try {
    const run = await processMarketingQueue();
    result = run.enabled ? `sent-${run.sent}` : "paused";
  } catch { /* Show an operational error without recipient details. */ }
  revalidatePath("/admin/acquisition");
  redirect(`/admin/acquisition?run=${result}`);
}
