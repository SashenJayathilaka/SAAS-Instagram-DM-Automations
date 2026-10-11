"use server";

import { MULTI_ACCOUNT_CONNECTIONS_ENABLED } from "@/lib/instagram-account-rollout";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { client } from "@/lib/prisma";
import { INSTAGRAM_ACCOUNT_COOKIE, selectInstagramAccount, requestedInstagramAccount } from "@/lib/instagram-account-scope";
import { getPlanLimits } from "@/lib/plan-limits";

export async function getInstagramAccountMenu() {
  const auth = await currentUser();
  if (!auth) return null;
  const user = await client.user.findUnique({
    where: { clerkId: auth.id },
    select: {
      subscription: { select: { plan: true } },
      integrations: {
        where: { name: "INSTAGRAM" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: { id: true, instagramUsername: true, profilePictureUrl: true, status: true, planLocked: true },
      },
    },
  });
  if (!user) return null;
  return {
    accounts: user.integrations,
    additionsEnabled: MULTI_ACCOUNT_CONNECTIONS_ENABLED || user.integrations.every((account) => account.status === "DISCONNECTED"),
    selectedId: selectInstagramAccount(user.integrations, await requestedInstagramAccount())?.id,
    plan: user.subscription?.plan ?? "FREE",
    limit: getPlanLimits(user.subscription?.plan).connectedInstagramAccounts,
    used: user.integrations.filter((account) => account.status !== "DISCONNECTED").length,
  };
}

export async function switchInstagramAccount(integrationId: string) {
  const auth = await currentUser();
  if (!auth || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(integrationId)) return { ok: false };
  const account = await client.integrations.findFirst({ where: { id: integrationId, User: { clerkId: auth.id }, name: "INSTAGRAM", planLocked: false }, select: { id: true } });
  if (!account) return { ok: false };
  (await cookies()).set(INSTAGRAM_ACCOUNT_COOKIE, account.id, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 31536000 });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
