import { cookies } from "next/headers";
import { cache } from "react";
import { client } from "@/lib/prisma";

export const INSTAGRAM_ACCOUNT_COOKIE = "ap3k_instagram_account";
export const NO_INSTAGRAM_ACCOUNT = "00000000-0000-0000-0000-000000000000";

export async function requestedInstagramAccount() {
  try { return (await cookies()).get(INSTAGRAM_ACCOUNT_COOKIE)?.value; } catch { return undefined; }
}

export function selectInstagramAccount<T extends { id: string; status?: string; planLocked?: boolean }>(accounts: T[], requested?: string) {
  return accounts.find((account) => account.id === requested && !account.planLocked)
    ?? accounts.find((account) => account.status === "CONNECTED" && !account.planLocked)
    ?? accounts.find((account) => !account.planLocked)
    ?? null;
}

// Always resolve the cookie against the authenticated owner's rows. Never trust a
// browser-provided integration ID as an ownership or authorization decision.
const requestCache = typeof cache === "function" ? cache : <T extends (...args: any[]) => any>(fn: T) => fn;
export const currentInstagramAccountId = requestCache(async (clerkId: string) => {
  const accounts = await client.integrations.findMany({
    where: { name: "INSTAGRAM", User: { clerkId } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, status: true, planLocked: true },
  });
  return selectInstagramAccount(accounts, await requestedInstagramAccount())?.id ?? NO_INSTAGRAM_ACCOUNT;
});
