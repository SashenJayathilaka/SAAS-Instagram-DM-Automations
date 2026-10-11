"use server";

import { revalidatePath } from "next/cache";
import { onCurrentUser } from "@/actions/user";
import { findUser } from "@/actions/user/queries";
import { client } from "@/lib/prisma";

export async function updateEmailPreferencesAction(formData: FormData) {
  const current = await onCurrentUser();
  const profile = await findUser(current.id);
  if (!profile?.id) throw new Error("AP3K account not found.");

  await client.emailPreference.upsert({
    where: { userId: profile.id },
    create: {
      userId: profile.id,
      productTips: formData.get("productTips") === "on",
      weeklyReports: formData.get("weeklyReports") === "on",
      promotions: formData.get("promotions") === "on",
    },
    update: {
      productTips: formData.get("productTips") === "on",
      weeklyReports: formData.get("weeklyReports") === "on",
      promotions: formData.get("promotions") === "on",
    },
  });

  revalidatePath("/dashboard/[slug]/settings", "page");
}
