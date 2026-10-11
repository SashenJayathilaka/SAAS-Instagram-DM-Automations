"use server";

import { onCurrentUser } from "@/actions/user";
import { client } from "@/lib/prisma";
import { isValidTimeZone } from "@/lib/time-zone";
import { revalidatePath } from "next/cache";

export type TimeZonePreference = {
  timeZone: string;
  automatic: boolean;
};

export async function updateTimeZonePreference(preference: TimeZonePreference) {
  const user = await onCurrentUser();
  if (!isValidTimeZone(preference.timeZone)) {
    throw new Error("Choose a valid time zone.");
  }

  await client.user.update({
    where: { clerkId: user.id },
    data: {
      timeZone: preference.timeZone,
      timeZoneAuto: preference.automatic,
    },
  });
  revalidatePath("/dashboard", "layout");
  return preference;
}
